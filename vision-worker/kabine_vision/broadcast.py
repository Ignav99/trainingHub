"""Detector de partido de verdad: RF-DETR para personas y balón, la cámara para el césped.

RF-DETR (Apache 2.0) encuentra cuerpos y balón. La cámara física de
``camera.py`` da la homografía y de ella salen los puntos del campo que el
pipeline ya sabe usar. El color de la camiseta separa los dos equipos, el
árbitro y los porteros: lo que aparece una sola vez por fotograma no es un equipo.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field

import cv2
import numpy as np

from .camera import PitchCamera
from .field import read_dorsal
from .homography import apply_h
from .tracking import Box, hex_to_rgb

Raw = tuple[str, float, float, float, float, float]
Model = Callable[[np.ndarray], list[Raw]]
BallFinder = Callable[[np.ndarray, int], list[Raw]]

PERSON_SCORE = 0.3
BALL_SCORE = 0.25
TILE_BALL_SCORE = 0.2
TILE_OVERLAP_PX = 96
SPOT_RADIUS_M = 1.5
PALETTE = 16
KIT_CLUSTERS = 8
LONE_PER_FRAME = 1.25
KEEPER_FROM_GOAL_M = 22.0
PITCH_MARGIN_M = 3.0
GRID_X = np.linspace(0.0, 105.0, 15)
GRID_Y = np.linspace(0.0, 68.0, 11)
GRID = np.array([(x, y) for x in GRID_X for y in GRID_Y], dtype=float)


def grass_reference(frame: np.ndarray) -> tuple[float, float]:
    """Tono y saturación del césped de este fotograma, de la mitad de abajo."""
    hsv = cv2.cvtColor(frame[frame.shape[0] // 2:: 4, :: 4], cv2.COLOR_BGR2HSV).reshape(-1, 3)
    vivid = hsv[hsv[:, 1] > 80]
    if len(vivid) < 50:
        return 40.0, 150.0
    return float(np.median(vivid[:, 0])), float(np.median(vivid[:, 1]))


def _is_grass(hsv: np.ndarray, grass: tuple[float, float]) -> np.ndarray:
    return (np.abs(hsv[..., 0].astype(np.int16) - int(grass[0])) <= 8) & (hsv[..., 1] > 0.55 * grass[1])


def torso_pixels(frame: np.ndarray, box: tuple[float, float, float, float], grass: tuple[float, float]) -> np.ndarray | None:
    """Píxeles Lab de la camiseta, sin el césped que se ve entre brazo y cuerpo."""
    x, y, w, h = box
    crop = frame[int(y + 0.12 * h): int(y + 0.5 * h), int(x + 0.25 * w): int(x + 0.75 * w)]
    if crop.size == 0:
        return None
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV).reshape(-1, 3)
    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    keep = ~_is_grass(hsv, grass)
    if int(keep.sum()) < 8:
        return None
    return lab[keep]


def stands_on_grass(frame: np.ndarray, box: tuple[float, float, float, float], grass: tuple[float, float]) -> bool:
    """La grada y la valla no pisan césped; un jugador, sí."""
    x, y, w, h = box
    height, width = frame.shape[:2]
    y0 = int(min(height - 1, max(0, y + h * 0.9)))
    y1 = int(min(height, y + h + max(4, h * 0.1)))
    x0, x1 = int(max(0, x - w * 0.25)), int(min(width, x + w * 1.25))
    band = frame[y0:y1, x0:x1]
    if band.size == 0:
        return False
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV)
    return float(_is_grass(hsv, grass).mean()) >= 0.25


@dataclass
class KitModel:
    """Paleta de colores del partido y a qué rol pertenece cada grupo de camisetas."""

    palette: np.ndarray
    centers: np.ndarray
    roles: list[tuple[str, int | None]]

    def histogram(self, pixels: np.ndarray) -> np.ndarray:
        nearest = np.argmin(((pixels[:, None, :] - self.palette[None]) ** 2).sum(-1), axis=1)
        return np.sqrt(np.bincount(nearest, minlength=len(self.palette)) / float(len(nearest))).astype(np.float32)

    def classify(self, pixels: np.ndarray) -> tuple[str, int | None]:
        hist = self.histogram(pixels)
        index = int(np.argmin(((self.centers - hist[None]) ** 2).sum(-1)))
        return self.roles[index]


@dataclass
class Sample:
    pixels: np.ndarray
    frame: int
    pitch_x: float | None
    rgb: tuple[float, float, float]


def learn_kits(samples: list[Sample], our_kit: str = "white", kits: dict | None = None) -> KitModel | None:
    """Agrupa camisetas: los grupos que salen una vez por fotograma son árbitro o porteros.

    El portero vive cerca de una portería; el árbitro, no. El resto se reparte
    en dos equipos por color.
    """
    if len(samples) < 3 * KIT_CLUSTERS:
        return None
    rng = np.random.default_rng(0)
    pool = np.vstack([sample.pixels for sample in samples])
    pool = pool[rng.choice(len(pool), min(len(pool), 30000), replace=False)]
    cv2.setRNGSeed(0)
    criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_MAX_ITER, 50, 0.1)
    _, _, palette = cv2.kmeans(pool, PALETTE, None, criteria, 4, cv2.KMEANS_PP_CENTERS)
    model = KitModel(palette=palette, centers=np.zeros((0, PALETTE), np.float32), roles=[])
    hists = np.array([model.histogram(sample.pixels) for sample in samples], dtype=np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_MAX_ITER, 100, 0.01)
    _, labels, centers = cv2.kmeans(hists, KIT_CLUSTERS, None, criteria, 10, cv2.KMEANS_PP_CENTERS)
    labels = labels.ravel()
    frames = {sample.frame for sample in samples}
    roles: list[tuple[str, int | None]] = []
    team_like: list[int] = []
    for index in range(KIT_CLUSTERS):
        members = [samples[i] for i in np.where(labels == index)[0]]
        per_frame: dict[int, int] = {}
        for sample in members:
            per_frame[sample.frame] = per_frame.get(sample.frame, 0) + 1
        crowd = float(np.mean(list(per_frame.values()))) if per_frame else 0.0
        if members and crowd <= LONE_PER_FRAME and len(per_frame) >= max(2, len(frames) // 8):
            xs = [sample.pitch_x for sample in members if sample.pitch_x is not None]
            from_goal = min(float(np.median(xs)), 105.0 - float(np.median(xs))) if xs else 52.5
            roles.append(("player", None) if from_goal <= KEEPER_FROM_GOAL_M else ("referee", None))
        else:
            roles.append(("player", -1))
            team_like.append(index)
    if len(team_like) < 2:
        return None
    sizes = np.bincount(labels, minlength=KIT_CLUSTERS).astype(float)
    groups = _two_groups(centers[team_like], sizes[team_like])
    rgbs = [
        np.mean([samples[i].rgb for i in np.where(np.isin(labels, [c for c, g in zip(team_like, groups) if g == group]))[0]], axis=0)
        for group in (0, 1)
    ]
    ours = _our_group(rgbs, our_kit, kits)
    for cluster, group in zip(team_like, groups):
        roles[cluster] = ("player", 0 if group == ours else 1)
    return KitModel(palette=palette, centers=centers, roles=roles)


def _two_groups(centers: np.ndarray, sizes: np.ndarray) -> list[int]:
    """Dos equipos: el reparto de grupos que deja los colores más juntos dentro de cada uno."""
    count = len(centers)
    best: tuple[float, list[int]] | None = None
    for mask in range(1, 2 ** (count - 1)):
        groups = [(mask >> i) & 1 for i in range(count)]
        cost = 0.0
        for group in (0, 1):
            chosen = [i for i in range(count) if groups[i] == group]
            weights = sizes[chosen]
            mean = (centers[chosen] * weights[:, None]).sum(0) / weights.sum()
            cost += float((weights * ((centers[chosen] - mean) ** 2).sum(-1)).sum())
        if best is None or cost < best[0]:
            best = (cost, groups)
    assert best is not None
    return best[1]


def _our_group(rgbs: list[np.ndarray], our_kit: str, kits: dict | None) -> int:
    ours = hex_to_rgb((kits or {}).get("ours")) if isinstance(kits, dict) else None
    if ours is not None:
        target = np.array(ours, dtype=float)
        return int(np.argmin([float(np.linalg.norm(rgb - target)) for rgb in rgbs]))
    luma = [float(np.mean(rgb)) for rgb in rgbs]
    if our_kit == "white":
        return int(np.argmax(luma))
    return int(np.argmin(luma))


def _rgb(pixels: np.ndarray) -> tuple[float, float, float]:
    lab = np.median(pixels, axis=0).astype(np.uint8).reshape(1, 1, 3)
    b, g, r = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR).reshape(3)
    return float(r), float(g), float(b)


def pitch_keypoints(img_to_pitch: np.ndarray, width: float, height: float, t: float) -> list[Box]:
    """Puntos de una rejilla del campo que caen dentro de la imagen, con su sitio en 105×68."""
    pitch_to_img = np.linalg.inv(img_to_pitch)
    ones = np.hstack([GRID, np.ones((len(GRID), 1))])
    proj = ones @ pitch_to_img.T
    ground = float((img_to_pitch @ np.array([width / 2.0, height - 1.0, 1.0]))[2])
    front = proj[:, 2] * np.sign(ground) > 1e-9
    px = proj[:, 0] / np.where(front, proj[:, 2], 1.0)
    py = proj[:, 1] / np.where(front, proj[:, 2], 1.0)
    inside = front & (px >= 0) & (px < width) & (py >= 0) & (py < height)
    return [
        Box(t, "keypoint", float(px[i]), float(py[i]), 1, 1, pitch_xy=(float(GRID[i, 0]), float(GRID[i, 1])))
        for i in np.where(inside)[0]
    ]


def tiled(model: Model) -> BallFinder:
    """El balón lejano mide pocos píxeles: se busca en dos mitades del césped a más resolución."""

    def find(frame: np.ndarray, top: int) -> list[Raw]:
        height, width = frame.shape[:2]
        rows: list[Raw] = []
        for x0, x1 in ((0, width // 2 + TILE_OVERLAP_PX), (width // 2 - TILE_OVERLAP_PX, width)):
            for kind, a, b, c, d, score in model(frame[top:height, x0:x1]):
                rows.append((kind, a + x0, b + top, c + x0, d + top, score))
        return rows

    return find


def pitch_top(img_to_pitch: np.ndarray | None, width: float, height: float) -> int:
    """Primera fila de la imagen con césped: lo de arriba es grada y cielo."""
    if img_to_pitch is None:
        return int(height // 3)
    keys = pitch_keypoints(img_to_pitch, width, height, 0.0)
    if not keys:
        return int(height // 3)
    return int(max(0.0, min(box.py for box in keys) - 0.04 * height))


def _spots(length: float) -> np.ndarray:
    """Puntos de penalti y centro en coordenadas de 105×68: el detector los confunde con el balón."""
    penalty = 11.0 * 105.0 / length
    return np.array([(penalty, 34.0), (105.0 - penalty, 34.0), (52.5, 34.0)], dtype=float)


@dataclass
class BroadcastDetector:
    """Cajas por fotograma para ``pipeline.run_span``. ``prepare`` aprende cámara y camisetas."""

    model: Model
    ball_finder: BallFinder | None = None
    our_kit: str = "white"
    kits: dict | None = None
    roster: dict | None = None
    camera: PitchCamera = field(default_factory=PitchCamera)
    kit_model: KitModel | None = None
    calibrated: int = 0
    frames: int = 0
    last_h: np.ndarray | None = None

    def prepare(self, frames: Sequence[np.ndarray], pool=None) -> None:
        raws = [self._people(frame) for frame in frames]
        self.camera.bootstrap(list(frames), [[box for box, _ in people] for people in raws], pool=pool)
        samples: list[Sample] = []
        for index, (frame, people) in enumerate(zip(frames, raws)):
            grass = grass_reference(frame)
            h = self.camera.fit(frame, [box for box, _ in people]) if self.camera.position is not None else None
            for box, _score in people:
                if not stands_on_grass(frame, box, grass):
                    continue
                pixels = torso_pixels(frame, box, grass)
                if pixels is None:
                    continue
                x, y, w, bh = box
                pitch_x = float(apply_h(h, np.array([[x + w / 2.0, y + bh]]))[0, 0]) if h is not None else None
                samples.append(Sample(pixels, index, pitch_x, _rgb(pixels)))
        self.kit_model = learn_kits(samples, self.our_kit, self.kits)
        self.camera = _fresh_camera(self.camera)

    def __call__(self, frame: np.ndarray, t: float) -> list[Box]:
        self.frames += 1
        height, width = frame.shape[:2]
        raw = self.model(frame)
        people = [((x1, y1, x2 - x1, y2 - y1), score) for kind, x1, y1, x2, y2, score in raw if kind == "person" and score >= PERSON_SCORE]
        h = self.camera.fit(frame, [box for box, _ in people])
        self.last_h = h
        out: list[Box] = []
        if h is not None:
            self.calibrated += 1
            out.extend(pitch_keypoints(h, width, height, t))
        grass = grass_reference(frame)
        allowed = _allowed(self.roster)
        for box, _score in people:
            x, y, w, bh = box
            if h is not None:
                foot = apply_h(h, np.array([[x + w / 2.0, y + bh]]))[0]
                if not (-PITCH_MARGIN_M <= foot[0] <= 105.0 + PITCH_MARGIN_M and -PITCH_MARGIN_M <= foot[1] <= 68.0 + PITCH_MARGIN_M):
                    continue
            elif not stands_on_grass(frame, box, grass):
                continue
            pixels = torso_pixels(frame, box, grass)
            kind, team = "player", None
            rgb = None
            if pixels is not None:
                rgb = _rgb(pixels)
                if self.kit_model is not None:
                    kind, team = self.kit_model.classify(pixels)
            item = Box(t, kind, float(x), float(y), float(w), float(bh), rgb=rgb, team=team if team is not None and team >= 0 else None)
            if kind == "player" and allowed:
                item.dorsal = read_dorsal(frame, item, allowed)
            out.append(item)
        balls = [row for row in raw if row[0] == "sports ball" and row[5] >= BALL_SCORE]
        balls = self._off_spots(balls, h)
        if not balls and self.ball_finder is not None:
            found = self.ball_finder(frame, pitch_top(h, width, height))
            balls = self._off_spots([row for row in found if row[0] == "sports ball" and row[5] >= TILE_BALL_SCORE], h)
        for _kind, x1, y1, x2, y2, _score in balls:
            out.append(Box(t, "ball", (x1 + x2) / 2.0, y2, 1, 1))
        return out

    def worker_state(self) -> dict:
        """Lo aprendido en `prepare`, para que otro proceso lea un tramo igual que este."""
        return {
            "our_kit": self.our_kit,
            "kits": self.kits,
            "roster": self.roster,
            "position": self.camera.position,
            "pitch": self.camera.pitch,
            "kit_model": self.kit_model,
        }

    def restart(self) -> None:
        """Al empezar otro tramo: la cámara sigue en su sitio, pero hay que volver a encontrar el encuadre."""
        self.camera = _fresh_camera(self.camera)
        self.last_h = None

    def _off_spots(self, balls: list[Raw], h: np.ndarray | None) -> list[Raw]:
        if h is None or not balls:
            return balls
        spots = _spots(self.camera.pitch.length)
        feet = apply_h(h, np.array([[(row[1] + row[3]) / 2.0, row[4]] for row in balls]))
        near = np.hypot(feet[:, None, 0] - spots[None, :, 0], feet[:, None, 1] - spots[None, :, 1]).min(axis=1)
        return [row for row, dist in zip(balls, near) if dist > SPOT_RADIUS_M]

    def _people(self, frame: np.ndarray) -> list[tuple[tuple[float, float, float, float], float]]:
        return [((x1, y1, x2 - x1, y2 - y1), score) for kind, x1, y1, x2, y2, score in self.model(frame) if kind == "person" and score >= PERSON_SCORE]


def detector_from_state(state: dict, size: str = "medium") -> BroadcastDetector:
    model = rfdetr_model(size)
    detector = BroadcastDetector(
        model=model, ball_finder=tiled(model), our_kit=state["our_kit"], kits=state["kits"], roster=state["roster"], kit_model=state["kit_model"]
    )
    detector.camera.position, detector.camera.pitch = state["position"], state["pitch"]
    return detector


def _fresh_camera(learned: PitchCamera) -> PitchCamera:
    camera = PitchCamera()
    camera.position, camera.pitch = learned.position, learned.pitch
    return camera


def _allowed(roster: dict | None) -> set[int]:
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


def _optimize(model) -> None:
    """En GPU, media precisión (FP16). rfdetr ≥ 1.8 lo llama `inference`; antes, `optimize_for_inference`."""
    try:
        import torch

        cuda = torch.cuda.is_available()
    except Exception:  # noqa: BLE001
        cuda = False
    if hasattr(model, "inference"):
        if not cuda:
            return
        import torch

        for options in ({"dtype": torch.float16}, {"dtype": torch.float16, "compile": False}):
            try:
                model.inference(**options)
                print(f"[visión] RF-DETR en GPU con FP16{'' if options.get('compile', True) else ' (sin compilar)'}", flush=True)
                return
            except Exception as exc:  # noqa: BLE001 - la versión sin optimizar también vale
                print(f"[visión] RF-DETR FP16 {options}: {exc}", flush=True)
        return
    try:
        model.optimize_for_inference()
    except Exception as exc:  # noqa: BLE001
        print(f"[visión] RF-DETR sin optimizar: {exc}", flush=True)


def rfdetr_model(size: str = "medium", threshold: float = min(PERSON_SCORE, BALL_SCORE)) -> Model:
    """RF-DETR de Roboflow (Apache 2.0). Solo personas y balón."""
    import rfdetr
    from rfdetr.assets.coco_classes import COCO_CLASSES

    model = getattr(rfdetr, f"RFDETR{size.capitalize()}")()
    _optimize(model)

    def run(frame: np.ndarray) -> list[Raw]:
        found = model.predict(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), threshold=threshold)
        rows: list[Raw] = []
        for (x1, y1, x2, y2), cls, score in zip(found.xyxy, found.class_id, found.confidence):
            name = COCO_CLASSES[int(cls)]
            if name in ("person", "sports ball"):
                rows.append((name, float(x1), float(y1), float(x2), float(y2), float(score)))
        return rows

    return run
