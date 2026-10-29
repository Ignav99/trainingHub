"""Calibración del césped con todas las líneas que se ven, aunque sea un trozo.

Veo y la tele graban desde un punto fijo que gira y hace zoom. La primera vez se
busca una cámara aproximada (sitio, giro, inclinación, zoom, ladeo) y las
medidas del campo, que en los campos municipales no suelen ser 105×68. Desde
ahí, y en cada fotograma siguiente, se afina una homografía libre emparejando
cada punto del dibujo con la línea vista más cercana (ICP). Las líneas
amarillas o naranjas de fútbol 7 no cuentan.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import cv2
import numpy as np
from scipy.optimize import least_squares, minimize
from scipy.spatial import cKDTree

from .homography import PITCH_LENGTH_M, PITCH_WIDTH_M, apply_h

WORK_WIDTH = 640
DIST_CAP_PX = 12.0
INLIER_PX = 2.5
MIN_VISIBLE_POINTS = 150
ACCEPT_FORWARD_PX = 3.0
ACCEPT_INLIERS = 0.6
MIN_SPREAD_M = 3.0
ACCEPT_EXPLAINED = 0.5
ACCEPT_COVERED = 0.8
GRASS_MARGIN_M = 8.0
GRASS_SAMPLE = 500
MIN_CAMERA_HEIGHT_M = 3.5
REACQUIRE_AFTER = 10
ACQUIRE_BACKOFF = 5
ICP_STEPS = (12.0, 8.0, 5.0, 3.5, 2.5, 2.5)
LENGTH_RANGE_M = (88.0, 110.0)
WIDTH_RANGE_M = (54.0, 75.0)
TEMPLATE_STEP_M = 0.5


@lru_cache(maxsize=4)
def affine_template(step_m: float = TEMPLATE_STEP_M) -> np.ndarray:
    """Puntos de las líneas como (2, 3) cada uno: punto = A · (largo, ancho, 1).

    Así el mismo punto sigue siendo el mismo al cambiar las medidas del campo;
    las áreas y el círculo miden siempre lo reglamentario.
    """

    def at(x_of_length: float, x_m: float, y_of_width: float, y_m: float) -> np.ndarray:
        return np.array([[x_of_length, 0.0, x_m], [0.0, y_of_width, y_m]])

    points: list[np.ndarray] = []

    def segment(a: np.ndarray, b: np.ndarray, nominal_m: float) -> None:
        count = max(2, int(nominal_m / step_m))
        for u in np.linspace(0.0, 1.0, count + 1):
            points.append((1.0 - u) * a + u * b)

    L, W = PITCH_LENGTH_M, PITCH_WIDTH_M
    segment(at(0, 0, 0, 0), at(1, 0, 0, 0), L)
    segment(at(0, 0, 1, 0), at(1, 0, 1, 0), L)
    segment(at(0, 0, 0, 0), at(0, 0, 1, 0), W)
    segment(at(1, 0, 0, 0), at(1, 0, 1, 0), W)
    segment(at(0.5, 0, 0, 0), at(0.5, 0, 1, 0), W)
    for end, sign in ((0.0, 1.0), (1.0, -1.0)):
        for depth, half in ((16.5, 20.16), (5.5, 9.16)):
            segment(at(end, 0, 0.5, -half), at(end, sign * depth, 0.5, -half), depth)
            segment(at(end, 0, 0.5, half), at(end, sign * depth, 0.5, half), depth)
            segment(at(end, sign * depth, 0.5, -half), at(end, sign * depth, 0.5, half), 2 * half)
        for angle in np.arange(-0.93, 0.93, step_m / 9.15):
            dx = 11.0 + 9.15 * np.cos(angle)
            if dx >= 16.5:
                points.append(at(end, sign * dx, 0.5, 9.15 * np.sin(angle)))
    for angle in np.arange(0, 2 * np.pi, step_m / 9.15):
        points.append(at(0.5, 9.15 * np.cos(angle), 0.5, 9.15 * np.sin(angle)))
    return np.asarray(points)


def pitch_template(step_m: float = TEMPLATE_STEP_M, length: float = PITCH_LENGTH_M, width: float = PITCH_WIDTH_M) -> np.ndarray:
    """Puntos sobre todas las líneas, en metros."""
    return affine_template(step_m) @ np.array([length, width, 1.0])


@dataclass(frozen=True)
class Pitch:
    length: float = PITCH_LENGTH_M
    width: float = PITCH_WIDTH_M

    @property
    def template(self) -> np.ndarray:
        return _template(round(self.length, 2), round(self.width, 2))

    @property
    def symmetries(self) -> tuple[np.ndarray, ...]:
        L, W = self.length, self.width
        return (
            np.array([[-1.0, 0.0, L], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]),
            np.array([[1.0, 0.0, 0.0], [0.0, -1.0, W], [0.0, 0.0, 1.0]]),
            np.array([[-1.0, 0.0, L], [0.0, -1.0, W], [0.0, 0.0, 1.0]]),
        )

    def to_standard(self) -> np.ndarray:
        """De metros de este campo a las coordenadas de 105×68 que usa el resto del programa."""
        return np.diag([PITCH_LENGTH_M / self.length, PITCH_WIDTH_M / self.width, 1.0])


@lru_cache(maxsize=16)
def _template(length: float, width: float) -> np.ndarray:
    return pitch_template(TEMPLATE_STEP_M, length, width)


STANDARD = Pitch()
TEMPLATE = STANDARD.template


@dataclass
class View:
    pan: float
    tilt: float
    focal: float


def rotation(pan: float, tilt: float) -> np.ndarray:
    """Mundo (x a lo largo, y a lo ancho, z arriba) a cámara (x derecha, y abajo, z delante).

    La cámara está en el lado y > ancho y mira hacia y = 0.
    """
    base = np.array([[-1.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, -1.0, 0.0]])
    cp, sp = np.cos(pan), np.sin(pan)
    ct, st = np.cos(tilt), np.sin(tilt)
    r_pan = np.array([[cp, 0.0, -sp], [0.0, 1.0, 0.0], [sp, 0.0, cp]])
    r_tilt = np.array([[1.0, 0.0, 0.0], [0.0, ct, -st], [0.0, st, ct]])
    return r_tilt @ r_pan @ base


def pitch_to_image(position: np.ndarray, view: View, size: tuple[int, int]) -> np.ndarray:
    width, height = size
    k = np.array([[view.focal, 0, width / 2.0], [0, view.focal, height / 2.0], [0, 0, 1.0]])
    r = rotation(view.pan, view.tilt)
    t = -r @ position
    h = k @ np.c_[r[:, 0], r[:, 1], t]
    return h / h[2, 2]


def grass_region(frame: np.ndarray) -> np.ndarray:
    """El césped como una sola mancha, con las líneas y la gente dentro."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    grass = cv2.inRange(hsv, (30, 50, 40), (90, 255, 255))
    grass = cv2.morphologyEx(grass, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(grass, 8)
    if count <= 1:
        return grass
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    region = np.where(labels == biggest, 255, 0).astype(np.uint8)
    region = cv2.morphologyEx(region, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    filled = region.copy()
    contours, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(filled, contours, -1, 255, -1)
    return cv2.erode(filled, np.ones((3, 3), np.uint8))


def _bright_thin(frame: np.ndarray) -> np.ndarray:
    """Más claro que lo que lo rodea y no amarillo: las líneas de fútbol 7 son amarillas o naranjas."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    side = 2 * int(round(4.5 * frame.shape[1] / 1280.0)) + 1
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_RECT, (side, side)))
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    pale = cv2.inRange(hsv, (0, 0, 0), (180, 150, 255))
    yellow = cv2.inRange(hsv, (5, 70, 0), (33, 255, 255))
    return cv2.bitwise_and(cv2.bitwise_and(cv2.inRange(tophat, 22, 255), pale), cv2.bitwise_not(yellow))


def line_mask(
    frame: np.ndarray,
    boxes: list[tuple[float, float, float, float]] | None = None,
    min_len: int = 14,
) -> np.ndarray:
    """Líneas blancas finas sobre césped, sin personas encima."""
    return _lines_and_grass(frame, boxes, min_len)[0]


def _lines_and_grass(
    frame: np.ndarray,
    boxes: list[tuple[float, float, float, float]] | None,
    min_len: int,
) -> tuple[np.ndarray, np.ndarray]:
    grass = grass_region(frame)
    lines = cv2.bitwise_and(_bright_thin(frame), grass)
    for x, y, w, h in boxes or []:
        cv2.rectangle(lines, (int(x) - 2, int(y) - 2), (int(x + w) + 2, int(y + h) + 2), 0, -1)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(lines, 8)
    keep = np.zeros_like(lines)
    for index in range(1, count):
        w, h, area = stats[index, 2], stats[index, 3], stats[index, 4]
        if max(w, h) >= min_len and area >= min_len:
            keep[labels == index] = 255
    return keep, grass


def work_mask(frame: np.ndarray, size: tuple[int, int], boxes: list[tuple[float, float, float, float]] | None = None) -> np.ndarray:
    return work_masks(frame, size, boxes)[0]


def work_masks(
    frame: np.ndarray, size: tuple[int, int], boxes: list[tuple[float, float, float, float]] | None = None
) -> tuple[np.ndarray, np.ndarray]:
    """Líneas y césped al tamaño de trabajo; las líneas se sacan a tamaño real porque las del fondo miden 1 o 2 píxeles."""
    height, width = frame.shape[:2]
    big = (min(width, size[0] * 3), min(height, size[1] * 3))
    scale = big[0] / float(width)
    sharp = cv2.resize(frame, big, interpolation=cv2.INTER_AREA) if big != (width, height) else frame
    big_boxes = [(x * scale, y * scale, w * scale, h * scale) for x, y, w, h in (boxes or [])]
    lines, grass = _lines_and_grass(sharp, big_boxes, int(14 * big[0] / size[0]))
    small = cv2.resize(lines, size, interpolation=cv2.INTER_AREA)
    grass_small = cv2.resize(grass, size, interpolation=cv2.INTER_NEAREST)
    return np.where(small >= 50, 255, 0).astype(np.uint8), grass_small


@dataclass
class Observed:
    size: tuple[int, int]
    dist: np.ndarray
    nearest: np.ndarray
    points: np.ndarray
    raw_dist: np.ndarray
    grass: np.ndarray


def observe(mask: np.ndarray, sample: int = 700, grass: np.ndarray | None = None) -> Observed:
    height, width = mask.shape[:2]
    dist, labels = cv2.distanceTransformWithLabels(255 - mask, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    raw_dist = cv2.distanceTransform(255 - mask, cv2.DIST_L2, 5)
    ys, xs = np.nonzero(mask)
    points = np.stack([xs, ys], axis=1).astype(float)
    by_label = np.zeros((int(labels.max()) + 1, 2), dtype=float)
    by_label[labels[ys, xs]] = points
    nearest = by_label[labels]
    if len(points) > sample:
        pick = np.random.default_rng(7).choice(len(points), sample, replace=False)
        points = points[pick]
    turf = np.zeros((0, 2))
    if grass is not None:
        gy, gx = np.nonzero(grass)
        turf = np.stack([gx, gy], axis=1).astype(float)
        if len(turf) > GRASS_SAMPLE:
            turf = turf[np.random.default_rng(11).choice(len(turf), GRASS_SAMPLE, replace=False)]
    return Observed((width, height), dist, nearest, points, raw_dist, turf)


@dataclass
class Fit:
    h: np.ndarray
    forward: float
    inliers: float
    visible: int
    spread: float
    explained: float = 0.0
    covered: float = 1.0

    @property
    def good(self) -> bool:
        return (
            self.visible >= MIN_VISIBLE_POINTS
            and self.forward <= ACCEPT_FORWARD_PX
            and self.inliers >= ACCEPT_INLIERS
            and self.spread >= MIN_SPREAD_M
            and self.explained >= ACCEPT_EXPLAINED
            and self.covered >= ACCEPT_COVERED
        )


def _inside(uv: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    width, height = size
    return np.isfinite(uv).all(axis=1) & (uv[:, 0] >= 0) & (uv[:, 0] < width - 1) & (uv[:, 1] >= 0) & (uv[:, 1] < height - 1)


def _visible(obs: Observed, h: np.ndarray, template: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    uv = apply_h(h, template)
    inside = _inside(uv, obs.size)
    return np.where(np.isfinite(uv), uv, -1.0), inside


def measure(obs: Observed, h: np.ndarray, pitch: Pitch = STANDARD) -> Fit:
    template = pitch.template
    uv, inside = _visible(obs, h, template)
    visible = int(inside.sum())
    if visible < MIN_VISIBLE_POINTS or not _faces_camera(h, obs.size):
        return Fit(h, DIST_CAP_PX, 0.0, visible, 0.0)
    ij = uv[inside].astype(int)
    near = obs.dist[ij[:, 1], ij[:, 0]]
    hit = template[inside][near <= INLIER_PX]
    spread = 0.0
    if len(hit) >= 10:
        spread = float(np.sqrt(max(0.0, np.linalg.eigvalsh(np.cov(hit.T))[0])))
    on_pitch = obs.points[_lands_on_pitch(h, obs.points, pitch, template[inside][0])]
    explained = 0.0
    if len(on_pitch) >= MIN_VISIBLE_POINTS // 3:
        back, _ = cKDTree(uv[inside]).query(on_pitch, k=1, distance_upper_bound=DIST_CAP_PX)
        explained = float((back <= INLIER_PX + 0.5).mean())
    covered = 1.0
    if len(obs.grass):
        covered = float(_lands_on_pitch(h, obs.grass, pitch, template[inside][0], GRASS_MARGIN_M).mean())
    return Fit(h, float(np.minimum(near, DIST_CAP_PX).mean()), float((near <= INLIER_PX).mean()), visible, spread, explained, covered)


PITCH_MARGIN_M = 2.0


def _lands_on_pitch(
    h_pitch_to_img: np.ndarray, points: np.ndarray, pitch: Pitch, seen_ground: np.ndarray, margin: float = PITCH_MARGIN_M
) -> np.ndarray:
    """Píxeles que caen dentro del campo (con un margen): gradas, vallas y carteles no cuentan.

    `seen_ground` es un punto del campo que se ve: marca qué lado del horizonte es suelo.
    """
    back = np.linalg.inv(h_pitch_to_img)
    q = back @ np.c_[points, np.ones(len(points))].T
    ahead = np.sign(q[2]) == np.sign((h_pitch_to_img @ np.r_[seen_ground, 1.0])[2])
    xy = q[:2] / np.where(np.abs(q[2]) < 1e-12, 1e-12, q[2])
    m = margin
    return ahead & (xy[0] >= -m) & (xy[0] <= pitch.length + m) & (xy[1] >= -m) & (xy[1] <= pitch.width + m)


def total_cost(obs: Observed, h: np.ndarray, pitch: Pitch = STANDARD) -> float:
    """Error medio en los dos sentidos: del dibujo a las líneas y de las líneas al dibujo."""
    uv, inside = _visible(obs, h, pitch.template)
    if int(inside.sum()) < MIN_VISIBLE_POINTS:
        return DIST_CAP_PX
    pts = uv[inside]
    ij = pts.astype(int)
    forward = float(np.minimum(obs.dist[ij[:, 1], ij[:, 0]], DIST_CAP_PX).mean())
    near, _ = cKDTree(pts).query(obs.points, k=1, distance_upper_bound=DIST_CAP_PX)
    return 0.5 * (forward + float(np.minimum(near, DIST_CAP_PX).mean()))


def icp(obs: Observed, h: np.ndarray, pitch: Pitch = STANDARD, steps: tuple[float, ...] = ICP_STEPS) -> np.ndarray | None:
    """Afina la homografía césped→píxel emparejando dibujo y líneas vistas."""
    template = pitch.template
    for gate in steps:
        uv, inside = _visible(obs, h, template)
        if int(inside.sum()) < MIN_VISIBLE_POINTS:
            return None
        points = template[inside]
        pts = uv[inside]
        ij = pts.astype(int)
        keep = obs.dist[ij[:, 1], ij[:, 0]] <= gate
        back, idx = cKDTree(pts).query(obs.points, k=1, distance_upper_bound=gate)
        ok = np.isfinite(back)
        src = np.vstack([points[keep], points[idx[ok]]])
        dst = np.vstack([obs.nearest[ij[keep, 1], ij[keep, 0]], obs.points[ok]])
        if len(src) < 40:
            return None
        found, _ = cv2.findHomography(src, dst, 0)
        if found is None or not np.isfinite(found).all():
            return None
        h = found / found[2, 2]
    return h


def upright(h_pitch_to_img: np.ndarray, size: tuple[int, int], pitch: Pitch = STANDARD) -> np.ndarray:
    """El dibujo es simétrico en largo y en ancho: se deja siempre la cámara en el lado y > ancho."""
    if _faces_camera(h_pitch_to_img, size):
        return h_pitch_to_img
    for flip in pitch.symmetries:
        turned = h_pitch_to_img @ flip
        turned = turned / turned[2, 2]
        if _faces_camera(turned, size):
            return turned
    return h_pitch_to_img


def _faces_camera(h_pitch_to_img: np.ndarray, size: tuple[int, int]) -> bool:
    """Abajo en la imagen es más cerca de la cámara (y mayor) y la imagen no está en espejo."""
    width, height = size
    try:
        back = np.linalg.inv(h_pitch_to_img)
    except np.linalg.LinAlgError:
        return False
    top, bottom, right, middle = apply_h(
        back, np.array([[width / 2, height * 0.3], [width / 2, height * 0.9], [width * 0.8, height * 0.6], [width / 2, height * 0.6]])
    )
    if not np.isfinite(np.r_[top, bottom, right, middle]).all():
        return False
    down = bottom - top
    across = right - middle
    return down[1] > 0 and (down[0] * across[1] - down[1] * across[0]) > 0


WIDE_CAP_PX = 20.0
TRACK_CAPS = (6.0,)
FREE_REFINE_TOP = 16
FIXED_REFINE_TOP = 60
ENOUGH_GOOD = 3


def camera_h(params: np.ndarray, size: tuple[int, int], pitch: Pitch = STANDARD) -> np.ndarray:
    """Cámara (x, metros detrás de la banda, altura, giro, inclinación, zoom/ancho, ladeo) a homografía."""
    x, back, z, pan, tilt, focal, roll = params[:7]
    width, height = size
    h = pitch_to_image(np.array([x, pitch.width + back, z]), View(float(pan), float(tilt), float(focal) * width), size)
    c, s = np.cos(roll), np.sin(roll)
    cx, cy = width / 2.0, height / 2.0
    turn = np.array([[c, -s, cx - cx * c + cy * s], [s, c, cy - cx * s - cy * c], [0.0, 0.0, 1.0]])
    return turn @ h


def _camera_cost(obs: Observed, params: np.ndarray, pitch: Pitch, every: int, cap: float, seen: np.ndarray) -> float:
    if params[1] < 0.5 or params[2] < MIN_CAMERA_HEIGHT_M or params[5] < 0.15:
        return 1e3
    template = pitch.template[::every]
    uv = apply_h(camera_h(params, obs.size, pitch), template)
    inside = _inside(uv, obs.size)
    if int(inside.sum()) * every < MIN_VISIBLE_POINTS:
        return 1e3
    pts = uv[inside]
    ij = pts.astype(int)
    forward = float(np.minimum(obs.raw_dist[ij[:, 1], ij[:, 0]], cap).mean())
    near, _ = cKDTree(pts).query(seen, k=1, distance_upper_bound=cap)
    return 0.5 * (forward + float(np.minimum(near, cap).mean()))


def _sized_cost(obs: Observed, params: np.ndarray, cap: float, seen: np.ndarray) -> float:
    length, width = params[7], params[8]
    if not (LENGTH_RANGE_M[0] <= length <= LENGTH_RANGE_M[1] and WIDTH_RANGE_M[0] <= width <= WIDTH_RANGE_M[1]):
        return 1e3
    pitch = Pitch(float(length), float(width))
    if params[1] < 0.5 or params[2] < MIN_CAMERA_HEIGHT_M or params[5] < 0.15:
        return 1e3
    template = affine_template()[::2] @ np.array([length, width, 1.0])
    uv = apply_h(camera_h(params, obs.size, pitch), template)
    inside = _inside(uv, obs.size)
    if int(inside.sum()) * 2 < MIN_VISIBLE_POINTS:
        return 1e3
    pts = uv[inside]
    ij = pts.astype(int)
    forward = float(np.minimum(obs.raw_dist[ij[:, 1], ij[:, 0]], cap).mean())
    near, _ = cKDTree(pts).query(seen, k=1, distance_upper_bound=cap)
    return 0.5 * (forward + float(np.minimum(near, cap).mean()))


def camera_grid(position: np.ndarray | None = None) -> np.ndarray:
    """Cámaras de partida: desde cualquier sitio junto a la banda, o solo girando si ya se sabe dónde está."""
    if position is None:
        places = [(x, back, z) for back in (3.0, 8.0, 15.0, 35.0) for z in (5.0, 9.0, 15.0) for x in (30.0, 52.5, 75.0)]
    else:
        places = [tuple(position)]
    views = [
        (pan, tilt, focal)
        for focal in np.geomspace(0.35, 2.2, 8)
        for pan in np.radians(np.arange(-80, 81, 5))
        for tilt in np.radians(np.arange(6, 43, 4))
    ]
    return np.array([[x, back, z, pan, tilt, focal, 0.0] for x, back, z in places for pan, tilt, focal in views])


@dataclass
class Found:
    fit: Fit
    params: np.ndarray
    pitch: Pitch


def search_camera(obs: Observed, pitch: Pitch = STANDARD, position: np.ndarray | None = None, free_size: bool = False) -> list[Found]:
    """Las mejores cámaras de la rejilla, afinadas a mano alzada y luego con ICP.

    El error en los dos sentidos con un tope ancho deja un valle amplio; el ICP
    solo cae bien si arranca a pocos píxeles, así que antes se afina la cámara
    (y, si se pide, las medidas del campo).
    """
    seen_grid = obs.points[::4]
    seen = obs.points[::2]
    grid = camera_grid(position)
    costs = np.array([_camera_cost(obs, p, pitch, 4, WIDE_CAP_PX, seen_grid) for p in grid])
    found: list[Found] = []
    for index in np.argsort(costs)[: FIXED_REFINE_TOP if position is not None else FREE_REFINE_TOP]:
        if costs[index] >= 1e3:
            break
        params = grid[index].copy()
        here = pitch
        for cap in (WIDE_CAP_PX, 8.0):
            params = _refine(obs, params, here, cap, seen, position is not None)
        if free_size:
            sized = _refine_size(obs, np.r_[params, here.length, here.width], seen)
            here = Pitch(round(float(sized[7]), 1), round(float(sized[8]), 1))
            params = sized[:7]
        refined = icp(obs, upright(camera_h(params, obs.size, here), obs.size, here), here)
        if refined is None:
            continue
        fit = measure(obs, upright(refined, obs.size, here), here)
        if fit.good:
            found.append(Found(fit, params, here))
            if len(found) >= ENOUGH_GOOD:
                break
    found.sort(key=lambda item: total_cost(obs, item.fit.h, item.pitch))
    return found


def _refine(
    obs: Observed, params: np.ndarray, pitch: Pitch, cap: float, seen: np.ndarray, fixed: bool, every: int = 2
) -> np.ndarray:
    budget = 300 if every >= 4 else (800 if fixed else 1500)
    options = {"xtol": 1e-3, "ftol": 1e-4, "maxfev": budget}
    if fixed:
        place = params[:3]
        best = minimize(lambda view: _camera_cost(obs, np.r_[place, view], pitch, every, cap, seen), params[3:], method="Powell", options=options)
        return np.r_[place, best.x]
    return minimize(lambda p: _camera_cost(obs, p, pitch, every, cap, seen), params, method="Powell", options=options).x


def _refine_size(obs: Observed, params: np.ndarray, seen: np.ndarray) -> np.ndarray:
    best = params
    for cap in (8.0, 4.0):
        best = minimize(lambda p: _sized_cost(obs, p, cap, seen), best, method="Powell", options={"xtol": 1e-3, "ftol": 1e-4, "maxfev": 2500}).x
    return best


ADJUST_GATES = (12.0, 8.0, 5.0, 3.5, 2.5)


def adjust_camera(views: list[tuple[Observed, np.ndarray]], pitch: Pitch) -> tuple[np.ndarray, Pitch, list[np.ndarray]]:
    """Ajuste conjunto: un único sitio de cámara y unas medidas del campo para todos los fotogramas.

    Cada fotograma aporta su giro, inclinación, zoom y ladeo. Los pares dibujo↔línea
    se rehacen con una puerta cada vez más estrecha, como en el ICP.
    """
    affine = affine_template()
    count = len(views)
    start = np.r_[views[0][1][:3], pitch.length, pitch.width, np.concatenate([p[3:7] for _, p in views])]

    def unpack(q: np.ndarray) -> tuple[np.ndarray, Pitch, list[np.ndarray]]:
        here = Pitch(float(q[3]), float(q[4]))
        return q[:3], here, [np.r_[q[:3], q[5 + 4 * i : 9 + 4 * i]] for i in range(count)]

    q = start
    for gate in ADJUST_GATES:
        _place, here, params = unpack(q)
        template = affine @ np.array([here.length, here.width, 1.0])
        pairs: list[tuple[np.ndarray, np.ndarray]] = []
        for (obs, _), p in zip(views, params):
            uv = apply_h(camera_h(p, obs.size, here), template)
            ids = np.nonzero(_inside(uv, obs.size))[0]
            if len(ids) < MIN_VISIBLE_POINTS:
                pairs.append((np.zeros(0, int), np.zeros((0, 2))))
                continue
            ij = uv[ids].astype(int)
            keep = obs.dist[ij[:, 1], ij[:, 0]] <= gate
            back, nearest = cKDTree(uv[ids]).query(obs.points, k=1, distance_upper_bound=gate)
            ok = np.isfinite(back)
            pairs.append((
                np.r_[ids[keep], ids[nearest[ok]]],
                np.vstack([obs.nearest[ij[keep, 1], ij[keep, 0]], obs.points[ok]]),
            ))

        def residuals(q: np.ndarray) -> np.ndarray:
            _place, here, params = unpack(q)
            out = []
            for (obs, _), p, (ids, target) in zip(views, params, pairs):
                if len(ids) == 0:
                    continue
                pts = affine[ids] @ np.array([here.length, here.width, 1.0])
                out.append((apply_h(camera_h(p, obs.size, here), pts) - target).ravel())
            return np.concatenate(out) if out else np.zeros(1)

        q = least_squares(residuals, q, loss="cauchy", f_scale=1.5, x_scale="jac", max_nfev=100).x
    place, here, params = unpack(q)
    length = float(np.clip(here.length, *LENGTH_RANGE_M))
    width = float(np.clip(here.width, *WIDTH_RANGE_M))
    return place, Pitch(round(length, 1), round(width, 1)), params


BOOTSTRAP_ROUNDS = 20
BOOTSTRAP_PATIENCE = 3
BOOTSTRAP_SEEDS = 3
MIN_BOOTSTRAP_VIEWS = 3


def _refit(obs: Observed, params: np.ndarray, pitch: Pitch) -> Found | None:
    """Giro y zoom afinados desde el ajuste conjunto, sin volver a la rejilla."""
    for cap in (WIDE_CAP_PX, 8.0):
        params = _refine(obs, params, pitch, cap, obs.points[::2], True)
    refined = icp(obs, upright(camera_h(params, obs.size, pitch), obs.size, pitch), pitch)
    if refined is None:
        return None
    fit = measure(obs, upright(refined, obs.size, pitch), pitch)
    return Found(fit, params, pitch) if fit.good else None


def _spread_order(items: list) -> list:
    """Primero el del principio, el del tercio y el de dos tercios; luego el resto."""
    first = [len(items) * k // BOOTSTRAP_SEEDS for k in range(BOOTSTRAP_SEEDS)]
    order = list(dict.fromkeys(i for i in first if i < len(items)))
    return [items[i] for i in order] + [item for i, item in enumerate(items) if i not in order]


def _settle_position(seen: list[Observed], position: np.ndarray, pitch: Pitch) -> tuple[int, float, np.ndarray, Pitch]:
    """Ajuste conjunto desde una semilla: fotogramas que encajan, su error mediano, sitio y medidas."""
    views = [(obs, found[0].params) for obs in seen for found in [search_camera(obs, pitch, position)] if found]
    best = (len(views), np.inf, position, pitch)
    stale = 0
    for _ in range(BOOTSTRAP_ROUNDS):
        if len(views) < MIN_BOOTSTRAP_VIEWS:
            break
        position, pitch, params = adjust_camera(views, pitch)
        fits = [(obs, _refit(obs, p, pitch)) for (obs, _), p in zip(views, params)]
        views = [(obs, found.params) for obs, found in fits if found is not None]
        if len(views) < MIN_BOOTSTRAP_VIEWS:
            break
        error = float(np.median([found.fit.forward for _, found in fits if found is not None]))
        if error < best[1]:
            best, stale = (len(views), error, position.copy(), pitch), 0
        else:
            stale += 1
            if stale >= BOOTSTRAP_PATIENCE:
                break
    return best


class PitchCamera:
    """Calibra cada fotograma partiendo del anterior; si se pierde, vuelve a buscar.

    La cámara de Veo no se mueve de sitio ni el campo cambia de medidas: la
    primera calibración buena fija las dos cosas y luego basta con buscar giro y zoom.
    """

    def __init__(self) -> None:
        self.h_work: np.ndarray | None = None
        self.view: np.ndarray | None = None
        self.view_before: np.ndarray | None = None
        self.last: Fit | None = None
        self.acquisitions = 0
        self.stages: dict[int, int] = {}
        self.misses = REACQUIRE_AFTER
        self.position: np.ndarray | None = None
        self.pitch = STANDARD
        self.wait = 0

    def bootstrap(self, frames: list[np.ndarray], boxes: list[list[tuple[float, float, float, float]]] | None = None) -> bool:
        """Sitio de la cámara y medidas del campo con unos cuantos fotogramas repartidos por el partido.

        Un fotograma suelto puede calibrarse con la cámara en un sitio falso que
        también encaja, así que se prueban varias semillas de fotogramas
        repartidos y gana la que luego calibra más fotogramas con menos error.
        """
        seen = [self._observe(frame, (boxes or [None] * len(frames))[i])[0] for i, frame in enumerate(frames)]
        seen = [obs for obs in seen if obs is not None]
        seeds: list[Found] = []
        for obs in _spread_order(seen):
            found = search_camera(obs, self.pitch, free_size=True)
            if found:
                seeds.append(found[0])
                if len(seeds) >= BOOTSTRAP_SEEDS:
                    break
        best: tuple[int, float, np.ndarray, Pitch] | None = None
        for seed in seeds:
            count, error, position, pitch = _settle_position(seen, seed.params[:3].copy(), seed.pitch)
            if best is None or (np.isfinite(error), count, -error) > (np.isfinite(best[1]), best[0], -best[1]):
                best = (count, error, position, pitch)
        if best is None:
            return False
        self.position, self.pitch = best[2], best[3]
        return True

    @staticmethod
    def _observe(frame: np.ndarray, boxes: list[tuple[float, float, float, float]] | None) -> tuple[Observed | None, float]:
        height, width = frame.shape[:2]
        scale = WORK_WIDTH / float(width)
        mask, grass = work_masks(frame, (WORK_WIDTH, int(round(height * scale))), boxes)
        if int(cv2.countNonZero(mask)) < 150:
            return None, scale
        return observe(mask, grass=grass), scale

    def fit(self, frame: np.ndarray, boxes: list[tuple[float, float, float, float]] | None = None) -> np.ndarray | None:
        """Homografía píxel→coordenadas de 105×68 del fotograma original, o None si las líneas no encajan."""
        obs, scale = self._observe(frame, boxes)
        found: Found | None = None
        if obs is not None:
            if self.view is not None:
                found = self._track(obs)
            if (found is None or not found.fit.good) and self.wait <= 0:
                found = self._acquire(obs)
        self.wait -= 1
        if found is None or not found.fit.good:
            self.last = None if found is None else found.fit
            self.misses += 1
            if self.misses >= REACQUIRE_AFTER:
                self.view = None
            self.view_before = None
            return None
        self.misses = 0
        self.last = found.fit
        self.view_before = self.view
        self.view = found.params
        self.h_work = found.fit.h
        to_work = np.diag([scale, scale, 1.0])
        img_to_pitch = self.pitch.to_standard() @ np.linalg.inv(found.fit.h) @ to_work
        return img_to_pitch / img_to_pitch[2, 2]

    def _track(self, obs: Observed) -> Found | None:
        """Desde la cámara del fotograma anterior, de lo barato a lo caro.

        Primero un afinado corto; si la cámara gira deprisa, desde el giro que
        llevaba; y si aun así no encaja, con el tope ancho de la búsqueda.
        """
        assert self.view is not None
        starts = [(self.view, TRACK_CAPS)]
        if self.view_before is not None:
            starts.append((2.0 * self.view - self.view_before, TRACK_CAPS))
        starts.append((self.view, (WIDE_CAP_PX, 8.0)))
        best: Found | None = None
        for stage, (start, caps) in enumerate(starts):
            found = self._settle(obs, start, caps)
            if found is not None and found.fit.good:
                self.stages[stage] = self.stages.get(stage, 0) + 1
                return found
            if found is not None and (best is None or found.fit.forward < best.fit.forward):
                best = found
        return best

    def _settle(self, obs: Observed, params: np.ndarray, caps: tuple[float, ...]) -> Found | None:
        fixed = self.position is not None
        quick = caps == TRACK_CAPS
        for cap in caps:
            params = _refine(obs, params, self.pitch, cap, obs.points[:: 4 if quick else 2], fixed, every=4 if quick else 2)
        refined = icp(obs, upright(camera_h(params, obs.size, self.pitch), obs.size, self.pitch), self.pitch)
        if refined is None:
            return None
        return Found(measure(obs, upright(refined, obs.size, self.pitch), self.pitch), params, self.pitch)

    def _acquire(self, obs: Observed) -> Found | None:
        self.acquisitions += 1
        found: list[Found] = []
        if self.position is not None:
            found = search_camera(obs, self.pitch, self.position)
        else:
            found = search_camera(obs, self.pitch, free_size=True)
            if found:
                self.position = found[0].params[:3].copy()
                self.pitch = found[0].pitch
        if not found:
            self.wait = ACQUIRE_BACKOFF
            return None
        return found[0]
