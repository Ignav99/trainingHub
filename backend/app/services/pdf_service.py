"""
TrainingHub Pro - PDF Service
Generación de PDFs profesionales con WeasyPrint + Jinja2.
"""

import asyncio
import base64
import logging
import re
from pathlib import Path
from typing import Optional

import httpx
from jinja2 import Environment, FileSystemLoader

from app.services.pdf_marca import html_a_pdf, jinja_globals, tema_pdf
from app.services.material import material_de_tareas
from app.services.informe_boards import clip as _clip, is_poisoned_preview, parse_grafico

from app.services.tarea_descanso import format_descanso
from app.services.partido_campo import clean_estadio_nombre, format_kit_convocatoria_label, split_campo_arbitro
from app.services.duracion_efectiva import (
    compensatorio_lane_index,
    fase_for_lane,
    is_compensatorio_fase,
    lanes_from_bloque,
    tiempos_sesion,
)

logger = logging.getLogger(__name__)


def _url_to_data_uri(url: str) -> str:
    """Fetch an external URL and return a base64 data URI. Returns original URL on failure."""
    if not url or url.startswith("data:"):
        return url
    try:
        with httpx.Client(timeout=8.0, http2=False) as client:
            r = client.get(url)
            r.raise_for_status()
            content_type = r.headers.get("content-type", "image/png").split(";")[0]
            b64 = base64.b64encode(r.content).decode()
            return f"data:{content_type};base64,{b64}"
    except Exception as e:
        logger.warning(f"Could not pre-fetch image {url}: {e}")
        return url


# Directorio de templates
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

FASE_NOMBRES = {
    "activacion": "Activacion",
    "desarrollo_1": "Desarrollo 1",
    "desarrollo_2": "Desarrollo 2",
    "desarrollo_3": "Desarrollo 3",
    "desarrollo_4": "Desarrollo 4",
    "desarrollo_5": "Desarrollo 5",
    "desarrollo_6": "Desarrollo 6",
    "vuelta_calma": "Vuelta a calma",
    "compensatorio_1": "Grupo A",
    "compensatorio_2": "Grupo B",
    "compensatorio_3": "Grupo C",
    "compensatorio_4": "Grupo D",
    "compensatorio_5": "Grupo E",
    "compensatorio_6": "Grupo F",
    "compensatorio_7": "Grupo G",
    "compensatorio_8": "Grupo H",
}

# Mapping from app team colors to peto CSS class + label
PETO_MAP = {
    "#3B82F6": {"css": "peto-negro", "label": "Negro"},      # team1
    "#EF4444": {"css": "peto-blanco", "label": "Blanco"},     # team2
    "#F59E0B": {"css": "peto-gris", "label": "Comodin"},      # neutral
    "#22C55E": {"css": "peto-verde", "label": "Portero"},     # goalkeeper
}

# Badge class codes that exist in the CSS
BADGE_CLASSES = {"rnd", "jdp", "pos", "evo", "avd", "pco", "aco", "ssg", "abp", "par"}


def _text_to_bullets(text: str, max_bullets: int = 4, max_chars: int = 85) -> list[str]:
    """Convert paragraph text to list of short bullet strings."""
    if not text:
        return []
    lines = re.split(r'[\n;]|(?<=\.)\s+', text.strip())
    bullets = [l.strip().rstrip('.') for l in lines if l.strip() and len(l.strip()) > 5]
    result = []
    for b in bullets[:max_bullets]:
        if len(b) > max_chars:
            b = b[:max_chars - 3].rsplit(' ', 1)[0] + '...'
        result.append(b)
    return result


def _first_sentence(text: str) -> str:
    """Extract first sentence from text, max 120 chars."""
    if not text:
        return ''
    m = re.match(r'^(.+?[.!?])\s', text)
    s = m.group(1) if m else text
    if len(s) > 120:
        s = s[:117].rsplit(' ', 1)[0] + '...'
    return s


# ============ Formation SVG for rival informe ============

# Positions as (x%, y%) on a 100x160 pitch (0,0 = top-left, goal at bottom)
# GK at bottom, attackers at top
FORMATION_POSITIONS: dict[str, list[tuple[int, int]]] = {
    "4-3-3": [
        (50, 145),  # GK
        (15, 118), (38, 122), (62, 122), (85, 118),  # DEF
        (30, 88), (50, 95), (70, 88),  # MID
        (20, 52), (50, 45), (80, 52),  # FWD
    ],
    "4-4-2": [
        (50, 145),
        (15, 118), (38, 122), (62, 122), (85, 118),
        (15, 85), (38, 90), (62, 90), (85, 85),
        (35, 48), (65, 48),
    ],
    "4-2-3-1": [
        (50, 145),
        (15, 118), (38, 122), (62, 122), (85, 118),
        (38, 95), (62, 95),
        (20, 68), (50, 65), (80, 68),
        (50, 42),
    ],
    "3-5-2": [
        (50, 145),
        (25, 120), (50, 124), (75, 120),
        (10, 85), (35, 90), (50, 95), (65, 90), (90, 85),
        (35, 48), (65, 48),
    ],
    "3-4-3": [
        (50, 145),
        (25, 120), (50, 124), (75, 120),
        (15, 88), (38, 92), (62, 92), (85, 88),
        (20, 52), (50, 45), (80, 52),
    ],
    "5-3-2": [
        (50, 145),
        (10, 115), (30, 120), (50, 124), (70, 120), (90, 115),
        (30, 88), (50, 95), (70, 88),
        (35, 48), (65, 48),
    ],
    "4-1-4-1": [
        (50, 145),
        (15, 118), (38, 122), (62, 122), (85, 118),
        (50, 100),
        (15, 75), (38, 78), (62, 78), (85, 75),
        (50, 42),
    ],
    "5-4-1": [
        (50, 145),
        (10, 115), (30, 120), (50, 124), (70, 120), (90, 115),
        (15, 85), (38, 90), (62, 90), (85, 85),
        (50, 42),
    ],
    "4-4-1-1": [
        (50, 145),
        (15, 118), (38, 122), (62, 122), (85, 118),
        (15, 88), (38, 92), (62, 92), (85, 88),
        (50, 62),
        (50, 42),
    ],
    "4-3-1-2": [
        (50, 145),
        (15, 118), (38, 122), (62, 122), (85, 118),
        (30, 92), (50, 98), (70, 92),
        (50, 68),
        (35, 45), (65, 45),
    ],
}


def _parse_formation(sistema_juego: str) -> str:
    """Parse '1-4-3-3' or '4-3-3' to normalized key like '4-3-3'."""
    if not sistema_juego:
        return "4-4-2"
    cleaned = sistema_juego.strip()
    # Remove leading '1-' (goalkeeper) if present
    if cleaned.startswith("1-"):
        cleaned = cleaned[2:]
    return cleaned if cleaned in FORMATION_POSITIONS else "4-4-2"


def _generate_formation_svg(sistema_juego: str, jugadores: list) -> str:
    """
    Generate inline SVG of formation with player dots on a pitch.
    jugadores: list of {nombre, dorsal, sancionado} — top 11 used.
    Returns SVG string or empty string.
    """
    formation_key = _parse_formation(sistema_juego)
    positions = FORMATION_POSITIONS.get(formation_key, FORMATION_POSITIONS["4-4-2"])
    once = jugadores[:11] if jugadores else []

    # SVG viewBox: 0 0 200 320 (scaled from 100x160 by 2x)
    svg_parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 320" '
        'width="100%" style="max-width:340px;display:block;margin:0 auto;">',
        # Pitch background
        '<rect x="0" y="0" width="200" height="320" rx="8" fill="#1b7a3d"/>',
        # Pitch outline
        '<rect x="8" y="8" width="184" height="304" rx="4" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>',
        # Center line
        '<line x1="8" y1="160" x2="192" y2="160" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>',
        # Center circle
        '<circle cx="100" cy="160" r="28" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>',
        '<circle cx="100" cy="160" r="2" fill="rgba(255,255,255,0.35)"/>',
        # Penalty area bottom (our goal)
        '<rect x="40" y="262" width="120" height="50" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>',
        '<rect x="65" y="290" width="70" height="22" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>',
        # Penalty area top (opponent goal)
        '<rect x="40" y="8" width="120" height="50" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>',
        '<rect x="65" y="8" width="70" height="22" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>',
    ]

    for i, (px, py) in enumerate(positions):
        # Scale to SVG coords (100→200, 160→320)
        cx = px * 2
        cy = py * 2

        if i < len(once):
            player = once[i]
            nombre = player.get("nombre", "")
            dorsal = player.get("dorsal", "")
            sancionado = player.get("sancionado", False)

            # Short name: first initial + last name
            parts = nombre.split()
            if len(parts) > 1:
                short_name = f"{parts[0][0]}. {parts[-1]}"
            else:
                short_name = nombre
            if len(short_name) > 12:
                short_name = short_name[:11] + "."

            # Circle color
            circle_fill = "white"
            circle_stroke = "#dc2626" if sancionado else "rgba(0,0,0,0.3)"
            stroke_width = "2" if sancionado else "1"

            svg_parts.append(
                f'<circle cx="{cx}" cy="{cy}" r="16" fill="{circle_fill}" '
                f'stroke="{circle_stroke}" stroke-width="{stroke_width}"/>'
            )
            # Dorsal number
            if dorsal:
                svg_parts.append(
                    f'<text x="{cx}" y="{cy + 5}" text-anchor="middle" '
                    f'font-family="Barlow Condensed,Arial" font-size="15" font-weight="700" '
                    f'fill="#1a1a2e">{dorsal}</text>'
                )
            # Player name below
            svg_parts.append(
                f'<text x="{cx}" y="{cy + 28}" text-anchor="middle" '
                f'font-family="Barlow Condensed,Arial" font-size="10" font-weight="600" '
                f'fill="white">{short_name}</text>'
            )
            # Sancionado indicator
            if sancionado:
                svg_parts.append(
                    f'<circle cx="{cx + 10}" cy="{cy - 10}" r="5" fill="#dc2626"/>'
                    f'<text x="{cx + 10}" y="{cy - 7}" text-anchor="middle" '
                    f'font-size="7" font-weight="700" fill="white">!</text>'
                )
        else:
            # Empty position dot
            svg_parts.append(
                f'<circle cx="{cx}" cy="{cy}" r="8" fill="rgba(255,255,255,0.2)" '
                f'stroke="rgba(255,255,255,0.4)" stroke-width="1"/>'
            )

    # Formation label
    svg_parts.append(
        f'<text x="100" y="18" text-anchor="middle" '
        f'font-family="Barlow Condensed,Arial" font-size="12" font-weight="700" '
        f'fill="rgba(255,255,255,0.6)">{formation_key}</text>'
    )

    svg_parts.append('</svg>')
    return '\n'.join(svg_parts)


