"""Marca común de todos los PDF de Kabin-e.

Cualquier PDF que sale de la app pasa por :func:`html_a_pdf`, que inyecta:

* la superficie "Papel" del sistema Cal (docs/diseno/cal.md): Encode Sans
  (estrecha para rótulos, ancha para títulos) embebida, tinta teñida con el
  tono del club, una sola línea, sin sombras ni degradados,
* las variables de color ``--c-*`` (y los alias antiguos ``--k-*``) calculadas
  igual que ``src/lib/clubTone.ts`` en la app: el club aporta el tono y el
  color "seguro" (4.5:1 con blanco),
* la marca de agua (isotipo de Kabin-e teñido con el color del club) y el pie
  normalizado con número de página.

Las plantillas usan las variables ``var(--k-*)`` y las clases ``.k-*`` de
``templates/_marca/base.css``; el contexto Jinja recibe ``tema`` desde
:func:`tema_pdf`.
"""
from __future__ import annotations

import base64
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

APP_DIR = Path(__file__).resolve().parent.parent
FUENTES_DIR = APP_DIR / "static" / "fonts"
MARCA_DIR = APP_DIR / "static" / "marca"
TEMPLATES_DIR = APP_DIR / "templates"

TINTA = "#171D1A"
TINTA_SUAVE = "#5A615D"
LINEA = "#CDD2CF"
PRIMARIO_DEFECTO = "#1F5240"

# Silueta del isotipo (una sola pieza, sin facetas) — misma geometría que
# frontend/public/brand/kabine-mark.svg.
MARCA_PATH = (
    "M16 12 L33 20 L33 41 L86 5 L62 47 L82 58 L82 81 L50 97 L16 81 Z "
    "M35 59 L53 51 L61 68 L45 77 Z"
)

_HEX = re.compile(r"^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


# ───────────────────────── colores ─────────────────────────

def _normaliza_hex(valor: Optional[str], defecto: str) -> str:
    if not valor or not isinstance(valor, str):
        return defecto
    m = _HEX.match(valor.strip())
    if not m:
        return defecto
    h = m.group(1)
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return f"#{h.upper()}"


def _rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{max(0, min(255, round(c))):02X}" for c in rgb)


def _luminancia(h: str) -> float:
    def canal(c: int) -> float:
        s = c / 255
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = _rgb(h)
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)


