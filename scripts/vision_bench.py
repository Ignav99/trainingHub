#!/usr/bin/env python3
"""Comparable Vision bench: decode vs detect. Same script on this VM and on the Mac.

Not the production worker (that is RF-DETR Apache + BoT-SORT). This times:
  - OpenCV decode of a Veo MP4
  - optional Ultralytics YOLO person boxes (COCO) at a chosen stride

Mac (from any folder, use the full path to this file):

  PY=/Users/User/.pyenv/versions/3.11.9/bin/python3
  $PY -m pip uninstall -y opencv-python-headless
  $PY -m pip install opencv-python ultralytics
  cp "/ruta/prueba 2.mp4" /Users/User/kabine-vision-bench/clip.mp4
  $PY vision_bench.py --video /Users/User/kabine-vision-bench/clip.mp4 --stride 6
"""

from __future__ import annotations

import argparse
import json
import platform
import re
import resource
import sys
import time
from pathlib import Path

import cv2


def rss_mb() -> float:
    val = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if sys.platform == "darwin":
        return val / (1024.0 * 1024.0)
    return val / 1024.0


def device_label() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return f"cuda:{torch.cuda.get_device_name(0)}"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def ffmpeg_enabled() -> bool:
    return bool(re.search(r"FFMPEG\s*:\s*YES", cv2.getBuildInformation()))


def capture_backends() -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    if hasattr(cv2, "CAP_FFMPEG"):
        out.append(("CAP_FFMPEG", int(cv2.CAP_FFMPEG)))
    if sys.platform == "darwin" and hasattr(cv2, "CAP_AVFOUNDATION"):
        out.append(("CAP_AVFOUNDATION", int(cv2.CAP_AVFOUNDATION)))
    out.append(("CAP_ANY", int(cv2.CAP_ANY)))
    return out


def fail_open(path: Path, tried: list[str]) -> str:
    size = path.stat().st_size if path.exists() else 0
    lines = [
        f"cannot open {path}",
        f"  exists={path.exists()} is_file={path.is_file()} bytes={size} ({size / (1024**2):.1f} MB)",
        f"  opencv={cv2.__version__} ffmpeg_build={ffmpeg_enabled()}",
        f"  backends={tried}",
        "  Fix on Mac:",
        "    1) Copy the mp4 next to this script (Desktop/Downloads are often blocked):",
        "       cp \"/path/to/clip.mp4\" /Users/User/kabine-vision-bench/clip.mp4",
        "    2) Use opencv-python, not headless:",
        "       python3 -m pip uninstall -y opencv-python-headless",
        "       python3 -m pip install opencv-python",
        "    3) If bytes is 0 or ~ a few KB, download the file from iCloud in Finder first.",
        "    4) Confirm QuickTime can play the file.",
    ]
    return "\n".join(lines)


def open_video(path: Path) -> cv2.VideoCapture:
    tried: list[str] = []
    for name, backend in capture_backends():
        cap = cv2.VideoCapture(str(path), backend)
        opened = bool(cap.isOpened())
        ok = False
        if opened:
            ok, frame = cap.read()
            if ok and frame is not None and frame.size:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                return cap
        cap.release()
        tried.append(f"{name}:opened={opened}:read={ok}")
    raise SystemExit(fail_open(path, tried))


def video_meta(path: Path) -> dict:
    cap = open_video(path)
    meta = {
        "path": str(path),
        "bytes": path.stat().st_size,
        "gb": round(path.stat().st_size / (1024**3), 3),
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "fps": float(cap.get(cv2.CAP_PROP_FPS) or 0),
        "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0),
        "opencv": cv2.__version__,
        "ffmpeg_build": ffmpeg_enabled(),
    }
    dur = meta["frame_count"] / meta["fps"] if meta["fps"] else 0
    meta["duration_s"] = round(dur, 2)
    cap.release()
    return meta


def decode_pass(path: Path, max_seconds: float | None) -> dict:
    cap = open_video(path)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30)
    limit = int(max_seconds * fps) if max_seconds else None
    n = 0
    t0 = time.perf_counter()
    while True:
        ok, _ = cap.read()
        if not ok:
            break
        n += 1
        if limit is not None and n >= limit:
            break
    elapsed = time.perf_counter() - t0
    cap.release()
    return {
        "frames": n,
        "seconds": round(elapsed, 3),
        "decode_fps": round(n / elapsed, 2) if elapsed else None,
        "rss_mb": round(rss_mb(), 1),
    }


def detect_pass(path: Path, stride: int, max_seconds: float | None, imgsz: int) -> dict:
    from ultralytics import YOLO

    model = YOLO("yolo11n.pt")
    cap = open_video(path)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30)
    limit = int(max_seconds * fps) if max_seconds else None
    people: list[int] = []
    balls = 0
    infer_n = 0
    frame_i = 0
    t0 = time.perf_counter()
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if limit is not None and frame_i >= limit:
            break
        if frame_i % stride == 0:
            res = model.predict(frame, imgsz=imgsz, verbose=False, conf=0.25)[0]
            n_person = 0
            for box in res.boxes:
                cls = int(box.cls[0])
                if cls == 0:
                    n_person += 1
                elif cls == 32:
                    balls += 1
            people.append(n_person)
            infer_n += 1
        frame_i += 1
    elapsed = time.perf_counter() - t0
    cap.release()
    clip_s = float(max_seconds) if max_seconds else (frame_i / fps if fps else 0.0)
    extra = round((90 * 60) / clip_s * elapsed / 60, 1) if elapsed and clip_s else None
    return {
        "decoded_frames": frame_i,
        "inferred_frames": infer_n,
        "stride": stride,
        "sample_fps": round((fps / stride), 2) if fps else None,
        "seconds": round(elapsed, 3),
        "infer_per_s": round(infer_n / elapsed, 2) if elapsed else None,
        "people_min": min(people) if people else 0,
        "people_max": max(people) if people else 0,
        "people_mean": round(sum(people) / len(people), 2) if people else 0,
        "ball_hits": balls,
        "rss_mb": round(rss_mb(), 1),
        "clip_s": round(clip_s, 2),
        "extrapolate_90min_min": extra,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--stride", type=int, default=6, help="1 = every frame (~30 fps); 6 ≈ 5 fps")
    ap.add_argument("--max-seconds", type=float, default=None)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--decode-only", action="store_true")
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    path = Path(args.video).expanduser().resolve()
    if not path.exists():
        raise SystemExit(f"missing {path}")
    if not path.is_file():
        raise SystemExit(f"not a file {path}")

    report: dict = {
        "host": {
            "system": platform.system(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python": sys.version.split()[0],
            "device": device_label(),
        },
        "video": video_meta(path),
        "args": {
            "stride": args.stride,
            "max_seconds": args.max_seconds,
            "imgsz": args.imgsz,
            "decode_only": args.decode_only,
        },
    }
    report["decode"] = decode_pass(path, args.max_seconds)
    if not args.decode_only:
        report["detect"] = detect_pass(path, args.stride, args.max_seconds, args.imgsz)

    text = json.dumps(report, indent=2)
    print(text)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text)


if __name__ == "__main__":
    main()
