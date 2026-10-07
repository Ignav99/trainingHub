"""Upsert de RPE de sesión y partido (Foster: RPE × minutos efectivos)."""

from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from app.services.duracion_efectiva import (
    margin_minutes_for_tipos,
    minutos_plan_margen,
    named_players_on_task,
    participation_kind,
    player_session_minutes,
    split_margen_efectivo,
)
from app.services.load_calculation_service import recalculate_player_load
from app.services.sesion_recalculo import (
    apply_minutes_to_rpe_rows,
    foster_carga,
    resolve_player_rpe_minutes,
    resolve_rpe_minutes,
    rpe_fields_for_minutes,
    should_rewrite_session_rpe,
)

logger = logging.getLogger(__name__)

__all__ = [
    "apply_minutes_to_rpe_rows",
    "foster_carga",
    "load_participation_by_player",
    "minutes_are_exact",
    "load_sesion_tareas_rows",
    "minute_overrides_for_sessions",
    "player_minutes_for_sesion",
    "resolve_player_rpe_minutes",
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


_TAREA_SELECTS = (
    "id, sesion_id, duracion_override, minutos_efectivos, fase_sesion, jugadores_margen, formacion_equipos, "
    "tareas(duracion_total, tiempo_descanso, num_series)",
    "id, sesion_id, duracion_override, minutos_efectivos, fase_sesion, formacion_equipos, "
    "tareas(duracion_total, tiempo_descanso, num_series)",
    "id, sesion_id, duracion_override, fase_sesion, formacion_equipos, "
    "tareas(duracion_total, tiempo_descanso, num_series)",
)


def _rows_in(supabase, table: str, columns: str, column: str, ids: list) -> list[dict]:
    rows: list[dict] = []
    clean = [str(i) for i in ids if i]
    for offset in range(0, len(clean), 80):
        chunk = clean[offset:offset + 80]
        resp = (
            supabase.table(table)
            .select(columns)
            .in_(column, chunk)
            .execute()
        )
        rows.extend(resp.data or [])
    return rows


def _tarea_rows_from_raw(raw_rows: list) -> list[dict]:
    rows = []
    for st in raw_rows or []:
        tarea = st.get("tareas") or {}
        if not isinstance(tarea, dict):
            tarea = {}
        rows.append({
            "id": st.get("id"),
            "sesion_id": st.get("sesion_id"),
            "duracion_override": st.get("duracion_override"),
            "minutos_efectivos": st.get("minutos_efectivos"),
            "fase_sesion": st.get("fase_sesion"),
            "formacion_equipos": st.get("formacion_equipos"),
            "jugadores_margen": named_players_on_task(st),
            "tarea": tarea,
            "tareas": tarea,
        })
    return rows


def _select_tarea_rows(supabase, *, sesion_id: str | None = None, sesion_ids: list | None = None) -> list[dict]:
    last_error: Exception | None = None
    for columns in _TAREA_SELECTS:
        try:
            query = supabase.table("sesion_tareas").select(columns)
            if sesion_id:
                resp = query.eq("sesion_id", str(sesion_id)).execute()
                return _tarea_rows_from_raw(resp.data or [])
            return _tarea_rows_from_raw(_rows_in(supabase, "sesion_tareas", columns, "sesion_id", sesion_ids or []))
        except Exception as e:
            last_error = e
            continue
    if last_error:
        logger.warning("sesion_tareas para minutos: %s", last_error)
    return []


def load_sesion_tareas_rows(supabase, sesion_id: str) -> list[dict]:
    return _select_tarea_rows(supabase, sesion_id=sesion_id)


def _tipos(raw) -> list[str]:
    if isinstance(raw, list):
        return [str(t) for t in raw if t]
    return []


def _margin_minutes_by_player(supabase, sesion_ids: list[str]) -> dict[tuple[str, str], int]:
    """(sesion_id, jugador_id) → minutos efectivos del plan al margen."""
    if not sesion_ids:
        return {}
    try:
        plans = _rows_in(
            supabase,
            "entrenamientos_margen",
            "id, sesion_id, jugador_id, duracion_estimada",
            "sesion_id",
            sesion_ids,
        )
    except Exception as e:
        logger.warning("planes al margen: %s", e)
        return {}
    plan_ids = [p.get("id") for p in plans if p.get("id")]
    tareas_by_plan: dict[str, list] = {}
    if plan_ids:
        raw_tareas: list = []
        for columns in (
            "entrenamiento_margen_id, duracion, minutos_efectivos, notas",
            "entrenamiento_margen_id, duracion, notas",
        ):
            try:
                raw_tareas = _rows_in(
                    supabase,
                    "entrenamientos_margen_tareas",
                    columns,
                    "entrenamiento_margen_id",
                    plan_ids,
                )
                break
            except Exception as e:
                logger.warning("tareas al margen (%s): %s", columns, e)
                raw_tareas = []
        for tarea in raw_tareas:
            pid = str(tarea.get("entrenamiento_margen_id") or "")
            if not pid:
                continue
            if tarea.get("minutos_efectivos") is None:
                _, efectivos = split_margen_efectivo(tarea.get("notas"), None)
                if efectivos is not None:
                    tarea["minutos_efectivos"] = efectivos
            tareas_by_plan.setdefault(pid, []).append(tarea)
    out: dict[tuple[str, str], int] = {}
    for plan in plans:
        sid = str(plan.get("sesion_id") or "")
        jid = str(plan.get("jugador_id") or "")
        if not sid or not jid:
            continue
        out[(sid, jid)] = minutos_plan_margen(
            tareas_by_plan.get(str(plan.get("id"))),
            plan.get("duracion_estimada"),
        )
    return out


def load_participation_by_player(supabase, sesion_id: str) -> dict[str, dict]:
    """Presentes de la sesión: si son parciales y cuántos minutos de margen suman."""
    try:
        asist = (
            supabase.table("asistencias_sesion")
            .select("jugador_id, presente, tipo_participacion")
            .eq("sesion_id", str(sesion_id))
            .execute()
        )
    except Exception as e:
        logger.warning("participación %s: %s", sesion_id, e)
        return {}
    present: list[tuple[str, list[str]]] = []
    for row in asist.data or []:
        if not row.get("presente") or not row.get("jugador_id"):
            continue
        present.append((str(row["jugador_id"]), _tipos(row.get("tipo_participacion"))))
    if not present:
        return {}
    margin = _margin_minutes_by_player(supabase, [str(sesion_id)])
    out: dict[str, dict] = {}
    for jid, tipos in present:
        kind = participation_kind(tipos)
        out[jid] = {
            "parcial": kind == "parcial",
            "solo_margen": kind == "solo_margen",
            "sin_campo": kind == "sin_campo",
            "minutos_margen": margin_minutes_for_tipos(tipos, margin.get((str(sesion_id), jid), 0)),
            "tipos": tipos,
        }
    return out


def minutes_are_exact(part: dict | None) -> bool:
    """0 minutos es real: no hereda la sesión entera ni el minutaje provisional."""
    data = part or {}
    return bool(data.get("parcial") or data.get("solo_margen") or data.get("sin_campo"))


def minute_overrides_for_sessions(supabase, session_ids: list, attendance: list) -> dict[str, dict[str, int]]:
    """Minutos propios de quien no hace la sesión entera. 0 es un resultado real."""
    relevant: dict[str, list[tuple[str, list[str], str]]] = {}
    wanted = {str(s) for s in session_ids if s}
    for row in attendance or []:
        if not row.get("presente"):
            continue
        sid = str(row.get("sesion_id") or "")
        jid = str(row.get("jugador_id") or "")
        if not sid or not jid or (wanted and sid not in wanted):
            continue
        tipos = _tipos(row.get("tipo_participacion"))
        kind = participation_kind(tipos)
        if kind == "completa":
            continue
        relevant.setdefault(sid, []).append((jid, tipos, kind))
    if not relevant:
        return {}
    sids = list(relevant.keys())
    tareas = _select_tarea_rows(supabase, sesion_ids=sids)
    by_session: dict[str, list] = {}
    for row in tareas:
        by_session.setdefault(str(row.get("sesion_id") or ""), []).append(row)
    estructura_by: dict[str, list] = {}
    try:
        for ses in _rows_in(supabase, "sesiones", "id, estructura_fases", "id", sids):
            estructura = ses.get("estructura_fases") or []
            estructura_by[str(ses.get("id"))] = estructura if isinstance(estructura, list) else []
    except Exception as e:
        logger.warning("estructura para minutos parciales: %s", e)
    margin = _margin_minutes_by_player(supabase, sids)
    overrides: dict[str, dict[str, int]] = {}
    for sid, players in relevant.items():
        for jid, tipos, kind in players:
            overrides.setdefault(sid, {})[jid] = player_session_minutes(
                by_session.get(sid) or [],
                estructura_by.get(sid) or [],
                jid,
                parcial=kind == "parcial",
                solo_margen=kind == "solo_margen",
                sin_campo=kind == "sin_campo",
                minutos_margen=margin_minutes_for_tipos(tipos, margin.get((sid, jid), 0)),
            )
    return overrides


def player_minutes_for_sesion(
    supabase,
    sesion_id: str,
    jugador_id: str,
    estructura: list | None = None,
    rows: list | None = None,
    participation: dict | None = None,
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
    if participation is None:
        participation = load_participation_by_player(supabase, sesion_id)
    part = (participation or {}).get(str(jugador_id)) or {}
    return player_session_minutes(
        rows,
        estructura,
        str(jugador_id),
        parcial=bool(part.get("parcial")),
        solo_margen=bool(part.get("solo_margen")),
        sin_campo=bool(part.get("sin_campo")),
        minutos_margen=int(part.get("minutos_margen") or 0),
    )
