"""Suelta una jugada de balón parado antes de borrarla.

Los planes guardan el id dentro de JSON. Si la jugada sigue citada, el partido
se queda con un hueco. Las tablas de enlace se vacían primero para que la
clave foránea no impida el borrado.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

PLAN_PHASE_COLUMNS = (
    "fase_ataque_organizado",
    "fase_defensa_organizada",
    "fase_transicion_ofensiva",
    "fase_transicion_defensiva",
    "fase_abp_ofensivo",
    "fase_abp_defensivo",
)

LINK_TABLES = ("abp_partido_jugadas", "abp_sesion_jugadas")


def strip_jugada_refs(node: Any, jugada_id: str) -> tuple[Any, bool]:
    """Quita los objetos cuya jugada_id coincide. Devuelve el árbol y si cambió."""
    if isinstance(node, list):
        changed = False
        kept: list[Any] = []
        for item in node:
            if isinstance(item, dict) and str(item.get("jugada_id") or "") == jugada_id:
                changed = True
                continue
            nxt, child_changed = strip_jugada_refs(item, jugada_id)
            changed = changed or child_changed
            kept.append(nxt)
        return kept, changed
    if isinstance(node, dict):
        changed = False
        out: dict[str, Any] = {}
        for key, value in node.items():
            nxt, child_changed = strip_jugada_refs(value, jugada_id)
            changed = changed or child_changed
            out[key] = nxt
        return out, changed
    return node, False


def _safe_delete(supabase, table: str, column: str, value: str) -> None:
    try:
        supabase.table(table).delete().eq(column, value).execute()
    except Exception:
        logger.exception("No se pudo limpiar %s.%s", table, column)


def _rewrite_rows(supabase, table: str, columns: tuple[str, ...], jugada_id: str) -> None:
    select = "id," + ",".join(columns)
    # Solo las filas que citan este id. Evita bajarse todos los planes.
    mentioned = ",".join(f"{column}.ilike.*{jugada_id}*" for column in columns)
    try:
        response = supabase.table(table).select(select).or_(mentioned).execute()
    except Exception:
        logger.exception("No se pudo leer %s para soltar la jugada", table)
        return
    for row in response.data or []:
        patch: dict[str, Any] = {}
        for column in columns:
            nxt, changed = strip_jugada_refs(row.get(column), jugada_id)
            if changed:
                patch[column] = nxt
        if not patch or not row.get("id"):
            continue
        try:
            supabase.table(table).update(patch).eq("id", row["id"]).execute()
        except Exception:
            logger.exception("No se pudo actualizar %s %s", table, row.get("id"))


def release_jugada(supabase, jugada_id: str) -> None:
    """Suelta partidos, sesiones y planes antes de borrar la jugada."""
    for table in LINK_TABLES:
        _safe_delete(supabase, table, "jugada_id", jugada_id)
    _rewrite_rows(supabase, "planes_partido", PLAN_PHASE_COLUMNS, jugada_id)
    _rewrite_rows(supabase, "rivales", ("plan_partido_manual",), jugada_id)
