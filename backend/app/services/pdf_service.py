"""
TrainingHub Pro - PDF Service
Generación de PDFs profesionales con WeasyPrint + Jinja2.
"""

import logging
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


def _get_jinja_env() -> Environment:
    """Obtiene el entorno Jinja2 configurado."""
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=True,
    )


def _get_jinja_env_v2() -> Environment:
    """Entorno Jinja2 para v2 templates (autoescape off for inline SVG)."""
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
    )


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
) -> bytes:
    """
    Genera un PDF profesional v2 de una sesion de entrenamiento.
    Pagina 1 landscape con thumbnails, paginas 2+ portrait con detalle por tarea.

    Args:
        sesion_data: Datos de la sesion (dict de BD)
        tareas_sesion: Lista de sesion_tareas con tareas nested
        organizacion: Datos de la organizacion
        jugadores_map: {jugador_id: {nombre, apellidos, dorsal, posicion_principal}}

    Returns:
        PDF como bytes
    """
    from app.services.svg_renderer import render_diagram_svg, render_diagram_thumbnail

    env = _get_jinja_env_v2()
    template = env.get_template("sesion_pdf_v2.html")

    color_primario = organizacion.get("color_primario", "#1a365d")
    equipo = sesion_data.get("equipos", {}) or {}

    # Build fases grouped for cover + flat list for detail pages
    fases = {
        "activacion": {"nombre": "Activacion", "tareas": []},
        "desarrollo_1": {"nombre": "Desarrollo 1", "tareas": []},
        "desarrollo_2": {"nombre": "Desarrollo 2", "tareas": []},
        "vuelta_calma": {"nombre": "Vuelta a calma", "tareas": []},
    }

    all_tareas = []
    duracion_total = 0

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
            "reglas_tecnicas": tarea.get("reglas_tecnicas", []) or [],
            "reglas_tacticas": tarea.get("reglas_tacticas", []) or [],
            "consignas_ofensivas": tarea.get("consignas_ofensivas", []) or [],
            "consignas_defensivas": tarea.get("consignas_defensivas", []) or [],
            "errores_comunes": tarea.get("errores_comunes", []) or [],
            "variantes": tarea.get("variantes", []) or [],
            "progresiones": tarea.get("progresiones", []) or [],
            "material": tarea.get("material", []) or [],
            "posicion_entrenador": tarea.get("posicion_entrenador") or "",
            "notas": tarea_sesion.get("notas", ""),
            "fase_label": FASE_NOMBRES.get(fase_key, ""),
            "svg_thumbnail": svg_thumb,
            "svg_large": svg_large,
            "formation_html": formation_html,
            "petos_html": petos_html,
            "badge_class": badge_class,
        }

        if fase_key in fases:
            fases[fase_key]["tareas"].append(tarea_enriched)
        all_tareas.append(tarea_enriched)

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

    # Render HTML
    html_content = template.render(
        sesion=sesion_data,
        fases=fases,
        all_tareas=all_tareas,
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
    )

    # Generate PDF
    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
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
