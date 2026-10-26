"""Biblioteca permanente de recortes. No caduca y no entra en la purga de revisión."""

from __future__ import annotations

import re
from uuid import UUID

_EXT = {"mp4", "webm", "mov", "mkv"}
_PATH = re.compile(
    r"^biblioteca/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(mp4|webm|mov|mkv)$"
)


def extension_for(filename: str | None, mime: str | None) -> str:
    name = (filename or "").lower()
    if "." in name:
        ext = name.rsplit(".", 1)[-1]
        if ext == "qt":
            ext = "mov"
        if ext in _EXT:
            return ext
    raw = (mime or "").lower()
    if "mp4" in raw:
        return "mp4"
    if "quicktime" in raw:
        return "mov"
    if "matroska" in raw or "mkv" in raw:
        return "mkv"
    return "webm"


def make_biblioteca_storage_path(equipo_id: str, corte_id: str, filename: str | None, mime: str | None = None) -> str:
    ext = extension_for(filename, mime)
    return f"biblioteca/{equipo_id}/{corte_id}.{ext}"


def is_allowed_biblioteca_path(path: str, equipo_id: str) -> bool:
    if not path or ".." in path or path.startswith("/") or "\\" in path:
        return False
    if not _PATH.match(path):
        return False
    return path.startswith(f"biblioteca/{equipo_id}/")


def corte_id_from_path(path: str) -> str | None:
    if not _PATH.match(path or ""):
        return None
    stem = path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    try:
        return str(UUID(stem))
    except ValueError:
        return None


def format_storage_bytes(size: int) -> str:
    n = max(0, int(size or 0))
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB".replace(".", ",")
    if n < 1024 * 1024 * 1024:
        return f"{n / (1024 * 1024):.1f} MB".replace(".", ",")
    return f"{n / (1024 * 1024 * 1024):.2f} GB".replace(".", ",")


def clean_search(value: str | None) -> str:
    text = (value or "").replace("%", "").replace(",", " ").strip()
    return text[:80]


def minute_ok(value: int | None) -> bool:
    if value is None:
        return True
    return 0 <= value <= 130


_SUBFASE_PARENT = {
    "creacion": "ataque_organizado",
    "progresion": "ataque_organizado",
    "finalizacion": "ataque_organizado",
    "bloque_alto": "defensa_organizada",
    "bloque_medio": "defensa_organizada",
    "bloque_bajo": "defensa_organizada",
    "bloque_mixto": "defensa_organizada",
}


def split_fase(value: str | None) -> tuple[str | None, str | None]:
    """Si el código es una subfase, devuelve (fase, subfase). Si no, (fase, None)."""
    code = (value or "").strip() or None
    if not code:
        return None, None
    parent = _SUBFASE_PARENT.get(code)
    if parent:
        return parent, code
    return code, None
