"""Tests for escudo image processing."""

import io

import pytest
from PIL import Image

from app.services.escudo_image_service import (
    ESCUDO_CANVAS,
    normalize_escudo_canvas,
    process_escudo_bytes,
    remove_white_background,
    validate_escudo_image,
)


def _png_bytes(size=(120, 120), bg=(255, 255, 255), fg=(200, 0, 0), fg_box=(40, 40, 80, 80)) -> bytes:
    img = Image.new("RGB", size, bg)
    draw_box = Image.new("RGB", (fg_box[2] - fg_box[0], fg_box[3] - fg_box[1]), fg)
    img.paste(draw_box, (fg_box[0], fg_box[1]))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_validate_rejects_non_image():
    with pytest.raises(ValueError, match="Solo se permiten"):
        validate_escudo_image("application/pdf", b"%PDF")


def test_remove_white_background_from_edges():
    raw = _png_bytes()
    with Image.open(io.BytesIO(raw)) as img:
        cleaned = remove_white_background(img)
    # Center pixel (crest) should remain opaque
    cx, cy = 60, 60
    assert cleaned.getpixel((cx, cy))[3] > 0
    # Corner should be transparent
    assert cleaned.getpixel((0, 0))[3] == 0


def test_normalize_escudo_canvas_size():
    with Image.open(io.BytesIO(_png_bytes())) as img:
        cleaned = remove_white_background(img)
        out = normalize_escudo_canvas(cleaned)
    assert out.size == (ESCUDO_CANVAS, ESCUDO_CANVAS)


def test_process_escudo_bytes_outputs_png():
    raw = _png_bytes()
    out = process_escudo_bytes(raw, "image/png")
    assert out[:8] == b"\x89PNG\r\n\x1a\n"
    with Image.open(io.BytesIO(out)) as img:
        assert img.size == (ESCUDO_CANVAS, ESCUDO_CANVAS)
        assert img.mode == "RGBA"
