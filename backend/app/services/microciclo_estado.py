"""Estado de microciclo a partir de las fechas (un solo «en curso» por semana actual)."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)


def today_es() -> date:
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Europe/Madrid")).date()
    except Exception:
        return date.today()


def as_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val)[:10]
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def estado_desde_fechas(fecha_inicio: Any, fecha_fin: Any, hoy: Optional[date] = None) -> str:
    """planificado (futuro) / en_curso (hoy dentro) / completado (ya pasó)."""
    hoy = hoy or today_es()
    ini = as_date(fecha_inicio)
    fin = as_date(fecha_fin)
    if not ini or not fin:
        return "borrador"
    if ini <= hoy <= fin:
        return "en_curso"
    if fin < hoy:
        return "completado"
    return "planificado"


def aplicar_estado(row: dict, hoy: Optional[date] = None) -> dict:
    out = dict(row)
    out["estado"] = estado_desde_fechas(out.get("fecha_inicio"), out.get("fecha_fin"), hoy)
    return out


def persist_estado(supabase, row: dict, hoy: Optional[date] = None) -> dict:
    """Recalcula y, si hace falta, guarda el estado en BD."""
    out = aplicar_estado(row, hoy)
    rid = out.get("id")
    if rid and row.get("estado") != out["estado"]:
        try:
            supabase.table("microciclos").update({"estado": out["estado"]}).eq("id", str(rid)).execute()
        except Exception:
            logger.exception("persist estado microciclo %s failed", rid)
    return out


def aplicar_filtro_estado(query, estado: Optional[str], hoy: Optional[date] = None):
    """Filtra por fechas reales, no por el campo estado (puede estar desfasado)."""
    if not estado:
        return query
    iso = (hoy or today_es()).isoformat()
    if estado == "en_curso":
        return query.lte("fecha_inicio", iso).gte("fecha_fin", iso)
    if estado == "completado":
        return query.lt("fecha_fin", iso)
    if estado in ("planificado", "borrador"):
        return query.gt("fecha_inicio", iso)
    return query


def sync_estados_equipo(supabase, equipo_id: str) -> int:
    """Persiste el estado calculado para que listados y dashboard coincidan."""
    if not equipo_id:
        return 0
    try:
        resp = (
            supabase.table("microciclos")
            .select("id, fecha_inicio, fecha_fin, estado")
            .eq("equipo_id", str(equipo_id))
            .execute()
        )
    except Exception:
        logger.exception("sync estados microciclo list failed")
        return 0
    hoy = today_es()
    n = 0
    for m in resp.data or []:
        nuevo = estado_desde_fechas(m.get("fecha_inicio"), m.get("fecha_fin"), hoy)
        if m.get("estado") == nuevo:
            continue
        try:
            supabase.table("microciclos").update({"estado": nuevo}).eq("id", m["id"]).execute()
            n += 1
        except Exception:
            logger.exception("sync estado microciclo %s failed", m.get("id"))
    return n
