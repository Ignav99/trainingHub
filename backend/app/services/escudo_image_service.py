"""
Process team crest / escudo images: remove white backgrounds and normalize dimensions.

All stored escudos are output as 256×256 PNG with transparency so they render
consistently across the app (calendario, partidos, PDFs, etc.).
"""

from __future__ import annotations

import io
import logging
from collections import deque
from typing import Optional, Tuple

from PIL import Image

logger = logging.getLogger(__name__)

ESCUDO_CANVAS = 256
ESCUDO_PADDING = 20
WHITE_TOLERANCE = 30
MAX_BYTES = 5 * 1024 * 1024

ALLOWED_MIME = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def validate_escudo_image(content_type: Optional[str], content: bytes) -> str:
    """Return normalized extension or raise ValueError."""
    if not content_type or content_type.lower() not in ALLOWED_MIME:
        raise ValueError("Solo se permiten imágenes JPEG, PNG o WebP")
    if len(content) > MAX_BYTES:
        raise ValueError("La imagen no puede superar 5MB")
    if len(content) < 32:
        raise ValueError("Archivo de imagen inválido")

    head = content[:12]
    mime = content_type.lower()
    if mime in ("image/jpeg", "image/jpg") and not head.startswith(b"\xff\xd8"):
        raise ValueError("El archivo no es un JPEG válido")
    if mime == "image/png" and not head.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("El archivo no es un PNG válido")
    if mime == "image/webp" and not (head.startswith(b"RIFF") and b"WEBP" in head):
        raise ValueError("El archivo no es un WebP válido")
    return ALLOWED_MIME[mime]


def _is_background_pixel(r: int, g: int, b: int, tolerance: int) -> bool:
    """Near-white pixels treated as background (common on RFAF / scanned crests)."""
    return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance


def remove_white_background(img: Image.Image, tolerance: int = WHITE_TOLERANCE) -> Image.Image:
    """
    Flood-fill white background from image edges so interior white (e.g. in the
    crest design) is preserved when not connected to the border.
    """
    rgba = img.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()

    if width == 0 or height == 0:
        return rgba

    to_clear: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if (x, y) in to_clear:
            return
        r, g, b, a = pixels[x, y]
        if a == 0 or _is_background_pixel(r, g, b, tolerance):
            to_clear.add((x, y))
            queue.append((x, y))

    for x in range(width):
        try_seed(x, 0)
        try_seed(x, height - 1)
    for y in range(height):
        try_seed(0, y)
        try_seed(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            if (nx, ny) in to_clear:
                continue
            r, g, b, a = pixels[nx, ny]
            if a == 0:
                to_clear.add((nx, ny))
                queue.append((nx, ny))
            elif _is_background_pixel(r, g, b, tolerance):
                to_clear.add((nx, ny))
                queue.append((nx, ny))

    for x, y in to_clear:
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

    return rgba


def normalize_escudo_canvas(
    img: Image.Image,
    canvas: int = ESCUDO_CANVAS,
    padding: int = ESCUDO_PADDING,
) -> Image.Image:
    """Crop to content, scale to fit, center on a square transparent canvas."""
    rgba = img.convert("RGBA")
    bbox = rgba.getbbox()
    if not bbox:
        return Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))

    cropped = rgba.crop(bbox)
    max_side = max(1, canvas - 2 * padding)
    cropped.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    x = (canvas - cropped.width) // 2
    y = (canvas - cropped.height) // 2
    out.paste(cropped, (x, y), cropped)
    return out


def process_escudo_bytes(content: bytes, content_type: Optional[str]) -> bytes:
    """
    Validate, strip white background, normalize to 256×256 PNG.
    Returns PNG bytes ready for storage.
    """
    validate_escudo_image(content_type, content)
    with Image.open(io.BytesIO(content)) as img:
        img.load()
        cleaned = remove_white_background(img)
        normalized = normalize_escudo_canvas(cleaned)

    buf = io.BytesIO()
    normalized.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def process_escudo_bytes_safe(content: bytes, content_type: Optional[str]) -> Tuple[bytes, str]:
    """
    Process escudo; on failure log and return original content + type.
    Used for RFAF downloads where we prefer storing something over nothing.
    """
    try:
        return process_escudo_bytes(content, content_type), "image/png"
    except Exception as exc:
        logger.warning("Escudo processing failed, storing original: %s", exc)
        ext = validate_escudo_image(content_type, content) if content_type else "png"
        mime = f"image/{ext}" if ext != "jpg" else "image/jpeg"
        return content, mime
