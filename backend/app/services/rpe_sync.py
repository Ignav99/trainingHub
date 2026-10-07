"""Upsert de RPE de sesión y partido (Foster: RPE × minutos efectivos)."""

from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from app.services.duracion_efectiva import player_session_minutes
from app.services.load_calculation_service import recalculate_player_load
from app.services.sesion_recalculo import (
    apply_minutes_to_rpe_rows,
    foster_carga,
    resolve_rpe_minutes,
    rpe_fields_for_minutes,
    should_rewrite_session_rpe,
)

logger = logging.getLogger(__name__)

__all__ = [
    "apply_minutes_to_rpe_rows",
    "foster_carga",
    "load_sesion_tareas_rows",
    "player_minutes_for_sesion",
    "present_player_ids",
    "recalc_jugador_safe",
    "refresh_completed_session_loads",
    "resolve_rpe_minutes",
    "rpe_fields_for_minutes",
    "should_rewrite_session_rpe",
    "sync_convocatoria_rpe",
    "upsert_rpe_partido",
    "upsert_rpe_sesion",
]


def _first_row(resp) -> Optional[dict]:
    data = getattr(resp, "data", None)
    if isinstance(data, list) and data:
        return data[0] if isinstance(data[0], dict) else None
    if isinstance(data, dict):
        return data
    return None


def upsert_rpe_sesion(
    supabase,
    *,
    jugador_id: str,
    sesion_id: str,
    fecha: str,
    rpe: int,
    duracion_percibida: int,
) -> Optional[dict]:
    """Un RPE de sesión por jugador. Select-then-update para no depender de ON CONFLICT."""
    carga = foster_carga(rpe, duracion_percibida)
    payload = {
        "jugador_id": str(jugador_id),
        "sesion_id": str(sesion_id),
        "fecha": fecha,
        "rpe": int(rpe),
        "duracion_percibida": int(duracion_percibida or 0),
        "tipo": "sesion",
        "carga_sesion": carga,
    }
    try:
        existing = (
            supabase.table("registros_rpe")
            .select("id, tipo")
            .eq("jugador_id", str(jugador_id))
            .eq("sesion_id", str(sesion_id))
            .execute()
        )
    except Exception as e:
        logger.warning("lookup RPE sesión %s/%s: %s", jugador_id, sesion_id, e)
        existing = type("R", (), {"data": []})()

    row = None
    for cand in existing.data or []:
        if (cand.get("tipo") or "sesion") == "sesion":
            row = cand
            break

    try:
        if row and row.get("id"):
            supabase.table("registros_rpe").update({
                "rpe": payload["rpe"],
                "duracion_percibida": payload["duracion_percibida"],
                "carga_sesion": carga,
                "fecha": fecha,
                "tipo": "sesion",
            }).eq("id", row["id"]).execute()
            return {**row, **payload, "id": row["id"]}
        inserted = supabase.table("registros_rpe").insert(payload).execute()
        return _first_row(inserted) or payload
    except Exception as e:
        logger.error("upsert RPE sesión %s/%s: %s", jugador_id, sesion_id, e)
        return None


def upsert_rpe_partido(
    supabase,
    *,
    jugador_id: str,
    partido_id: str,
    fecha: str,
    rpe: int,
    minutos: int,
) -> Optional[dict]:
    carga = foster_carga(rpe, minutos)
    payload = {
        "jugador_id": str(jugador_id),
        "partido_id": str(partido_id),
        "sesion_id": None,
        "fecha": fecha,
        "rpe": int(rpe),
        "duracion_percibida": int(minutos or 0),
        "tipo": "partido",
        "carga_sesion": carga,
    }
    try:
        existing = (
            supabase.table("registros_rpe")
            .select("id, tipo")
            .eq("jugador_id", str(jugador_id))
            .eq("partido_id", str(partido_id))
            .execute()
        )
    except Exception as e:
        logger.warning("lookup RPE partido (¿falta partido_id?): %s", e)
        existing = type("R", (), {"data": []})()

    row = None
    for cand in existing.data or []:
        if (cand.get("tipo") or "") == "partido":
            row = cand
            break

    try:
        if row and row.get("id"):
            supabase.table("registros_rpe").update({
                "rpe": payload["rpe"],
                "duracion_percibida": payload["duracion_percibida"],
                "carga_sesion": carga,
                "fecha": fecha,
                "tipo": "partido",
            }).eq("id", row["id"]).execute()
            return {**row, **payload, "id": row["id"]}
        inserted = supabase.table("registros_rpe").insert(payload).execute()
        return _first_row(inserted) or payload
    except Exception as e:
        logger.error("upsert RPE partido %s/%s: %s", jugador_id, partido_id, e)
        return None


def delete_rpe_partido(supabase, jugador_id: str, partido_id: str) -> None:
    try:
        supabase.table("registros_rpe").delete().eq(
            "jugador_id", str(jugador_id)
        ).eq("partido_id", str(partido_id)).eq("tipo", "partido").execute()
    except Exception as e:
        logger.warning("delete RPE partido: %s", e)


