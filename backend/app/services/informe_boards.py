"""Cromado MD y pizarras para el dossier de microciclo (sin deps de Supabase)."""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Preview JPEG del editor; por encima se usa SVG para no hinchar el PDF.
PREVIEW_MAX_CHARS = 900_000

WEEKDAYS_ES = (
    "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
)

# Misma lectura de MD que SessionCard / Sesiones (cromado de vestuario).
MATCH_DAY_CHROME = {
    "MD+1": {"bar": "#22C55E", "ink": "#15803D", "wash": "#ECFDF5", "label": "Recuperación", "carga": "Muy baja"},
    "MD+2": {"bar": "#84CC16", "ink": "#4D7C0F", "wash": "#F7FEE7", "label": "Regeneración", "carga": "Baja"},
    "MD-4": {"bar": "#EF4444", "ink": "#B91C1C", "wash": "#FEF2F2", "label": "Fuerza", "carga": "Alta"},
    "MD-3": {"bar": "#F97316", "ink": "#C2410C", "wash": "#FFF7ED", "label": "Resistencia", "carga": "Alta"},
    "MD-2": {"bar": "#3B82F6", "ink": "#1D4ED8", "wash": "#EFF6FF", "label": "Velocidad", "carga": "Media"},
    "MD-1": {"bar": "#8B5CF6", "ink": "#6D28D9", "wash": "#F5F3FF", "label": "Activación", "carga": "Baja"},
    "MD":   {"bar": "#F59E0B", "ink": "#B45309", "wash": "#FFFBEB", "label": "Partido", "carga": "Competición"},
}
MATCH_DAY_FALLBACK = {
    "bar": "#334155", "ink": "#0F172A", "wash": "#F1F5F9", "label": "Sesión", "carga": "",
}


def clip(text: Any, n: int) -> str:
    raw = " ".join(str(text or "").split())
    if len(raw) <= n:
        return raw
    return raw[: n - 1].rsplit(" ", 1)[0] + "…"


def as_list(val: Any, n: int = 4) -> list[str]:
    if val is None:
        return []
    items: list[str] = []
    if isinstance(val, list):
        items = [str(v).strip() for v in val if str(v).strip()]
    elif isinstance(val, str):
        stripped = val.strip()
        if stripped:
            items = [ln.strip(" •-\t") for ln in re.split(r"[\n;]", stripped) if ln.strip()]
    return [clip(x, 90) for x in items[:n]]


def md_chrome(match_day: Any) -> dict[str, str]:
    key = str(match_day or "").strip().upper()
    return dict(MATCH_DAY_CHROME.get(key) or MATCH_DAY_FALLBACK)


def weekday(val: Any) -> str:
    if hasattr(val, "weekday"):
        return WEEKDAYS_ES[val.weekday()]
    s = str(val or "")[:10]
    try:
        return WEEKDAYS_ES[datetime.strptime(s, "%Y-%m-%d").weekday()]
    except ValueError:
        return ""


def board_assets(tarea: dict, diagram_id: str) -> tuple[str, str]:
    """Instantánea del editor o SVG de la pizarra. Fallo suave."""
    preview_img = ""
    grafico = tarea.get("grafico_data")
    if isinstance(grafico, dict):
        raw = grafico.get("preview") or ""
        if isinstance(raw, str) and raw.startswith("data:image") and len(raw) <= PREVIEW_MAX_CHARS:
            preview_img = raw
    if not preview_img:
        gu = tarea.get("grafico_url") or ""
        if isinstance(gu, str) and gu.startswith("data:image") and len(gu) <= PREVIEW_MAX_CHARS:
            preview_img = gu
        elif isinstance(gu, str) and gu.startswith("http"):
            try:
                from app.services.pdf_service import _url_to_data_uri
                converted = _url_to_data_uri(gu)
            except Exception:
                converted = ""
            if (
                isinstance(converted, str)
                and converted.startswith("data:image")
                and len(converted) <= PREVIEW_MAX_CHARS
            ):
                preview_img = converted
    svg_thumb = ""
    if not preview_img and isinstance(grafico, dict):
        try:
            from app.services.svg_renderer import render_diagram_thumbnail
            svg_thumb = render_diagram_thumbnail(grafico, diagram_id=diagram_id) or ""
        except Exception:
            logger.exception("informe pizarra svg failed %s", diagram_id)
    return preview_img, svg_thumb


def bloques_de_tareas(tareas: list[dict]) -> list[dict]:
    bloques: list[dict] = []
    current: Optional[dict] = None
    for t in tareas:
        fase = t.get("fase") or "—"
        if current is None or current["fase"] != fase:
            current = {"fase": fase, "tareas": []}
            bloques.append(current)
        current["tareas"].append(t)
    return bloques
