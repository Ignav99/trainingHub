"""Escrituras de tareas tolerantes a columnas ausentes en PostgREST (PGRST204)."""

from __future__ import annotations

import logging
import re
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

_PGRST_MISSING_COL_RE = re.compile(
    r"Could not find the '([^']+)' column",
    re.IGNORECASE,
)

OPTIONAL_TAREA_WRITE_COLS = (
    "desarrollo",
    "reglas",
    "anotaciones",
    "tarea_origen_id",
    "tipo_variante",
    "objetivos_tacticos",
    "objetivos_tecnicos",
    "orientaciones_fisicas",
    "etiquetas_fisicas",
    "complejidad",
    "dificultad",
    "exigencia",
    "modalidad",
    "espacio_forma",
    "tipo_esfuerzo",
    "m2_por_jugador",
    "fc_esperada_min",
    "fc_esperada_max",
    "subprincipio_tactico",
)

# Columnas que se añadieron juntas: si falta una, se omiten todas del grupo.
OPTIONAL_TAREA_COL_GROUPS = (
    ("desarrollo", "reglas", "anotaciones", "tarea_origen_id", "tipo_variante"),
    ("objetivos_tacticos", "objetivos_tecnicos", "orientaciones_fisicas", "etiquetas_fisicas"),
    ("complejidad", "dificultad", "exigencia"),
)

REQUIRED_TAREA_WRITE_COLS = frozenset({
    "titulo",
    "organizacion_id",
    "creado_por",
    "id",
    "categoria_id",
})

_origen_column_ok = True


def origen_column_available() -> bool:
    return _origen_column_ok


def mark_origen_column_missing() -> None:
    global _origen_column_ok
    _origen_column_ok = False


def note_origen_query_error(err: Exception) -> bool:
    """True si el error es por tarea_origen_id ausente; marca el flag para no repetir."""
    msg = str(err).lower()
    if "tarea_origen_id" in msg or (
        ("schema cache" in msg or "pgrst204" in msg or "42703" in msg)
        and "origen" in msg
    ):
        mark_origen_column_missing()
        return True
    return False


def drop_missing_tarea_cols(
    payload: Dict[str, Any], error_msg: str
) -> Tuple[Dict[str, Any], List[str]]:
    """Quita del payload la columna que PostgREST no reconoce."""
    out = dict(payload)
    dropped: List[str] = []
    msg = error_msg or ""

    for col in _PGRST_MISSING_COL_RE.findall(msg):
        if col in REQUIRED_TAREA_WRITE_COLS:
            continue
        if col in out:
            out.pop(col)
            dropped.append(col)

    if not dropped:
        lower = msg.lower()
        for col in OPTIONAL_TAREA_WRITE_COLS:
            if col in REQUIRED_TAREA_WRITE_COLS:
                continue
            if col in out and col in lower:
                out.pop(col)
                dropped.append(col)

    for col in list(dropped):
        for group in OPTIONAL_TAREA_COL_GROUPS:
            if col in group:
                for mate in group:
                    if mate in out and mate not in dropped:
                        out.pop(mate)
                        dropped.append(mate)

    if "tarea_origen_id" in dropped:
        mark_origen_column_missing()

    return out, dropped


def retry_tarea_write(
    execute_fn: Callable[[Dict[str, Any]], Any],
    payload: Dict[str, Any],
    *,
    op: str = "write",
) -> Any:
    """Insert/update omitiendo columnas desconocidas hasta que PostgREST acepte."""
    pending = dict(payload)
    last_error: Optional[Exception] = None

    for _attempt in range(1, 16):
        try:
            return execute_fn(pending)
        except Exception as e:
            last_error = e
            note_origen_query_error(e)
            new_pending, dropped = drop_missing_tarea_cols(pending, str(e))
            if not dropped:
                raise
            logger.warning("%s tarea: omitiendo columnas ausentes %s (%s)", op, dropped, e)
            pending = new_pending
            if not pending:
                raise

    assert last_error is not None
    raise last_error
