"""Dónde vive el tracking en este PC.

El JSON principal se queda al lado del vídeo. Otra copia entra en la carpeta
del programa. El índice recuerda el archivo para no volver a pedir la ruta.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from collections.abc import Callable
from pathlib import Path

from .preview import PreviewError

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".avi", ".webm", ".mkv"}
_lock = threading.Lock()
Picker = Callable[[str], str]


def program_dir() -> Path:
    raw = os.environ.get("KABINE_VISION_DIR", "").strip()
    if raw:
        return Path(os.path.expanduser(raw))
    return Path.home() / ".kabine" / "vision"


def program_copy_for(video: Path) -> Path:
    size = video.stat().st_size
    stem = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in video.stem)[:80] or "partido"
    return program_dir() / "partidos" / f"{stem}-{size}.kabine-vision.json"


def recall_video(name: str, size: int) -> dict:
    path = _lookup(name.strip(), int(size or 0))
    if path is None:
        return {"found": False}
    return {"found": True, "path": str(path), "name": path.name, "size": path.stat().st_size}


def choose_video(name: str = "", size: int = 0, *, picker: Picker | None = None) -> dict:
    pick = picker or native_picker
    try:
        raw = pick(name.strip())
    except PreviewError:
        raise
    except Exception as exc:
        raise PreviewError("no pude abrir el selector de archivos de este Mac") from exc
    path = Path(os.path.expanduser(str(raw).strip())).resolve()
    if path.suffix.lower() not in VIDEO_EXT:
        raise PreviewError("tiene que ser un vídeo")
    if not path.is_file():
        raise PreviewError("no encuentro ese partido en este PC")
    expected = int(size or 0)
    if expected and path.stat().st_size != expected:
        raise PreviewError("ese archivo no es el vídeo que tienes abierto en Kabine. Elige el mismo.")
    remember(path)
    return {"found": True, "path": str(path), "name": path.name, "size": path.stat().st_size}


def remember(video: Path, *, stored_path: str | None = None, program_path: str | None = None) -> None:
    video = video.resolve()
    size = video.stat().st_size
    key = f"{video.name}:{size}"
    with _lock:
        data = _read_index()
        prev = data.get(key) if isinstance(data.get(key), dict) else {}
        data[key] = {
            "name": video.name,
            "size": size,
            "path": str(video),
            "stored_path": stored_path or prev.get("stored_path"),
            "program_path": program_path or prev.get("program_path"),
        }
        _write_index(data)


def native_picker(hint_name: str) -> str:
    if sys.platform != "darwin":
        raise PreviewError("el selector de archivos de Visión está en el Mac. Arranca el programa allí.")
    label = _safe_label(hint_name) or "el partido"
    prompt = f"Elige {label}. Es el mismo archivo que tienes abierto en Kabine."
    script = (
        "POSIX path of (choose file with prompt "
        + _apple_string(prompt)
        + ' of type {"public.movie", "public.mpeg-4", "com.apple.quicktime-movie"})'
    )
    try:
        done = subprocess.run(
            ["osascript", "-e", script],
            check=True,
            capture_output=True,
            text=True,
            timeout=600,
        )
    except subprocess.CalledProcessError as exc:
        err = f"{exc.stderr or ''} {exc.stdout or ''}"
        if "cancel" in err.lower() or "-128" in err:
            raise PreviewError("has cancelado la elección del partido") from exc
        raise PreviewError("no pude abrir el selector de archivos de este Mac") from exc
    except subprocess.TimeoutExpired as exc:
        raise PreviewError("el selector de archivos se quedó esperando") from exc
    chosen = done.stdout.strip()
    if not chosen:
        raise PreviewError("has cancelado la elección del partido")
    return chosen


def _lookup(name: str, size: int) -> Path | None:
    if not name or size <= 0:
        return None
    with _lock:
        data = _read_index()
    row = data.get(f"{name}:{size}")
    if not isinstance(row, dict):
        return None
    raw = str(row.get("path") or "")
    if not raw:
        return None
    path = Path(raw)
    try:
        if not path.is_file() or path.stat().st_size != size:
            return None
    except OSError:
        return None
    return path.resolve()


def _index_path() -> Path:
    return program_dir() / "index.json"


def _read_index() -> dict:
    path = _index_path()
    if not path.is_file():
        return {}
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return loaded if isinstance(loaded, dict) else {}


def _write_index(data: dict) -> None:
    path = _index_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def _safe_label(name: str) -> str:
    cleaned = "".join(ch for ch in name if ch.isprintable() and ch not in '"\\')
    return cleaned.strip()[:80]


def _apple_string(text: str) -> str:
    return '"' + text.replace("\\", "\\\\").replace('"', "") + '"'
