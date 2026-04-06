"""
TrainingHub Pro - PDF Service
Generación de PDFs profesionales con WeasyPrint + Jinja2.
"""

import logging
import re
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

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


def _text_to_bullets(text: str, max_bullets: int = 4) -> list[str]:
    """Convert paragraph text to list of short bullet strings (max ~80 chars each)."""
    if not text:
        return []
    lines = re.split(r'[\n;]|(?<=\.)\s+', text.strip())
    bullets = [l.strip().rstrip('.') for l in lines if l.strip() and len(l.strip()) > 5]
    result = []
    for b in bullets[:max_bullets]:
        if len(b) > 85:
            b = b[:82].rsplit(' ', 1)[0] + '...'
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
                f'<circle cx="{cx}" cy="{cy}" r="12" fill="{circle_fill}" '
                f'stroke="{circle_stroke}" stroke-width="{stroke_width}"/>'
            )
            # Dorsal number
            if dorsal:
                svg_parts.append(
                    f'<text x="{cx}" y="{cy + 4}" text-anchor="middle" '
                    f'font-family="Barlow Condensed,Arial" font-size="11" font-weight="700" '
                    f'fill="#1a1a2e">{dorsal}</text>'
                )
            # Player name below
            svg_parts.append(
                f'<text x="{cx}" y="{cy + 22}" text-anchor="middle" '
                f'font-family="Barlow Condensed,Arial" font-size="8" font-weight="600" '
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
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=True,
    )


