"""Tracking de un partido entero, solo con el balón en juego.

Los cuatro pitidos recortan el ruido: antes del inicio, el descanso y lo de
después del final no se leen. El JSON se queda al lado del vídeo y hay otra copia dentro del programa.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from .library import program_copy_for, remember
from .pipeline import run_span
from .preview import Detector, PreviewError
from .tracking import Box

SAMPLE_FPS = 10.0
# Si cambia la lectura, un JSON ya guardado se vuelve a calcular.
READER = "estable-2"
WHISTLE_KEYS = ("inicio_1", "final_1", "inicio_2", "final_partido")
PITCH_POINTS = 1800


def ordered_whistles(raw: dict) -> dict[str, float]:
    if not isinstance(raw, dict):
        raise PreviewError("faltan los pitidos")
    labels = {
        "inicio_1": "el pitido inicial",
        "final_1": "el final de la primera parte",
        "inicio_2": "el inicio de la segunda parte",
        "final_partido": "el pitido final",
    }
    values: dict[str, float] = {}
    for key, label in labels.items():
        if raw.get(key) is None or raw.get(key) == "":
            raise PreviewError(f"falta {label}")
        values[key] = round(float(raw[key]), 3)
    keys = list(labels)
    for prev, nxt in zip(keys, keys[1:]):
        if values[nxt] <= values[prev]:
            raise PreviewError(
                "los pitidos tienen que ir en este orden: inicial, final de la primera parte, inicio de la segunda y pitido final"
            )
    return values


def play_spans(whistles: dict[str, float]) -> list[tuple[str, float, float]]:
    return [
        ("primera", whistles["inicio_1"], whistles["final_1"]),
        ("segunda", whistles["inicio_2"], whistles["final_partido"]),
    ]


def sample_stride(video_fps: float, sample_fps: float = SAMPLE_FPS) -> int:
    return max(1, int(round(float(video_fps) / float(sample_fps))))


def sidecar_for(video: Path) -> Path:
    return video.with_name(video.stem + ".kabine-vision.json")


def whistles_match(saved: dict | None, marks: dict[str, float]) -> bool:
    if not isinstance(saved, dict):
        return False
    for key, value in marks.items():
        other = saved.get(key)
        if other is None or abs(float(other) - float(value)) > 0.05:
            return False
    return True


def session_match(saved: dict | None, marks: dict[str, float], kits: dict | None, roster: dict | None) -> bool:
    """Los mismos pitidos, camisetas y dorsales no vuelven a leer el vídeo."""
    whistles = saved.get("whistles") if isinstance(saved.get("whistles"), dict) else saved
    if not whistles_match(whistles, marks):
        return False
    if not isinstance(saved, dict):
        return False
    return (
        saved.get("reader") == READER
        and _canon_kits(saved.get("kits")) == _canon_kits(kits)
        and _canon_roster(saved.get("roster")) == _canon_roster(roster)
    )


def file_summary(doc: dict, stored: Path | None = None) -> dict:
    tracks = doc.get("tracks") or []
    players = [track for track in tracks if track.get("role") == "player"]
    ball = doc.get("ball") or []
    homography = doc.get("homography") or []
    size = stored.stat().st_size if stored is not None and stored.is_file() else None
    return {
        "kept_frames": (doc.get("preview") or {}).get("kept_frames") or 0,
        "players": len(players),
        "tracks": len(tracks),
        "samples": sum(len(track.get("samples") or []) for track in players),
        "ball": len(ball),
        "homography_accepted": sum(1 for row in homography if row.get("accepted")),
        "homography": len(homography),
        "with_metres": sum(1 for row in (doc.get("physical") or []) if (row.get("visible_m") or 0) > 0),
        "bytes": size,
        "detector": (doc.get("preview") or {}).get("detector") or "blobs",
        "metrics": doc.get("metrics") or quality_metrics(doc),
    }


def pitch_check(doc: dict, stored: Path | None = None) -> dict:
    """Copia pequeña para el césped. El JSON del disco conserva todos los fotogramas."""
    summary = file_summary(doc, stored)
    preview = dict(doc.get("preview") or {})
    preview.update({
        "bytes": summary["bytes"],
        "players": summary["players"],
        "samples": summary["samples"],
        "ball_samples": summary["ball"],
        "homography_accepted": summary["homography_accepted"],
        "with_metres": summary["with_metres"],
        "metrics": summary.get("metrics"),
    })
    note = (
        f"Guardado en este Mac: {summary['kept_frames']} fotogramas, {summary['players']} jugadores, "
        f"{summary['ball']} posiciones de balón, {summary['homography_accepted']} homografías válidas."
    )
    metrics = summary.get("metrics") or {}
    if summary["detector"] == "field":
        note += (
            f" Con el color de camiseta: {metrics.get('teams_assigned', 0)} de {summary['players']}."
            f" Dorsales del acta leídos: {metrics.get('dorsals_in_acta', 0)}."
            " Un partido de noche sigue necesitando el detector de producto para que cada punto sea un jugador de verdad."
        )
    elif summary["detector"] == "blobs":
        note += " El detector sigue siendo el de colores: un partido real todavía no coloca a los jugadores de verdad."
    preview["note"] = note
    return {
        "schema": doc.get("schema"),
        "source": doc.get("source"),
        "job": doc.get("job"),
        "our_team": doc.get("our_team"),
        "our_kit": doc.get("our_kit"),
        "whistles": doc.get("whistles"),
        "spans": doc.get("spans"),
        "events": doc.get("events") or [],
        "phases": doc.get("phases") or [],
        "physical": doc.get("physical") or [],
        "tracks": [_thin_track(track) for track in doc.get("tracks") or []],
        "ball": _thin_rows(doc.get("ball") or []),
        "homography": _thin_rows(doc.get("homography") or []),
        "preview": preview,
    }


def _size_label(size: int) -> str:
    if size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    return f"{max(1, size // 1024)} KB"


def _thin_rows(rows: list) -> list:
    if len(rows) <= PITCH_POINTS:
        return rows
    step = (len(rows) + PITCH_POINTS - 1) // PITCH_POINTS
    return rows[::step]


def _thin_track(track: dict) -> dict:
    return {
        "id": track.get("id"),
        "team": track.get("team"),
        "role": track.get("role"),
        "dorsal": track.get("dorsal"),
        "samples": _thin_rows(track.get("samples") or []),
    }


def analyze_match(
    path: str,
    whistles: dict,
    *,
    sample_fps: float = SAMPLE_FPS,
    detector: Detector,
    our_kit: str = "white",
    kits: dict | None = None,
    roster: dict | None = None,
    detector_name: str = "blobs",
    on_progress: Callable[[str, int], None] | None = None,
) -> dict:
    import cv2

    marks = ordered_whistles(whistles)
    rate = float(sample_fps or SAMPLE_FPS)
    if rate < 1 or rate > 15:
        raise PreviewError("la muestra tiene que estar entre 1 y 15 fotogramas por segundo")
    video = Path(path)
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise PreviewError("no se pudo abrir el partido")
    spans = play_spans(marks)
    pieces: list[dict] = []
    kept = 0
    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 25.0
        width = float(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = float(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        stride = sample_stride(fps, rate)
        for name, start_s, end_s in spans:
            boxes, span_kept, last_t = _read_span(
                cap,
                fps=fps,
                start_s=start_s,
                end_s=end_s,
                stride=stride,
                detector=detector,
                on_frame=lambda total, phase=name: on_progress(phase, total) if on_progress else None,
                already=kept,
            )
            kept += span_kept
            if span_kept == 0:
                raise PreviewError("una de las partes no tiene fotogramas")
            pieces.append(run_span(
                boxes,
                start_s=start_s,
                end_s=max(start_s, last_t),
                width=width,
                height=height,
                fps=fps / stride,
                our_kit=our_kit,
                kits=kits,
            ))
    finally:
        cap.release()

    doc = _merge(pieces, marks, spans)
    stored = sidecar_for(video)
    program = program_copy_for(video)
    doc["reader"] = READER
    doc["source"]["sample_fps"] = rate
    doc["source"]["path"] = "local"
    doc["kits"] = _canon_kits(kits)
    doc["roster"] = _canon_roster(roster)
    doc["our_kit"] = (doc["kits"] or {}).get("ours") or our_kit
    doc["metrics"] = quality_metrics(doc)
    doc["preview"] = {
        "kept_frames": kept,
        "sample_fps": rate,
        "detector": detector_name,
        "stored_path": str(stored),
        "program_path": str(program),
        "note": "Tracking a 10 fotogramas por segundo entre los pitidos. Una copia queda al lado del vídeo y otra dentro del programa, en este PC.",
    }
    try:
        _write(program, doc)
        remember(video, stored_path=str(stored), program_path=str(program))
    except OSError as exc:
        doc["preview"]["program_path"] = None
        doc["preview"]["program_error"] = "la copia dentro del programa no se pudo escribir"
        print(f"[visión] la copia interna no se escribió: {exc}", flush=True)
    _write(stored, doc)
    summary = file_summary(doc, stored)
    print(
        f"Visión guardada en {stored} ({_size_label(summary['bytes'] or 0)}, "
        f"{summary['kept_frames']} fotogramas, {summary['players']} jugadores, "
        f"{summary['homography_accepted']} homografías).",
        flush=True,
    )
    return doc


def _read_span(
    cap,
    *,
    fps: float,
    start_s: float,
    end_s: float,
    stride: int,
    detector: Detector,
    on_frame: Callable[[int], None] | None,
    already: int,
) -> tuple[list[Box], int, float]:
    target = int(round(start_s * fps))
    end_index = int(round(end_s * fps))
    cap.set(cap_prop_pos_frames(), target)
    index = target
    boxes: list[Box] = []
    kept = 0
    last_t = start_s
    while index <= end_index:
        take = (index - target) % stride == 0
        if take:
            ok, frame = cap.read()
        else:
            ok = bool(cap.grab())
            frame = None
        if not ok:
            break
        if take and frame is not None:
            t = round(index / fps, 3)
            boxes.extend(detector(frame, t))
            kept += 1
            last_t = t
            if on_frame and kept % 10 == 0:
                on_frame(already + kept)
        index += 1
    return boxes, kept, last_t


def cap_prop_pos_frames() -> int:
    import cv2

    return cv2.CAP_PROP_POS_FRAMES


def _merge(pieces: list[dict], whistles: dict[str, float], spans: list[tuple[str, float, float]]) -> dict:
    merged = pieces[0]
    offset = max((int(track["id"]) for track in merged["tracks"]), default=0)
    for piece in pieces[1:]:
        for track in piece["tracks"]:
            track["id"] = int(track["id"]) + offset
        for row in piece["physical"]:
            row["track_id"] = int(row["track_id"]) + offset
        offset = max((int(track["id"]) for track in piece["tracks"]), default=offset)
        merged["tracks"].extend(piece["tracks"])
        merged["ball"].extend(piece["ball"])
        merged["homography"].extend(piece["homography"])
        merged["physical"].extend(piece["physical"])
    merged["source"]["duration_s"] = round(sum(end_s - start_s for _, start_s, end_s in spans), 3)
    merged["whistles"] = whistles
    merged["spans"] = [
        {"name": name, "start_s": start_s, "end_s": end_s}
        for name, start_s, end_s in spans
    ]
    merged["events"] = []
    merged["phases"] = []
    merged["job"] = {
        "status": "done",
        "start_s": spans[0][1],
        "end_s": spans[-1][2],
        "error": None,
        "sample_fps": SAMPLE_FPS,
    }
    return merged


def _write(path: Path, doc: dict) -> None:
    from .compact import atomic_write_document

    atomic_write_document(path, doc)


def quality_metrics(doc: dict) -> dict:
    tracks = doc.get("tracks") or []
    players = [track for track in tracks if track.get("role") == "player"]
    samples = [sample for track in players for sample in (track.get("samples") or [])]
    on_pitch = sum(1 for sample in samples if sample.get("x") is not None and sample.get("y") is not None and not sample.get("rejected_speed"))
    teams = sum(1 for track in players if track.get("team") is not None)
    roster = _canon_roster(doc.get("roster"))
    legal = set(roster["ours"]) | set(roster["rival"])
    dorsals = [track.get("dorsal") for track in players if track.get("dorsal") is not None]
    in_acta = sum(1 for number in dorsals if not legal or int(number) in legal)
    homography = doc.get("homography") or []
    spans = doc.get("spans") or []

    def accepted_between(start_s: float, end_s: float) -> int:
        total = 0
        for row in homography:
            if not row.get("accepted") or row.get("t") is None:
                continue
            stamp = float(row["t"])
            if start_s - 0.05 <= stamp <= end_s + 0.05:
                total += 1
        return total

    by_half = {}
    for span in spans:
        by_half[str(span.get("name") or "")] = accepted_between(float(span.get("start_s") or 0), float(span.get("end_s") or 0))
    counts: dict[float, int] = {}
    for sample in samples:
        stamp = round(float(sample.get("t") or 0), 3)
        counts[stamp] = counts.get(stamp, 0) + 1
    return {
        "players": len(players),
        "teams_assigned": teams,
        "team_coverage": round(teams / len(players), 3) if players else 0,
        "dorsals_read": len(dorsals),
        "dorsals_in_acta": in_acta,
        "ball_samples": len(doc.get("ball") or []),
        "homography_accepted": sum(1 for row in homography if row.get("accepted")),
        "homography_primera": by_half.get("primera", 0),
        "homography_segunda": by_half.get("segunda", 0),
        "samples": len(samples),
        "samples_on_pitch": on_pitch,
        "pitch_coverage": round(on_pitch / len(samples), 3) if samples else 0,
        "max_players_in_frame": max(counts.values()) if counts else 0,
        "with_metres": sum(1 for row in (doc.get("physical") or []) if (row.get("visible_m") or 0) > 0),
    }


def _canon_kits(kits: dict | None) -> dict | None:
    from .tracking import hex_to_rgb

    if not isinstance(kits, dict):
        return None
    canon = {}
    for key in ("ours", "rival"):
        rgb = hex_to_rgb(kits.get(key))
        if rgb is None:
            return None
        canon[key] = "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))
    if canon["ours"] == canon["rival"]:
        return None
    return canon


def _canon_roster(roster: dict | None) -> dict[str, list[int]]:
    found = {"ours": [], "rival": []}
    if not isinstance(roster, dict):
        return found
    for key in ("ours", "rival"):
        numbers: list[int] = []
        for item in roster.get(key) or []:
            try:
                number = int(item)
            except (TypeError, ValueError):
                continue
            if 0 <= number <= 99 and number not in numbers:
                numbers.append(number)
        found[key] = numbers[:30]
    return found


def load_sidecar(path: Path) -> dict | None:
    from .compact import read_document

    return read_document(path, repack=True, metrics_fn=quality_metrics)
