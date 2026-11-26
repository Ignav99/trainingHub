#!/usr/bin/env python3
"""Banco de la homografía sobre un vídeo real.

Saca unos fotogramas, calibra la cámara y guarda el dibujo del campo encima
de la imagen. Sirve para comparar una prueba con la siguiente sin mirar solo
el JSON del partido entero.

  python3 scripts/vision_homography_bench.py --video vision-worker/prueba2.mp4 --frames 6 --out /tmp/homo
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "vision-worker"))

from kabine_vision.camera import WORK_WIDTH, PitchCamera, pitch_template, work_masks  # noqa: E402
from kabine_vision.homography import apply_h  # noqa: E402


def _frames(path: Path, count: int) -> list[tuple[float, np.ndarray]]:
    cap = cv2.VideoCapture(str(path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
    if total < 2:
        raise SystemExit(f"no se puede leer {path}")
    picks = [int(total * (i + 0.5) / count) for i in range(count)]
    out: list[tuple[float, np.ndarray]] = []
    for index in picks:
        cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        ok, frame = cap.read()
        if ok:
            out.append((index / fps, frame))
    cap.release()
    return out


def _draw(frame: np.ndarray, homography: np.ndarray | None, lines: np.ndarray) -> np.ndarray:
    height, width = frame.shape[:2]
    scale = WORK_WIDTH / float(width)
    small = cv2.resize(frame, (WORK_WIDTH, int(round(height * scale))))
    painted = small.copy()
    painted[lines > 0] = (0, 255, 255)
    if homography is None:
        return painted
    # La homografía devuelta lleva el píxel original al campo de 105×68.
    to_pitch = homography @ np.diag([1.0 / scale, 1.0 / scale, 1.0])
    points = pitch_template(1.2, 105.0, 68.0)
    try:
        image = apply_h(np.linalg.inv(to_pitch), points)
    except np.linalg.LinAlgError:
        return painted
    for x, y in image:
        if 0 <= x < painted.shape[1] - 1 and 0 <= y < painted.shape[0] - 1:
            cv2.circle(painted, (int(x), int(y)), 1, (0, 0, 255), -1)
    return painted


def bench(path: Path, out: Path, frames: int) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    pitch = None
    for second, frame in _frames(path, frames):
        # Cada fotograma se busca solo: en el banco van muy separados y el seguimiento no aplica.
        height, width = frame.shape[:2]
        scale = WORK_WIDTH / float(width)
        size = (WORK_WIDTH, int(round(height * scale)))
        lines, _grass = work_masks(frame, size, None)
        camera = PitchCamera()
        homography = camera.fit(frame)
        pitch = [camera.pitch.length, camera.pitch.width]
        fit = camera.last
        stem = f"{path.stem}-{second:06.1f}s"
        cv2.imwrite(str(out / f"{stem}.jpg"), _draw(frame, homography, lines), [int(cv2.IMWRITE_JPEG_QUALITY), 84])
        rows.append(
            {
                "t": round(second, 2),
                "accepted": homography is not None,
                "lines": int(np.count_nonzero(lines)),
                "forward": None if fit is None else round(float(fit.forward), 2),
                "inliers": None if fit is None else round(float(fit.inliers), 2),
                "explained": None if fit is None else round(float(fit.explained), 2),
                "covered": None if fit is None else round(float(fit.covered), 2),
                "ring": None if fit is None else round(float(fit.ring), 2),
                "visible": None if fit is None else int(fit.visible),
            }
        )
        print(
            f"{stem} lines={rows[-1]['lines']} accepted={rows[-1]['accepted']} "
            f"fwd={rows[-1]['forward']} exp={rows[-1]['explained']}",
            flush=True,
        )
    accepted = sum(1 for row in rows if row["accepted"])
    report = {
        "video": path.name,
        "frames": len(rows),
        "accepted": accepted,
        "rate": round(accepted / len(rows), 3) if rows else 0.0,
        "pitch_m": pitch,
        "rows": rows,
    }
    (out / f"{path.stem}.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"{path.name}: {accepted}/{len(rows)} fotogramas calibrados")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=6)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    bench(args.video, args.out, args.frames)


if __name__ == "__main__":
    main()
