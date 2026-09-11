#!/usr/bin/env python3
"""Comparable Vision bench: decode vs detect. Same script on this VM and on the Mac.

Not the production worker (that is RF-DETR Apache + BoT-SORT).

Mac — copy the mp4 NEXT TO this script (not Desktop), then:

  PY=/Users/User/.pyenv/versions/3.11.9/bin/python3
  cd /Users/User/kabine-vision-bench
  $PY -m pip uninstall -y opencv-python-headless
  $PY -m pip install opencv-python imageio imageio-ffmpeg ultralytics
  cp "/Users/User/Desktop/prueba 2.mp4" ./clip.mp4
  $PY vision_bench.py --video ./clip.mp4 --stride 6
"""

from __future__ import annotations

import argparse
import json
import platform
import re
import resource
import sys
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


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


@dataclass
class VideoSrc:
    path: Path
    fps: float
    frame_count: int
    width: int
    height: int
    backend: str

    def meta(self) -> dict:
        dur = self.frame_count / self.fps if self.fps else 0
        return {
            "path": str(self.path),
            "bytes": self.path.stat().st_size,
            "gb": round(self.path.stat().st_size / (1024**3), 3),
            "width": self.width,
            "height": self.height,
            "fps": self.fps,
            "frame_count": self.frame_count,
            "duration_s": round(dur, 2),
            "backend": self.backend,
            "opencv": cv2.__version__,
            "ffmpeg_build": ffmpeg_enabled(),
        }

    def iter_bgr(self) -> Iterator[np.ndarray]:
        if self.backend == "opencv":
            cap = cv2.VideoCapture(str(self.path))
            try:
                while True:
                    ok, frame = cap.read()
                    if not ok:
                        break
                    yield frame
            finally:
                cap.release()
            return
        import imageio.v2 as imageio

        reader = imageio.get_reader(str(self.path), format="FFMPEG")
        try:
            for frame in reader:
                yield frame[:, :, ::-1].copy()
        finally:
            reader.close()


def try_opencv(path: Path) -> VideoSrc | None:
    backends: list[tuple[str, int]] = []
    if hasattr(cv2, "CAP_FFMPEG"):
        backends.append(("CAP_FFMPEG", int(cv2.CAP_FFMPEG)))
    if sys.platform == "darwin" and hasattr(cv2, "CAP_AVFOUNDATION"):
        backends.append(("CAP_AVFOUNDATION", int(cv2.CAP_AVFOUNDATION)))
    backends.append(("CAP_ANY", int(cv2.CAP_ANY)))
    for _, be in backends:
        cap = cv2.VideoCapture(str(path), be)
        if cap.isOpened():
            ok, frame = cap.read()
            if ok and frame is not None and frame.size:
                fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 30.0
                count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
                h, w = frame.shape[:2]
                cap.release()
                return VideoSrc(path, fps, count, w, h, "opencv")
        cap.release()
    return None


def try_imageio(path: Path) -> VideoSrc | None:
    try:
        import imageio.v2 as imageio
    except ImportError:
        return None
    try:
        reader = imageio.get_reader(str(path), format="FFMPEG")
        meta = reader.get_meta_data()
        frame = reader.get_data(0)
        reader.close()
    except Exception:
        return None
    if frame is None or not getattr(frame, "size", 0):
        return None
    fps = float(meta.get("fps") or 30)
    raw_n = meta.get("nframes")
    if raw_n is None:
        raw_n = meta.get("n_frames") or 0
    try:
        n = int(raw_n)
    except (TypeError, OverflowError, ValueError):
        n = 0
    if n <= 0 or n > 10**9:
        n = 0
    h, w = frame.shape[:2]
    if n == 0 and fps:
        dur = float(meta.get("duration") or 0)
        n = int(dur * fps) if dur else 0
    return VideoSrc(path, fps, n, w, h, "imageio")


def open_src(path: Path, backend: str) -> VideoSrc:
    size = path.stat().st_size
    errors: list[str] = []
    if backend in ("auto", "opencv"):
        src = try_opencv(path)
        if src:
            return src
        errors.append("opencv: no stream")
    if backend in ("auto", "imageio"):
        src = try_imageio(path)
        if src:
            return src
        errors.append("imageio: no stream (pip install imageio imageio-ffmpeg)")
    raise SystemExit(
        "\n".join(
            [
                f"cannot open {path}",
                f"  exists={path.exists()} is_file={path.is_file()} bytes={size} ({size / (1024**2):.1f} MB)",
                f"  opencv={cv2.__version__} ffmpeg_build={ffmpeg_enabled()}",
                f"  tried={errors}",
                "  On Mac: copy the mp4 next to the script, not from Desktop:",
                "    cp \"/Users/User/Desktop/prueba 2.mp4\" /Users/User/kabine-vision-bench/clip.mp4",
                "    python3 -m pip uninstall -y opencv-python-headless",
                "    python3 -m pip install opencv-python imageio imageio-ffmpeg",
                "    python3 vision_bench.py --video ./clip.mp4 --stride 6",
                "  If bytes is 0 or a few KB, download the file from iCloud in Finder first.",
            ]
        )
    )


def decode_pass(src: VideoSrc, max_seconds: float | None) -> dict:
    limit = int(max_seconds * src.fps) if max_seconds and src.fps else None
    n = 0
    t0 = time.perf_counter()
    for _ in src.iter_bgr():
        n += 1
        if limit is not None and n >= limit:
            break
    elapsed = time.perf_counter() - t0
    return {
        "frames": n,
        "seconds": round(elapsed, 3),
        "decode_fps": round(n / elapsed, 2) if elapsed else None,
        "rss_mb": round(rss_mb(), 1),
    }


def detect_pass(src: VideoSrc, stride: int, max_seconds: float | None, imgsz: int) -> dict:
    from ultralytics import YOLO

    model = YOLO("yolo11n.pt")
    limit = int(max_seconds * src.fps) if max_seconds and src.fps else None
    people: list[int] = []
    balls = 0
    infer_n = 0
    frame_i = 0
    t0 = time.perf_counter()
    for frame in src.iter_bgr():
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
    clip_s = float(max_seconds) if max_seconds else (frame_i / src.fps if src.fps else 0.0)
    extra = round((90 * 60) / clip_s * elapsed / 60, 1) if elapsed and clip_s else None
    return {
        "decoded_frames": frame_i,
        "inferred_frames": infer_n,
        "stride": stride,
        "sample_fps": round((src.fps / stride), 2) if src.fps else None,
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
    ap.add_argument("--backend", choices=("auto", "opencv", "imageio"), default="auto")
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    path = Path(args.video).expanduser().resolve()
    if not path.exists():
        raise SystemExit(f"missing {path}")
    if not path.is_file():
        raise SystemExit(f"not a file {path}")

    src = open_src(path, args.backend)
    report: dict = {
        "host": {
            "system": platform.system(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python": sys.version.split()[0],
            "device": device_label(),
        },
        "video": src.meta(),
        "args": {
            "stride": args.stride,
            "max_seconds": args.max_seconds,
            "imgsz": args.imgsz,
            "decode_only": args.decode_only,
            "backend": args.backend,
        },
    }
    report["decode"] = decode_pass(src, args.max_seconds)
    if not args.decode_only:
        report["detect"] = detect_pass(src, args.stride, args.max_seconds, args.imgsz)

    text = json.dumps(report, indent=2)
    print(text)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text)


if __name__ == "__main__":
    main()