def _get_jinja_env_v2() -> Environment:
    """Entorno Jinja2 para v2 templates (autoescape off for inline SVG)."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
    )
    env.filters['to_bullets'] = _text_to_bullets
    env.filters['first_sentence'] = _first_sentence
    return env


def generate_sesion_pdf(
    sesion_data: dict,
    tareas: list,
    organizacion: dict,
) -> bytes:
    """
    Genera un PDF profesional de una sesión de entrenamiento.

    Args:
        sesion_data: Datos de la sesión (dict de BD)
        tareas: Lista de tareas de la sesión (sesion_tareas con tareas nested)
        organizacion: Datos de la organización

    Returns:
        PDF como bytes
    """
    env = _get_jinja_env()
    template = env.get_template("sesion_pdf.html")

    # Preparar fases agrupadas
    fases = {
        "activacion": {"nombre": "Activación", "tareas": []},
        "desarrollo_1": {"nombre": "Desarrollo 1", "tareas": []},
        "desarrollo_2": {"nombre": "Desarrollo 2", "tareas": []},
        "vuelta_calma": {"nombre": "Vuelta a calma", "tareas": []},
    }

    for tarea_sesion in tareas:
        tarea = tarea_sesion.get("tareas", {}) or {}
        categoria = tarea.get("categorias_tarea", {}) or {}
        fase_key = tarea_sesion.get("fase_sesion", "desarrollo_1")

        if fase_key in fases:
            fases[fase_key]["tareas"].append({
                "titulo": tarea.get("titulo", ""),
                "descripcion": tarea.get("descripcion", ""),
                "duracion": tarea_sesion.get("duracion_override") or tarea.get("duracion_total", 0),
                "categoria": categoria.get("nombre", ""),
                "categoria_codigo": categoria.get("codigo", ""),
                "num_jugadores_min": tarea.get("num_jugadores_min", 0),
                "num_jugadores_max": tarea.get("num_jugadores_max"),
                "espacio_largo": tarea.get("espacio_largo"),
                "espacio_ancho": tarea.get("espacio_ancho"),
                "nivel_cognitivo": tarea.get("nivel_cognitivo"),
                "densidad": tarea.get("densidad"),
                "reglas_tecnicas": tarea.get("reglas_tecnicas", []) or [],
                "consignas_ofensivas": tarea.get("consignas_ofensivas", []) or [],
                "consignas_defensivas": tarea.get("consignas_defensivas", []) or [],
                "grafico_url": tarea.get("grafico_url"),
                "grafico_svg": tarea.get("grafico_svg"),
                "notas": tarea_sesion.get("notas", ""),
            })

    # Renderizar HTML
    html_content = template.render(
        sesion=sesion_data,
        fases=fases,
        organizacion=organizacion,
        equipo=sesion_data.get("equipos", {}),
    )

    # Generar PDF
    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_informe_partido_pdf(
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

    html_content = template.render(
        partido=partido,
        rival=rival,
        convocatoria=convocatoria,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
    )

    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_convocatoria_pdf(
    partido: dict,
    rival: dict,
    convocatoria: list,
    organizacion: dict,
    equipo_nombre: str = "",
    equipo_categoria: str = "",
) -> bytes:
    """Genera PDF de convocatoria (hoja de convocados)."""
    env = _get_jinja_env()
    template = env.get_template("convocatoria_pdf.html")

    color = organizacion.get("color_primario", "#1a365d")

    titulares = []
    suplentes = []
    for c in convocatoria:
        jugador = c.get("jugadores", {}) or {}
        entry = {
            "dorsal": c.get("dorsal") or jugador.get("dorsal", ""),
            "jugador_nombre": f"{jugador.get('nombre', '')} {jugador.get('apellidos', '')}".strip(),
            "posicion": c.get("posicion_asignada") or jugador.get("posicion_principal", ""),
        }
        if c.get("titular"):
            titulares.append(entry)
        else:
            suplentes.append(entry)

    html_content = template.render(
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
        titulares=titulares,
        suplentes=suplentes,
        total_convocados=len(convocatoria),
    )

    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


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


def generate_sesion_pdf_v2(
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

    # Build fases dynamically from actual tareas_sesion data
    fases = {}
    for ts in tareas_sesion:
        fk = ts.get("fase_sesion", "desarrollo_1")
        if fk not in fases:
            fases[fk] = {"nombre": FASE_NOMBRES.get(fk, fk.replace("_", " ").title()), "tareas": []}
    # Ensure at least the standard phases exist in order
    for default_fase in ["activacion", "desarrollo_1", "desarrollo_2", "vuelta_calma"]:
        if default_fase not in fases:
            fases[default_fase] = {"nombre": FASE_NOMBRES.get(default_fase, default_fase), "tareas": []}
    # Sort fases in canonical order
    fase_order = ["activacion", "desarrollo_1", "desarrollo_2", "desarrollo_3", "desarrollo_4", "desarrollo_5", "desarrollo_6", "vuelta_calma"]
    fases = {k: fases[k] for k in fase_order if k in fases}

    all_tareas = []
    duracion_total = 0

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
        duracion_total += duracion

        # Generate SVGs (fluid sizing, controlled by CSS containers)
        svg_thumb = render_diagram_thumbnail(grafico_data, diagram_id=f"t{len(all_tareas)}")
        svg_large = render_diagram_svg(grafico_data, diagram_id=f"d{len(all_tareas)}")

        # Formation HTML for detail page + petos HTML for cover page
        formation_html = _build_formation_html(formacion, jugadores_map)
        petos_html = _build_petos_html(formacion, jugadores_map)

        # Badge class from categoria codigo
        cat_code = (categoria.get("codigo", "") or "").lower()
        badge_class = cat_code if cat_code in BADGE_CLASSES else "default"

        tarea_enriched = {
            "titulo": tarea.get("titulo", ""),
            "descripcion": tarea.get("descripcion", ""),
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
            "variantes": _ensure_list(tarea.get("variantes")),
            "progresiones": _ensure_list(tarea.get("progresiones")),
            "material": _ensure_list(tarea.get("material")),
            "posicion_entrenador": tarea.get("posicion_entrenador") or "",
            "notas": tarea_sesion.get("notas", ""),
            "fase_label": FASE_NOMBRES.get(fase_key, ""),
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

    # Build all_tareas in canonical phase order:
    # activacion → desarrollo_1 → desarrollo_2 → ... → vuelta_calma
    all_tareas = []
    for fase_key in fase_order:
        if fase_key in fases:
            all_tareas.extend(fases[fase_key]["tareas"])

    # Cover page: only desarrollo tasks (exclude activacion + vuelta_calma)
    cover_tareas = [t for t in all_tareas if not t["is_activacion"] and not t["is_vuelta_calma"]]

    # Derive secondary color (slightly lighter/shifted version of primary)
    color_secundario = organizacion.get("color_secundario", color_primario)

    # Aggregate unique materials from all tasks
    material_sesion = []
    seen_materials = set()
    for t in all_tareas:
        for m in t.get("material", []):
            if m and m not in seen_materials:
                material_sesion.append(m)
                seen_materials.add(m)

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

    # Render HTML
    html_content = template.render(
        sesion=sesion_data,
        fases=fases,
        all_tareas=all_tareas,
        cover_tareas=cover_tareas,
        color_primario=color_primario,
        color_secundario=color_secundario,
        org_nombre=organizacion.get("nombre", "TrainingHub Pro"),
        logo_url=organizacion.get("logo_url", ""),
        equipo_nombre=equipo.get("nombre", ""),
        equipo_categoria=equipo.get("categoria", ""),
        duracion_total=duracion_total,
        num_ejercicios=len(all_tareas),
        microciclo_nombre=microciclo_nombre or "",
        lugar=lugar or "",
        material_sesion=material_sesion,
        asistencia_roster=asistencia_roster or [],
        objetivo_principal=sesion_data.get("objetivo_principal", ""),
        fase_juego_principal=sesion_data.get("fase_juego_principal", "").replace("_", " ").title() if sesion_data.get("fase_juego_principal") else "",
        principio_tactico_principal=sesion_data.get("principio_tactico_principal", ""),
        portero_tareas=portero_enriched,
        portero_duracion=portero_duracion,
        abp_jugadas=abp_enriched,
        margen_entrenamientos=margen_entrenamientos or [],
    )

    # Generate PDF
    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_informe_rival_pdf(
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

    html_content = template.render(
        informe=informe,
        partido=partido,
        rival=rival,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
        color_primario=color_primario,
        intel=intel or {},
    )

    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_informe_rival_standalone_pdf(
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

    formation_svg = ""
    if once_probable:
        formation_svg = _generate_formation_svg(sistema_juego, once_probable)

    # Extract top scorers from intel
    goleadores = []
    if intel and intel.get("competition_stats"):
        # Top scorers aren't in competition_stats directly — extract from once_probable goles if available
        pass

    html_content = template.render(
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
    )

    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_plan_partido_pdf(
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

    html_content = template.render(
        plan=plan,
        partido=partido,
        rival=rival,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
        color_primario=color_primario,
    )

    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_plan_partido_jugadores_pdf(
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

    html_content = template.render(
        plan=plan,
        partido=partido,
        rival=rival,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
        color_primario=color_primario,
    )

    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_tarea_pdf(
    tarea: dict,
    organizacion: dict,
) -> bytes:
    """Genera PDF de ficha de tarea (ejercicio individual)."""
    env = _get_jinja_env()
    template = env.get_template("tarea_pdf.html")

    color = organizacion.get("color_primario", "#1a365d")
    categoria = tarea.get("categorias_tarea", {}) or {}

    html_content = template.render(
        tarea=tarea,
        color_primario=color,
        org_nombre=organizacion.get("nombre", "TrainingHub Pro"),
        categoria_nombre=categoria.get("nombre", ""),
        categoria_codigo=categoria.get("codigo", ""),
    )

    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


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
}

ABP_LADO_LABELS = {
    "ofensivo": "Ofensivo",
    "defensivo": "Defensivo",
}


def _render_abp_diagram_svg(fase: dict, diagram_id: str = "abp") -> str:
    """Render a single ABP phase diagram to inline SVG."""
    try:
        from app.services.svg_renderer import render_diagram_svg
        diagram = fase.get("diagram", {})
        if not diagram or not diagram.get("elements"):
            return ""
        return render_diagram_svg(diagram, diagram_id=diagram_id)
    except Exception as e:
        logger.warning(f"Error rendering ABP diagram: {e}")
        return ""


def generate_abp_playbook_pdf(
    jugadas: list[dict],
    equipo_nombre: str = "",
) -> bytes:
    """Genera PDF del playbook ABP completo del equipo."""
    env = _get_jinja_env_v2()
    template = env.get_template("abp_playbook_pdf.html")

    grouped: dict[str, list] = {}
    for j in jugadas:
        tipo = j.get("tipo", "otro")
        if tipo not in grouped:
            grouped[tipo] = []
        fases = j.get("fases") or []
        rendered_fases = []
        for i, fase in enumerate(fases):
            svg = _render_abp_diagram_svg(fase, diagram_id=f"j{j.get('id','')[:8]}_f{i}")
            rendered_fases.append({**fase, "svg": svg})
        j["rendered_fases"] = rendered_fases
        grouped[tipo].append(j)

    html_content = template.render(
        grouped=grouped,
        equipo_nombre=equipo_nombre,
        tipo_labels=ABP_TIPO_LABELS,
        lado_labels=ABP_LADO_LABELS,
    )

    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")


def generate_abp_partido_pdf(
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

    # Render diagrams for our plays using ABP pitch (goal at bottom)
    for idx, jp in enumerate(jugadas_partido):
        jugada = jp.get("jugada") or {}
        fases = jugada.get("fases") or []
        # Use first phase diagram as the main diagram
        if fases:
            diagram = fases[0].get("diagram", {})
            jugada["main_svg"] = render_abp_diagram_svg(diagram, diagram_id=f"own_{idx}") if diagram and diagram.get("elements") else ""
        else:
            jugada["main_svg"] = ""

        # Resolve player assignments — use diagram element label (not dorsal)
        asignaciones = jp.get("asignaciones_override") or jugada.get("asignaciones") or []
        fases = jugada.get("fases") or []
        diagram_elements = fases[0].get("diagram", {}).get("elements", []) if fases else []
        element_labels = {str(el.get("id", "")): str(el.get("label", "")) for el in diagram_elements}
        resolved = []
        for asig in asignaciones:
            # Support jugador_ids (array) with fallback to legacy jugador_id (single)
            jids = asig.get("jugador_ids") or ([asig["jugador_id"]] if asig.get("jugador_id") else [])
            names = []
            for jid in jids:
                player = jugadores_map.get(jid, {}) if jugadores_map and jid else {}
                if player:
                    name = f"{player.get('nombre', '')} {player.get('apellidos', '')}".strip()
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
            diagram = fases[0].get("diagram", {})
            rj["main_svg"] = render_abp_diagram_svg(diagram, diagram_id=f"rival_{idx}") if diagram and diagram.get("elements") else ""
        else:
            rj["main_svg"] = ""

    rival_info = partido.get("rivales") or {}
    rival_nombre = rival_info.get("nombre", "Rival")

    # Separate by lado
    ofensivas = [jp for jp in jugadas_partido if (jp.get("jugada") or {}).get("lado") == "ofensivo"]
    defensivas = [jp for jp in jugadas_partido if (jp.get("jugada") or {}).get("lado") == "defensivo"]

    org = organizacion or {}
    color_primario = org.get("color_primario", "#1a365d")

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

    html_content = template.render(
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
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not available, returning HTML as bytes")
        return html_content.encode("utf-8")