def _get_jinja_env() -> Environment:
    """Obtiene el entorno Jinja2 configurado."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=True,
    )
    env.globals.update(jinja_globals())
    return env


def _highlight_tactical(text: str) -> str:
    """Highlight tactical keywords in text with <strong> tags."""
    if not text:
        return ''
    t = text
    # Formations: 4-3-3, 5-3-2, 1-4-3-3
    t = re.sub(r'(\d+-\d+-\d+(?:-\d+)?)', r'<strong>\1</strong>', t)
    # Player refs: #22, #18
    t = re.sub(r'(#\d+)', r'<strong>\1</strong>', t)
    # P+N patterns
    t = re.sub(r'(P\+\d)', r'<strong>\1</strong>', t)
    return t


def _generate_phase_svgs() -> dict[str, str]:
    """Generate schematic mini-pitch SVGs for each tactical phase."""
    P = (
        '<rect x="0" y="0" width="120" height="160" rx="6" fill="#1b7a3d"/>'
        '<rect x="6" y="6" width="108" height="148" rx="3" fill="none" '
        'stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>'
        '<line x1="6" y1="80" x2="114" y2="80" stroke="rgba(255,255,255,0.3)" stroke-width="0.6"/>'
        '<circle cx="60" cy="80" r="16" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.6"/>'
        '<rect x="30" y="6" width="60" height="28" fill="none" '
        'stroke="rgba(255,255,255,0.3)" stroke-width="0.6"/>'
        '<rect x="30" y="126" width="60" height="28" fill="none" '
        'stroke="rgba(255,255,255,0.3)" stroke-width="0.6"/>'
    )

    def w(c):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" '
                f'width="90" style="display:block;">{P}{c}</svg>')

    def d(x, y, r=4):
        return f'<circle cx="{x}" cy="{y}" r="{r}" fill="white" opacity="0.85"/>'

    def au(x, y1, y2):
        return (f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2+6}" '
                f'stroke="white" stroke-width="1.5" opacity="0.5"/>'
                f'<polygon points="{x-3},{y2+7} {x},{y2} {x+3},{y2+7}" '
                f'fill="white" opacity="0.5"/>')

    def ad(x, y1, y2):
        return (f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2-6}" '
                f'stroke="white" stroke-width="1.5" opacity="0.5"/>'
                f'<polygon points="{x-3},{y2-7} {x},{y2} {x+3},{y2-7}" '
                f'fill="white" opacity="0.5"/>')

    def z(x, y, ww, h, c="rgba(255,255,255,0.08)"):
        return f'<rect x="{x}" y="{y}" width="{ww}" height="{h}" rx="3" fill="{c}"/>'

    def dl(x1, y1, x2, y2, op="0.35"):
        return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                f'stroke="white" stroke-width="1" opacity="{op}" stroke-dasharray="3,2"/>')

    def hl(x1, y, x2, c="rgba(239,68,68,0.35)"):
        return (f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" '
                f'stroke="{c}" stroke-width="1" stroke-dasharray="4,3"/>')

    return {
        # Salida de balón: GK + defenders, arrows forward
        'salida_balon': w(
            z(10, 100, 100, 54, "rgba(59,130,246,0.12)")
            + d(60, 148, 5) + d(25, 130) + d(45, 132) + d(75, 132) + d(95, 130)
            + d(40, 105) + d(80, 105)
            + au(60, 143, 115) + au(40, 127, 108) + au(80, 127, 108)
            + dl(25, 130, 40, 105) + dl(95, 130, 80, 105)
        ),
        # Construcción: midfield progression
        'construccion': w(
            z(10, 55, 100, 50, "rgba(59,130,246,0.12)")
            + d(35, 95) + d(65, 95) + d(60, 80)
            + d(20, 70) + d(100, 70) + d(45, 60) + d(75, 60)
            + au(35, 90, 72) + au(65, 90, 72)
            + dl(35, 95, 65, 95) + dl(20, 70, 45, 60) + dl(100, 70, 75, 60)
        ),
        # Finalización: converge on goal
        'finalizacion': w(
            z(25, 6, 70, 48, "rgba(59,130,246,0.15)")
            + d(30, 40) + d(60, 32) + d(90, 40)
            + d(40, 62) + d(80, 62)
            + au(30, 58, 42) + au(60, 55, 35) + au(90, 58, 42)
            + dl(40, 62, 55, 35) + dl(80, 62, 65, 35)
        ),
        # Pressing: high press arrows
        'pressing': w(
            z(10, 6, 100, 55, "rgba(239,68,68,0.12)")
            + d(40, 42) + d(60, 38) + d(80, 42)
            + d(30, 65) + d(50, 68) + d(70, 68) + d(90, 65)
            + au(40, 48, 25) + au(60, 44, 20) + au(80, 48, 25)
            + dl(30, 60, 40, 48) + dl(90, 60, 80, 48)
        ),
        # Bloque medio: two compact defensive lines
        'bloque_medio': w(
            z(10, 62, 100, 42, "rgba(239,68,68,0.1)")
            + d(20, 100) + d(40, 102) + d(60, 104) + d(80, 102) + d(100, 100)
            + d(30, 78) + d(50, 80) + d(70, 80) + d(90, 78)
            + hl(20, 100, 100) + hl(30, 78, 90)
        ),
        # Bloque bajo: compact near own goal
        'bloque_bajo': w(
            z(10, 105, 100, 49, "rgba(239,68,68,0.12)")
            + d(60, 148, 5)
            + d(18, 125) + d(38, 127) + d(60, 128) + d(82, 127) + d(102, 125)
            + d(30, 112) + d(50, 114) + d(70, 114) + d(90, 112)
            + hl(18, 125, 102) + hl(30, 112, 90)
        ),
        # Transición ofensiva: fast arrows up
        'trans_ofensiva': w(
            '<line x1="60" y1="88" x2="60" y2="38" stroke="rgba(245,158,11,0.4)" '
            'stroke-width="3" stroke-dasharray="6,3"/>'
            '<polygon points="55,44 60,30 65,44" fill="rgba(245,158,11,0.45)"/>'
            + d(60, 120) + d(35, 115) + d(85, 115)
            + au(60, 115, 85) + au(35, 110, 78) + au(85, 110, 78)
            + d(40, 55) + d(60, 45) + d(80, 55)
        ),
        # Transición defensiva: retreat arrows
        'trans_defensiva': w(
            '<line x1="60" y1="42" x2="60" y2="92" stroke="rgba(245,158,11,0.4)" '
            'stroke-width="3" stroke-dasharray="6,3"/>'
            '<polygon points="55,86 60,98 65,86" fill="rgba(245,158,11,0.45)"/>'
            + d(30, 45) + d(60, 40) + d(90, 45)
            + ad(30, 50, 80) + ad(60, 48, 80) + ad(90, 50, 80)
            + d(25, 110) + d(50, 115) + d(70, 115) + d(95, 110)
        ),
    }


def _get_jinja_env_v2() -> Environment:
    """Entorno Jinja2 para v2 templates (autoescape off for inline SVG)."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
    )
    env.filters['to_bullets'] = _text_to_bullets
    env.filters['first_sentence'] = _first_sentence
    env.filters['highlight_tactical'] = _highlight_tactical
    env.globals.update(jinja_globals())
    return env


async def generate_informe_partido_pdf(
    partido: dict,
    rival: dict,
    convocatoria: list,
    organizacion: dict,
    equipo_nombre: str = "",
) -> bytes:
    """
    Genera un PDF profesional de informe de partido.

    Args:
        partido: Datos del partido (dict de BD)
        rival: Datos del rival
        convocatoria: Lista de convocados con datos de jugador
        organizacion: Datos de la organización
        equipo_nombre: Nombre del equipo propio

    Returns:
        PDF como bytes
    """
    env = _get_jinja_env()
    template = env.get_template("informe_partido.html")

    # Preparar convocatoria con nombres de jugador
    for c in convocatoria:
        jugador = c.get("jugadores", {}) or {}
        c["jugador_nombre"] = f"{jugador.get('nombre', '')} {jugador.get('apellidos', '')}".strip()
        if not c.get("dorsal") and jugador.get("dorsal"):
            c["dorsal"] = jugador["dorsal"]
        if not c.get("posicion_asignada") and jugador.get("posicion_principal"):
            c["posicion_asignada"] = jugador["posicion_principal"]

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            partido=partido,
            rival=rival,
            convocatoria=convocatoria,
            organizacion=organizacion,
            equipo_nombre=equipo_nombre,
        )
        try:
            return html_a_pdf(html_content, organizacion, "Informe de partido")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


async def generate_convocatoria_pdf(
    partido: dict,
    rival: dict,
    convocatoria: list,
    organizacion: dict,
    equipo_nombre: str = "",
    equipo_categoria: str = "",
) -> bytes:
    """Genera PDF de convocatoria: todos los convocados por dorsal, sin once titular."""
    env = _get_jinja_env()
    template = env.get_template("convocatoria_pdf.html")

    color = organizacion.get("color_primario", "#1a365d")
    convocados = build_convocatoria_pdf_rows(convocatoria)

    raw_lugar = (
        (partido.get("ubicacion") or rival.get("estadio") or rival.get("ciudad") or "")
    ).strip()
    lugar_partido = clean_estadio_nombre(raw_lugar) or split_campo_arbitro(raw_lugar)[0]
    _, arbitro_from_lugar = split_campo_arbitro(raw_lugar)
    arbitro = (partido.get("arbitro") or arbitro_from_lugar or "").strip()
    hora_citacion = (partido.get("hora_citacion") or "").strip()
    raw_citacion = (partido.get("lugar_citacion") or lugar_partido or "").strip()
    lugar_citacion = clean_estadio_nombre(raw_citacion)
    kit = format_kit_convocatoria_label(
        partido.get("kit_convocatoria"),
        partido.get("localia"),
    )

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            color_primario=color,
            org_nombre=organizacion.get("nombre", "TrainingHub Pro"),
            equipo_nombre=equipo_nombre,
            equipo_categoria=equipo_categoria,
            rival_nombre=rival.get("nombre", "Rival"),
            fecha=partido.get("fecha", ""),
            hora=partido.get("hora"),
            competicion=partido.get("competicion"),
            jornada=partido.get("jornada"),
            localia=partido.get("localia", ""),
            lugar_partido=lugar_partido,
            arbitro=arbitro,
            hora_citacion=hora_citacion,
            lugar_citacion=lugar_citacion,
            kit_convocatoria=kit,
            convocados=convocados,
            total_convocados=len(convocados),
        )
        try:
            return html_a_pdf(html_content, organizacion, "Convocatoria")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


