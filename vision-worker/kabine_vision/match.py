"""Tracking de un partido entero, solo con el balón en juego.

Los cuatro pitidos recortan el ruido: antes del inicio, el descanso y lo de
después del final no se leen. El JSON se queda al lado del vídeo y hay otra copia dentro del programa.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path

from .library import program_copy_for, remember
from .pipeline import run_span
from .preview import Detector, PreviewError
from .tracking import Box

SAMPLE_FPS = 10.0
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
    })
    note = (
        f"Guardado en este Mac: {summary['kept_frames']} fotogramas, {summary['players']} jugadores, "
        f"{summary['ball']} posiciones de balón, {summary['homography_accepted']} homografías válidas."
    )
    if summary["detector"] == "blobs":
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
        "samples": _thin_rows(track.get("samples") or []),
    }


def analyze_match(
    path: str,
    whistles: dict,
    *,
    sample_fps: float = SAMPLE_FPS,
    detector: Detector,
    our_kit: str = "white",
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
            ))
    finally:
        cap.release()

    doc = _merge(pieces, marks, spans)
    stored = sidecar_for(video)
    program = program_copy_for(video)
    doc["source"]["sample_fps"] = rate
    doc["source"]["path"] = "local"
    doc["preview"] = {
        "kept_frames": kept,
        "sample_fps": rate,
        "detector": "blobs",
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
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def load_sidecar(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
