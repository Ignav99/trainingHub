"""Lee un tramo corto de un vídeo local y lo pasa por el módulo 1."""

from __future__ import annotations

from collections.abc import Callable

import numpy as np

from .pipeline import run_span
from .tracking import Box

MAX_KEPT = 400
Detector = Callable[[np.ndarray, float], list[Box]]


class PreviewError(ValueError):
    pass


def analyze_video(
    path: str,
    *,
    start_s: float = 0.0,
    seconds: float | None = 5.0,
    frames: int | None = None,
    stride: int = 6,
    detector: Detector,
    our_kit: str = "white",
) -> dict:
    import cv2

    if start_s < 0:
        raise PreviewError("el inicio es negativo")
    stride = max(1, int(stride))
    if frames is not None and frames <= 0:
        frames = None
    if seconds is not None and seconds <= 0:
        seconds = None
    if seconds is None and frames is None:
        raise PreviewError("indica segundos o fotogramas")

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise PreviewError("no se pudo abrir el vídeo")
    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 25.0
        width = float(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = float(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        end_s = start_s + seconds if seconds is not None else 1e9
        boxes: list[Box] = []
        kept = 0
        last_t = start_s
        index = 0
        start_index = int(round(start_s * fps))
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            t = index / fps
            index += 1
            if t + 1e-6 < start_s:
                continue
            if t > end_s + 1e-6:
                break
            if (index - 1 - start_index) % stride != 0:
                continue
            boxes.extend(detector(frame, round(t, 3)))
            kept += 1
            last_t = t
            if frames is not None and kept >= frames:
                break
            if kept >= MAX_KEPT:
                break
    finally:
        cap.release()

    if kept == 0:
        raise PreviewError("ese tramo no tiene fotogramas")
    result = run_span(
        boxes,
        start_s=start_s,
        end_s=max(start_s, last_t),
        width=width,
        height=height,
        fps=fps / stride,
        our_kit=our_kit,
    )
    result["preview"] = {
        "kept_frames": kept,
        "stride": stride,
        "start_s": start_s,
        "end_s": round(max(start_s, last_t), 3),
        "max_mb": 40,
    }
    return result