def build_convocatoria_pdf_rows(convocatoria: Optional[list] = None) -> list:
    """Todos los convocados por dorsal. No separa titulares/suplentes."""

    def _dorsal_sort(c: dict):
        jugador = c.get("jugadores") or {}
        raw = c.get("dorsal") if c.get("dorsal") is not None else jugador.get("dorsal")
        try:
            n = int(raw)
            return (0, n, (jugador.get("apellidos") or ""), (jugador.get("nombre") or ""))
        except (TypeError, ValueError):
            return (1, 0, (jugador.get("apellidos") or ""), (jugador.get("nombre") or ""))

    rows: list[dict] = []
    for c in sorted(convocatoria or [], key=_dorsal_sort):
        jugador = c.get("jugadores") or {}
        nombre = f"{jugador.get('nombre', '')} {jugador.get('apellidos', '')}".strip()
        rows.append({
            "dorsal": c.get("dorsal") if c.get("dorsal") is not None else jugador.get("dorsal") or "",
            "jugador_nombre": nombre,
            "apodo": (jugador.get("apodo") or "").strip(),
            "posicion": c.get("posicion_asignada") or jugador.get("posicion_principal", ""),
        })
    return rows


def _build_equipos_reducido(
    formacion_equipos: Optional[dict],
    jugadores_map: Optional[dict] = None,
) -> list[dict]:
    """Equipos compactos para el PDF reducido: color, título y dorsales/nombres."""
    if not formacion_equipos or not isinstance(formacion_equipos, dict):
        return []
    out: list[dict] = []
    for espacio in formacion_equipos.get("espacios") or []:
        for grupo in espacio.get("grupos") or []:
            tipo = grupo.get("tipo") or "equipo"
            if tipo in ("sin_asignar",):
                continue
            color = grupo.get("color") or "#64748b"
            nombre = grupo.get("nombre") or ("Comodín" if tipo == "comodin" else "Equipo")
            players = []
            for jid in grupo.get("jugador_ids") or []:
                j = (jugadores_map or {}).get(str(jid)) or {}
                dorsal = j.get("dorsal")
                n = (j.get("nombre") or "").strip()
                a = (j.get("apellidos") or "").strip()
                label = f"#{dorsal}" if dorsal not in (None, "") else (f"{n} {a[:1]}.".strip() if n else "?")
                players.append(label)
            out.append({
                "nombre": nombre,
                "color": color,
                "tipo": tipo,
                "players": players,
                "count": len(players),
            })
    return out


def _get_peto_info(color: str) -> dict:
    """Get peto CSS class and label for a team color."""
    if color in PETO_MAP:
        return PETO_MAP[color]
    # Fallback: try to determine a reasonable peto
    return {"css": "peto-gris", "label": color}


def _build_petos_html(
    formacion_equipos: Optional[dict],
    jugadores_map: Optional[dict] = None,
) -> str:
    """
    Build HTML for the cover page petos band.
    Each team group becomes a peto row with dot + label + player names.
    Uses ex-peto-row / ex-peto-dot / ex-peto-label / ex-peto-players CSS.
    """
    if not formacion_equipos:
        return ""

    espacios = formacion_equipos.get("espacios", [])
    if not espacios:
        return ""

    html = ""
    for espacio in espacios:
        for grupo in espacio.get("grupos", []):
            color = grupo.get("color", "#3B82F6")
            nombre = grupo.get("nombre", "")
            jugador_ids = grupo.get("jugador_ids", [])
            peto = _get_peto_info(color)

            # Build player names string
            names = []
            for jid in jugador_ids:
                jid_str = str(jid)
                if jugadores_map and jid_str in jugadores_map:
                    j = jugadores_map[jid_str]
                    n = j.get("nombre", "")
                    a = j.get("apellidos", "")
                    names.append(f"{n} {a[:1]}." if a else n)
                else:
                    names.append(f"#{len(names)+1}")

            html += f'<div class="ex-peto-row">'
            html += f'<div class="ex-peto-dot {peto["css"]}"></div>'
            html += f'<div>'
            html += f'<div class="ex-peto-label">{nombre or peto["label"]}</div>'
            if names:
                html += f'<div class="ex-peto-players">{", ".join(names)}</div>'
            html += f'</div></div>'

    return html


def _build_formation_html(
    formacion_equipos: Optional[dict],
    jugadores_map: Optional[dict] = None,
) -> str:
    """
    Build HTML for formation display on detail pages.
    Uses equipo-block / equipo-dot / equipo-name / equipo-jugadores CSS.
    """
    if not formacion_equipos:
        return ""

    espacios = formacion_equipos.get("espacios", [])
    if not espacios:
        return ""

    html = ""
    for espacio in espacios:
        for grupo in espacio.get("grupos", []):
            color = grupo.get("color", "#3B82F6")
            nombre = grupo.get("nombre", "")
            jugador_ids = grupo.get("jugador_ids", [])
            peto = _get_peto_info(color)

            # Build player names
            names = []
            for jid in jugador_ids:
                jid_str = str(jid)
                if jugadores_map and jid_str in jugadores_map:
                    j = jugadores_map[jid_str]
                    dorsal = j.get("dorsal", "")
                    n = j.get("nombre", "")
                    a = j.get("apellidos", "")
                    player_name = f"{n} {a[:1]}." if a else n
                    if dorsal:
                        player_name = f"#{dorsal} {player_name}"
                    names.append(player_name)

            html += f'<div class="equipo-block">'
            html += f'<div class="equipo-name"><span class="equipo-dot" style="background:{color};"></span>{nombre or peto["label"]}</div>'
            if names:
                html += f'<div class="equipo-jugadores">{" · ".join(names)}</div>'
            html += f'</div>'

    return html


