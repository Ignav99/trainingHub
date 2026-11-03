"""Nota de 0 a 100 de un JSON de visión.

100 es el partido perfecto: cada segundo de juego, 22 jugadores con su sitio en
el césped y un id que dura todo el partido, el árbitro, el balón, el equipo y el
dorsal del acta. Todo se cuenta por segundo y sobre 22 plazas, así que un id
perfecto que solo aparece dos décimas apenas suma.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable

from .homography import BALL_MAX_SPEED_M_S, PITCH_LENGTH_M, PITCH_WIDTH_M

PLAYERS_ON_PITCH = 22
ID_FULL_S = 60.0
WEIGHTS = {
    "jugadores": 40.0,
    "identidad": 20.0,
    "balon": 20.0,
    "arbitro": 10.0,
    "equipo_dorsal": 10.0,
}


def score_document(doc: dict, *, visible: Callable[[int], float] | None = None, id_full_s: float = ID_FULL_S) -> dict:
    """``visible`` da cuántos jugadores se ven en cada segundo cuando el vídeo es un trozo con la cámara cerrada."""
    seconds = _play_seconds(doc)
    if not seconds:
        return {"nota": 0.0, "partes": {key: 0.0 for key in WEIGHTS}, "segundos": 0, "jugadores_por_segundo": 0.0}
    second_set = set(seconds)
    legal = _legal_numbers(doc.get("roster"))

    present: dict[int, dict[float, list[tuple[float, float]]]] = defaultdict(lambda: defaultdict(list))
    referees: set[int] = set()
    for track in doc.get("tracks") or []:
        valid = [sample for sample in track.get("samples") or [] if _on_pitch(sample)]
        if not valid:
            continue
        if track.get("role") == "referee":
            referees |= {int(float(sample["t"])) for sample in valid} & second_set
            continue
        if track.get("role") != "player":
            continue
        duration = float(valid[-1]["t"]) - float(valid[0]["t"])
        identity = min(1.0, duration / id_full_s)
        dorsal = track.get("dorsal")
        known = dorsal is not None and (not legal or int(dorsal) in legal)
        label = 0.5 * (track.get("team") is not None) + 0.5 * known
        for sample in valid:
            second = int(float(sample["t"]))
            if second in second_set:
                present[second][round(float(sample["t"]), 3)].append((identity, label))

    ball: dict[int, float] = {}
    for row in _believable_ball(doc.get("ball") or []):
        second = int(float(row["t"]))
        if second in second_set:
            ball[second] = max(ball.get(second, 0.0), 0.5 if row.get("held") else 1.0)

    count_sum = identity_sum = label_sum = seen_sum = 0.0
    for second in seconds:
        places = PLAYERS_ON_PITCH if visible is None else max(1, min(PLAYERS_ON_PITCH, round(visible(second))))
        frames = present.get(second) or {}
        if not frames:
            continue
        for rows in frames.values():
            rows = sorted(rows, reverse=True)[:places]
            count_sum += len(rows) / places / len(frames)
            identity_sum += sum(identity for identity, _ in rows) / places / len(frames)
            label_sum += sum(label for _, label in rows) / places / len(frames)
            seen_sum += len(rows) / len(frames)

    total = float(len(seconds))
    shares = {
        "jugadores": count_sum / total,
        "identidad": identity_sum / total,
        "balon": sum(ball.values()) / total,
        "arbitro": len(referees) / total,
        "equipo_dorsal": label_sum / total,
    }
    parts = {key: round(WEIGHTS[key] * min(1.0, value), 2) for key, value in shares.items()}
    return {
        "nota": round(sum(parts.values()), 1),
        "partes": parts,
        "segundos": len(seconds),
        "jugadores_por_segundo": round(seen_sum / total, 2),
    }


REAL_PEOPLE = 25
TARGETS = {
    "camara_pct": 80.0,
    "segundos_con_metros_pct": 90.0,
    "balon_pct": 60.0,
    "tracks_por_persona": 3.0,
    "id_mediana_s": 30.0,
}


def scorecard(doc: dict) -> dict:
    """La nota y los indicadores que la mueven, por parte, para comparar una prueba con la anterior."""
    graded = score_document(doc)
    rate = float((doc.get("source") or {}).get("sample_fps") or 10.0)
    homographies = [row for row in doc.get("homography") or [] if isinstance(row, dict) and row.get("accepted")]
    players = [track for track in doc.get("tracks") or [] if track.get("role") == "player" and track.get("samples")]
    ball = _believable_ball(doc.get("ball") or [])
    parts: list[dict] = []
    for span in doc.get("spans") or []:
        start, end = float(span.get("start_s") or 0), float(span.get("end_s") or 0)
        length = max(end - start, 1e-6)

        def inside(t: object, start: float = start, end: float = end) -> bool:
            return start <= float(t) < end

        tracks = [track for track in players if inside(track["samples"][0]["t"])]
        durations = sorted(float(track["samples"][-1]["t"]) - float(track["samples"][0]["t"]) for track in tracks)
        metres = {int(float(s["t"])) for track in tracks for s in track["samples"] if inside(s["t"]) and _on_pitch(s)}
        parts.append({
            "parte": span.get("name"),
            "camara_pct": round(100 * sum(inside(row["t"]) for row in homographies) / (length * rate), 1),
            "segundos_con_metros_pct": round(100 * len(metres) / length, 1),
            "balon_pct": round(100 * len({int(float(row["t"])) for row in ball if inside(row["t"])}) / length, 1),
            "tracks_por_persona": round(len(tracks) / REAL_PEOPLE, 1),
            "id_mediana_s": round(durations[len(durations) // 2], 1) if durations else 0.0,
        })
    return {**graded, "indicadores": parts, "objetivos": TARGETS}


def scorecard_lines(card: dict) -> list[str]:
    lines = [f"NOTA KABINE {card['nota']:.1f}/100  ({card['jugadores_por_segundo']} jugadores situados por segundo de media)"]
    lines.append("  " + "  ".join(f"{key} {value:.1f}/{WEIGHTS[key]:g}" for key, value in card["partes"].items()))
    labels = {
        "camara_pct": "cámara calibrada",
        "segundos_con_metros_pct": "segundos con jugadores en metros",
        "balon_pct": "segundos con balón",
        "tracks_por_persona": "tracks por persona real (menos es mejor)",
        "id_mediana_s": "duración mediana de un id, s",
    }
    for key, label in labels.items():
        values = "  ".join(f"{row['parte']} {row[key]:g}" for row in card["indicadores"])
        lines.append(f"  {label:<42} {values}   objetivo {card['objetivos'][key]:g}")
    return lines


def _believable_ball(rows: list[dict]) -> list[dict]:
    """El balón cuenta si cae en el campo y enlaza con una vecina a velocidad de balón."""
    inside = [
        row for row in rows
        if row.get("x") is not None
        and row.get("y") is not None
        and 0.0 <= float(row["x"]) <= 1.0
        and 0.0 <= float(row["y"]) <= 1.0
    ]
    inside.sort(key=lambda row: float(row["t"]))
    kept: list[dict] = []
    for index, row in enumerate(inside):
        for other in (inside[index - 1] if index else None, inside[index + 1] if index + 1 < len(inside) else None):
            if other is None:
                continue
            dt = abs(float(other["t"]) - float(row["t"]))
            if dt <= 1e-6 or dt > 0.5:
                continue
            dx = (float(other["x"]) - float(row["x"])) * PITCH_LENGTH_M
            dy = (float(other["y"]) - float(row["y"])) * PITCH_WIDTH_M
            if (dx * dx + dy * dy) ** 0.5 / dt <= BALL_MAX_SPEED_M_S:
                kept.append(row)
                break
    return kept


def _play_seconds(doc: dict) -> list[int]:
    out: list[int] = []
    for span in doc.get("spans") or []:
        out.extend(range(int(float(span.get("start_s") or 0)), int(float(span.get("end_s") or 0))))
    if out:
        return out
    stamps = [
        float(sample["t"])
        for track in doc.get("tracks") or []
        for sample in track.get("samples") or []
        if sample.get("t") is not None
    ]
    if not stamps:
        return []
    return list(range(int(min(stamps)), int(max(stamps)) + 1))


def _on_pitch(sample: dict) -> bool:
    if sample.get("x") is None or sample.get("y") is None or sample.get("rejected_speed"):
        return False
    return 0.0 <= float(sample["x"]) <= 1.0 and 0.0 <= float(sample["y"]) <= 1.0


def _legal_numbers(roster: dict | None) -> set[int]:
    if not isinstance(roster, dict):
        return set()
    found: set[int] = set()
    for key in ("ours", "rival"):
        for number in roster.get(key) or []:
            try:
                found.add(int(number))
            except (TypeError, ValueError):
                continue
    return found
