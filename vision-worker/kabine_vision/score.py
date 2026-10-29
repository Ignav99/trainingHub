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

    present: dict[int, dict[int, tuple[float, float]]] = defaultdict(dict)
    referees: set[int] = set()
    for track in doc.get("tracks") or []:
        valid = [sample for sample in track.get("samples") or [] if _on_pitch(sample)]
        if not valid:
            continue
        stamps = {int(float(sample["t"])) for sample in valid} & second_set
        if track.get("role") == "referee":
            referees |= stamps
            continue
        if track.get("role") != "player":
            continue
        duration = float(valid[-1]["t"]) - float(valid[0]["t"])
        identity = min(1.0, duration / id_full_s)
        dorsal = track.get("dorsal")
        known = dorsal is not None and (not legal or int(dorsal) in legal)
        label = 0.5 * (track.get("team") is not None) + 0.5 * known
        tid = int(track.get("id") or 0)
        for second in stamps:
            present[second][tid] = (identity, label)

    ball: dict[int, float] = {}
    for row in _believable_ball(doc.get("ball") or []):
        second = int(float(row["t"]))
        if second in second_set:
            ball[second] = max(ball.get(second, 0.0), 0.5 if row.get("held") else 1.0)

    count_sum = identity_sum = label_sum = 0.0
    for second in seconds:
        places = PLAYERS_ON_PITCH if visible is None else max(1, min(PLAYERS_ON_PITCH, round(visible(second))))
        rows = sorted((present.get(second) or {}).values(), reverse=True)[:places]
        count_sum += len(rows) / places
        identity_sum += sum(identity for identity, _ in rows) / places
        label_sum += sum(label for _, label in rows) / places

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
        "jugadores_por_segundo": round(sum(len(present.get(second) or {}) for second in seconds) / total, 2),
    }


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
