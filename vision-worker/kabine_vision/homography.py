"""Homografía imagen → césped, con descarte y suavizado."""

from __future__ import annotations

import numpy as np

PITCH_LENGTH_M = 105.0
PITCH_WIDTH_M = 68.0
# Por encima de esto el paso es un error de tracking, no un sprint.
MAX_SPEED_M_S = 12.0
# Un disparo cabe aquí. El salto de una mancha blanca a otra, no.
BALL_MAX_SPEED_M_S = 40.0
# Sin líneas nuevas, el césped anterior aguanta un corte breve de la cámara.
H_HOLD_S = 3.0
# Un paneo o un temblor de las líneas cabe aquí. Medio campo de golpe, no.
H_MAX_STEP_M = 28.0


def dlt_homography(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
    """Homografía que lleva puntos `src` a `dst`. Hace falta al menos 4 pares."""
    src = np.asarray(src, dtype=float)
    dst = np.asarray(dst, dtype=float)
    if src.shape != dst.shape or src.shape[0] < 4 or src.shape[1] != 2:
        raise ValueError("hacen falta al menos 4 pares de puntos")
    src_n, t_src = _normalize(src)
    dst_n, t_dst = _normalize(dst)
    rows: list[list[float]] = []
    for (x, y), (xp, yp) in zip(src_n, dst_n):
        rows.append([x, y, 1, 0, 0, 0, -xp * x, -xp * y, -xp])
        rows.append([0, 0, 0, x, y, 1, -yp * x, -yp * y, -yp])
    _, _, vt = np.linalg.svd(np.asarray(rows, dtype=float))
    h = vt[-1].reshape(3, 3)
    full = np.linalg.inv(t_dst) @ h @ t_src
    return full / full[2, 2]


def apply_h(h: np.ndarray, pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, dtype=float)
    hom = np.c_[pts, np.ones(len(pts))]
    out = (h @ hom.T).T
    scale = out[:, 2:3]
    bad = np.abs(scale) < 1e-8
    safe = np.where(bad, 1.0, scale)
    result = out[:, :2] / safe
    result[bad[:, 0]] = np.nan
    return result


def homography_keeps_center_on_pitch(
    h: np.ndarray,
    width: float,
    height: float,
    margin_m: float = 8.0,
) -> bool:
    """La calibración vale si el centro del fotograma cae en el césped, con margen."""
    center = apply_h(h, np.array([[width / 2.0, height / 2.0]]))[0]
    return _inside(center[0], center[1], margin_m)


def length_is_pitch(
    h: np.ndarray,
    img_a: np.ndarray,
    img_b: np.ndarray,
    expected_m: float,
    tol: float = 0.2,
) -> bool:
    """Dos puntos del fotograma tienen que medir lo que miden en el campo."""
    if expected_m <= 0:
        return False
    a, b = apply_h(h, np.vstack([img_a, img_b]))
    dist = float(np.hypot(*(a - b)))
    return abs(dist - expected_m) / expected_m <= tol


def blend_homography(previous: np.ndarray, current: np.ndarray, alpha: float = 0.35) -> np.ndarray:
    mixed = (1.0 - alpha) * previous + alpha * current
    return mixed / mixed[2, 2]


def homography_step_is_calm(
    previous: np.ndarray,
    current: np.ndarray,
    width: float,
    height: float,
    max_step_m: float = H_MAX_STEP_M,
) -> bool:
    """La misma zona de la imagen no puede saltar de medio campo en un fotograma."""
    cols = (0.3, 0.5, 0.7)
    pts = np.array([[width * x, height * y] for y in cols for x in cols], dtype=float)
    before = apply_h(previous, pts)
    after = apply_h(current, pts)
    steps = np.hypot(after[:, 0] - before[:, 0], after[:, 1] - before[:, 1])
    if not np.isfinite(steps).all():
        return False
    return float(np.median(steps)) <= max_step_m


def on_pitch(x: float, y: float, margin_m: float = 12.0) -> bool:
    return _inside(x, y, margin_m)


def _normalize(pts: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    center = pts.mean(axis=0)
    dist = np.sqrt(((pts - center) ** 2).sum(axis=1)).mean()
    scale = np.sqrt(2.0) / dist if dist > 1e-9 else 1.0
    transform = np.array(
        [[scale, 0, -scale * center[0]], [0, scale, -scale * center[1]], [0, 0, 1]],
        dtype=float,
    )
    hom = np.c_[pts, np.ones(len(pts))]
    normed = (transform @ hom.T).T
    return normed[:, :2], transform


def _inside(x: float, y: float, margin: float) -> bool:
    return -margin <= x <= PITCH_LENGTH_M + margin and -margin <= y <= PITCH_WIDTH_M + margin
