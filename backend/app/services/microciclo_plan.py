"""Merge de plan_ct para que un guardado parcial no borre el resto."""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

WEEK_TEXT_KEYS = ("olfato_ct", "objetivos_semana")


def _blank_week_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, list):
        return not any(str(item).strip() for item in value)
    return False


def week_text_score(plan: Optional[dict]) -> tuple[int, int]:
    plan = plan if isinstance(plan, dict) else {}
    olfato = plan.get("olfato_ct")
    olfato_n = len(olfato.strip()) if isinstance(olfato, str) else 0
    objs = plan.get("objetivos_semana")
    obj_n = 0
    if isinstance(objs, list):
        obj_n = sum(1 for item in objs if str(item).strip())
    return (olfato_n, obj_n)


def has_week_text(plan: Optional[dict]) -> bool:
    olfato_n, obj_n = week_text_score(plan)
    return olfato_n > 0 or obj_n > 0


def merge_plan_ct(current: Optional[dict], incoming: Optional[dict]) -> dict:
    """Combina el plan guardado con el que acaba de llegar.

    Las claves que el cliente envía sustituyen a las anteriores. Las que no
    envía se conservan: así un enlace de partido no borra el olfato ni los
    objetivos, y una respuesta vieja que aún no los tenía tampoco.
    Un valor null borra una clave, salvo el olfato y los objetivos de la
    semana: un vacío no puede dejar la semana en blanco si ya había texto.
    """
    base = dict(current) if isinstance(current, dict) else {}
    if not isinstance(incoming, dict):
        return base
    merged: dict[str, Any] = {**base, **incoming}
    for key, value in incoming.items():
        if value is None:
            merged.pop(key, None)
    for key in WEEK_TEXT_KEYS:
        if key in incoming and _blank_week_value(incoming.get(key)) and not _blank_week_value(base.get(key)):
            merged[key] = base[key]
    return merged


def fill_missing_week_text(current: Optional[dict], donor: Optional[dict]) -> dict:
    """Copia olfato y objetivos solo cuando en esta copia faltan."""
    base = dict(current) if isinstance(current, dict) else {}
    if has_week_text(base) or not isinstance(donor, dict):
        return base
    if isinstance(donor.get("olfato_ct"), str) and donor["olfato_ct"].strip() and _blank_week_value(base.get("olfato_ct")):
        base["olfato_ct"] = donor["olfato_ct"]
    donor_objs = donor.get("objetivos_semana")
    if (
        isinstance(donor_objs, list)
        and any(str(item).strip() for item in donor_objs)
        and _blank_week_value(base.get("objetivos_semana"))
    ):
        base["objetivos_semana"] = donor_objs
    return base


def week_identity(row: dict) -> tuple[str, str, str]:
    return (
        str(row.get("equipo_id") or ""),
        str(row.get("fecha_inicio") or "")[:10],
        str(row.get("fecha_fin") or "")[:10],
    )


def microciclo_rank(row: dict, session_counts: dict[str, int]) -> tuple:
    olfato_n, obj_n = week_text_score(row.get("plan_ct") if isinstance(row.get("plan_ct"), dict) else None)
    return (
        int(session_counts.get(str(row.get("id")), 0)),
        olfato_n,
        obj_n,
        str(row.get("updated_at") or ""),
    )


def dedupe_same_week(rows: list[dict], session_counts: Optional[dict[str, int]] = None) -> list[dict]:
    """Una fila por equipo y fechas. Se queda la que tiene las sesiones y el texto."""
    counts = session_counts or {}
    best: dict[tuple[str, str, str], dict] = {}
    order: list[tuple[str, str, str]] = []
    for row in rows:
        key = week_identity(row)
        current = best.get(key)
        if current is None:
            best[key] = row
            order.append(key)
            continue
        if microciclo_rank(row, counts) > microciclo_rank(current, counts):
            best[key] = row
    return [best[key] for key in order]


def count_sessions(supabase: Any, microciclo_ids: list[str]) -> dict[str, int]:
    ids = [str(item) for item in microciclo_ids if item]
    if not ids:
        return {}
    try:
        resp = supabase.table("sesiones").select("microciclo_id").in_("microciclo_id", ids).execute()
    except Exception:
        logger.exception("conteo de sesiones del microciclo failed")
        return {}
    counts: dict[str, int] = {}
    for row in resp.data or []:
        mid = str(row.get("microciclo_id") or "")
        if mid:
            counts[mid] = counts.get(mid, 0) + 1
    return counts