async def generate_sesion_pdf_v2(
    sesion_data: dict,
    tareas_sesion: list,
    organizacion: dict,
    jugadores_map: Optional[dict] = None,
    microciclo_nombre: Optional[str] = None,
    lugar: Optional[str] = None,
    asistencia_roster: Optional[list] = None,
    portero_tareas: Optional[list] = None,
    abp_jugadas: Optional[list] = None,
    margen_entrenamientos: Optional[list] = None,
) -> bytes:
    """
    Genera un PDF profesional v2 de una sesion de entrenamiento.
    Pagina 1 landscape con thumbnails, paginas 2+ portrait con detalle por tarea.

    Args:
        sesion_data: Datos de la sesion (dict de BD)
        tareas_sesion: Lista de sesion_tareas con tareas nested
        organizacion: Datos de la organizacion
        jugadores_map: {jugador_id: {nombre, apellidos, dorsal, posicion_principal}}
        asistencia_roster: Lista de asistencia [{dorsal, nombre, apellidos, tipo_display, sort_key}]
        portero_tareas: Lista de tareas de portero de la sesion
        abp_jugadas: Lista de jugadas ABP vinculadas al partido de la sesion

    Returns:
        PDF como bytes
    """
    from app.services.svg_renderer import render_diagram_svg, render_diagram_thumbnail, render_abp_diagram_svg

    env = _get_jinja_env_v2()
    template = env.get_template("sesion_pdf_v2.html")

    color_primario = organizacion.get("color_primario", "#1a365d")
    equipo = sesion_data.get("equipos", {}) or {}

    # Build fases from estructura guardada o desde tareas (sin bloques vacíos por defecto)
    fases = {}
    estructura = sesion_data.get("estructura_fases") or []
    if isinstance(estructura, list) and estructura:
        for bloque in sorted(estructura, key=lambda b: b.get("orden", 0)):
            tipo = bloque.get("tipo")
            if not tipo or tipo in ("videoanalisis", "partido_condicionado"):
                fk = f"bloque_{bloque.get('id', tipo)}"
                partido = bloque.get("partido") if tipo == "partido_condicionado" else None
                fases[fk] = {
                    "nombre": bloque.get("label") or (
                        "Partido condicionado" if tipo == "partido_condicionado" else "Videoanálisis"
                    ),
                    "tareas": [],
                    "notas": bloque.get("notas") or "",
                    "duracion_objetivo": bloque.get("duracion_objetivo"),
                    "partido": partido if isinstance(partido, dict) else None,
                }
                continue
            if tipo == "compensatorio":
                lanes = lanes_from_bloque(bloque)
                for i, lane in enumerate(lanes):
                    lane_key = fase_for_lane(i)
                    if lane_key not in fases:
                        fases[lane_key] = {
                            "nombre": lane.get("label") or FASE_NOMBRES.get(lane_key, lane_key),
                            "tareas": [],
                            "duracion_objetivo": bloque.get("duracion_objetivo"),
                        }
                continue
            fk = tipo
            if fk not in fases:
                fases[fk] = {
                    "nombre": bloque.get("label") or FASE_NOMBRES.get(fk, fk.replace("_", " ").title()),
                    "tareas": [],
                    "duracion_objetivo": bloque.get("duracion_objetivo"),
                }
    for ts in tareas_sesion:
        fk = ts.get("fase_sesion", "desarrollo_1")
        if fk not in fases:
            fases[fk] = {"nombre": FASE_NOMBRES.get(fk, fk.replace("_", " ").title()), "tareas": []}
    # Sort fases: orden de estructura_fases si existe; si no, orden canónico
    if isinstance(estructura, list) and estructura:
        ordered_keys: list[str] = []
        for bloque in sorted(estructura, key=lambda b: b.get("orden", 0)):
            tipo = bloque.get("tipo")
            if tipo in ("videoanalisis", "partido_condicionado"):
                ordered_keys.append(f"bloque_{bloque.get('id', tipo)}")
            elif tipo == "compensatorio":
                ordered_keys.extend([fase_for_lane(i) for i in range(len(lanes_from_bloque(bloque)))])
            elif tipo:
                ordered_keys.append(tipo)
        for fk in fases:
            if fk not in ordered_keys:
                ordered_keys.append(fk)
        fases = {k: fases[k] for k in ordered_keys if k in fases}
    else:
        fase_order = [
            "activacion",
            "desarrollo_1",
            "desarrollo_2",
            "desarrollo_3",
            "desarrollo_4",
            "desarrollo_5",
            "desarrollo_6",
            "compensatorio_1",
            "compensatorio_2",
            "compensatorio_3",
            "compensatorio_4",
            "compensatorio_5",
            "compensatorio_6",
            "compensatorio_7",
            "compensatorio_8",
            "vuelta_calma",
        ]
        fases = {k: fases[k] for k in fase_order if k in fases}

    all_tareas = []
    sequential_dur = 0
    lane_durs: dict[int, int] = {}

    def _ensure_list(val):
        """Coerce string/None to list for template iteration safety."""
        if val is None:
            return []
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            stripped = val.strip()
            if not stripped:
                return []
            if "\n" in stripped:
                return [line.strip() for line in stripped.split("\n") if line.strip()]
            return [stripped]
        return []

    for tarea_sesion in tareas_sesion:
        tarea = tarea_sesion.get("tareas", {}) or {}
        categoria = tarea.get("categorias_tarea", {}) or {}
        fase_key = tarea_sesion.get("fase_sesion", "desarrollo_1")
        formacion = tarea_sesion.get("formacion_equipos")
        grafico_data = tarea.get("grafico_data")

        duracion = tarea_sesion.get("duracion_override") or tarea.get("duracion_total", 0)
        try:
            dur_i = int(duracion or 0)
        except (TypeError, ValueError):
            dur_i = 0
        if is_compensatorio_fase(fase_key):
            idx = compensatorio_lane_index(str(fase_key))
            if idx is not None:
                lane_durs[idx] = lane_durs.get(idx, 0) + dur_i
        else:
            sequential_dur += dur_i

        # Pizarra: foto real del editor; si no hay (o es el raster inventado), se dibuja
        # desde grafico_data. Nunca falta una pizarra.
        board = _board_tarea(tarea, f"t{len(all_tareas)}", f"d{len(all_tareas)}")
        preview_img = board["img"]
        svg_thumb = board["svg"]
        svg_large = board["svg_large"]

        # Formation HTML for detail page + petos HTML for cover page
        formation_html = _build_formation_html(formacion, jugadores_map)
        petos_html = _build_petos_html(formacion, jugadores_map)

        # Badge class from categoria codigo
        cat_code = (categoria.get("codigo", "") or "").lower()
        badge_class = cat_code if cat_code in BADGE_CLASSES else "default"

        tarea_enriched = {
            "titulo": tarea.get("titulo", ""),
            "descripcion": tarea.get("desarrollo") or tarea.get("descripcion", ""),
            "desarrollo": tarea.get("desarrollo") or "",
            "reglas": tarea.get("reglas") or "",
            "duracion": duracion,
            "categoria": categoria.get("nombre", ""),
            "categoria_codigo": categoria.get("codigo", ""),
            "num_jugadores_min": tarea.get("num_jugadores_min", 0),
            "num_jugadores_max": tarea.get("num_jugadores_max"),
            "num_series": tarea.get("num_series"),
            "espacio_largo": tarea.get("espacio_largo"),
            "espacio_ancho": tarea.get("espacio_ancho"),
            "nivel_cognitivo": tarea.get("nivel_cognitivo"),
            "densidad": tarea.get("densidad"),
            "fase_juego": tarea.get("fase_juego"),
            "principio_tactico": tarea.get("principio_tactico"),
            "subprincipio_tactico": tarea.get("subprincipio_tactico"),
            "reglas_tecnicas": _ensure_list(tarea.get("reglas_tecnicas")),
            "reglas_tacticas": _ensure_list(tarea.get("reglas_tacticas")),
            "consignas_ofensivas": _ensure_list(tarea.get("consignas_ofensivas")),
            "consignas_defensivas": _ensure_list(tarea.get("consignas_defensivas")),
            "errores_comunes": _ensure_list(tarea.get("errores_comunes")),
            "variantes": [
                v for v in _ensure_list(tarea.get("variantes"))
                if v.strip().lower() not in {x.lower() for x in _normas_planas(tarea)}
            ],
            "progresiones": _ensure_list(tarea.get("progresiones")),
            "material": material_de_tareas([tarea.get("material")]),
            "normas_grupos": _normas_grupos(tarea),
            "peto_color": _peto_categoria(categoria),
            "posicion_entrenador": tarea.get("posicion_entrenador") or "",
            "notas": tarea_sesion.get("notas", ""),
            "fase_label": FASE_NOMBRES.get(fase_key, ""),
            "preview_img": preview_img,
            "svg_thumbnail": svg_thumb,
            "svg_large": svg_large,
            "formation_html": formation_html,
            "petos_html": petos_html,
            "badge_class": badge_class,
            "is_activacion": fase_key == "activacion",
            "is_vuelta_calma": fase_key == "vuelta_calma",
            "objetivo_tactico": tarea.get("principio_tactico") or tarea.get("fase_juego", "").replace("_", " ").title() if tarea.get("fase_juego") else "",
            "has_diagram": bool(grafico_data),
        }

        if fase_key in fases:
            fases[fase_key]["tareas"].append(tarea_enriched)

    duracion_total = sequential_dur + (max(lane_durs.values()) if lane_durs else 0)

    def _ids_to_names(ids_or_map) -> str:
        ids: list = []
        if isinstance(ids_or_map, dict):
            ids = [v for v in ids_or_map.values() if v]
        elif isinstance(ids_or_map, list):
            ids = [v for v in ids_or_map if v]
        names = []
        for jid in ids:
            j = (jugadores_map or {}).get(str(jid)) or {}
            n = j.get("nombre", "")
            a = j.get("apellidos", "")
            dorsal = j.get("dorsal", "")
            label = f"{n} {a[:1]}.".strip() if a else n or str(jid)[:6]
            if dorsal:
                label = f"#{dorsal} {label}"
            names.append(label)
        return " · ".join(names)

    for fk, fase in list(fases.items()):
        partido = fase.get("partido")
        if not isinstance(partido, dict):
            continue
        dur = int(partido.get("duracion_min") or fase.get("duracion_objetivo") or 0)
        duracion_total += dur
        grafico_p = partido.get("pizarra") if isinstance(partido.get("pizarra"), dict) else None
        svg_large_p = render_diagram_svg(grafico_p, diagram_id=f"pco{fk}") if grafico_p else ""
        svg_thumb_p = render_diagram_thumbnail(grafico_p, diagram_id=f"pcot{fk}") if grafico_p else ""
        fase["tareas"].append({
            "titulo": fase.get("nombre") or "Partido condicionado",
            "descripcion": partido.get("objetivo") or "",
            "desarrollo": partido.get("objetivo") or "",
            "reglas": partido.get("normas") or "",
            "duracion": dur,
            "categoria": "Partido condicionado",
            "categoria_codigo": "PCO",
            "num_jugadores_min": 22,
            "num_jugadores_max": 22,
            "num_series": 1,
            "espacio_largo": None,
            "espacio_ancho": None,
            "nivel_cognitivo": None,
            "densidad": "alta",
            "fase_juego": "",
            "principio_tactico": "",
            "subprincipio_tactico": "",
            "reglas_tecnicas": [],
            "reglas_tacticas": [],
            "consignas_ofensivas": [],
            "consignas_defensivas": [],
            "errores_comunes": [],
            "variantes": [],
            "progresiones": [],
            "material": [],
            "normas_grupos": [("Normas", _lineas(partido.get("normas")))] if _lineas(partido.get("normas")) else [],
            "peto_color": _peto_categoria({"codigo": "PCO"}),
            "posicion_entrenador": "",
            "notas": fase.get("notas") or "",
            "fase_label": fase.get("nombre") or "Partido condicionado",
            "preview_img": "",
            "svg_thumbnail": svg_thumb_p,
            "svg_large": svg_large_p,
            "formation_html": "",
            "petos_html": "",
            "badge_class": "pco",
            "is_activacion": False,
            "is_vuelta_calma": False,
            "is_partido_condicionado": True,
            "partido_peto": _ids_to_names(partido.get("equipo_peto")),
            "partido_sin_peto": _ids_to_names(partido.get("equipo_sin_peto")),
            "partido_fuera": _ids_to_names(partido.get("fuera")),
            "objetivo_tactico": partido.get("objetivo") or "",
            "has_diagram": bool(grafico_p),
        })

    all_tareas = []
    for fase_key, fase in fases.items():
        all_tareas.extend(fase.get("tareas") or [])

    # Portada: TODAS las tareas (ninguna pizarra puede faltar)
    cover_tareas = list(all_tareas)

    # Derive secondary color (slightly lighter/shifted version of primary)
    color_secundario = organizacion.get("color_secundario", color_primario)

    from app.services.sesion_labels import build_conceptos_line
    conceptos_line = build_conceptos_line(sesion_data)

    logo_url = organizacion.get("logo_url") or ""
    if logo_url:
        logo_url = _url_to_data_uri(logo_url)

    # Material mínimo necesario: unión calculada de las tareas (no el campo manual)
    material_sesion = material_de_tareas(
        [(ts.get("tareas") or {}).get("material") for ts in tareas_sesion]
    )

    # Build portero tareas enriched data
    portero_enriched = []
    portero_duracion = 0
    for pt in (portero_tareas or []):
        diagram_data = pt.get("diagram")
        dur = pt.get("duracion", 10)
        portero_duracion += dur
        svg_thumb = render_diagram_thumbnail(diagram_data, diagram_id=f"pt{len(portero_enriched)}")
        svg_large = render_diagram_svg(diagram_data, diagram_id=f"pd{len(portero_enriched)}")
        portero_enriched.append({
            "nombre": pt.get("nombre", ""),
            "descripcion": pt.get("descripcion", ""),
            "duracion": dur,
            "intensidad": pt.get("intensidad", "media"),
            "tipo": pt.get("tipo", ""),
            "notas": pt.get("notas", ""),
            "svg_thumbnail": svg_thumb,
            "svg_large": svg_large,
            "has_diagram": bool(diagram_data and diagram_data.get("elements")),
        })
    # NOTE: portero_duracion NOT added to duracion_total — GK trains in parallel

    # Build ABP jugadas enriched data
    abp_enriched = []
    for idx, jp in enumerate(abp_jugadas or []):
        jugada = jp.get("jugada") or {}
        fases_abp = jugada.get("fases") or []
        main_svg = ""
        if fases_abp:
            diagram = fases_abp[0].get("diagram", {})
            if diagram and diagram.get("elements"):
                main_svg = render_abp_diagram_svg(diagram, diagram_id=f"abp_{idx}")
        abp_enriched.append({
            "nombre": jugada.get("nombre", ""),
            "codigo": jugada.get("codigo", ""),
            "tipo": ABP_TIPO_LABELS.get(jugada.get("tipo", ""), jugada.get("tipo", "")),
            "lado": jugada.get("lado", ""),
            "lado_label": "Ofensivo" if jugada.get("lado") == "ofensivo" else "Defensivo",
            "descripcion": jugada.get("descripcion", ""),
            "main_svg": main_svg,
            "notas": jp.get("notas", ""),
        })

    roster_grupos = _roster_grupos(asistencia_roster)
    md_color = _contexto_sesion_comun(sesion_data, organizacion, None, None, "")["md_color"]
    avail = 186 - 22 - (6 if conceptos_line else 0) - (8 if sesion_data.get("objetivo_principal") else 0) \
        - (7 if material_sesion else 0) - _alto_roster(roster_grupos, 10) - 8
    portada_layout = _layout_rejilla(len(cover_tareas), avail, 277)
    portada_layout["board_h"] = round(max(portada_layout["cell_h"] - 15.5, 8), 1)

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            roster_grupos=roster_grupos,
            md_color=md_color,
            portada_layout=portada_layout,
            sesion=sesion_data,
            fases=fases,
            all_tareas=all_tareas,
            cover_tareas=cover_tareas,
            color_primario=color_primario,
            color_secundario=color_secundario,
            org_nombre=organizacion.get("nombre", "TrainingHub Pro"),
            logo_url=logo_url,
            equipo_nombre=equipo.get("nombre", ""),
            equipo_categoria=equipo.get("categoria", ""),
            duracion_total=duracion_total,
            num_ejercicios=len(all_tareas),
            microciclo_nombre=microciclo_nombre or "",
            lugar=lugar or "",
            material_sesion=material_sesion,
            asistencia_roster=asistencia_roster or [],
            objetivo_principal=sesion_data.get("objetivo_principal", ""),
            conceptos_line=conceptos_line,
            fase_juego_principal=sesion_data.get("fase_juego_principal", "").replace("_", " ").title() if sesion_data.get("fase_juego_principal") else "",
            principio_tactico_principal=sesion_data.get("principio_tactico_principal", ""),
            portero_tareas=portero_enriched,
            portero_duracion=portero_duracion,
            abp_jugadas=abp_enriched,
            margen_entrenamientos=margen_entrenamientos or [],
        )
        try:
            return html_a_pdf(html_content, organizacion, "Sesión")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


