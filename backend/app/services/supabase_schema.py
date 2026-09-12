"""Detección de columnas PostgREST que aún no existen en producción."""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

MISSING_COL_RE = re.compile(r"Could not find the '([^']+)' column", re.I)

OPTIONAL_PARTIDO_COLS = ("arbitro",)

PARTIDOS_LIST_SELECT = (
    "id,equipo_id,rival_id,fecha,hora,localia,competicion,jornada,ubicacion,arbitro,"
    "goles_favor,goles_contra,resultado,created_at,updated_at,auto_creado,"
    "rfef_competicion_id,video_url,informe_url,"
    "hora_citacion,lugar_citacion,kit_convocatoria,"
    "rivales(id,organizacion_id,nombre,nombre_corto,escudo_url,estadio,ciudad,created_at,updated_at)"
)

PARTIDOS_GET_SELECT = (
    "id,equipo_id,rival_id,fecha,hora,localia,competicion,jornada,ubicacion,arbitro,"
    "goles_favor,goles_contra,resultado,notas_pre,notas_post,video_url,informe_url,"
    "rfef_competicion_id,auto_creado,created_at,updated_at,"
    "hora_citacion,lugar_citacion,kit_convocatoria,"
    "rivales(id,organizacion_id,nombre,nombre_corto,escudo_url,estadio,ciudad,created_at,updated_at)"
)


def is_missing_column_error(err: Exception) -> bool:
    msg = str(err).lower()
    return "42703" in msg or "pgrst204" in msg or "schema cache" in msg or "does not exist" in msg


def drop_optional_partido_cols(payload: dict) -> dict:
    out = dict(payload)
    for col in OPTIONAL_PARTIDO_COLS:
        out.pop(col, None)
    return out


def strip_column_from_select(select: str, col: str) -> str:
    """Quita una columna del SELECT de partidos sin tocar el embed rivales(...)."""
    head, sep, tail = select.partition("rivales(")
    head = head.replace(f"{col},", "").replace(f",{col}", "")
    return head + sep + tail


def select_without_optional_partido_cols(select: str) -> str:
    out = select
    for col in OPTIONAL_PARTIDO_COLS:
        out = strip_column_from_select(out, col)
    return out


def execute_partidos_query(run_select, select: str):
    """Ejecuta el SELECT; si PostgREST no conoce una columna, reintenta sin ella.

    Nunca debe dejar el calendario vacío por una migración SQL pendiente.
    """
    current = select
    last_err = None
    for _ in range(1 + len(OPTIONAL_PARTIDO_COLS) + 2):
        try:
            return run_select(current)
        except Exception as err:
            last_err = err
            if not is_missing_column_error(err):
                raise
            found = MISSING_COL_RE.search(str(err))
            nxt = strip_column_from_select(current, found.group(1)) if found else current
            if nxt == current:
                nxt = select_without_optional_partido_cols(current)
            if nxt == current:
                raise
            logger.error(
                "Columna opcional de partidos no existe aún (%s). "
                "Reintento sin ella para no ocultar el calendario. Aplica la migración SQL.",
                err,
            )
            current = nxt
    raise last_err


def write_partido_row(write_fn, payload: dict):
    """INSERT/UPDATE que descarta columnas opcionales si PostgREST las rechaza."""
    body = dict(payload)
    last_err = None
    for _ in range(1 + len(OPTIONAL_PARTIDO_COLS)):
        try:
            return write_fn(body)
        except Exception as err:
            last_err = err
            if not is_missing_column_error(err):
                raise
            nxt = drop_optional_partido_cols(body)
            found = MISSING_COL_RE.search(str(err))
            if found:
                nxt.pop(found.group(1), None)
            if set(nxt.keys()) == set(body.keys()):
                raise
            body = nxt
    raise last_err
