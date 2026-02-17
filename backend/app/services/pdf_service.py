"""
TrainingHub Pro - PDF Service
Generación de PDFs profesionales con WeasyPrint + Jinja2.
"""

import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# Directorio de templates
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def _get_jinja_env() -> Environment:
    """Obtiene el entorno Jinja2 configurado."""
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=True,
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
