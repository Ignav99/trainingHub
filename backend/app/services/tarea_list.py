"""Helpers for listing tareas without silently dropping or capping results."""

from __future__ import annotations

from math import ceil
from typing import Any, Dict, Optional, Set

# Keep in sync with app.models.tarea enums. Duplicated here so list helpers
# can be unit-tested without importing the full models package.
_FASE_JUEGO = {
    "ataque_organizado",
    "defensa_organizada",
    "transicion_ataque_defensa",
    "transicion_defensa_ataque",
    "balon_parado_ofensivo",
    "balon_parado_defensivo",
}
_MODALIDAD = {"analitica", "global", "competitiva", "general"}
_DENSIDAD = {"alta", "media", "baja"}
_NIVEL_COGNITIVO = {1, 2, 3}
_TIPO_CONTRACCION = {"concentrica", "excentrica", "isometrica", "pliometrica"}
_ZONA_CUERPO = {"tren_superior", "tren_inferior", "core", "full_body"}
_OBJETIVO_GYM = {
    "fuerza_maxima",
    "hipertrofia",
    "potencia",
    "resistencia_muscular",
    "movilidad",
    "activacion",
    "recuperacion",
}


def resolve_list_tareas_total(db_count: Optional[int], page_len: int) -> int:
    """Return the list total without collapsing it to the current page size.

    A previous bug set `total = len(page)` after filtering madres in Python.
    The UI then believed there was only one page of 12 even with dozens saved.
    """
    count = int(db_count or 0)
    if count <= 0:
        return max(page_len, 0)
    return count


def pages_for_total(total: int, limit: int) -> int:
    if limit <= 0 or total <= 0:
        return 1
    return ceil(total / limit)


def apply_origen_family_filter(query: Any, *, solo_madres: bool, solo_variantes: bool):
    """Filter mother/variant in PostgREST so count+offset stay exact."""
    if solo_madres:
        return query.is_("tarea_origen_id", "null")
    if solo_variantes:
        return query.not_.is_("tarea_origen_id", "null")
    return query


def _sanitize_enum(value: Any, allowed: Set[Any]) -> Any:
    if value in ("", None):
        return None
    if isinstance(value, str) and value.isdigit() and allowed and all(isinstance(x, int) for x in allowed):
        value = int(value)
    return value if value in allowed else None


def coerce_tarea_row_for_response(row: Dict[str, Any]) -> Dict[str, Any]:
    """Relax invalid/empty values so a saved task still appears in the library."""
    t = dict(row)
    titulo = t.get("titulo")
    if not isinstance(titulo, str) or not titulo.strip():
        t["titulo"] = "Tarea"
    else:
        t["titulo"] = titulo[:255]

    duracion = t.get("duracion_total")
    try:
        duracion_n = int(duracion)
    except (TypeError, ValueError):
        duracion_n = 1
    t["duracion_total"] = duracion_n if duracion_n > 0 else 1

    jug_min = t.get("num_jugadores_min")
    try:
        jug_min_n = int(jug_min)
    except (TypeError, ValueError):
        jug_min_n = 1
    t["num_jugadores_min"] = jug_min_n if jug_min_n >= 1 else 1

    series = t.get("num_series")
    try:
        series_n = int(series)
    except (TypeError, ValueError):
        series_n = 1
    t["num_series"] = series_n if series_n >= 1 else 1

    t["fase_juego"] = _sanitize_enum(t.get("fase_juego"), _FASE_JUEGO)
    t["modalidad"] = _sanitize_enum(t.get("modalidad"), _MODALIDAD)
    t["densidad"] = _sanitize_enum(t.get("densidad"), _DENSIDAD)
    t["nivel_cognitivo"] = _sanitize_enum(t.get("nivel_cognitivo"), _NIVEL_COGNITIVO)
    t["tipo_contraccion"] = _sanitize_enum(t.get("tipo_contraccion"), _TIPO_CONTRACCION)
    t["zona_cuerpo"] = _sanitize_enum(t.get("zona_cuerpo"), _ZONA_CUERPO)
    t["objetivo_gym"] = _sanitize_enum(t.get("objetivo_gym"), _OBJETIVO_GYM)

    if t.get("espacio_forma") in ("", None):
        t["espacio_forma"] = "rectangular"

    return t


def matches_family_filter(
    row: Dict[str, Any], *, solo_madres: bool, solo_variantes: bool
) -> bool:
    origen = row.get("tarea_origen_id")
    if solo_madres and origen:
        return False
    if solo_variantes and not origen:
        return False
    return True