def _same_week_rows(supabase: Any, equipo_id: str, inicio: str, fin: str) -> list[dict]:
    resp = (
        supabase.table("microciclos")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .eq("fecha_inicio", inicio)
        .eq("fecha_fin", fin)
        .execute()
    )
    return list(resp.data or [])


def reuse_same_week(supabase: Any, data: dict) -> Optional[dict]:
    """Si esa semana ya existe, devuelve esa fila en vez de crear otra vacía."""
    equipo_id = data.get("equipo_id")
    inicio = str(data.get("fecha_inicio") or "")[:10]
    fin = str(data.get("fecha_fin") or "")[:10]
    if not equipo_id or not inicio or not fin:
        return None
    try:
        rows = _same_week_rows(supabase, str(equipo_id), inicio, fin)
    except Exception:
        logger.exception("buscar microciclo de la misma semana failed")
        return None
    if not rows:
        return None
    counts = count_sessions(supabase, [str(row.get("id")) for row in rows])
    chosen = max(rows, key=lambda row: microciclo_rank(row, counts))
    incoming = data.get("plan_ct") if isinstance(data.get("plan_ct"), dict) else None
    if incoming and has_week_text(incoming) and not has_week_text(chosen.get("plan_ct")):
        filled = fill_missing_week_text(chosen.get("plan_ct"), incoming)
        try:
            supabase.table("microciclos").update({"plan_ct": filled}).eq("id", str(chosen["id"])).execute()
        except Exception:
            logger.exception("rellenar texto de la semana existente failed")
        else:
            chosen = dict(chosen)
            chosen["plan_ct"] = filled
    return chosen


def ensure_week_text(supabase: Any, micro: dict) -> dict:
    """Si esta copia no tiene el texto, lo trae de la otra copia de la misma semana."""
    plan = micro.get("plan_ct") if isinstance(micro.get("plan_ct"), dict) else {}
    if has_week_text(plan):
        return micro
    equipo_id = micro.get("equipo_id")
    inicio = str(micro.get("fecha_inicio") or "")[:10]
    fin = str(micro.get("fecha_fin") or "")[:10]
    if not equipo_id or not inicio or not fin:
        return micro
    try:
        rows = _same_week_rows(supabase, str(equipo_id), inicio, fin)
    except Exception:
        logger.exception("cargar copias de la semana failed")
        return micro
    donor = None
    best: Optional[tuple[int, int]] = None
    for row in rows:
        if str(row.get("id")) == str(micro.get("id")):
            continue
        score = week_text_score(row.get("plan_ct") if isinstance(row.get("plan_ct"), dict) else None)
        if score[0] or score[1]:
            if best is None or score > best:
                best = score
                donor = row
    if donor is None:
        return micro
    filled = fill_missing_week_text(plan, donor.get("plan_ct"))
    if filled == plan:
        return micro
    try:
        supabase.table("microciclos").update({"plan_ct": filled}).eq("id", str(micro["id"])).execute()
    except Exception:
        logger.exception("guardar texto recuperado del microciclo failed")
        return micro
    out = dict(micro)
    out["plan_ct"] = filled
    return out


def mirror_week_text(supabase: Any, micro: dict, plan: Optional[dict]) -> None:
    """El texto escrito en una copia queda también en las otras de la misma semana."""
    if not isinstance(plan, dict) or not has_week_text(plan):
        return
    equipo_id = micro.get("equipo_id")
    inicio = str(micro.get("fecha_inicio") or "")[:10]
    fin = str(micro.get("fecha_fin") or "")[:10]
    if not equipo_id or not inicio or not fin:
        return
    patch: dict[str, Any] = {}
    if isinstance(plan.get("olfato_ct"), str) and plan["olfato_ct"].strip():
        patch["olfato_ct"] = plan["olfato_ct"]
    objs = plan.get("objetivos_semana")
    if isinstance(objs, list) and any(str(item).strip() for item in objs):
        patch["objetivos_semana"] = objs
    if not patch:
        return
    try:
        rows = _same_week_rows(supabase, str(equipo_id), inicio, fin)
    except Exception:
        logger.exception("listar copias para copiar el texto failed")
        return
    for row in rows:
        if str(row.get("id")) == str(micro.get("id")):
            continue
        current = row.get("plan_ct") if isinstance(row.get("plan_ct"), dict) else {}
        merged = merge_plan_ct(current, patch)
        if merged == current:
            continue
        try:
            supabase.table("microciclos").update({"plan_ct": merged}).eq("id", str(row["id"])).execute()
        except Exception:
            logger.exception("copiar texto a la otra semana failed")