async def generate_informe_rival_pdf(
    informe: dict,
    partido: dict,
    rival: dict,
    organizacion: dict,
    equipo_nombre: str = "",
    intel: Optional[dict] = None,
) -> bytes:
    """Genera PDF profesional de informe del rival."""
    env = _get_jinja_env_v2()
    template = env.get_template("informe_rival_pdf.html")

    color_primario = organizacion.get("color_primario", "#2563eb")

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            informe=informe,
            partido=partido,
            rival=rival,
            organizacion=organizacion,
            equipo_nombre=equipo_nombre,
            color_primario=color_primario,
            intel=intel or {},
        )
        try:
            return html_a_pdf(html_content, organizacion, "Informe rival")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


async def generate_informe_rival_standalone_pdf(
    informe: dict,
    rival: dict,
    organizacion: dict,
    equipo_nombre: str = "",
    equipo_escudo_url: str = "",
    intel: Optional[dict] = None,
    created_at: str = "",
) -> bytes:
    """Genera PDF profesional de informe del rival (standalone, sin partido)."""
    env = _get_jinja_env_v2()
    template = env.get_template("informe_rival_standalone_pdf.html")

    color_primario = organizacion.get("color_primario", "#2563eb")

    # Calculate H2H stats from intel
    h2h_stats = None
    if intel and intel.get("head_to_head"):
        wins = draws = losses = 0
        for match in intel["head_to_head"]:
            resultado = match.get("resultado", "")
            if resultado == "victoria":
                wins += 1
            elif resultado == "empate":
                draws += 1
            elif resultado == "derrota":
                losses += 1
        if wins or draws or losses:
            h2h_stats = {"wins": wins, "draws": draws, "losses": losses}

    # Generate formation SVG
    sistema_juego = rival.get("sistema_juego", "") or ""
    once_probable = []
    if intel and intel.get("once_probable"):
        once_data = intel["once_probable"]
        # intel.once_probable is {actas_analizadas, jugadores: [...]}
        if isinstance(once_data, dict):
            once_probable = once_data.get("jugadores", [])
        elif isinstance(once_data, list):
            once_probable = once_data
    if not once_probable and informe and informe.get("once_probable"):
        once_probable = informe["once_probable"]

    # No formation SVG — user wants a simple player list like the scouting tab
    formation_svg = ""

    # Generate phase diagrams
    phase_svgs = _generate_phase_svgs()

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            informe=informe,
            rival=rival,
            organizacion=organizacion,
            equipo_nombre=equipo_nombre,
            equipo_escudo_url=equipo_escudo_url,
            color_primario=color_primario,
            intel=intel or {},
            h2h_stats=h2h_stats,
            created_at=created_at,
            formation_svg=formation_svg,
            sistema_juego=_parse_formation(sistema_juego),
            phase_svgs=phase_svgs,
        )
        try:
            return html_a_pdf(html_content, organizacion, "Informe rival")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


async def generate_plan_partido_pdf(
    plan: dict,
    partido: dict,
    rival: dict,
    organizacion: dict,
    equipo_nombre: str = "",
) -> bytes:
    """Genera PDF profesional de plan de partido."""
    env = _get_jinja_env_v2()
    template = env.get_template("plan_partido_pdf.html")

    color_primario = organizacion.get("color_primario", "#2563eb")

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            plan=plan,
            partido=partido,
            rival=rival,
            organizacion=organizacion,
            equipo_nombre=equipo_nombre,
            color_primario=color_primario,
        )
        try:
            return html_a_pdf(html_content, organizacion, "Plan de partido")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


async def generate_plan_partido_jugadores_pdf(
    plan: dict,
    partido: dict,
    rival: dict,
    organizacion: dict,
    equipo_nombre: str = "",
) -> bytes:
    """Genera PDF simplificado de plan de partido para jugadores."""
    env = _get_jinja_env_v2()
    template = env.get_template("plan_partido_jugadores_pdf.html")

    color_primario = organizacion.get("color_primario", "#2563eb")

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            plan=plan,
            partido=partido,
            rival=rival,
            organizacion=organizacion,
            equipo_nombre=equipo_nombre,
            color_primario=color_primario,
        )
        try:
            return html_a_pdf(html_content, organizacion, "Plan de partido · Jugadores")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


async def generate_tarea_pdf(
    tarea: dict,
    organizacion: dict,
    equipo_nombre: str = "",
) -> bytes:
    """Genera PDF de ficha de tarea (ejercicio individual)."""
    env = _get_jinja_env()
    template = env.get_template("tarea_pdf.html")

    color = organizacion.get("color_primario", "#1a365d")
    categoria = tarea.get("categorias_tarea", {}) or {}

    # Render diagram SVG from grafico_data if available
    grafico_svg_rendered = tarea.get("grafico_svg") or ""
    if not grafico_svg_rendered and tarea.get("grafico_data"):
        try:
            from app.services.svg_renderer import render_diagram_svg
            grafico_svg_rendered = render_diagram_svg(tarea["grafico_data"]) or ""
        except Exception as e:
            logger.warning(f"Could not render tarea diagram SVG: {e}")

    # Pre-fetch external images as base64 data URIs so WeasyPrint doesn't
    # make slow HTTP requests during PDF rendering (saves ~25s in production).
    raw_logo = organizacion.get("logo_url") or organizacion.get("logo") or ""
    org_logo_data = _url_to_data_uri(raw_logo) if raw_logo else ""

    raw_grafico = tarea.get("grafico_url") or ""
    grafico_data_uri = _url_to_data_uri(raw_grafico) if raw_grafico and not grafico_svg_rendered else raw_grafico

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            tarea=tarea,
            color_primario=color,
            org_nombre=organizacion.get("nombre", "TrainingHub Pro"),
            org_logo_url=org_logo_data,
            categoria_nombre=categoria.get("nombre", ""),
            categoria_codigo=categoria.get("codigo", ""),
            equipo_nombre=equipo_nombre,
            grafico_svg_rendered=grafico_svg_rendered,
            grafico_data_uri=grafico_data_uri,
            descanso_label=format_descanso(tarea.get("tiempo_descanso")),
            material_nombres=material_de_tareas([tarea.get("material")]),
            normas_grupos=_normas_grupos(tarea),
            variantes_extra=[
                v for v in _lineas(tarea.get("variantes"))
                if v.lower() not in {x.lower() for x in _normas_planas(tarea)}
            ],
            peto_color=_peto_categoria(categoria),
        )
        try:
            return html_a_pdf(html_content, organizacion, "Tarea")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


# ============ ABP PDF Functions ============

ABP_TIPO_LABELS = {
    "corner": "Corner",
    "semi_corner": "Semi-corner",
    "falta_lateral": "Falta lateral",
    "falta_frontal": "Falta frontal",
    "falta_lejana": "Falta lejana",
    "penalti": "Penalti",
    "saque_banda": "Saque de banda",
    "saque_puerta": "Saque de puerta",
    "saque_centro": "Saque de centro",
}

ABP_LADO_LABELS = {
    "ofensivo": "Ofensivo",
    "defensivo": "Defensivo",
}


ABP_ROL_LABELS = {
    "lanzador": "Lanzador",
    "bloqueador": "Bloqueador",
    "palo_corto": "Palo corto",
    "palo_largo": "Palo largo",
    "borde_area": "Borde área",
    "señuelo": "Señuelo",
    "rechace": "Rechace",
    "referencia": "Referencia",
    "barrera": "Barrera",
    "marcaje_zonal": "Marcaje zonal",
    "marcaje_individual": "Marcaje individual",
    "portero": "Portero",
    "otro": "Otro",
}


def _player_display_name(player: Optional[dict]) -> str:
    if not player:
        return ""
    apodo = (player.get("apodo") or "").strip()
    if apodo:
        return apodo
    return f"{player.get('nombre', '')} {player.get('apellidos', '')}".strip()


def _name_by_element_id(
    asignaciones: list,
    jugadores_map: Optional[dict],
    elements: list,
) -> dict:
    """Map diagram element id → player name (asignaciones + token fields)."""
    names: dict[str, str] = {}
    for el in elements or []:
        eid = str(el.get("id", ""))
        if not eid:
            continue
        if el.get("jugador"):
            names[eid] = str(el["jugador"])
        elif jugadores_map and el.get("jugadorId"):
            n = _player_display_name(jugadores_map.get(el["jugadorId"]))
            if n:
                names[eid] = n
        elif jugadores_map and el.get("jugador_id"):
            n = _player_display_name(jugadores_map.get(el["jugador_id"]))
            if n:
                names[eid] = n
    for asig in asignaciones or []:
        eid = str(asig.get("element_id") or "")
        if not eid:
            continue
        if asig.get("jugador_nombre"):
            names[eid] = str(asig["jugador_nombre"])
            continue
        jids = asig.get("jugador_ids") or ([asig["jugador_id"]] if asig.get("jugador_id") else [])
        resolved = []
        for jid in jids:
            n = _player_display_name((jugadores_map or {}).get(jid) if jugadores_map else None)
            if n:
                resolved.append(n)
        if resolved:
            names[eid] = " / ".join(resolved)
    return names


