#!/usr/bin/env python3
"""One-shot local probe (CPU/MPS). Not the production worker (that is RF-DETR Apache)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

# COCO: person=0, sports ball=32
PERSON, BALL = 0, 32


def jersey_label(bgr: np.ndarray) -> str:
    """Rough kit from the torso crop. White = low saturation, high value."""
    if bgr.size == 0:
        return "unknown"
    h, w = bgr.shape[:2]
    torso = bgr[int(h * 0.15) : int(h * 0.65), int(w * 0.2) : int(w * 0.8)]
    if torso.size == 0:
        torso = bgr
    hsv = cv2.cvtColor(torso, cv2.COLOR_BGR2HSV)
    sat = float(np.median(hsv[:, :, 1]))
    val = float(np.median(hsv[:, :, 2]))
    hue = float(np.median(hsv[:, :, 0]))
    if val > 140 and sat < 70:
        return "white"
    if 90 <= hue <= 135 and sat > 40:
        return "blue"
    if sat > 80 and (hue <= 25 or hue >= 160):
        return "red_or_yellow"
    return "other"


def draw(frame, xyxy, kind: str, kit: str | None, conf: float):
    x1, y1, x2, y2 = map(int, xyxy)
    if kind == "ball":
        color = (0, 255, 255)
        label = f"ball {conf:.2f}"
    elif kit == "white":
        color = (255, 255, 255)
        label = f"ours {conf:.2f}"
    elif kit == "blue":
        color = (255, 80, 40)
        label = f"rival {conf:.2f}"
    else:
        color = (180, 180, 180)
        label = f"{kit or kind} {conf:.2f}"
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    cv2.putText(frame, label, (x1, max(18, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--video", default="_inbox/prueba 2.mp4")
    p.add_argument("--out", default="/opt/cursor/artifacts/vision-probe")
    p.add_argument("--weights", default="yolo11n.pt")
    p.add_argument("--every", type=int, default=10, help="keep 1 of N frames (~3 fps at 30fps)")
    p.add_argument("--imgsz", type=int, default=640)
    args = p.parse_args()

    video = Path(args.video)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    model = YOLO(args.weights)
    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    counts = {"frames": 0, "person": 0, "white": 0, "blue": 0, "other": 0, "ball": 0}
    snapshots = []
    snap_at = {1.0, 6.0, 12.0, 18.0}
    snapped = set()

    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = i / fps
        i += 1
        if (i - 1) % args.every != 0:
            continue

        res = model.predict(frame, imgsz=args.imgsz, verbose=False, conf=0.25)[0]
        vis = frame.copy()
        fw = {"white": 0, "blue": 0, "other": 0, "ball": 0, "person": 0}
        if res.boxes is not None:
            for b in res.boxes:
                cls = int(b.cls.item())
                conf = float(b.conf.item())
                xyxy = b.xyxy[0].tolist()
                x1, y1, x2, y2 = map(int, xyxy)
                crop = frame[max(0, y1) : y2, max(0, x1) : x2]
                if cls == BALL:
                    counts["ball"] += 1
                    fw["ball"] += 1
                    draw(vis, xyxy, "ball", None, conf)
                elif cls == PERSON:
                    kit = jersey_label(crop)
                    counts["person"] += 1
                    counts[kit if kit in counts else "other"] += 1
                    fw["person"] += 1
                    fw[kit if kit in fw else "other"] += 1
                    draw(vis, xyxy, "person", kit, conf)
        counts["frames"] += 1

        for s in snap_at:
            if t >= s and s not in snapped:
                path = out / f"detect-{int(s):02d}s.jpg"
                cv2.imwrite(str(path), vis, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                snapshots.append({"t": round(t, 2), "file": str(path), **fw})
                snapped.add(s)

    cap.release()
    summary = {
        "video": str(video),
        "weights": args.weights,
        "fps": fps,
        "frames_total": n,
        "frames_inferred": counts["frames"],
        "every": args.every,
        "imgsz": args.imgsz,
        "counts": counts,
        "snapshots": snapshots,
        "note": "CPU COCO yolo11n probe. White/blue from jersey HSV, not SigLIP. Production = RF-DETR + BoT-SORT.",
    }
    (out / "probe.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
