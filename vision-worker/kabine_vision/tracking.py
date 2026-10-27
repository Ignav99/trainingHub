"""Identidad de cada cuerpo, equipos por color y metros solo de los pasos creíbles."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .homography import MAX_SPEED_M_S


@dataclass
class Box:
    t: float
    kind: str
    px: float
    py: float
    w: float
    h: float
    rgb: tuple[float, float, float] | None = None
    pitch_xy: tuple[float, float] | None = None


@dataclass
class Track:
    id: int
    kind: str
    team: int | None = None
    role: str = "player"
    rgb: tuple[float, float, float] | None = None
    samples: list[dict] = field(default_factory=list)
    visible_m: float = 0.0
    _last_box: tuple[float, float, float, float] | None = None
    _smooth_xy: tuple[float, float] | None = None
    _raw_xy: tuple[float, float] | None = None

    def foot(self) -> tuple[float, float] | None:
        if self._last_box is None:
            return None
        x, y, w, h = self._last_box
        return x + w / 2.0, y + h


def iou(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x1, y1 = max(ax, bx), max(ay, by)
    x2, y2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if inter <= 0:
        return 0.0
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0.0


def assign_teams(tracks: list[Track], our_kit: str = "white") -> None:
    """Dos grupos de color. El nuestro es el que se parece al kit indicado."""
    players = [track for track in tracks if track.role == "player" and track.rgb is not None]
    if len(players) < 2:
        return
    colors = np.array([track.rgb for track in players], dtype=float)
    labels = _two_means(colors)
    if not (labels == 0).any() or not (labels == 1).any():
        return
    luminance = colors.mean(axis=1)
    group_luma = [float(luminance[labels == 0].mean()), float(luminance[labels == 1].mean())]
    if our_kit == "white":
        ours = 0 if group_luma[0] >= group_luma[1] else 1
    else:
        ours = 0 if group_luma[0] < group_luma[1] else 1
    for track, label in zip(players, labels):
        track.team = 0 if int(label) == ours else 1


def step_metres(prev_xy: tuple[float, float], xy: tuple[float, float], dt: float) -> float | None:
    """Metros del paso, o None si la velocidad no puede ser de un futbolista."""
    if dt <= 1e-6:
        return None
    dist = float(np.hypot(xy[0] - prev_xy[0], xy[1] - prev_xy[1]))
    if dist / dt > MAX_SPEED_M_S:
        return None
    return dist


def smooth_xy(previous: tuple[float, float] | None, xy: tuple[float, float], alpha: float = 0.45) -> tuple[float, float]:
    if previous is None:
        return xy
    return (
        (1.0 - alpha) * previous[0] + alpha * xy[0],
        (1.0 - alpha) * previous[1] + alpha * xy[1],
    )


def _two_means(colors: np.ndarray, rounds: int = 12) -> np.ndarray:
    c0 = colors[int(np.argmax(colors.mean(axis=1)))]
    c1 = colors[int(np.argmin(colors.mean(axis=1)))]
    labels = np.zeros(len(colors), dtype=int)
    for _ in range(rounds):
        d0 = ((colors - c0) ** 2).sum(axis=1)
        d1 = ((colors - c1) ** 2).sum(axis=1)
        labels = (d1 < d0).astype(int)
        if (labels == 0).any():
            c0 = colors[labels == 0].mean(axis=0)
        if (labels == 1).any():
            c1 = colors[labels == 1].mean(axis=0)
    return labels