def _collect_directrices(fase: dict, elements: list, arrows: list) -> list[str]:
    items: list[str] = []
    desc = (fase.get("descripcion") or "").strip()
    if desc:
        items.append(desc)
    for el in elements or []:
        who = (el.get("jugador") or el.get("label") or "").strip()
        for fn in el.get("funciones") or []:
            if not isinstance(fn, dict):
                continue
            text = (fn.get("funcion") or "").strip()
            if not text:
                continue
            label = (fn.get("jugadorLabel") or who).strip()
            items.append(f"{label}: {text}" if label else text)
    for ar in arrows or []:
        comment = (ar.get("comment") or "").strip()
        if not comment:
            continue
        num = ar.get("label") or ""
        items.append(f"{num}. {comment}" if num else comment)
    seen = set()
    unique = []
    for item in items:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def _render_abp_diagram_svg(
    fase: dict,
    diagram_id: str = "abp",
    name_by_element: Optional[dict] = None,
) -> str:
    """Render a single ABP phase diagram with editor orientation (goal at bottom)."""
    try:
        from app.services.svg_renderer import (
            render_abp_diagram_svg,
            prepare_abp_playbook_snapshot,
        )
        diagram = fase.get("diagram") or {}
        if not isinstance(diagram, dict):
            return ""
        snap = prepare_abp_playbook_snapshot(diagram)
        if not snap:
            return ""
        pitch = snap.get("pitchType") or diagram.get("pitchType") or "half"
        is_full = pitch == "full"
        return render_abp_diagram_svg(
            diagram,
            diagram_id=diagram_id,
            horizontal_full=is_full,
            name_by_element=name_by_element,
            include_trails=True,
        )
    except Exception as e:
        logger.warning(f"Error rendering ABP diagram: {e}")
        return ""


async def generate_abp_playbook_pdf(
    jugadas: list[dict],
    equipo_nombre: str = "",
    organizacion: Optional[dict] = None,
    equipo_temporada: str = "",
    equipo_categoria: str = "",
    jugadores_map: Optional[dict] = None,
) -> bytes:
    """Genera PDF del playbook ABP completo del equipo (mismo diseño que el resto de PDFs)."""
    env = _get_jinja_env_v2()
    template = env.get_template("abp_playbook_pdf.html")

    org = organizacion or {}
    color_primario = org.get("color_primario") or "#1a365d"
    raw_logo = org.get("logo_url") or org.get("logo") or ""
    logo_url = _url_to_data_uri(raw_logo) if raw_logo else ""

    grouped: dict[str, list] = {}
    toc: list[dict] = []
    for j in jugadas:
        tipo = j.get("tipo", "otro")
        if tipo not in grouped:
            grouped[tipo] = []
        fases = j.get("fases") or []
        asignaciones = j.get("asignaciones") or []
        rendered_fases = []
        all_directrices: list[str] = []
        all_asignaciones: list[dict] = []
        for i, fase in enumerate(fases):
            diagram = fase.get("diagram") or {}
            from app.services.svg_renderer import prepare_abp_playbook_snapshot
            snap = prepare_abp_playbook_snapshot(diagram) or {}
            elements = snap.get("elements") or []
            arrows = snap.get("arrows") or []
            names = _name_by_element_id(asignaciones, jugadores_map, elements)
            svg = _render_abp_diagram_svg(
                fase,
                diagram_id=f"j{str(j.get('id', ''))[:8]}_f{i}",
                name_by_element=names,
            )
            directrices = _collect_directrices(fase, elements, arrows)
            all_directrices.extend(directrices)
            rendered_fases.append({**fase, "svg": svg, "directrices": directrices})
            for el in elements:
                eid = str(el.get("id", ""))
                name = names.get(eid) or (el.get("jugador") or "")
                rol = el.get("rol") or ""
                if name or rol:
                    all_asignaciones.append({
                        "label": el.get("label") or "",
                        "rol": ABP_ROL_LABELS.get(rol, rol) if rol else "",
                        "nombre": name,
                    })
        j["rendered_fases"] = rendered_fases
        j["play_directrices"] = list(dict.fromkeys(all_directrices))
        j["resolved_asignaciones"] = all_asignaciones
        from app.services.svg_renderer import roles_campo_from_diagram
        j["roles_campo"] = []
        for fase in fases:
            found = roles_campo_from_diagram((fase or {}).get("diagram"))
            if found:
                j["roles_campo"] = found
                break
        grouped[tipo].append(j)
        toc.append({
            "nombre": j.get("nombre") or "",
            "codigo": j.get("codigo") or "",
            "tipo": tipo,
            "lado": j.get("lado") or "",
        })

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            grouped=grouped,
            toc=toc,
            equipo_nombre=equipo_nombre,
            equipo_temporada=equipo_temporada,
            equipo_categoria=equipo_categoria,
            org_nombre=org.get("nombre", ""),
            logo_url=logo_url,
            color_primario=color_primario,
            tipo_labels=ABP_TIPO_LABELS,
            lado_labels=ABP_LADO_LABELS,
            rol_labels=ABP_ROL_LABELS,
            total_jugadas=len(jugadas),
        )
        try:
            return html_a_pdf(html_content, organizacion, "Playbook ABP")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


async def generate_abp_partido_pdf(
    jugadas_partido: list[dict],
    rival_jugadas: list[dict],
    partido: dict,
    plan: Optional[dict] = None,
    jugadores_map: Optional[dict] = None,
    equipo_nombre: str = "",
    organizacion: Optional[dict] = None,
    equipo_temporada: str = "",
    equipo_categoria: str = "",
) -> bytes:
    """Genera PDF profesional del plan ABP para un partido (vestuario)."""
    from app.services.svg_renderer import render_abp_diagram_svg

    env = _get_jinja_env_v2()
    template = env.get_template("abp_partido_pdf.html")

    from app.services.svg_renderer import prepare_abp_playbook_snapshot

    # Render diagrams for our plays using ABP pitch (goal at bottom, same as editor)
    for idx, jp in enumerate(jugadas_partido):
        jugada = jp.get("jugada") or {}
        fases = jugada.get("fases") or []
        asignaciones = jp.get("asignaciones_override") or jugada.get("asignaciones") or []
        if fases:
            diagram = fases[0].get("diagram") or {}
            snap = prepare_abp_playbook_snapshot(diagram) or {}
            names = _name_by_element_id(asignaciones, jugadores_map, snap.get("elements") or [])
            pitch = snap.get("pitchType") or (diagram or {}).get("pitchType") or "half"
            jugada["main_svg"] = render_abp_diagram_svg(
                diagram,
                diagram_id=f"own_{idx}",
                horizontal_full=(pitch == "full"),
                name_by_element=names,
            ) if diagram else ""
            diagram_elements = snap.get("elements") or []
        else:
            jugada["main_svg"] = ""
            diagram_elements = []
            diagram = {}

        from app.services.svg_renderer import roles_campo_from_diagram
        jugada["roles_campo"] = roles_campo_from_diagram(diagram if fases else None)

        element_labels = {str(el.get("id", "")): str(el.get("label", "")) for el in diagram_elements}
        resolved = []
        for asig in asignaciones:
            jids = asig.get("jugador_ids") or ([asig["jugador_id"]] if asig.get("jugador_id") else [])
            names = []
            for jid in jids:
                name = _player_display_name((jugadores_map or {}).get(jid) if jugadores_map and jid else None)
                if name:
                    names.append(name)
            element_label = element_labels.get(str(asig.get("element_id", "")), "")
            resolved.append({
                "element_id": asig.get("element_id", ""),
                "element_label": element_label,
                "rol": asig.get("rol", ""),
                "jugador_nombre": " / ".join(names),
            })
        jp["resolved_asignaciones"] = [r for r in resolved if r["jugador_nombre"]]

    # Render diagrams for rival plays
    for idx, rj in enumerate(rival_jugadas):
        fases = rj.get("fases") or []
        if fases:
            diagram = fases[0].get("diagram") or {}
            pitch = (diagram or {}).get("pitchType") or "half"
            rj["main_svg"] = render_abp_diagram_svg(
                diagram,
                diagram_id=f"rival_{idx}",
                horizontal_full=(pitch == "full"),
            ) if diagram else ""
        else:
            rj["main_svg"] = ""

    rival_info = partido.get("rivales") or {}
    rival_nombre = rival_info.get("nombre", "Rival")

    # Separate by lado
    ofensivas = [jp for jp in jugadas_partido if (jp.get("jugada") or {}).get("lado") == "ofensivo"]
    defensivas = [jp for jp in jugadas_partido if (jp.get("jugada") or {}).get("lado") == "defensivo"]

    org = organizacion or {}
    color_primario = org.get("color_primario", "#1a365d")
    raw_logo = org.get("logo_url") or ""
    if raw_logo:
        org = {**org, "logo_url": _url_to_data_uri(raw_logo)}

    def _render() -> bytes:
        html_content = template.render(
            tema=tema_pdf(organizacion),
            jugadas_partido=jugadas_partido,
            ofensivas=ofensivas,
            defensivas=defensivas,
            rival_jugadas=rival_jugadas,
            partido=partido,
            rival_nombre=rival_nombre,
            plan=plan or {},
            equipo_nombre=equipo_nombre,
            equipo_temporada=equipo_temporada,
            equipo_categoria=equipo_categoria,
            org_nombre=org.get("nombre", ""),
            logo_url=org.get("logo_url", ""),
            color_primario=color_primario,
            tipo_labels=ABP_TIPO_LABELS,
            lado_labels=ABP_LADO_LABELS,
            rol_labels=ABP_ROL_LABELS,
            total_ofensivas=len(ofensivas),
            total_defensivas=len(defensivas),
        )
        try:
            return html_a_pdf(html_content, organizacion, "ABP · Plan de partido")
        except ImportError:
            logger.warning("WeasyPrint not available, returning HTML as bytes")
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)


# ============ Sesión: piezas compartidas por v2 / reducido / plegado ============

# Color de peto por categoría (semántico; siempre va con la sigla escrita).
_PETO_CATEGORIA = {
    "RND": "#3B82F6", "JDP": "#8B5CF6", "POS": "#06B6D4", "EVO": "#F59E0B",
    "AVD": "#EF4444", "PCO": "#10B981", "ACO": "#14B8A6", "SSG": "#F97316",
    "ABP": "#6366F1", "PAR": "#84CC16",
}


def _peto_categoria(categoria: Optional[dict]) -> str:
    cat = categoria if isinstance(categoria, dict) else {}
    color = str(cat.get("color") or "").strip()
    if re.fullmatch(r"#[0-9A-Fa-f]{6}", color):
        return color
    return _PETO_CATEGORIA.get(str(cat.get("codigo") or "").upper(), "#64748B")


def _lineas(val) -> list[str]:
    """Texto o lista -> líneas limpias (sin viñetas)."""
    if val is None:
        return []
    if isinstance(val, str):
        parts = re.split(r"[\n;]", val)
    elif isinstance(val, (list, tuple)):
        parts = []
        for v in val:
            parts.extend(str(v).split("\n"))
    else:
        return []
    out = [p.strip(" •-\t") for p in parts]
    return [p for p in out if p]


