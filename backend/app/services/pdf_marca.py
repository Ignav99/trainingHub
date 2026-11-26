"""Marca común de todos los PDF de Kabin-e.

Cualquier PDF que sale de la app pasa por :func:`html_a_pdf`, que inyecta:

* las fuentes de la app (Schibsted Grotesk + IBM Plex Mono) embebidas,
* las variables de color del club (``--k-primario``, ``--k-secundario``…),
  con variantes de contraste calculadas para que ningún color de club deje
  texto ilegible,
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

TINTA = "#0E1334"
TINTA_SUAVE = "#5A618C"
LINEA = "#E3E6EF"
PRIMARIO_DEFECTO = "#2326A0"

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


def tema_pdf(organizacion: Optional[dict[str, Any]] = None) -> dict[str, str]:
    """Colores del club listos para imprimir, con contraste garantizado."""
    org = organizacion or {}
    primario = _normaliza_hex(org.get("color_primario"), PRIMARIO_DEFECTO)
    secundario = _normaliza_hex(org.get("color_secundario"), primario)

    # Un secundario casi blanco (o casi igual al primario) no sirve como acento.
    if contraste(secundario, "#FFFFFF") < 1.6 or contraste(secundario, primario) < 1.25:
        secundario = mezcla(primario, TINTA, 0.45)

    sobre_primario = "#FFFFFF" if contraste("#FFFFFF", primario) >= contraste(TINTA, primario) else TINTA
    sobre_secundario = "#FFFFFF" if contraste("#FFFFFF", secundario) >= contraste(TINTA, secundario) else TINTA

    return {
        "primario": primario,
        "secundario": secundario,
        "primario_texto": oscurece_hasta(primario),
        "secundario_texto": oscurece_hasta(secundario),
        "sobre_primario": sobre_primario,
        "sobre_secundario": sobre_secundario,
        "primario_suave": mezcla(primario, "#FFFFFF", 0.92),
        "primario_medio": mezcla(primario, "#FFFFFF", 0.75),
        "secundario_suave": mezcla(secundario, "#FFFFFF", 0.9),
        "tinta": TINTA,
        "tinta_suave": TINTA_SUAVE,
        "linea": LINEA,
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
    variables = (
        ":root{"
        f"--k-primario:{tema['primario']};--k-secundario:{tema['secundario']};"
        f"--k-primario-texto:{tema['primario_texto']};--k-secundario-texto:{tema['secundario_texto']};"
        f"--k-sobre-primario:{tema['sobre_primario']};--k-sobre-secundario:{tema['sobre_secundario']};"
        f"--k-primario-suave:{tema['primario_suave']};--k-primario-medio:{tema['primario_medio']};"
        f"--k-secundario-suave:{tema['secundario_suave']};"
        f"--k-tinta:{tema['tinta']};--k-tinta-suave:{tema['tinta_suave']};--k-linea:{tema['linea']};"
        "}"
    )
    return _css_base().replace("__FUENTES__", fuentes) + variables


def html_marca(tema: dict[str, str], titulo: str = "") -> str:
    """Marca de agua + pie corrido; se repiten en cada página."""
    club = tema.get("club") or ""
    pie_club = f'<span class="k-pie-club">{_esc(club)}</span>' if club else ""
    pie_titulo = f'<span class="k-pie-titulo">{_esc(titulo)}</span>' if titulo else ""
    return (
        f'<div class="k-marca-agua"><img src="{marca_data_uri(tema["primario"])}" alt=""></div>'
        '<div class="k-pie">'
        f'<img class="k-pie-marca" src="{marca_data_uri(tema["primario"])}" alt="">'
        f'<img class="k-pie-word" src="{wordmark_data_uri(TINTA_SUAVE)}" alt="Kabin-e">'
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
