"""
TrainingHub Pro - Video Clip Service
Extracts MP4 clips from videos using ffmpeg by URL + timestamps.
"""

import logging
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


async def extract_clip(
    video_url: str,
    start_ms: int,
    end_ms: int,
    output_format: str = "mp4",
) -> Path:
    """
    Extract a clip from a video URL using ffmpeg.
    Returns path to the temporary output file.
    """
    start_secs = start_ms / 1000.0
    duration_secs = (end_ms - start_ms) / 1000.0

    suffix = f".{output_format}"
    output_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    output_path = Path(output_file.name)
    output_file.close()

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_secs),
        "-i", video_url,
        "-t", str(duration_secs),
        "-c:v", "libx264",
        "-c:a", "aac",
        "-movflags", "+faststart",
        "-preset", "fast",
        output_path.as_posix(),
    ]

    logger.info(f"Extracting clip: {start_ms}ms-{end_ms}ms from {video_url[:80]}...")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            logger.error(f"ffmpeg error: {result.stderr[:500]}")
            raise RuntimeError(f"ffmpeg failed: {result.stderr[:200]}")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("ffmpeg produced empty output")

        logger.info(f"Clip extracted: {output_path.stat().st_size} bytes")
        return output_path

    except subprocess.TimeoutExpired:
        output_path.unlink(missing_ok=True)
        raise RuntimeError("ffmpeg timed out after 120s")
    except Exception:
        output_path.unlink(missing_ok=True)
        raise


async def extract_compilation(
    clips: list[dict],
    output_format: str = "mp4",
) -> Path:
    """
    Extract and concatenate multiple clips into one video.
    Each clip dict: { video_url, start_ms, end_ms }
    """
    clip_paths: list[Path] = []

    try:
        # Extract individual clips
        for clip in clips:
            path = await extract_clip(
                clip["video_url"],
                clip["start_ms"],
                clip["end_ms"],
                output_format,
            )
            clip_paths.append(path)

        if len(clip_paths) == 1:
            return clip_paths[0]

        # Create concat file
        concat_file = tempfile.NamedTemporaryFile(
            suffix=".txt", mode="w", delete=False
        )
        for p in clip_paths:
            concat_file.write(f"file '{p.as_posix()}'\n")
        concat_file.close()

        # Concatenate
        output_file = tempfile.NamedTemporaryFile(
            suffix=f".{output_format}", delete=False
        )
        output_path = Path(output_file.name)
        output_file.close()

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file.name,
            "-c", "copy",
            "-movflags", "+faststart",
            output_path.as_posix(),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        Path(concat_file.name).unlink(missing_ok=True)

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg concat failed: {result.stderr[:200]}")

        return output_path

    finally:
        # Clean up individual clips (except if single clip returned)
        if len(clip_paths) > 1:
            for p in clip_paths:
                p.unlink(missing_ok=True)