def _normas_grupos(tarea: dict) -> list[tuple[str, list[str]]]:
    """Normas de provocación de la tarea: reglas técnicas, tácticas y psicológicas,
    más el texto «Variantes / reglas» (sin repetir lo ya listado)."""
    grupos: list[tuple[str, list[str]]] = []
    vistos: set[str] = set()
    for label, key in (
        ("Técnicas", "reglas_tecnicas"),
        ("Tácticas", "reglas_tacticas"),
        ("Psicológicas", "reglas_psicologicas"),
    ):
        items = [x for x in _lineas(tarea.get(key)) if x.lower() not in vistos]
        vistos.update(x.lower() for x in items)
        if items:
            grupos.append((label, items))
    extra = [x for x in _lineas(tarea.get("reglas")) if x.lower() not in vistos]
    if extra:
        grupos.append(("Reglas y variantes", extra))
    return grupos


def _normas_planas(tarea: dict) -> list[str]:
    return [x for _, items in _normas_grupos(tarea) for x in items]


def _board_tarea(tarea: dict, diagram_id: str, large_id: str = "") -> dict:
    """Pizarra de una tarea: foto real del editor; si no hay, SVG desde grafico_data
    (también cuando la foto es el raster inventado). Siempre devuelve algo dibujable."""
    from app.services.svg_renderer import render_diagram_for_pdf, render_diagram_svg

    grafico = parse_grafico(tarea.get("grafico_data"))
    img = ""
    raw = grafico.get("preview") or ""
    if isinstance(raw, str) and raw.startswith("data:image") and not is_poisoned_preview(raw):
        img = raw
    if not img:
        gu = tarea.get("grafico_url") or ""
        if isinstance(gu, str) and gu:
            cand = _url_to_data_uri(gu) if gu.startswith("http") else gu
            if isinstance(cand, str) and cand.startswith("data:image") and not is_poisoned_preview(cand):
                img = cand
    svg, svg_large, kind = "", "", "half"
    if not img:
        base = grafico or {"pitchType": "half"}
        try:
            svg, kind = render_diagram_for_pdf(base, diagram_id=diagram_id)
            kind = kind or "half"
        except Exception:
            svg = ""
        try:
            svg_large = render_diagram_svg(grafico or None, diagram_id=large_id or diagram_id + "L") or ""
        except Exception:
            svg_large = ""
    elif isinstance(grafico, dict):
        kind = "full" if grafico.get("pitchType") == "full" else "half"
    return {"img": img, "svg": svg, "svg_large": svg_large, "kind": kind}


def _orden_fases(estructura) -> tuple[list[str], dict]:
    """Claves de fase en el orden de la sesión, y los bloques de partido condicionado."""
    partidos: dict = {}
    keys: list[str] = []
    if isinstance(estructura, list) and estructura:
        for bloque in sorted(estructura, key=lambda b: (b or {}).get("orden", 0)):
            tipo = bloque.get("tipo")
            if tipo == "partido_condicionado":
                k = f"bloque_{bloque.get('id', tipo)}"
                partidos[k] = bloque
                keys.append(k)
            elif tipo == "videoanalisis" or not tipo:
                continue
            elif tipo == "compensatorio":
                keys.extend(fase_for_lane(i) for i in range(len(lanes_from_bloque(bloque))))
            else:
                keys.append(tipo)
    else:
        keys = (
            ["activacion"] + [f"desarrollo_{i}" for i in range(1, 7)]
            + [f"compensatorio_{i}" for i in range(1, 9)] + ["vuelta_calma"]
        )
    return keys, partidos


def _jug_corto(jugadores_map: Optional[dict], jid) -> dict:
    j = (jugadores_map or {}).get(str(jid)) or {}
    ap = (j.get("apellidos") or "").strip()
    nom = (j.get("nombre") or "").strip()
    etiqueta = ap.split()[0] if ap else (nom or "?")
    return {"dorsal": j.get("dorsal") if j.get("dorsal") not in (None, "") else "", "nombre": etiqueta}


def _card_tarea(ts: dict, orden: int, jugadores_map: Optional[dict]) -> dict:
    tarea = ts.get("tareas") or ts.get("tarea") or {}
    if not isinstance(tarea, dict):
        tarea = {}
    cat = tarea.get("categorias_tarea") or tarea.get("categoria") or {}
    cat = cat if isinstance(cat, dict) else {}
    fase = ts.get("fase_sesion") or ""
    lane = compensatorio_lane_index(fase) if is_compensatorio_fase(fase) else None
    desc = " ".join((tarea.get("desarrollo") or tarea.get("descripcion") or "").split())
    if not desc:
        obj = []
        for key in ("objetivos_tacticos", "objetivos_tecnicos"):
            vals = tarea.get(key) or []
            if isinstance(vals, list):
                obj.extend(str(v).replace("_", " ") for v in vals[:2])
        desc = " · ".join(obj[:3])
    formacion = ts.get("formacion_equipos") if isinstance(ts.get("formacion_equipos"), dict) else None
    try:
        dur = int(ts.get("duracion_override") or tarea.get("duracion_total") or 0)
    except (TypeError, ValueError):
        dur = 0
    espacio = ""
    if tarea.get("espacio_largo") and tarea.get("espacio_ancho"):
        espacio = f"{int(float(tarea['espacio_largo']))}×{int(float(tarea['espacio_ancho']))} m"
    return {
        "orden": orden,
        "titulo": tarea.get("titulo") or "Tarea",
        "sigla": str(cat.get("codigo") or cat.get("nombre_corto") or "").upper()[:4],
        "peto": _peto_categoria(cat),
        "duracion": dur,
        "series": tarea.get("num_series") if (tarea.get("num_series") or 1) > 1 else None,
        "desc": desc,
        "normas": _normas_planas(tarea),
        "material": material_de_tareas([tarea.get("material")]),
        "board": _board_tarea(tarea, f"r{orden}", f"rl{orden}"),
        "equipos": _build_equipos_reducido(formacion, jugadores_map),
        "lane": lane,
        "espacio": espacio,
        "jugadores": (
            f"{tarea.get('num_jugadores_min')}"
            + (f"–{tarea.get('num_jugadores_max')}" if tarea.get("num_jugadores_max") and tarea.get("num_jugadores_max") != tarea.get("num_jugadores_min") else "")
        ) if tarea.get("num_jugadores_min") else "",
    }


def _card_partido(bloque: dict, orden: int) -> dict:
    partido = bloque.get("partido") if isinstance(bloque.get("partido"), dict) else {}
    try:
        dur = int(partido.get("duracion_min") or bloque.get("duracion_objetivo") or 0)
    except (TypeError, ValueError):
        dur = 0
    pizarra = partido.get("pizarra") if isinstance(partido.get("pizarra"), dict) else None
    board = _board_tarea({"grafico_data": pizarra or {"pitchType": "full"}}, f"rp{orden}", f"rpl{orden}")
    return {
        "orden": orden,
        "titulo": bloque.get("label") or "Partido condicionado",
        "sigla": "PCO",
        "peto": _peto_categoria({"codigo": "PCO"}),
        "duracion": dur,
        "series": None,
        "desc": " ".join(str(partido.get("objetivo") or "").split()),
        "normas": _lineas(partido.get("normas")),
        "material": [],
        "board": board,
        "equipos": [],
        "lane": None,
        "espacio": "",
        "jugadores": "",
    }


def _roster_grupos(asistencia_roster: Optional[list]) -> list[dict]:
    roster = asistencia_roster or []
    defs = (
        ("sesion", "Sesión", lambda p: "sesion" in (p.get("tipos") or [])),
        ("fisio", "Fisio", lambda p: "fisio" in (p.get("tipos") or [])),
        ("margen", "Margen", lambda p: "margen" in (p.get("tipos") or [])),
        ("ausente", "Ausentes", lambda p: p.get("sort_key") == "ausente"),
    )
    out = []
    for clave, label, pred in defs:
        players = []
        for p in roster:
            if not pred(p):
                continue
            ap = (p.get("apellidos") or "").strip()
            nom = (p.get("nombre") or "").strip()
            players.append({
                "dorsal": p.get("dorsal") if p.get("dorsal") not in (None, "") else "",
                "nombre": ap.split()[0] if ap else nom,
                "motivo": (p.get("tipo_display") or "").replace("Ausente — ", "") if clave == "ausente" else "",
                "fisio": clave in ("sesion", "margen") and "fisio" in (p.get("tipos") or []),
            })
        if players:
            out.append({"clave": clave, "label": label, "players": players})
    return out


