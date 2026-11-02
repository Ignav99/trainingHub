#!/usr/bin/env python3
"""Fotogramas sueltos con las líneas y el césped que ve la calibración, en un solo JPG.

  python3 scripts/vision_frames.py --video partido.mp4 --tiempos 450 550 2000 2800 4400 4500

Izquierda, el fotograma. Derecha, en rojo las líneas que encuentra y en verde el césped.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "vision-worker"))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

from kabine_vision.camera import WORK_WIDTH, work_masks  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--tiempos", nargs="+", type=float, required=True, help="segundos del vídeo")
    parser.add_argument("--salida", default="/workspace/fotogramas.jpg")
    args = parser.parse_args()

    cap = cv2.VideoCapture(args.video)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
    rows = []
    for t in args.tiempos:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * fps)))
        ok, frame = cap.read()
        if not ok:
            print(f"{t:8.1f} s  no se pudo leer")
            continue
        height, width = frame.shape[:2]
        size = (WORK_WIDTH, int(round(height * WORK_WIDTH / float(width))))
        lines, grass = work_masks(frame, size)
        small = cv2.resize(frame, size)
        view = small.copy()
        view[grass > 0] = (0.6 * view[grass > 0] + 0.4 * np.array([0, 160, 0])).astype(np.uint8)
        view[lines > 0] = (0, 0, 255)
        text = f"{t:.0f}s  lineas {int(np.count_nonzero(lines))} px  cesped {100.0 * np.count_nonzero(grass) / grass.size:.0f}%"
        print(text, flush=True)
        both = np.hstack([small, view])
        cv2.putText(both, text, (8, both.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4, cv2.LINE_AA)
        cv2.putText(both, text, (8, both.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
        rows.append(both)
    cap.release()
    if rows:
        cv2.imwrite(args.salida, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 80])
        print(f"Guardado en {args.salida}")


if __name__ == "__main__":
    main()