def sync_convocatoria_rpe(supabase, conv: dict) -> None:
    """Tras guardar convocatorias.rpe, espeja Foster en registros_rpe."""
    jid = conv.get("jugador_id")
    pid = conv.get("partido_id")
    if not jid or not pid:
        return
    rpe = conv.get("rpe")
    if rpe is None:
        delete_rpe_partido(supabase, str(jid), str(pid))
        return
    try:
        rpe_i = int(rpe)
    except (TypeError, ValueError):
        return
    if rpe_i < 1 or rpe_i > 10:
        return
    minutos = int(conv.get("minutos_jugados") or 0)
    fecha = None
    try:
        part = (
            supabase.table("partidos")
            .select("fecha")
            .eq("id", str(pid))
            .maybe_single()
            .execute()
        )
        fecha = (part.data or {}).get("fecha")
    except Exception:
        fecha = None
    if not fecha:
        from datetime import date as date_cls
        fecha = date_cls.today().isoformat()
    upsert_rpe_partido(
        supabase,
        jugador_id=str(jid),
        partido_id=str(pid),
        fecha=str(fecha)[:10],
        rpe=rpe_i,
        minutos=minutos,
    )


def present_player_ids(supabase, sesion_id: str) -> set[str]:
    try:
        asist = (
            supabase.table("asistencias_sesion")
            .select("jugador_id, presente")
            .eq("sesion_id", str(sesion_id))
            .eq("presente", True)
            .execute()
        )
    except Exception as e:
        logger.warning("asistencia para recálculo %s: %s", sesion_id, e)
        return set()
    return {str(a.get("jugador_id")) for a in (asist.data or []) if a.get("jugador_id")}


def refresh_completed_session_loads(supabase, sesion_id: str, equipo_id: str, extra_ids: set[str] | None = None) -> None:
    """Recalcula la carga de quienes estuvieron y de quienes tienen RPE de esa sesión.

    Comparte un solo contexto de sesiones para no repetir las lecturas por jugador.
    """
    if not equipo_id:
        return
    ids = set(extra_ids or set())
    ids |= present_player_ids(supabase, sesion_id)
    ids = {jid for jid in ids if jid}
    if not ids:
        return
    try:
        from datetime import date as date_cls

        from app.services.load_calculation_service import (
            fetch_session_load_context,
            recalculate_player_load,
            series_start,
        )

        ctx = fetch_session_load_context(supabase, str(equipo_id), series_start(date_cls.today()))
    except Exception as e:
        logger.warning("contexto de carga %s: %s", sesion_id, e)
        return
    for jid in ids:
        try:
            recalculate_player_load(UUID(str(jid)), UUID(str(equipo_id)), session_ctx=ctx)
        except Exception as e:
            logger.warning("recalc load %s tras sesión %s: %s", jid, sesion_id, e)


def recalc_jugador_safe(jugador_id: str) -> None:
    try:
        from app.database import get_supabase
        supabase = get_supabase()
        jug = (
            supabase.table("jugadores")
            .select("equipo_id")
            .eq("id", str(jugador_id))
            .maybe_single()
            .execute()
        )
        if jug.data and jug.data.get("equipo_id"):
            recalculate_player_load(UUID(str(jugador_id)), UUID(str(jug.data["equipo_id"])))
    except Exception as e:
        logger.warning("recalc load %s: %s", jugador_id, e)


def load_sesion_tareas_rows(supabase, sesion_id: str) -> list[dict]:
    try:
        tareas = (
            supabase.table("sesion_tareas")
            .select(
                "id, duracion_override, minutos_efectivos, fase_sesion, "
                "tareas(duracion_total, tiempo_descanso, num_series)"
            )
            .eq("sesion_id", str(sesion_id))
            .execute()
        )
    except Exception:
        tareas = (
            supabase.table("sesion_tareas")
            .select(
                "id, duracion_override, fase_sesion, "
                "tareas(duracion_total, tiempo_descanso, num_series)"
            )
            .eq("sesion_id", str(sesion_id))
            .execute()
        )
    rows = []
    for st in tareas.data or []:
        tarea = st.get("tareas") or {}
        if not isinstance(tarea, dict):
            tarea = {}
        rows.append({
            "id": st.get("id"),
            "duracion_override": st.get("duracion_override"),
            "minutos_efectivos": st.get("minutos_efectivos"),
            "fase_sesion": st.get("fase_sesion"),
            "tarea": tarea,
            "tareas": tarea,
        })
    return rows


def player_minutes_for_sesion(
    supabase,
    sesion_id: str,
    jugador_id: str,
    estructura: list | None = None,
    rows: list | None = None,
) -> int:
    if rows is None:
        rows = load_sesion_tareas_rows(supabase, sesion_id)
    if estructura is None:
        try:
            ses = (
                supabase.table("sesiones")
                .select("estructura_fases")
                .eq("id", str(sesion_id))
                .maybe_single()
                .execute()
            )
            estructura = (ses.data or {}).get("estructura_fases") or []
        except Exception:
            estructura = []
    if not isinstance(estructura, list):
        estructura = []
    return player_session_minutes(rows, estructura, str(jugador_id))