def _alto_roster(grupos: list[dict], por_linea: int) -> float:
    return sum(2 + 5.6 * max(1, -(-len(g["players"]) // por_linea)) for g in grupos)


def _layout_rejilla(n: int, avail_h: float, ancho: float) -> dict:
    n = max(n, 1)
    if n <= 3:
        rows, cols = 1, n
    elif n <= 12:
        rows, cols = 2, -(-n // 2)
    else:
        rows, cols = 3, -(-n // 3)
    cell_h = max(30.0, avail_h / rows - 2)
    cell_w = ancho / cols - 2
    return {"cols": cols, "rows": rows, "cell_h": round(cell_h, 1), "cell_w": round(cell_w, 1)}


def _recorta_card(card: dict, lineas: int, cpl: int, max_normas: int = 5) -> None:
    """Ajusta descripción y normas a `lineas` líneas de `cpl` caracteres.

    Cada norma ocupa una línea (se acorta); la descripción usa el resto."""
    lineas = max(int(lineas), 1)
    normas = card.get("normas") or []
    desc = card.get("desc") or ""
    if normas:
        quiere = min(len(normas), max_normas)
        n_lin = quiere if not desc else min(quiere, max(1, lineas // 2))
    else:
        n_lin = 0
    d_lin = max(lineas - n_lin, 1 if desc else 0)
    card["desc_c"] = _clip(desc, int(d_lin * cpl * 0.9)) if desc else ""
    if desc and card["desc_c"]:
        usadas = -(-len(card["desc_c"]) // cpl)
        if normas and usadas < d_lin:
            n_lin = min(min(len(normas), max_normas), n_lin + (d_lin - usadas))
    card["normas_c"] = [_clip(x, max(cpl - 3, 12)) for x in normas[:n_lin]]


def _datos_cartel(
    sesion_data: dict,
    tareas_sesion: list,
    jugadores_map: Optional[dict],
    margen_entrenamientos: Optional[list],
) -> dict:
    """Todo lo que necesitan el reducido (cartel) y el plegado."""
    keys, partidos = _orden_fases(sesion_data.get("estructura_fases"))
    por_fase: dict[str, list] = {}
    for ts in tareas_sesion or []:
        por_fase.setdefault(ts.get("fase_sesion") or "desarrollo_1", []).append(ts)
    items: list[tuple[str, dict]] = []
    for k in keys:
        if k in partidos:
            items.append(("partido", partidos[k]))
        items.extend(("tarea", ts) for ts in por_fase.pop(k, []))
    for resto in por_fase.values():
        items.extend(("tarea", ts) for ts in resto)

    tareas = []
    for n, (tipo, obj) in enumerate(items, start=1):
        tareas.append(_card_tarea(obj, n, jugadores_map) if tipo == "tarea" else _card_partido(obj, n))

    material = material_de_tareas([(ts.get("tareas") or {}).get("material") for ts in tareas_sesion or []])
    duracion = tiempos_sesion(tareas_sesion)[0] + sum(
        c["duracion"] for (tipo, _o), c in zip(items, tareas) if tipo == "partido"
    )

    lanes = []
    estructura = sesion_data.get("estructura_fases")
    for bloque in (estructura if isinstance(estructura, list) else []):
        if not isinstance(bloque, dict) or bloque.get("tipo") != "compensatorio":
            continue
        for i, lane in enumerate(lanes_from_bloque(bloque)):
            players = [_jug_corto(jugadores_map, jid) for jid in lane.get("jugador_ids") or []]
            lt = [c for c in tareas if c["lane"] == i]
            if not players and not lt:
                continue
            lanes.append({
                "label": lane.get("label") or f"Grupo {chr(65 + i)}",
                "players": players,
                "tareas": [{"orden": c["orden"], "titulo": c["titulo"], "duracion": c["duracion"]} for c in lt],
                "duracion": sum(c["duracion"] for c in lt),
            })

    margen = []
    for ent in margen_entrenamientos or []:
        ap = (ent.get("apellidos") or "").strip()
        nom = (ent.get("nombre") or "").strip()
        margen.append({
            "dorsal": ent.get("dorsal") if ent.get("dorsal") not in (None, "") else "",
            "nombre": ap.split()[0] if ap else nom,
            "objetivo": ent.get("objetivo") or "",
            "duracion": ent.get("duracion_estimada"),
            "ejercicios": [
                {"titulo": t.get("titulo") or "", "duracion": t.get("duracion"),
                 "series": t.get("series"), "repeticiones": t.get("repeticiones")}
                for t in (ent.get("tareas") or []) if t.get("titulo")
            ],
        })
    return {
        "tareas": tareas, "material": material, "duracion": duracion,
        "lanes": lanes, "margen": margen,
    }


def _contexto_sesion_comun(
    sesion_data: dict, organizacion: dict, lugar, microciclo_nombre, logo_url: str
) -> dict:
    from app.services.informe_boards import md_chrome
    from app.services.sesion_labels import build_conceptos_line

    equipo = sesion_data.get("equipos", {}) or {}
    md = md_chrome(sesion_data.get("match_day"))
    return {
        "md_color": md["bar"],
        "md_label": md["label"] if sesion_data.get("match_day") else "",
        "tema": tema_pdf(organizacion),
        "sesion": sesion_data,
        "objetivo_principal": (sesion_data.get("objetivo_principal") or "").strip(),
        "equipo_nombre": equipo.get("nombre", ""),
        "equipo_categoria": equipo.get("categoria", ""),
        "logo_url": logo_url,
        "match_day": sesion_data.get("match_day"),
        "rival": sesion_data.get("rival"),
        "lugar": lugar or sesion_data.get("lugar"),
        "microciclo_nombre": microciclo_nombre,
        "conceptos_line": build_conceptos_line(sesion_data),
    }


def _logo_pdf(organizacion: dict) -> str:
    logo_url = organizacion.get("logo_url") or ""
    return _url_to_data_uri(logo_url) if logo_url else ""


async def generate_sesion_pdf_reducido(
    sesion_data: dict,
    tareas_sesion: list,
    organizacion: dict,
    *,
    lugar: Optional[str] = None,
    microciclo_nombre: Optional[str] = None,
    asistencia_roster: Optional[list] = None,
    jugadores_map: Optional[dict] = None,
    margen_entrenamientos: Optional[list] = None,
) -> bytes:
    """Reducido = cartel A4 apaisado para la puerta del vestuario.

    Todas las tareas con su pizarra y una explicación corta, el tiempo, el material
    mínimo necesario y, si lo hay, el compensatorio (quién va y qué hace).
    Siempre 1 folio: las alturas se calculan y cada celda recorta su texto.
    """
    env = _get_jinja_env_v2()
    template = env.get_template("sesion_pdf_reducido.html")
    datos = _datos_cartel(sesion_data, tareas_sesion, jugadores_map, margen_entrenamientos)
    tareas = datos["tareas"]
    lanes, margen = datos["lanes"], datos["margen"]

    # Alto del compensatorio (si lo hay)
    comp_h = 0.0
    if lanes or margen:
        cols_c = len(lanes) + (1 if margen else 0)
        col_w = 281 / max(cols_c, 1)
        por_fila = max(1, int((col_w - 4) // 17))
        h_lane = 0.0
        for ln in lanes:
            h_lane = max(h_lane, 5 + 6.4 * max(1, -(-len(ln["players"]) // por_fila)) + 3.6 * min(len(ln["tareas"]), 4))
        h_marg = (5 + 5.6 * min(len(margen), 6)) if margen else 0
        comp_h = min(56.0, max(h_lane, h_marg, 20.0) + 3)

    objetivo = bool((sesion_data.get("objetivo_principal") or "").strip())
    avail = 190 - 25 - (7 if objetivo else 0) - (7 if datos["material"] else 0) - comp_h - 4
    lay = _layout_rejilla(len(tareas), avail, 281)
    fs = 10.0 if lay["cell_w"] > 120 else (8.4 if lay["cell_w"] > 75 else 7.2)
    board_h = round(min(lay["cell_h"] * 0.52, lay["cell_w"] * 0.74, 90), 1)
    text_h = max(lay["cell_h"] - board_h - 11, 8)
    fs_mm = fs * 0.3528
    lineas = max(1, int(text_h / (fs_mm * 1.3)))
    cpl = max(10, int((lay["cell_w"] - 4) / (fs_mm * 0.54)))
    for c in tareas:
        _recorta_card(c, lineas, cpl, max_normas=5)
    lay.update(board_h=board_h, text_h=round(text_h, 1), fs=fs)
    filas = [tareas[i * lay["cols"]:(i + 1) * lay["cols"]] for i in range(lay["rows"])]
    filas = [f + [None] * (lay["cols"] - len(f)) for f in filas if f]

    ctx = _contexto_sesion_comun(sesion_data, organizacion, lugar, microciclo_nombre, _logo_pdf(organizacion))
    ctx.update(
        filas=filas, layout=lay, material=datos["material"], duracion_total=datos["duracion"],
        lanes=lanes, margen=margen, comp_h=round(comp_h, 1), n_tareas=len(tareas),
    )

    def _render() -> bytes:
        return html_a_pdf(template.render(**ctx), organizacion, "Sesión")

    return await asyncio.to_thread(_render)


async def generate_sesion_pdf_plegado(
    sesion_data: dict,
    tareas_sesion: list,
    organizacion: dict,
    *,
    lugar: Optional[str] = None,
    microciclo_nombre: Optional[str] = None,
    asistencia_roster: Optional[list] = None,
    jugadores_map: Optional[dict] = None,
    margen_entrenamientos: Optional[list] = None,
) -> bytes:
    """Plegado: 1 folio A4 apaisado en 6 u 8 paneles, en orden de lectura.

    Panel 1 = sesión (objetivo, material, índice); luego una o varias tareas por panel;
    último = compensatorio y notas. Guías de doblez discontinuas con la etiqueta «doblar».
    """
    env = _get_jinja_env_v2()
    template = env.get_template("sesion_pdf_plegado.html")
    datos = _datos_cartel(sesion_data, tareas_sesion, jugadores_map, margen_entrenamientos)
    tareas = datos["tareas"]
    n = len(tareas)

    total = 6 if n <= 4 else 8
    cols = 3 if total == 6 else 4
    slots = total - 2
    panel_w = 283.0 / cols
    inner_w, inner_h = panel_w - 6, 85.5

    base, extra = (n // slots, n % slots) if n >= slots else (0, 0)
    if n >= slots:
        counts = [base + (1 if i < extra else 0) for i in range(slots)]
    else:
        counts = [1] * n + [0] * (slots - n)

    paneles = [{"tipo": "portada"}]
    pos = 0
    for k in counts:
        if k == 0:
            paneles.append({"tipo": "notas"})
            continue
        bloques = []
        for card in tareas[pos:pos + k]:
            if k == 1:
                bh = round(min(inner_w * 0.7, 40), 1)
                dims = dict(modo="v", block_h=inner_h, board_h=bh, board_w=inner_w, text_w=inner_w,
                            text_h=inner_h - bh - 7, fs=7.6 if cols == 4 else 8.2)
            elif k == 2:
                bh = round(min(inner_w * 0.42, 22), 1)
                bl = (inner_h - 3) / 2
                dims = dict(modo="v", block_h=bl, board_h=bh, board_w=inner_w, text_w=inner_w,
                            text_h=bl - bh - 7, fs=6.8)
            else:
                bl = (inner_h - 2 * (k - 1)) / k
                bw = min(27.0, inner_w * 0.4)
                dims = dict(modo="s", block_h=round(bl, 1), board_h=round(min(bl - 7, bw * 0.78), 1),
                            board_w=round(bw, 1), text_w=inner_w - bw - 2, text_h=bl - 7, fs=6.4)
            fs_mm = dims["fs"] * 0.3528
            lineas = max(1, int(dims["text_h"] / (fs_mm * 1.3)))
            if k == 1:
                lineas -= 3 if card.get("normas") else 2  # rótulo «Normas» + líneas de datos
            elif k == 2 and card.get("normas"):
                lineas -= 1
            cpl = max(10, int((dims["text_w"] - 1) / (fs_mm * 0.54)))
            _recorta_card(card, lineas, cpl, max_normas=4 if k == 1 else (2 if k == 2 else 1))
            bloques.append({"card": card, **{kk: (round(v, 1) if isinstance(v, float) else v) for kk, v in dims.items()}})
        pos += k
        paneles.append({"tipo": "tareas", "bloques": bloques, "k": k})
    paneles.append({"tipo": "cierre"})

    filas = [paneles[i * cols:(i + 1) * cols] for i in range(2)]
    ctx = _contexto_sesion_comun(sesion_data, organizacion, lugar, microciclo_nombre, _logo_pdf(organizacion))
    ctx.update(
        filas=filas, cols=cols, total=total, panel_w=round(panel_w, 1), material=datos["material"],
        duracion_total=datos["duracion"], lanes=datos["lanes"], margen=datos["margen"],
        indice=tareas[:8], n_tareas=n, roster_grupos=_roster_grupos(asistencia_roster),
    )

    def _render() -> bytes:
        return html_a_pdf(template.render(**ctx), organizacion, "Sesión")

    return await asyncio.to_thread(_render)
