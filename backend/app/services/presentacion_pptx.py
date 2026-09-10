"""Build a widescreen .pptx locker-room briefing.

The file opens in PowerPoint, Keynote and Google Slides (File → Open).
"""

from __future__ import annotations

import io
import logging
from typing import Any

import requests
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

logger = logging.getLogger(__name__)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

BG = RGBColor(14, 18, 24)
INK = RGBColor(232, 237, 242)
MUTED = RGBColor(148, 163, 184)
ACCENT = RGBColor(16, 185, 129)
CARD = RGBColor(22, 28, 38)


def _rgb(hex_color: str | None, fallback: RGBColor) -> RGBColor:
    raw = (hex_color or "").replace("#", "").strip()
    if len(raw) == 3:
        raw = "".join(c * 2 for c in raw)
    if len(raw) < 6:
        return fallback
    try:
        return RGBColor(int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16))
    except ValueError:
        return fallback


def _set_run(run, text: str, *, size: int, bold: bool = False, color: RGBColor = INK) -> None:
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = "Calibri"


def _fill(shape, color: RGBColor) -> None:
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def _fetch_image(url: str | None) -> io.BytesIO | None:
    if not url or not str(url).startswith("http"):
        return None
    try:
        r = requests.get(url, timeout=8)
        r.raise_for_status()
        if len(r.content) < 80 or len(r.content) > 2_000_000:
            return None
        return io.BytesIO(r.content)
    except Exception as exc:
        logger.warning("presentacion crest fetch failed: %s", exc)
        return None


def _add_picture(slide, blob: io.BytesIO | None, left, top, width) -> None:
    if blob is None:
        return
    try:
        blob.seek(0)
        slide.shapes.add_picture(blob, left, top, width=width)
    except Exception as exc:
        logger.warning("presentacion picture skip: %s", exc)


def _blank(prs: Presentation):
    return prs.slides.add_slide(prs.slide_layouts[6])


def _chrome(slide, stripe: RGBColor, footer: str, index: int, total: int) -> None:
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    _fill(bg, BG)
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.18), SLIDE_H)
    _fill(bar, stripe)
    accent = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, SLIDE_H - Inches(0.08), SLIDE_W, Inches(0.08))
    _fill(accent, ACCENT)
    box = slide.shapes.add_textbox(Inches(0.55), SLIDE_H - Inches(0.42), Inches(10), Inches(0.28))
    run = box.text_frame.paragraphs[0].add_run()
    _set_run(run, footer, size=11, color=MUTED)
    num = slide.shapes.add_textbox(Inches(11.6), SLIDE_H - Inches(0.42), Inches(1.3), Inches(0.28))
    np = num.text_frame.paragraphs[0]
    np.alignment = PP_ALIGN.RIGHT
    run = np.add_run()
    _set_run(run, f"{index} / {total}", size=11, color=MUTED)


def _add_kicker(slide, text: str, top=Inches(0.42)) -> None:
    if not text:
        return
    box = slide.shapes.add_textbox(Inches(0.7), top, Inches(12), Inches(0.32))
    p = box.text_frame.paragraphs[0]
    run = p.add_run()
    _set_run(run, text.upper(), size=13, bold=True, color=ACCENT)


def _add_title(slide, text: str, top=Inches(0.78), size: int = 36) -> None:
    box = slide.shapes.add_textbox(Inches(0.7), top, Inches(12.1), Inches(1.15))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    run = p.add_run()
    _set_run(run, text, size=size, bold=True, color=INK)


