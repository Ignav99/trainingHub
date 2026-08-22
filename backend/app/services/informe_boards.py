"""Cromado MD y pizarras para el dossier de microciclo (sin deps de Supabase)."""

from __future__ import annotations

import base64
import json
import logging
import re
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

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

_PREVIEW_KEYS = ("preview", "imagen", "thumbnail", "snapshot", "foto")


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


def parse_grafico(raw: Any) -> dict:
    """grafico_data puede llegar como dict, JSON string o lista de 1."""
    if raw is None:
        return {}
    if isinstance(raw, list) and raw:
        raw = raw[0]
    if isinstance(raw, str):
        stripped = raw.strip()
        if not stripped:
            return {}
        try:
            raw = json.loads(stripped)
        except json.JSONDecodeError:
            return {}
    return raw if isinstance(raw, dict) else {}


def _as_data_uri(raw: Any) -> str:
    if not isinstance(raw, str):
        return ""
    val = raw.strip()
    if not val:
        return ""
    if val.startswith("data:image"):
        return val
    if val.startswith("http://") or val.startswith("https://"):
        try:
            from app.services.pdf_service import _url_to_data_uri
            converted = _url_to_data_uri(val)
        except Exception:
            return ""
        return converted if isinstance(converted, str) and converted.startswith("data:image") else ""
    # JPEG/PNG en base64 crudo (sin prefijo data:)
    if len(val) > 80 and re.fullmatch(r"[A-Za-z0-9+/=\s]+", val[:200] or ""):
        compact = "".join(val.split())
        if compact.startswith("/9j/"):
            return "data:image/jpeg;base64," + compact
        if compact.startswith("iVBOR"):
            return "data:image/png;base64," + compact
    return ""


def _shrink_data_uri(uri: str) -> str:
    """Si la instantánea es enorme, baja a JPEG compacto para WeasyPrint."""
    if not uri.startswith("data:image") or len(uri) < 1_200_000:
        return uri
    try:
        from io import BytesIO
        from PIL import Image
        _header, b64 = uri.split(",", 1)
        im = Image.open(BytesIO(base64.b64decode(b64)))
        im.thumbnail((1400, 900))
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        buf = BytesIO()
        im.save(buf, format="JPEG", quality=74, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return uri


def extract_preview(grafico: dict, grafico_url: Any = None, grafico_svg: Any = None) -> str:
    """Foto real de la pizarra. No se descarta por tamaño."""
    for key in _PREVIEW_KEYS:
        uri = _as_data_uri(grafico.get(key))
        if uri:
            return _shrink_data_uri(uri)
    frames = grafico.get("frames")
    if isinstance(frames, list):
        for fr in frames:
            if not isinstance(fr, dict):
                continue
            for key in _PREVIEW_KEYS:
                uri = _as_data_uri(fr.get(key))
                if uri:
                    return _shrink_data_uri(uri)
    uri = _as_data_uri(grafico_url)
    if uri:
        return _shrink_data_uri(uri)
    if isinstance(grafico_svg, str) and grafico_svg.strip().startswith("<svg"):
        return ""
    return ""


def board_assets(tarea: dict, diagram_id: str) -> tuple[str, str]:
    """Instantánea JPEG del editor, o SVG solo si hay contenido (nunca un campo vacío)."""
    grafico = parse_grafico(tarea.get("grafico_data"))
    preview_img = extract_preview(
        grafico,
        tarea.get("grafico_url"),
        tarea.get("grafico_svg"),
    )
    if preview_img:
        return preview_img, ""

    svg_thumb = ""
    raw_svg = tarea.get("grafico_svg")
    if isinstance(raw_svg, str) and "<svg" in raw_svg:
        svg_thumb = raw_svg
        return "", svg_thumb

    if not grafico:
        return "", ""
    try:
        from app.services.svg_renderer import prepare_board_snapshot, render_diagram_svg
        snap = prepare_board_snapshot(grafico)
        has_content = bool(
            snap
            and (
                (snap.get("elements") or [])
                or (snap.get("arrows") or [])
                or (snap.get("zones") or [])
            )
        )
        if has_content:
            svg_thumb = render_diagram_svg(snap, diagram_id=diagram_id) or ""
    except Exception:
        logger.exception("informe pizarra svg failed %s", diagram_id)
    return "", svg_thumb


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
