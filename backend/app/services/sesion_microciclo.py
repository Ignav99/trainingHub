"""Vincula una sesión al microciclo que cubre su fecha y rellena contexto/nº."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional

from app.services.microciclo_estado import as_date

logger = logging.getLogger(__name__)

MD_POR_DELTA = {
    0: "MD",
    1: "MD-1",
    2: "MD-2",
    3: "MD-3",
    4: "MD-4",
    -1: "MD+1",
    -2: "MD+2",
}


def match_day_desde_partido(fecha_sesion: Any, fecha_partido: Any) -> Optional[str]:
    ses = as_date(fecha_sesion)
    par = as_date(fecha_partido)
    if not ses or not par:
        return None
    return MD_POR_DELTA.get((par - ses).days)


def _contexto_desde_plan(plan: dict) -> tuple[str, bool, str]:
    """contexto_periodo, es_pretemporada, etiqueta tipo."""
    plan = plan or {}
    tipo = str(plan.get("tipo_microciclo") or "").strip() or "competicion"
    fase = str(plan.get("fase_temporada") or "").strip()
    if tipo == "pretemporada" or fase == "pretemporada":
        return "pretemporada", True, "pretemporada"
    if fase == "transicion" or tipo == "transicion":
        return "transicion", False, "transicion"
    return "competicion", False, tipo or "competicion"


def _elegir_micro(candidatos: list[dict], fecha: date) -> Optional[dict]:
    covering = []
    for m in candidatos:
        ini = as_date(m.get("fecha_inicio"))
        fin = as_date(m.get("fecha_fin"))
        if ini and fin and ini <= fecha <= fin:
            covering.append(m)
    if not covering:
        return None
    covering.sort(key=lambda m: (as_date(m.get("fecha_inicio")) or date.min), reverse=True)
    return covering[0]


def _siguiente_numero(supabase, microciclo_id: str, exclude_id: Optional[str] = None) -> int:
    try:
        resp = (
            supabase.table("sesiones")
            .select("id, numero_sesion")
            .eq("microciclo_id", microciclo_id)
            .execute()
        )
    except Exception:
        logger.exception("numero sesion count failed")
        return 1
    nums: list[int] = []
    for row in resp.data or []:
        if exclude_id and str(row.get("id")) == str(exclude_id):
            continue
        n = row.get("numero_sesion")
        if isinstance(n, int) and n > 0:
            nums.append(n)
    return (max(nums) + 1) if nums else 1


def vincular_sesion_a_microciclo(
    supabase,
    payload: dict,
    *,
    sesion_id: Optional[str] = None,
    previous_microciclo_id: Optional[str] = None,
    suggest_match_day: bool = False,
) -> dict:
    """Rellena microciclo_id, dia_numero, contexto y número según la fecha."""
    out = dict(payload)
    equipo_id = out.get("equipo_id")
    fecha = as_date(out.get("fecha"))
    if not equipo_id or not fecha:
        return out

    micro = None
    mid = out.get("microciclo_id")
    if mid:
        try:
            resp = (
                supabase.table("microciclos")
                .select("id, fecha_inicio, fecha_fin, plan_ct, partido_id")
                .eq("id", str(mid))
                .maybe_single()
                .execute()
            )
            micro = resp.data if resp else None
        except Exception:
            logger.exception("load microciclo for sesion failed")
            micro = None
        if micro:
            ini = as_date(micro.get("fecha_inicio"))
            fin = as_date(micro.get("fecha_fin"))
            if ini and fin and not (ini <= fecha <= fin):
                micro = None
                out["microciclo_id"] = None

    if not micro:
        try:
            iso = fecha.isoformat()
            resp = (
                supabase.table("microciclos")
                .select("id, fecha_inicio, fecha_fin, plan_ct, partido_id")
                .eq("equipo_id", str(equipo_id))
                .lte("fecha_inicio", iso)
                .gte("fecha_fin", iso)
                .execute()
            )
            micro = _elegir_micro(resp.data or [], fecha)
        except Exception:
            logger.exception("find microciclo by date failed")
            micro = None

    if not micro:
        return out

    out["microciclo_id"] = str(micro["id"])
    ini = as_date(micro.get("fecha_inicio"))
    if ini:
        out["dia_numero"] = (fecha - ini).days + 1

    ctx, pre, _tipo = _contexto_desde_plan(micro.get("plan_ct") or {})
    if not out.get("contexto_periodo"):
        out["contexto_periodo"] = ctx
    if out.get("es_pretemporada") is None:
        out["es_pretemporada"] = pre

    mid_changed = previous_microciclo_id and str(previous_microciclo_id) != str(micro["id"])
    if out.get("numero_sesion") in (None, "") or mid_changed:
        out["numero_sesion"] = _siguiente_numero(supabase, str(micro["id"]), exclude_id=sesion_id)

    if suggest_match_day and not out.get("match_day"):
        partido_fecha = None
        pid = micro.get("partido_id")
        if pid:
            try:
                p = (
                    supabase.table("partidos")
                    .select("fecha")
                    .eq("id", str(pid))
                    .maybe_single()
                    .execute()
                )
                partido_fecha = (p.data or {}).get("fecha") if p else None
            except Exception:
                partido_fecha = None
        if not partido_fecha:
            partido_fecha = micro.get("fecha_fin")
        suggested = match_day_desde_partido(fecha, partido_fecha)
        if suggested:
            out["match_day"] = suggested

    return out
