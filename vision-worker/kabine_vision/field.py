"""Lectura del campo con los colores de camiseta, el césped y las líneas.

No es el detector de producto. RF-DETR sigue haciendo falta para un partido
de noche. Esto usa el color que marca el entrenador, descarta lo que no
tiene forma de jugador y solo acepta un dorsal si está en el acta.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from .tracking import Box, hex_to_rgb

_GRASS = (40, 110, 45)
_WHITE = (245, 245, 245)
_BLUE = (180, 40, 30)
_YELLOW = (40, 220, 240)
_INK_DARK = (8, 8, 8)
_INK_LIGHT = (250, 250, 250)
_PITCH = (48, 36, 592, 324)

# 5×7. El 1 es tinta.
_FONT = {
    0: ("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
    1: ("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
    2: ("01110", "10001", "00001", "00010", "00100", "01000", "11111"),
    3: ("11110", "00001", "00001", "01110", "00001", "00001", "11110"),
    4: ("00010", "00110", "01010", "10010", "11111", "00010", "00010"),
    5: ("11111", "10000", "11110", "00001", "00001", "10001", "01110"),
    6: ("00110", "01000", "10000", "11110", "10001", "10001", "01110"),
    7: ("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
    8: ("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
    9: ("01110", "10001", "10001", "01111", "00001", "00010", "01100"),
}
_TEMPLATES = {
    digit: np.array([1 if bit == "1" else 0 for row in rows for bit in row], dtype=np.uint8)
    for digit, rows in _FONT.items()
}


def detect_field(
    frame_bgr: np.ndarray,
    t: float,
    *,
    kits: dict | None = None,
    roster: dict | None = None,
) -> list[Box]:
    height, width = frame_bgr.shape[:2]
    scale = 1.0
    work = frame_bgr
    if width > 960:
        scale = 960.0 / float(width)
        work = cv2.resize(frame_bgr, (960, max(1, int(round(height * scale)))), interpolation=cv2.INTER_AREA)
    boxes = _detect_work(work, t, kits=kits, roster=None)
    if scale != 1.0:
        inv = 1.0 / scale
        for box in boxes:
            box.px *= inv
            box.py *= inv
            box.w *= inv
            box.h *= inv
    _read_numbers(frame_bgr, boxes, roster)
    return boxes


def write_field_fixture(path: str | Path, frames: int = 16, fps: float = 10.0) -> Path:
    """Césped con líneas, dos camisetas, dorsales y un balón redondo."""
    path = Path(path)
    if path.suffix.lower() != ".avi":
        path = path.with_suffix(".avi")
    path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"png "), fps, (640, 360))
    if not writer.isOpened():
        raise RuntimeError("no se pudo escribir el vídeo de campo")
    try:
        for i in range(frames):
            writer.write(_field_frame(i))
    finally:
        writer.release()
    return path


def read_dorsal(frame_bgr: np.ndarray, box: Box, allowed: set[int]) -> int | None:
    if not allowed or box.h < 28 or box.w < 12:
        return None
    height, width = frame_bgr.shape[:2]
    x0 = max(0, int(box.px + box.w * 0.12))
    x1 = min(width, int(box.px + box.w * 0.88))
    y0 = max(0, int(box.py + box.h * 0.08))
    y1 = min(height, int(box.py + box.h * 0.52))
    if x1 - x0 < 6 or y1 - y0 < 8:
        return None
    gray = cv2.cvtColor(frame_bgr[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    ink = (np.abs(gray.astype(np.int16) - int(np.median(gray))) > 42).astype(np.uint8)
    ys, xs = np.where(ink > 0)
    if len(xs) < 6:
        return None
    ink = ink[int(ys.min()): int(ys.max()) + 1, int(xs.min()): int(xs.max()) + 1]
    groups = _digit_spans(ink.sum(axis=0))
    if not groups:
        return None
    if len(groups) > 2:
        groups = sorted(groups, key=lambda span: span[1] - span[0], reverse=True)[:2]
        groups.sort()
    digits: list[int] = []
    for start, end in groups:
        glyph = (ink[:, start:end] * 255).astype(np.uint8)
        if glyph.size == 0:
            return None
        small = cv2.resize(glyph, (5, 7), interpolation=cv2.INTER_AREA)
        bits = (small > 80).astype(np.uint8).reshape(-1)
        best_digit = None
        best_distance = 99
        for digit, template in _TEMPLATES.items():
            distance = int(np.count_nonzero(bits != template))
            if distance < best_distance:
                best_digit = digit
                best_distance = distance
        if best_digit is None or best_distance > 10:
            return None
        digits.append(best_digit)
    number = digits[0] if len(digits) == 1 else digits[0] * 10 + digits[1]
    if number not in allowed:
        return None
    return number


def _field_frame(i: int) -> np.ndarray:
    frame = np.zeros((360, 640, 3), dtype=np.uint8)
    frame[:] = _GRASS
    x0, y0, x1, y1 = _PITCH
    cv2.rectangle(frame, (x0, y0), (x1, y1), (255, 255, 255), 3)
    mid = (x0 + x1) // 2
    cv2.line(frame, (mid, y0), (mid, y1), (255, 255, 255), 3)
    shift = i * 3
    _shirt(frame, 150 + shift, 150, _WHITE, 7, _INK_DARK)
    _shirt(frame, 170 + shift, 280, _WHITE, 8, _INK_DARK)
    _shirt(frame, 490 - shift, 150, _BLUE, 4, _INK_LIGHT)
    _shirt(frame, 470 - shift, 280, _BLUE, 5, _INK_LIGHT)
    _shirt(frame, 320, 210, _YELLOW, None, _INK_DARK, w=28, h=48)
    cv2.circle(frame, (230 + i * 4, 188), 6, (250, 250, 250), -1)
    return frame


def _shirt(
    frame: np.ndarray,
    foot_x: int,
    foot_y: int,
    color: tuple[int, int, int],
    number: int | None,
    ink: tuple[int, int, int],
    w: int = 36,
    h: int = 72,
) -> None:
    x1 = int(foot_x - w / 2)
    y1 = int(foot_y - h)
    cv2.rectangle(frame, (x1, y1), (x1 + w, y1 + h), color, -1)
    if number is None:
        return
    paint_digits(frame, foot_x, y1 + int(h * 0.28), number, ink, scale=2)


def paint_digits(
    frame: np.ndarray,
    cx: int,
    cy: int,
    number: int,
    color: tuple[int, int, int],
    scale: int = 2,
) -> None:
    text = str(int(number))
    glyph_w = 5 * scale
    gap = scale
    total = len(text) * glyph_w + (len(text) - 1) * gap
    x = int(cx - total / 2)
    y = int(cy - (7 * scale) / 2)
    height, width = frame.shape[:2]
    for index, char in enumerate(text):
        rows = _FONT.get(int(char))
        if rows is None:
            continue
        origin_x = x + index * (glyph_w + gap)
        for row_index, row in enumerate(rows):
            for col_index, bit in enumerate(row):
                if bit != "1":
                    continue
                x0 = origin_x + col_index * scale
                y0 = y + row_index * scale
                x1 = min(width, x0 + scale)
                y1 = min(height, y0 + scale)
                if x0 >= 0 and y0 >= 0 and x1 > x0 and y1 > y0:
                    frame[y0:y1, x0:x1] = color


def _detect_work(frame: np.ndarray, t: float, *, kits: dict | None, roster: dict | None) -> list[Box]:
    del roster
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    height, width = frame.shape[:2]
    area = float(height * width)
    min_area = max(80.0, area * 0.0007)
    max_area = area * 0.045
    ours_bgr = _bgr(kits.get("ours") if isinstance(kits, dict) else None)
    rival_bgr = _bgr(kits.get("rival") if isinstance(kits, dict) else None)
    people: list[Box] = []
    if ours_bgr is not None and rival_bgr is not None:
        people.extend(_people(frame, hsv, t, ours_bgr, "player", 0, min_area, max_area))
        people.extend(_people(frame, hsv, t, rival_bgr, "player", 1, min_area, max_area))
        if not _yellowish(ours_bgr) and not _yellowish(rival_bgr):
            people.extend(_people(frame, hsv, t, _YELLOW, "referee", None, min_area, max_area))
    else:
        from .blobs import detect_blobs

        return detect_blobs(frame, t)
    people = _nms(people)
    boxes: list[Box] = []
    lines = _line_keypoints(frame, hsv, t, people)
    if len(lines) >= 4:
        boxes.extend(lines)
    else:
        boxes.extend(_orange_corners(frame, t))
    boxes.extend(people)
    ball = _ball(hsv, people)
    if ball is not None:
        ball.t = t
        boxes.append(ball)
    return boxes


def _read_numbers(frame: np.ndarray, boxes: list[Box], roster: dict | None) -> None:
    ours, rival = _roster_sets(roster)
    allowed_all = ours | rival
    if not allowed_all:
        return
    for box in boxes:
        if box.kind != "player":
            continue
        allowed = ours if box.team == 0 else rival if box.team == 1 else allowed_all
        box.dorsal = read_dorsal(frame, box, allowed)


def _people(
    frame: np.ndarray,
    hsv: np.ndarray,
    t: float,
    bgr: tuple[int, int, int],
    kind: str,
    team: int | None,
    min_area: float,
    max_area: float,
) -> list[Box]:
    mask = cv2.morphologyEx(_kit_mask(hsv, bgr), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 9)))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    found: list[Box] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area or area > max_area:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        if w < 8 or h < 16 or h < w * 1.15 or h > w * 5.5:
            continue
        found.append(Box(t, kind, float(x), float(y), float(w), float(h), rgb=_median_rgb(frame, x, y, w, h), team=team))
    return found


def _kit_mask(hsv: np.ndarray, bgr: tuple[int, int, int]) -> np.ndarray:
    hue, sat, val = _hsv(bgr)
    if sat < 45:
        if val >= 170:
            return cv2.inRange(hsv, (0, 0, 165), (180, 60, 255))
        if val <= 70:
            return cv2.inRange(hsv, (0, 0, 0), (180, 90, 95))
        low = max(0, val - 50)
        high = min(255, val + 50)
        return cv2.inRange(hsv, (0, 0, low), (180, 80, high))
    if hue < 16 or hue > 164:
        low = cv2.inRange(hsv, (0, 40, 35), (min(180, hue + 16 if hue < 16 else 16), 255, 255))
        high = cv2.inRange(hsv, (max(0, hue - 16 if hue > 164 else 164), 40, 35), (180, 255, 255))
        return cv2.bitwise_or(low, high)
    return cv2.inRange(hsv, (max(0, hue - 16), 40, 35), (min(180, hue + 16), 255, 255))


def _line_keypoints(frame: np.ndarray, hsv: np.ndarray, t: float, people: list[Box]) -> list[Box]:
    height, width = frame.shape[:2]
    grass = cv2.inRange(hsv, (32, 35, 35), (100, 255, 255))
    near = cv2.dilate(grass, np.ones((3, 3), np.uint8), iterations=1)
    white = cv2.inRange(hsv, (0, 0, 170), (180, 75, 255))
    orange = cv2.inRange(hsv, (5, 80, 120), (22, 255, 255))
    paint = cv2.bitwise_and(cv2.bitwise_or(white, orange), near)
    for box in people:
        x0 = max(0, int(box.px) - 4)
        y0 = max(0, int(box.py) - 4)
        x1 = min(width, int(box.px + box.w) + 4)
        y1 = min(height, int(box.py + box.h) + 4)
        paint[y0:y1, x0:x1] = 0
    long = max(24, width // 18)
    horizontal = cv2.morphologyEx(paint, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (long, 1)))
    vertical = cv2.morphologyEx(paint, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, long)))
    lines = cv2.bitwise_or(horizontal, vertical)
    count = int(cv2.countNonZero(lines))
    if count < 80:
        return []
    ys, xs = np.where(lines > 0)
    points = np.stack([xs, ys], axis=1).astype(np.int32)
    hull = cv2.convexHull(points)
    approx = cv2.approxPolyDP(hull, 0.03 * cv2.arcLength(hull, True), True)
    if len(approx) == 4:
        corners = [(int(point[0][0]), int(point[0][1])) for point in approx]
    else:
        x, y, w, h = cv2.boundingRect(hull)
        if w < width * 0.35 or h < height * 0.25:
            return []
        corners = [(x, y), (x + w - 1, y), (x, y + h - 1), (x + w - 1, y + h - 1)]
    if cv2.contourArea(np.array(corners, dtype=np.int32)) < 0.12 * width * height:
        return []
    ordered = _order_corners(corners)
    pitch = ((0.0, 0.0), (105.0, 0.0), (0.0, 68.0), (105.0, 68.0))
    return [Box(t, "keypoint", x, y, 1, 1, pitch_xy=xy) for (x, y), xy in zip(ordered, pitch)]


def _orange_corners(frame: np.ndarray, t: float) -> list[Box]:
    from .blobs import _corner_keypoints, _centers, _four_extreme

    marks = _centers(frame, (0, 140, 255), min_area=40, max_area=800)
    if len(marks) < 4:
        return []
    return _corner_keypoints(t, marks[:4] if len(marks) == 4 else _four_extreme(marks))


def _ball(hsv: np.ndarray, people: list[Box]) -> Box | None:
    white = cv2.inRange(hsv, (0, 0, 180), (180, 70, 255))
    found = _round_from_mask(white, people, 12, 700)
    if found is not None:
        return found
    magenta = cv2.inRange(hsv, (140, 80, 80), (170, 255, 255))
    return _round_from_mask(magenta, people, 8, 500)


def _round_from_mask(
    mask: np.ndarray,
    people: list[Box],
    min_area: float,
    max_area: float,
) -> Box | None:
    count, _labels, stats, _centroids = cv2.connectedComponentsWithStats(mask, 8)
    best = None
    best_fill = 0.0
    for index in range(1, count):
        x, y, w, h, area = (int(stats[index, i]) for i in range(5))
        if area < min_area or area > max_area or w < 4 or h < 4:
            continue
        aspect = w / float(h)
        fill = area / float(w * h)
        if aspect < 0.7 or aspect > 1.4 or fill < 0.55 or fill < best_fill:
            continue
        if _hits_person(x, y, w, h, people):
            continue
        best_fill = fill
        best = Box(0.0, "ball", float(x) + w / 2.0, float(y) + h / 2.0, 1, 1)
    return best


def _hits_person(x: int, y: int, w: int, h: int, people: list[Box]) -> bool:
    cx = x + w / 2.0
    cy = y + h / 2.0
    for box in people:
        if box.px - 2 <= cx <= box.px + box.w + 2 and box.py - 2 <= cy <= box.py + box.h + 2:
            return True
    return False


def _nms(boxes: list[Box]) -> list[Box]:
    ordered = sorted(boxes, key=lambda box: box.w * box.h, reverse=True)
    kept: list[Box] = []
    players = 0
    referees = 0
    for box in ordered:
        if any(_iou_box(box, other) > 0.4 for other in kept):
            continue
        if box.kind == "player" and players >= 26:
            continue
        if box.kind == "referee" and referees >= 4:
            continue
        kept.append(box)
        if box.kind == "player":
            players += 1
        elif box.kind == "referee":
            referees += 1
    return kept


def _iou_box(a: Box, b: Box) -> float:
    x1, y1 = max(a.px, b.px), max(a.py, b.py)
    x2, y2 = min(a.px + a.w, b.px + b.w), min(a.py + a.h, b.py + b.h)
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    union = a.w * a.h + b.w * b.h - inter
    return inter / union if union else 0.0


def _order_corners(points: list[tuple[int, int]]) -> list[tuple[float, float]]:
    pts = [(float(x), float(y)) for x, y in points]
    top = sorted(pts, key=lambda point: point[1])[:2]
    bottom = sorted(pts, key=lambda point: point[1])[-2:]
    return sorted(top, key=lambda point: point[0]) + sorted(bottom, key=lambda point: point[0])


def _digit_spans(columns: np.ndarray) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    start = None
    for index, value in enumerate(columns.tolist()):
        if value > 0 and start is None:
            start = index
        elif value == 0 and start is not None:
            if index - start >= 2:
                spans.append((start, index))
            start = None
    if start is not None and len(columns) - start >= 2:
        spans.append((start, len(columns)))
    return spans


def _roster_sets(roster: dict | None) -> tuple[set[int], set[int]]:
    if not isinstance(roster, dict):
        return set(), set()

    def numbers(key: str) -> set[int]:
        found: set[int] = set()
        for item in roster.get(key) or []:
            try:
                number = int(item)
            except (TypeError, ValueError):
                continue
            if 0 <= number <= 99:
                found.add(number)
        return found

    return numbers("ours"), numbers("rival")


def _median_rgb(frame: np.ndarray, x: int, y: int, w: int, h: int) -> tuple[float, float, float]:
    crop = frame[max(0, y): y + h, max(0, x): x + w]
    if crop.size == 0:
        return (0.0, 0.0, 0.0)
    median = np.median(crop.reshape(-1, 3), axis=0)
    return (float(median[2]), float(median[1]), float(median[0]))


def _bgr(value: object) -> tuple[int, int, int] | None:
    rgb = hex_to_rgb(value)
    if rgb is None:
        return None
    return int(rgb[2]), int(rgb[1]), int(rgb[0])


def _hsv(bgr: tuple[int, int, int]) -> tuple[int, int, int]:
    pixel = np.uint8([[list(bgr)]])
    hue, sat, val = cv2.cvtColor(pixel, cv2.COLOR_BGR2HSV)[0, 0]
    return int(hue), int(sat), int(val)


def _yellowish(bgr: tuple[int, int, int]) -> bool:
    hue, sat, val = _hsv(bgr)
    return sat > 80 and val > 100 and 16 <= hue <= 42
