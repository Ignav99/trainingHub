"""Detector de fichas de color. Sirve para el vídeo de ejemplo, no para un partido."""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from .tracking import Box

# BGR exactos del vídeo de ejemplo.
_GRASS = (40, 110, 45)
_ORANGE = (0, 140, 255)
_WHITE = (245, 245, 245)
_BLUE = (180, 40, 30)
_YELLOW = (40, 220, 240)
_BALL = (255, 0, 255)

_PITCH = (48, 36, 592, 324)  # x0, y0, x1, y1 en un fotograma 640×360


def detect_blobs(frame_bgr: np.ndarray, t: float) -> list[Box]:
    boxes: list[Box] = []
    marks = _centers(frame_bgr, _ORANGE, min_area=40, max_area=800)
    if len(marks) >= 4:
        boxes.extend(_corner_keypoints(t, marks[:4] if len(marks) == 4 else _four_extreme(marks)))
    boxes.extend(_people(frame_bgr, t, _WHITE, "player", (245, 245, 245)))
    boxes.extend(_people(frame_bgr, t, _BLUE, "player", (30, 40, 180)))
    boxes.extend(_people(frame_bgr, t, _YELLOW, "referee", (240, 220, 40)))
    for x, y, w, h in _bounds(frame_bgr, _BALL, min_area=8, max_area=500):
        boxes.append(Box(t, "ball", x + w / 2.0, y + h / 2.0, 1, 1))
    return boxes


def write_fixture(path: str | Path, frames: int = 20, fps: float = 10.0) -> Path:
    """Dos segundos de fichas sobre un césped dibujado. No es un partido."""
    path = Path(path)
    if path.suffix.lower() != ".avi":
        path = path.with_suffix(".avi")
    path.parent.mkdir(parents=True, exist_ok=True)
    # png dentro del avi conserva los colores planos. mp4v los lava y las fichas desaparecen.
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"png "), fps, (640, 360))
    if not writer.isOpened():
        raise RuntimeError("no se pudo escribir el vídeo de ejemplo")
    try:
        for i in range(frames):
            writer.write(_fixture_frame(i))
    finally:
        writer.release()
    return path


def _fixture_frame(i: int) -> np.ndarray:
    frame = np.zeros((360, 640, 3), dtype=np.uint8)
    frame[:] = _GRASS
    x0, y0, x1, y1 = _PITCH
    for cx, cy in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
        cv2.rectangle(frame, (cx - 8, cy - 8), (cx + 8, cy + 8), _ORANGE, -1)
    _person(frame, 140 + i * 4, 110, _WHITE)
    _person(frame, 140 + i * 4, 250, _WHITE)
    _person(frame, 500 - i * 4, 110, _BLUE)
    _person(frame, 500 - i * 4, 250, _BLUE)
    _person(frame, 320, 180, _YELLOW, w=28, h=48)
    cx, cy = 210 + i * 5, 168
    cv2.circle(frame, (cx, cy), 6, _BALL, -1)
    return frame


def _person(frame: np.ndarray, foot_x: int, foot_y: int, color: tuple[int, int, int], w: int = 36, h: int = 72) -> None:
    x1 = int(foot_x - w / 2)
    y1 = int(foot_y - h)
    cv2.rectangle(frame, (x1, y1), (x1 + w, y1 + h), color, -1)


def _people(frame: np.ndarray, t: float, bgr: tuple[int, int, int], kind: str, rgb: tuple[float, float, float]) -> list[Box]:
    found: list[Box] = []
    for x, y, w, h in _bounds(frame, bgr, min_area=400, max_area=8000):
        found.append(Box(t, kind, float(x), float(y), float(w), float(h), rgb=rgb))
    return found


def _corner_keypoints(t: float, marks: list[tuple[float, float]]) -> list[Box]:
    top = sorted(marks, key=lambda p: p[1])[:2]
    bottom = sorted(marks, key=lambda p: p[1])[-2:]
    ordered = sorted(top, key=lambda p: p[0]) + sorted(bottom, key=lambda p: p[0])
    pitch = ((0.0, 0.0), (105.0, 0.0), (0.0, 68.0), (105.0, 68.0))
    return [
        Box(t, "keypoint", x, y, 1, 1, pitch_xy=xy)
        for (x, y), xy in zip(ordered, pitch)
    ]


def _four_extreme(marks: list[tuple[float, float]]) -> list[tuple[float, float]]:
    ranked = sorted(marks, key=lambda p: p[0] + p[1])
    return [ranked[0], ranked[-1], min(marks, key=lambda p: p[0] - p[1]), max(marks, key=lambda p: p[0] - p[1])]


def _centers(frame: np.ndarray, bgr: tuple[int, int, int], min_area: float, max_area: float) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for x, y, w, h in _bounds(frame, bgr, min_area, max_area):
        points.append((x + w / 2.0, y + h / 2.0))
    return points


def _bounds(frame: np.ndarray, bgr: tuple[int, int, int], min_area: float, max_area: float) -> list[tuple[int, int, int, int]]:
    color = np.array(bgr, dtype=np.int16)
    lower = np.clip(color - 24, 0, 255).astype(np.uint8)
    upper = np.clip(color + 24, 0, 255).astype(np.uint8)
    mask = cv2.inRange(frame, lower, upper)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    found: list[tuple[int, int, int, int]] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area or area > max_area:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        found.append((x, y, w, h))
    return found