def contraste(a: str, b: str) -> float:
    la, lb = sorted((_luminancia(a), _luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def mezcla(a: str, b: str, t: float) -> str:
    """Mezcla ``a`` hacia ``b`` en proporción ``t`` (0 = a, 1 = b)."""
    ra, rb = _rgb(a), _rgb(b)
    return _hex(tuple(x + (y - x) * t for x, y in zip(ra, rb)))


def oscurece_hasta(color: str, fondo: str = "#FFFFFF", minimo: float = 4.5) -> str:
    """Oscurece ``color`` hacia la tinta hasta alcanzar ``minimo`` de contraste."""
    c = color
    t = 0.0
    while contraste(c, fondo) < minimo and t < 1:
        t += 0.06
        c = mezcla(color, TINTA, t)
    return c


def _hsl_hex(h: float, s: float, l: float) -> str:
    s /= 100
    l /= 100
    a = s * min(l, 1 - l)

    def f(n: int) -> float:
        k = (n + h / 30) % 12
        return 255 * (l - a * max(-1, min(k - 3, 9 - k, 1)))

    return _hex((f(0), f(8), f(4)))


def _hex_hsl(hx: str) -> tuple[int, int, int]:
    r, g, b = (c / 255 for c in _rgb(hx))
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0, 0, round(l * 100)
    s = d / (1 - abs(2 * l - 1))
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    h *= 60
    return round(h % 360), round(s * 100), round(l * 100)


def tono_club(hex_club: Optional[str]) -> tuple[int, int, int]:
    """(tono, saturación, luminosidad) del color seguro del club — igual que clubTone.ts."""
    try:
        h, s, l = _hex_hsl(_normaliza_hex(hex_club, PRIMARIO_DEFECTO))
    except Exception:
        h, s, l = 158, 42, 26
    sin_color = s < 12
    tono = 220 if sin_color else h
    sat = 8 if sin_color else min(s, 80)
    lum = min(l, 46)
    while lum > 6 and contraste("#FFFFFF", _hsl_hex(tono, sat, lum)) < 4.5:
        lum -= 1
    return tono, sat, lum


def tema_pdf(organizacion: Optional[dict[str, Any]] = None) -> dict[str, str]:
    """Colores del papel Cal a partir del club. Tinta y neutros teñidos con su tono."""
    org = organizacion or {}
    h, s, l = tono_club(org.get("color_primario"))
    club = _hsl_hex(h, s, l)
    tinta = _hsl_hex(h, 18, 11)
    suave = _hsl_hex(h, 7, 38)
    borde = _hsl_hex(h, 9, 82)
    hundido = _hsl_hex(h, 12, 92.5)
    club_suave = _hsl_hex(h, min(s, 40), 94)
    secundario = _normaliza_hex(org.get("color_secundario"), club)
    if contraste(secundario, "#FFFFFF") < 1.6 or contraste(secundario, club) < 1.25:
        secundario = tinta
    return {
        # Cal
        "color_club": club,
        "color_club_suave": club_suave,
        "tinta": tinta,
        "tinta_suave": suave,
        "borde": borde,
        "hundido": hundido,
        "aviso": _hsl_hex(45, 96, 52),
        "baja": _hsl_hex(6, 78, 44),
        "ok": _hsl_hex(152, 60, 30),
        "info": _hsl_hex(215, 55, 42),
        # alias antiguos (plantillas aún no migradas)
        "primario": club,
        "secundario": secundario,
        "primario_texto": club,
        "secundario_texto": oscurece_hasta(secundario),
        "sobre_primario": "#FFFFFF",
        "sobre_secundario": "#FFFFFF" if contraste("#FFFFFF", secundario) >= contraste(tinta, secundario) else tinta,
        "primario_suave": hundido,
        "primario_medio": borde,
        "secundario_suave": hundido,
        "linea": borde,
        "club": (org.get("nombre") or "").strip(),
        "logo_url": org.get("logo_url") or "",
    }


# ───────────────────────── recursos ─────────────────────────

def marca_svg(color: str = PRIMARIO_DEFECTO) -> str:
    """Isotipo plano de un solo color (para marcas de agua y cabeceras)."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        f'<path fill="{color}" stroke="{color}" stroke-width="4" stroke-linejoin="round" '
        f'fill-rule="evenodd" d="{MARCA_PATH}"/></svg>'
    )


def marca_data_uri(color: str = PRIMARIO_DEFECTO) -> str:
    return "data:image/svg+xml;base64," + base64.b64encode(marca_svg(color).encode()).decode()


@lru_cache(maxsize=1)
def _wordmark_path() -> tuple[str, str]:
    svg = (MARCA_DIR / "kabine-wordmark.svg").read_text()
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    d = re.search(r' d="([^"]+)"', svg).group(1)
    return vb, d


def wordmark_data_uri(color: str = TINTA) -> str:
    vb, d = _wordmark_path()
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path fill="{color}" d="{d}"/></svg>'
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


@lru_cache(maxsize=1)
def _css_base() -> str:
    return (TEMPLATES_DIR / "_marca" / "base.css").read_text()


def css_marca(tema: dict[str, str]) -> str:
    fuentes = FUENTES_DIR.as_uri()
    t = tema
    variables = (
        ":root{"
        f"--c-club:{t['color_club']};--c-club-suave:{t['color_club_suave']};--c-tinta:{t['tinta']};"
        f"--c-suave:{t['tinta_suave']};--c-borde:{t['borde']};--c-hundido:{t['hundido']};"
        f"--c-aviso:{t['aviso']};--c-baja:{t['baja']};--c-ok:{t['ok']};--c-info:{t['info']};"
        f"--k-primario:{t['color_club']};--k-secundario:{t['secundario']};"
        f"--k-primario-texto:{t['color_club']};--k-secundario-texto:{t['secundario_texto']};"
        f"--k-sobre-primario:#FFFFFF;--k-sobre-secundario:{t['sobre_secundario']};"
        f"--k-primario-suave:{t['hundido']};--k-primario-medio:{t['borde']};"
        f"--k-secundario-suave:{t['hundido']};"
        f"--k-tinta:{t['tinta']};--k-tinta-suave:{t['tinta_suave']};--k-linea:{t['borde']};"
        "}"
    )
    return _css_base().replace("__FUENTES__", fuentes) + variables


def html_marca(tema: dict[str, str], titulo: str = "") -> str:
    """Marca de agua + pie corrido; se repiten en cada página."""
    club = tema.get("club") or ""
    pie_club = f'<span class="k-pie-club">{_esc(club)}</span>' if club else ""
    pie_titulo = f'<span class="k-pie-titulo">{_esc(titulo)}</span>' if titulo else ""
    return (
        f'<div class="k-marca-agua"><img src="{marca_data_uri(tema["color_club"])}" alt=""></div>'
        '<div class="k-pie">'
        f'<img class="k-pie-marca" src="{marca_data_uri(tema["tinta"])}" alt="">'
        f'<img class="k-pie-word" src="{wordmark_data_uri(tema["tinta"])}" alt="Kabin-e">'
        f"{pie_club}{pie_titulo}"
        "</div>"
    )


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def jinja_globals() -> dict[str, Any]:
    """Helpers disponibles en todas las plantillas PDF."""
    return {
        "marca_data_uri": marca_data_uri,
        "wordmark_data_uri": wordmark_data_uri,
        "mezcla": mezcla,
    }


# ───────────────────────── render ─────────────────────────

_GOOGLE_FONTS = re.compile(
    r"<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>|@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\)\s*;?",
    re.I,
)


def preparar_html(html: str, organizacion: Optional[dict[str, Any]] = None, titulo: str = "") -> str:
    tema = tema_pdf(organizacion)
    html = _GOOGLE_FONTS.sub("", html)  # nada de red al imprimir: fuentes locales
    estilo = f"<style>{css_marca(tema)}</style>"
    if "</head>" in html:
        html = html.replace("</head>", estilo + "</head>", 1)
    else:
        html = estilo + html
    marca = html_marca(tema, titulo)
    m = re.search(r"<body[^>]*>", html, re.I)
    if m:
        html = html[: m.end()] + marca + html[m.end():]
    else:
        html = marca + html
    return html


def html_a_pdf(html: str, organizacion: Optional[dict[str, Any]] = None, titulo: str = "") -> bytes:
    """Único punto de salida a PDF de la app."""
    from weasyprint import HTML

    return HTML(string=preparar_html(html, organizacion, titulo), base_url=str(TEMPLATES_DIR)).write_pdf()