def _slide_portada(slide, slide_data: dict, meta: dict, stripe: RGBColor, club_img, rival_img, index: int, total: int) -> None:
    _chrome(slide, stripe, meta.get("club_nombre") or "Charla de partido", index, total)
    kicker = slide_data.get("kicker") or meta.get("club_nombre") or ""
    _add_kicker(slide, kicker)
    _add_title(slide, slide_data.get("title") or "", top=Inches(0.85), size=44)

    _add_picture(slide, club_img, Inches(0.75), Inches(2.35), Inches(1.35))
    vs = slide.shapes.add_textbox(Inches(2.2), Inches(2.7), Inches(0.7), Inches(0.5))
    p = vs.text_frame.paragraphs[0]
    run = p.add_run()
    _set_run(run, "VS", size=18, bold=True, color=MUTED)
    _add_picture(slide, rival_img, Inches(2.9), Inches(2.35), Inches(1.35))

    meta_bits = [b for b in (slide_data.get("bullets") or []) if b]
    extra = [meta.get("fecha"), meta.get("hora"), meta.get("tramo"), meta.get("localia"), meta.get("campo")]
    for bit in extra:
        if bit and bit not in meta_bits:
            meta_bits.append(bit)
    ticker = "   ·   ".join(str(b) for b in meta_bits if b)
    if ticker:
        box = slide.shapes.add_textbox(Inches(0.7), Inches(4.15), Inches(12), Inches(0.4))
        run = box.text_frame.paragraphs[0].add_run()
        _set_run(run, ticker, size=16, color=MUTED)


def _slide_claves(slide, slide_data: dict, footer: str, stripe: RGBColor, index: int, total: int) -> None:
    _chrome(slide, stripe, footer, index, total)
    _add_kicker(slide, slide_data.get("kicker") or "Claves")
    _add_title(slide, slide_data.get("title") or "Lo que importa hoy")
    keywords = slide_data.get("keywords") or []
    if not keywords:
        return
    n = min(len(keywords), 6)
    gap = Inches(0.22)
    left = Inches(0.7)
    usable = SLIDE_W - Inches(1.4)
    width = int((usable - gap * (n - 1)) / n)
    top = Inches(2.35)
    for i, word in enumerate(keywords[:n]):
        x = left + (width + gap) * i
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, top, width, Inches(2.35))
        _fill(card, CARD)
        tf = card.text_frame
        tf.word_wrap = True
        tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        tf.auto_size = None
        # vertical-ish: pad
        try:
            tf.auto_size = None
        except Exception:
            pass
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        _set_run(run, str(word), size=18, bold=True, color=INK)


def _slide_bullets(slide, slide_data: dict, footer: str, stripe: RGBColor, index: int, total: int) -> None:
    _chrome(slide, stripe, footer, index, total)
    _add_kicker(slide, slide_data.get("kicker") or "")
    _add_title(slide, slide_data.get("title") or "")
    bullets = slide_data.get("bullets") or []
    top = Inches(2.15)
    for i, line in enumerate(bullets[:4]):
        mark = slide.shapes.add_shape(
            MSO_SHAPE.OVAL,
            Inches(0.75),
            top + Inches(0.18),
            Inches(0.18),
            Inches(0.18),
        )
        _fill(mark, ACCENT)
        box = slide.shapes.add_textbox(Inches(1.12), top, Inches(11.3), Inches(0.7))
        tf = box.text_frame
        tf.word_wrap = True
        run = tf.paragraphs[0].add_run()
        _set_run(run, str(line), size=22, color=INK)
        top += Inches(0.85)


def build_pptx_bytes(
    deck: dict[str, Any],
    meta: dict[str, Any] | None = None,
) -> bytes:
    meta = meta or {}
    stripe = _rgb(meta.get("color_primario"), RGBColor(30, 58, 95))
    club_img = _fetch_image(meta.get("club_logo_url"))
    rival_img = _fetch_image(meta.get("rival_escudo_url"))
    footer = meta.get("club_nombre") or deck.get("titulo") or "Charla"

    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    slides = deck.get("slides") or []
    total = max(len(slides), 1)
    if not slides:
        slides = [{"layout": "portada", "title": deck.get("titulo") or "Charla", "kicker": footer, "bullets": [], "keywords": []}]

    for i, item in enumerate(slides, start=1):
        slide = _blank(prs)
        layout = item.get("layout")
        if layout == "portada":
            _slide_portada(slide, item, meta, stripe, club_img, rival_img, i, total)
        elif layout == "claves":
            _slide_claves(slide, item, footer, stripe, i, total)
        else:
            _slide_bullets(slide, item, footer, stripe, i, total)

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()
