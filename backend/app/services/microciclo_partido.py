"""Auto-assign the week's match (and rival) to a competition microciclo."""

from __future__ import annotations

from typing import Any, Optional

OFFICIAL_COMPETICIONES = {"liga", "copa", "torneo"}


def should_skip_auto_link(plan_ct: Optional[dict]) -> bool:
    plan = plan_ct or {}
    return (
        plan.get("tipo_microciclo") == "pretemporada"
        or plan.get("fase_temporada") == "pretemporada"
        or plan.get("modo_partido") in ("none", "amistoso_interno")
        or plan.get("auto_link_partido") is False
    )


def pick_week_partido(rows: list[dict]) -> Optional[dict]:
    """First official match in the week, else the earliest friendly."""
    if not rows:
        return None
    oficiales = [r for r in rows if r.get("competicion") in OFFICIAL_COMPETICIONES]
    return (oficiales or rows)[0]


def build_auto_link_patch(
    *,
    partido_id: Optional[str],
    rival_id: Optional[str],
    week_partido: Optional[dict],
    linked_partido: Optional[dict],
) -> dict[str, str]:
    """FK patch: assign missing partido_id / rival_id. Never overwrites a set match."""
    patch: dict[str, str] = {}
    if not partido_id:
        if week_partido and week_partido.get("id"):
            patch["partido_id"] = str(week_partido["id"])
            rid = week_partido.get("rival_id")
            if rid and not rival_id:
                patch["rival_id"] = str(rid)
        return patch
    if not rival_id:
        src = linked_partido or {}
        rid = src.get("rival_id")
        if rid:
            patch["rival_id"] = str(rid)
    return patch


def apply_auto_link_partido(supabase: Any, micro: dict) -> bool:
    """Persist week-match assignment. Returns True if a DB update ran."""
    if should_skip_auto_link(micro.get("plan_ct")):
        return False
    micro_id = micro.get("id")
    equipo_id = micro.get("equipo_id")
    if not micro_id or not equipo_id:
        return False
    fecha_inicio = str(micro.get("fecha_inicio") or "")[:10]
    fecha_fin = str(micro.get("fecha_fin") or "")[:10]
    if not fecha_inicio or not fecha_fin:
        return False

    partido_id = micro.get("partido_id")
    rival_id = micro.get("rival_id")
    week_partido = None
    linked_partido = None

    if not partido_id:
        res = (
            supabase.table("partidos")
            .select("id, rival_id, fecha, competicion")
            .eq("equipo_id", str(equipo_id))
            .gte("fecha", fecha_inicio)
            .lte("fecha", fecha_fin)
            .order("fecha")
            .limit(8)
            .execute()
        )
        week_partido = pick_week_partido(res.data or [])
    elif not rival_id:
        res = (
            supabase.table("partidos")
            .select("id, rival_id")
            .eq("id", str(partido_id))
            .limit(1)
            .execute()
        )
        rows = res.data or []
        linked_partido = rows[0] if rows else None

    patch = build_auto_link_patch(
        partido_id=str(partido_id) if partido_id else None,
        rival_id=str(rival_id) if rival_id else None,
        week_partido=week_partido,
        linked_partido=linked_partido,
    )
    if not patch:
        return False
    supabase.table("microciclos").update(patch).eq("id", str(micro_id)).execute()
    return True
