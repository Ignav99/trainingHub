"""Charla de vestuario en .pptx panorámico, en la superficie "Papel" de Cal.

Se abre en PowerPoint, Keynote y Google Slides (Archivo → Abrir).

Regla de superficie (docs/design/pdf-marca.md): todo lo que se *descarga*
(PDF, PPTX) es Papel — fondo blanco, tinta teñida con el tono del club, una
sola línea, sin sombras ni degradados, el color del club como único acento.
Las salas en pantalla (vídeo, revisión, pizarra) usan Visitante (oscura).

El logo de Kabin-e aparece siempre: grande en la portada y pequeño
(isotipo + logotipo) en el pie de cada diapositiva.
"""

from __future__ import annotations

import io
import logging
import re
from functools import lru_cache
from typing import Any

import requests
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

from app.services.pdf_marca import MARCA_PATH, _wordmark_path, tema_pdf

logger = logging.getLogger(__name__)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
MARGEN = Inches(0.7)
ANCHO_UTIL = SLIDE_W - 2 * MARGEN

# PPTX no embebe fuentes de forma fiable: se nombra Encode Sans (la de Cal)
# y PowerPoint/Keynote caen a su sans por defecto si no está instalada.
FUENTE = "Encode Sans"

# Una sola línea: 1,5 px ≈ 1,125 pt para lo que importa; separadores finos en borde.
LINEA = Pt(1.125)
LINEA_FINA = Pt(0.75)

BLANCO = RGBColor(0xFF, 0xFF, 0xFF)


def _rgb(hex_color: str) -> RGBColor:
    h = hex_color.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


class _Tema:
    """Colores Papel calculados igual que los PDF (pdf_marca.tema_pdf)."""

    def __init__(self, meta: dict[str, Any]):
        t = tema_pdf({"color_primario": meta.get("color_primario"), "nombre": meta.get("club_nombre")})
        self.hex = t
        self.club = _rgb(t["color_club"])
        self.tinta = _rgb(t["tinta"])
        self.suave = _rgb(t["tinta_suave"])
        self.borde = _rgb(t["borde"])
        self.hundido = _rgb(t["hundido"])


# ───────────────────────── logo a PNG ─────────────────────────

