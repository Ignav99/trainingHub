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

    Returns:
        PDF como bytes
    """
    from app.services.svg_renderer import render_diagram_svg, render_diagram_thumbnail

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
        all_tareas.append(tarea_enriched)

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