@lru_cache(maxsize=16)
def _png_marca(color: str, px: int = 256) -> bytes:
    """Isotipo plano de un color en PNG transparente.

    Usa cairosvg si está disponible; si no, dibuja la silueta con Pillow a
    partir de ``MARCA_PATH`` (solo segmentos rectos) con supermuestreo.
    """
    try:
        import cairosvg  # type: ignore

        from app.services.pdf_marca import marca_svg

        return cairosvg.svg2png(bytestring=marca_svg(color).encode(), output_width=px, output_height=px)
    except Exception:
        pass

    from PIL import Image, ImageDraw

    escala = 4
    lado = px * escala
    k = lado / 100.0
    rgb = tuple(int(color.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    anillos = []
    for sub in MARCA_PATH.split("Z"):
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", sub)]
        if len(nums) >= 6:
            anillos.append([(nums[i] * k, nums[i + 1] * k) for i in range(0, len(nums), 2)])
    grosor = max(1, round(4 * k))
    exterior, huecos = anillos[0], anillos[1:]
    d.polygon(exterior, fill=rgb + (255,))
    d.line(exterior + [exterior[0], exterior[1]], fill=rgb + (255,), width=grosor, joint="curve")
    for hueco in huecos:  # fill-rule evenodd: el hueco se vacía y conserva su trazo
        d.polygon(hueco, fill=(0, 0, 0, 0))
        d.line(hueco + [hueco[0], hueco[1]], fill=rgb + (255,), width=grosor, joint="curve")
    img = img.resize((px, px), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


@lru_cache(maxsize=16)
def _png_wordmark(color: str, alto_px: int = 120) -> bytes | None:
    """Logotipo "Kabin-e" en PNG (requiere cairosvg; sin él se escribe en texto)."""
    try:
        import cairosvg  # type: ignore

        vb, d = _wordmark_path()
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path fill="{color}" d="{d}"/></svg>'
        return cairosvg.svg2png(bytestring=svg.encode(), output_height=alto_px)
    except Exception:
        return None


def _logo(slide, tema: _Tema, left, top, alto, color: RGBColor | None = None, hex_color: str | None = None) -> None:
    """Isotipo + logotipo Kabin-e. ``alto`` es la altura del isotipo."""
    hx = hex_color or tema.hex["tinta"]
    slide.shapes.add_picture(io.BytesIO(_png_marca(hx)), left, top, width=alto, height=alto)
    x = left + int(alto * 1.18)
    word = _png_wordmark(hx)
    alto_word = int(alto * 0.5)
    if word:
        # proporción del viewBox del logotipo: 7695 × 1655
        slide.shapes.add_picture(
            io.BytesIO(word), x, top + int((alto - alto_word) / 2), height=alto_word, width=int(alto_word * 7695 / 1655)
        )
        return
    box = slide.shapes.add_textbox(x, top, int(alto * 5), alto)
    tf = box.text_frame
    _sin_margen(tf)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    _run(tf.paragraphs[0].add_run(), "Kabin-e", size=max(8, round(alto / 12700 * 0.62)), bold=True, color=color or tema.tinta)


# ───────────────────────── primitivas ─────────────────────────

def _run(run, text: str, *, size: float, bold: bool = False, color: RGBColor, tracking: int | None = None) -> None:
    run.text = text
    f = run.font
    f.size = Pt(size)
    f.bold = bold
    f.color.rgb = color
    f.name = FUENTE
    if tracking is not None:
        run._r.get_or_add_rPr().set("spc", str(tracking))  # centésimas de punto


def _sin_margen(tf) -> None:
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0


def _texto(slide, left, top, width, height, text: str, *, size: float, bold: bool = False, color: RGBColor,
           align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, tracking: int | None = None, wrap: bool = True):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = wrap
    _sin_margen(tf)
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    _run(p.add_run(), text, size=size, bold=bold, color=color, tracking=tracking)
    return box


def _sin_efectos(shape) -> None:
    """Cal: sin sombras. Anula la referencia de efecto del tema y fuerza una lista vacía."""
    from pptx.oxml.ns import qn

    el = shape._element
    for ref in el.iter(qn("a:effectRef")):
        ref.set("idx", "0")
    sp_pr = el.find(qn("p:spPr"))
    if sp_pr is not None and sp_pr.find(qn("a:effectLst")) is None:
        from lxml import etree

        sp_pr.append(etree.SubElement(sp_pr, qn("a:effectLst")))


def _linea(slide, x1, y, x2, color: RGBColor, grosor=LINEA) -> None:
    ln = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y, x2, y)
    ln.line.color.rgb = color
    ln.line.width = grosor
    _sin_efectos(ln)


def _caja(slide, left, top, width, height, *, borde: RGBColor | None, relleno: RGBColor | None = None,
          forma=MSO_SHAPE.RECTANGLE, grosor=LINEA):
    shp = slide.shapes.add_shape(forma, left, top, width, height)
    if relleno is None:
        shp.fill.background()
    else:
        shp.fill.solid()
        shp.fill.fore_color.rgb = relleno
    if borde is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = borde
        shp.line.width = grosor
    _sin_efectos(shp)
    return shp


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


def _add_picture(slide, blob: io.BytesIO | None, left, top, alto) -> bool:
    if blob is None:
        return False
    try:
        blob.seek(0)
        slide.shapes.add_picture(blob, left, top, height=alto)
        return True
    except Exception as exc:
        logger.warning("presentacion picture skip: %s", exc)
        return False


def _blank(prs: Presentation):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    fondo = slide.background.fill
    fondo.solid()
    fondo.fore_color.rgb = BLANCO
    return slide


# ───────────────────────── chrome común ─────────────────────────

PIE_Y = SLIDE_H - Inches(0.62)


def _pie(slide, tema: _Tema, pie: str, index: int, total: int) -> None:
    """Línea fina + isotipo y logotipo Kabin-e + club · título + página."""
    _linea(slide, MARGEN, PIE_Y, SLIDE_W - MARGEN, tema.borde, LINEA_FINA)
    alto = Inches(0.24)
    top = PIE_Y + Inches(0.17)
    _logo(slide, tema, MARGEN, top, alto)
    if pie:
        _texto(slide, MARGEN + Inches(1.55), top, Inches(9), alto, pie, size=10, color=tema.suave,
               anchor=MSO_ANCHOR.MIDDLE, wrap=False)
    _texto(slide, SLIDE_W - MARGEN - Inches(1.4), top, Inches(1.4), alto, f"{index} / {total}", size=10,
           color=tema.suave, align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)


def _cabecera(slide, tema: _Tema, kicker: str, title: str, *, top=Inches(0.55), size: int = 34) -> Emu:
    """Rótulo estrecho en el color del club + título en tinta + línea de tinta. Devuelve la Y libre."""
    if kicker:
        _texto(slide, MARGEN, top, ANCHO_UTIL, Inches(0.3), kicker.upper(), size=11, bold=True,
               color=tema.club, tracking=110)
    y_titulo = top + Inches(0.34)
    _texto(slide, MARGEN, y_titulo, ANCHO_UTIL, Inches(0.9), title, size=size, bold=True, color=tema.tinta,
           anchor=MSO_ANCHOR.BOTTOM)
    y_linea = y_titulo + Inches(1.0)
    _linea(slide, MARGEN, y_linea, SLIDE_W - MARGEN, tema.tinta)
    return y_linea + Inches(0.45)


# ───────────────────────── diapositivas ─────────────────────────

def _slide_portada(slide, slide_data: dict, meta: dict, tema: _Tema, club_img, rival_img, pie: str,
                   index: int, total: int) -> None:
    # Logo de Kabin-e grande arriba a la izquierda.
    _logo(slide, tema, MARGEN, Inches(0.55), Inches(0.62))

    kicker = slide_data.get("kicker") or meta.get("club_nombre") or ""
    if kicker:
        _texto(slide, MARGEN, Inches(2.05), ANCHO_UTIL, Inches(0.34), kicker.upper(), size=13, bold=True,
               color=tema.club, tracking=120)
    _texto(slide, MARGEN, Inches(2.45), ANCHO_UTIL, Inches(1.5), slide_data.get("title") or "", size=54,
           bold=True, color=tema.tinta, anchor=MSO_ANCHOR.TOP)
    _linea(slide, MARGEN, Inches(4.1), SLIDE_W - MARGEN, tema.tinta)

    meta_bits = [b for b in (slide_data.get("bullets") or []) if b]
    for bit in (meta.get("fecha"), meta.get("hora"), meta.get("tramo"), meta.get("localia"), meta.get("campo")):
        if bit and bit not in meta_bits:
            meta_bits.append(bit)
    ticker = "  ·  ".join(str(b) for b in meta_bits if b)
    if ticker:
        _texto(slide, MARGEN, Inches(4.35), Inches(8.2), Inches(0.4), ticker, size=16, color=tema.suave)

    # Escudos (cosas, no personas): a la derecha bajo la línea.
    alto = Inches(1.15)
    x = SLIDE_W - MARGEN - Inches(3.4)
    if club_img is not None or rival_img is not None:
        _add_picture(slide, club_img, x, Inches(4.45), alto)
        _texto(slide, x + Inches(1.3), Inches(4.45), Inches(0.8), alto, "vs", size=16, bold=True,
               color=tema.suave, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        _add_picture(slide, rival_img, x + Inches(2.25), Inches(4.45), alto)

    _pie(slide, tema, pie, index, total)


def _slide_claves(slide, slide_data: dict, pie: str, tema: _Tema, index: int, total: int) -> None:
    y = _cabecera(slide, tema, slide_data.get("kicker") or "Claves", slide_data.get("title") or "Lo que importa hoy")
    keywords = slide_data.get("keywords") or []
    if keywords:
        n = min(len(keywords), 6)
        cols = 3 if n > 3 else n
        filas = (n + cols - 1) // cols
        gap = Inches(0.25)
        width = int((ANCHO_UTIL - gap * (cols - 1)) / cols)
        alto_disp = PIE_Y - Inches(0.35) - y
        height = int(min(Inches(1.9), (alto_disp - gap * (filas - 1)) / filas))
        for i, word in enumerate(keywords[:n]):
            fila, col = divmod(i, cols)
            x = MARGEN + (width + gap) * col
            top = y + (height + gap) * fila
            _caja(slide, x, top, width, height, borde=tema.tinta)
            _texto(slide, x + Inches(0.22), top + Inches(0.18), Inches(1), Inches(0.3), f"{i + 1:02d}", size=11,
                   bold=True, color=tema.club, tracking=80)
            _texto(slide, x + Inches(0.22), top + Inches(0.3), width - Inches(0.44), height - Inches(0.5),
                   str(word), size=24, bold=True, color=tema.tinta, anchor=MSO_ANCHOR.MIDDLE)
    _pie(slide, tema, pie, index, total)


def _iniciales(nombre: str) -> str:
    partes = [p for p in re.split(r"\s+", nombre.strip()) if p]
    if not partes:
        return "?"
    if len(partes) == 1:
        return partes[0][:2].upper()
    return (partes[0][0] + partes[-1][0]).upper()


def _slide_once(slide, slide_data: dict, pie: str, tema: _Tema, index: int, total: int) -> None:
    """Personas como fichas redondas (círculo es persona)."""
    y = _cabecera(slide, tema, slide_data.get("kicker") or "Once", slide_data.get("title") or "Once probable")
    nombres = [str(b) for b in (slide_data.get("bullets") or []) if b][:11]
    cols = 6
    ancho = int(ANCHO_UTIL / cols)
    diam = Inches(0.78)
    for i, nombre in enumerate(nombres):
        fila, col = divmod(i, cols)
        cx = MARGEN + ancho * col
        top = y + Inches(1.55) * fila
        _caja(slide, cx + int((ancho - diam) / 2), top, diam, diam, borde=tema.tinta, forma=MSO_SHAPE.OVAL)
        _texto(slide, cx + int((ancho - diam) / 2), top, diam, diam, _iniciales(nombre), size=16, bold=True,
               color=tema.tinta, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        _texto(slide, cx, top + diam + Inches(0.1), ancho, Inches(0.45), nombre, size=13, color=tema.tinta,
               align=PP_ALIGN.CENTER)
    _pie(slide, tema, pie, index, total)


def _slide_bullets(slide, slide_data: dict, pie: str, tema: _Tema, index: int, total: int) -> None:
    title = slide_data.get("title") or ""
    if title.strip().lower().startswith("once"):
        _slide_once(slide, slide_data, pie, tema, index, total)
        return
    y = _cabecera(slide, tema, slide_data.get("kicker") or "", title)
    bullets = slide_data.get("bullets") or []
    fila = Inches(0.92)
    for i, line in enumerate(bullets[:4]):
        top = y + fila * i
        _texto(slide, MARGEN, top, Inches(0.6), Inches(0.6), str(i + 1), size=22, bold=True, color=tema.club)
        _texto(slide, MARGEN + Inches(0.6), top, ANCHO_UTIL - Inches(0.6), Inches(0.7), str(line), size=22,
               color=tema.tinta)
        if i < min(len(bullets), 4) - 1:
            _linea(slide, MARGEN, top + fila - Inches(0.14), SLIDE_W - MARGEN, tema.borde, LINEA_FINA)
    _pie(slide, tema, pie, index, total)


def build_pptx_bytes(
    deck: dict[str, Any],
    meta: dict[str, Any] | None = None,
) -> bytes:
    meta = meta or {}
    tema = _Tema(meta)
    club_img = _fetch_image(meta.get("club_logo_url"))
    rival_img = _fetch_image(meta.get("rival_escudo_url"))
    club = meta.get("club_nombre") or ""
    titulo = deck.get("titulo") or "Charla"
    pie = " · ".join(x for x in (club, titulo) if x)

    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    prs.core_properties.title = titulo
    prs.core_properties.author = "Kabin-e"

    slides = deck.get("slides") or []
    if not slides:
        slides = [{"layout": "portada", "title": titulo, "kicker": club or "Charla", "bullets": [], "keywords": []}]
    total = len(slides)

    for i, item in enumerate(slides, start=1):
        slide = _blank(prs)
        layout = item.get("layout")
        if layout == "portada":
            _slide_portada(slide, item, meta, tema, club_img, rival_img, pie, i, total)
        elif layout == "claves":
            _slide_claves(slide, item, pie, tema, i, total)
        else:
            _slide_bullets(slide, item, pie, tema, i, total)

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()
