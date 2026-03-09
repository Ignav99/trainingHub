"""
TrainingHub Pro - Load Calculation Service
Calculates accumulated training load (sRPE) per player from sessions and matches.
"""

import logging
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from app.database import get_supabase

logger = logging.getLogger(__name__)

# --- RPE estimation constants ---

INTENSITY_BASE_RPE = {
    "alta": 8.0,
    "media": 5.5,
    "baja": 3.5,
    "muy_baja": 2.0,
}

DENSITY_MODIFIER = {
    "alta": 1.3,
    "media": 1.0,
    "baja": 0.7,
}

COGNITIVE_MODIFIER = {
    1: 0.9,
    2: 1.0,
    3: 1.1,
}


def estimate_session_load(
    intensidad_objetivo: Optional[str],
    tareas: list[dict],
) -> tuple[float, float, float]:
    """
    Estimate session RPE from task composition.
    Returns (estimated_rpe, total_duration_min, session_load).
    """
    if not tareas:
        base = INTENSITY_BASE_RPE.get(intensidad_objetivo or "media", 5.5)
        return (base, 0.0, 0.0)

    total_duration = 0.0
    weighted_rpe_sum = 0.0

    for t in tareas:
        duration = t.get("duracion", 0) or 0
        if duration <= 0:
            continue

        # Get base RPE from session intensity or default
        base = INTENSITY_BASE_RPE.get(intensidad_objetivo or "media", 5.5)

        # Apply density modifier
        densidad = t.get("densidad") or "media"
        density_mod = DENSITY_MODIFIER.get(densidad, 1.0)

        # Apply cognitive modifier
        nivel_cog = t.get("nivel_cognitivo")
        if isinstance(nivel_cog, str):
            try:
                nivel_cog = int(nivel_cog)
            except (ValueError, TypeError):
                nivel_cog = 2
        cog_mod = COGNITIVE_MODIFIER.get(nivel_cog or 2, 1.0)

        task_rpe = min(base * density_mod * cog_mod, 10.0)
        weighted_rpe_sum += task_rpe * duration
        total_duration += duration

    if total_duration == 0:
        return (INTENSITY_BASE_RPE.get(intensidad_objetivo or "media", 5.5), 0.0, 0.0)

    session_rpe = round(weighted_rpe_sum / total_duration, 2)
    session_load = round(session_rpe * total_duration, 2)

    return (session_rpe, total_duration, session_load)


GK_MATCH_RPE_MAX = 6.0  # Goalkeeper max RPE at 90 min (vs 10.0 for outfield)


def calculate_match_load(minutos: int, es_portero: bool = False) -> tuple[float, float]:
    """
    Calculate match load from minutes played.
    Goalkeepers have a reduced RPE ceiling (6.0 vs 10.0 for outfield players).
    Returns (match_rpe, match_load).
    """
    if minutos <= 0:
        return (0.0, 0.0)

    rpe_max = GK_MATCH_RPE_MAX if es_portero else 10.0
    match_rpe = min(round(rpe_max * minutos / 90.0, 2), rpe_max)
    match_load = round(match_rpe * minutos, 2)
    return (match_rpe, match_load)


def _determine_nivel(ratio: Optional[float]) -> str:
    """Determine load level from ACWR ratio."""
    if ratio is None:
        return "optimo"
    if ratio > 1.5:
        return "critico"
    if ratio > 1.3:
        return "alto"
    if ratio >= 0.8:
        return "optimo"
    return "bajo"


def recalculate_player_load(jugador_id: UUID, equipo_id: UUID) -> dict:
    """
    Recalculate accumulated load for a single player.
    Sources: registros_rpe, asistencias_sesion + sesiones + sesion_tareas + tareas, convocatorias + partidos.
    Returns the upserted row.
    """
    supabase = get_supabase()
    today = date.today()
    d28_ago = today - timedelta(days=28)
    d7_ago = today - timedelta(days=7)

    jid = str(jugador_id)
    eid = str(equipo_id)

    # Fetch player's es_portero flag and estado for load adjustment
    es_portero = False
    jugador_estado = None
    try:
        jug_resp = supabase.table("jugadores").select("es_portero, estado").eq("id", jid).limit(1).execute()
        if jug_resp.data:
            es_portero = bool(jug_resp.data[0].get("es_portero"))
            jugador_estado = jug_resp.data[0].get("estado")
    except Exception:
        pass

    loads: list[tuple[date, float]] = []  # (fecha, load)

    # --- 1. Session loads (completed sessions the player attended) ---
    try:
        asistencias = (
            supabase.table("asistencias_sesion")
            .select("sesion_id, tipo_participacion")
            .eq("jugador_id", jid)
            .eq("presente", True)
            .execute()
        )

        # Build two sets: all sessions (for manual RPE) and sessions eligible for auto-estimation
        all_sesion_ids = []
        sesion_ids_for_auto = set()
        for a in (asistencias.data or []):
            sid = a["sesion_id"]
            all_sesion_ids.append(sid)
            tipos = a.get("tipo_participacion") or []
            # Legacy empty tipo or includes 'sesion' → eligible for auto-estimation
            if not tipos or "sesion" in tipos:
                sesion_ids_for_auto.add(sid)

        if all_sesion_ids:
            sesiones = (
                supabase.table("sesiones")
                .select("id, fecha, intensidad_objetivo, duracion_total, estado")
                .eq("estado", "completada")
                .gte("fecha", d28_ago.isoformat())
                .in_("id", all_sesion_ids)
                .execute()
            )

            for s in sesiones.data or []:
                sid = s["id"]
                fecha = date.fromisoformat(s["fecha"])

                # Check if there's a manual RPE for this session (always counts)
                manual_rpe = (
                    supabase.table("registros_rpe")
                    .select("rpe, duracion_percibida, carga_sesion")
                    .eq("jugador_id", jid)
                    .eq("sesion_id", sid)
                    .limit(1)
                    .execute()
                )

                if manual_rpe.data:
                    mr = manual_rpe.data[0]
                    load = mr.get("carga_sesion") or 0
                    if not load and mr.get("rpe") and mr.get("duracion_percibida"):
                        load = mr["rpe"] * mr["duracion_percibida"]
                    if load:
                        loads.append((fecha, float(load)))
                    continue

                # Only auto-estimate for players who did 'sesion' (not fisio/margen only)
                if sid not in sesion_ids_for_auto:
                    continue

                # Estimate from tasks
                tareas_resp = (
                    supabase.table("sesion_tareas")
                    .select("tarea_id, duracion, orden")
                    .eq("sesion_id", sid)
                    .execute()
                )
                tareas_data = []
                for st in tareas_resp.data or []:
                    tid = st.get("tarea_id")
                    if tid:
                        tarea = (
                            supabase.table("tareas")
                            .select("densidad, nivel_cognitivo")
                            .eq("id", tid)
                            .limit(1)
                            .execute()
                        )
                        t_info = tarea.data[0] if tarea.data else {}
                    else:
                        t_info = {}
                    tareas_data.append({
                        "duracion": st.get("duracion", 0),
                        "densidad": t_info.get("densidad"),
                        "nivel_cognitivo": t_info.get("nivel_cognitivo"),
                    })

                _, _, session_load = estimate_session_load(
                    s.get("intensidad_objetivo"),
                    tareas_data,
                )

                if session_load > 0:
                    loads.append((fecha, session_load))

    except Exception as e:
        logger.error(f"Error calculating session loads for {jid}: {e}")

    # --- 2. Match loads ---
    try:
        convs = (
            supabase.table("convocatorias")
            .select("partido_id, minutos_jugados")
            .eq("jugador_id", jid)
            .gt("minutos_jugados", 0)
            .execute()
        )
        partido_ids = [c["partido_id"] for c in (convs.data or []) if c.get("minutos_jugados")]

        if partido_ids:
            partidos = (
                supabase.table("partidos")
                .select("id, fecha")
                .gte("fecha", d28_ago.isoformat())
                .in_("id", partido_ids)
                .execute()
            )
            partido_fechas = {p["id"]: p["fecha"] for p in (partidos.data or [])}

            for c in convs.data or []:
                pid = c["partido_id"]
                if pid in partido_fechas and c.get("minutos_jugados"):
                    fecha = date.fromisoformat(partido_fechas[pid])
                    _, match_load = calculate_match_load(c["minutos_jugados"], es_portero=es_portero)
                    if match_load > 0:
                        loads.append((fecha, match_load))

    except Exception as e:
        logger.error(f"Error calculating match loads for {jid}: {e}")

    # --- 3. Compute rolling totals ---
    load_28d = sum(l for (d, l) in loads if d >= d28_ago)
    load_7d = sum(l for (d, l) in loads if d >= d7_ago)

    carga_cronica = round(load_28d / 4.0, 2) if load_28d > 0 else 0
    carga_aguda = round(load_7d, 2)
    ratio_acwr = round(carga_aguda / carga_cronica, 3) if carga_cronica > 0 else None
    nivel = _determine_nivel(ratio_acwr)

    # Override nivel_carga for non-active players
    if jugador_estado in ("lesionado", "enfermo"):
        nivel = "bajo"  # Injured/sick → forced to bajo (no training)

    # Last activity
    ultima_actividad = max((d for d, _ in loads), default=None) if loads else None
    dias_sin = (today - ultima_actividad).days if ultima_actividad else 0

    # Discount planned rest days from inactivity count
    if dias_sin > 0 and ultima_actividad:
        try:
            desc_res = supabase.table("descansos").select("fecha") \
                .eq("equipo_id", eid) \
                .gt("fecha", ultima_actividad.isoformat()) \
                .lte("fecha", today.isoformat()) \
                .execute()
            planned_rest_days = len(desc_res.data or [])
            dias_sin = max(0, dias_sin - planned_rest_days)
        except Exception as e:
            logger.error(f"Error fetching descansos for {jid}: {e}")

    ultima_carga = loads[-1][1] if loads else 0

    # Sort by date to get most recent
    if loads:
        loads.sort(key=lambda x: x[0])
        ultima_carga = loads[-1][1]

    # --- 4. Upsert ---
    row = {
        "jugador_id": jid,
        "equipo_id": eid,
        "carga_aguda": float(carga_aguda),
        "carga_cronica": float(carga_cronica),
        "ratio_acwr": float(ratio_acwr) if ratio_acwr is not None else None,
        "nivel_carga": nivel,
        "ultima_carga": float(ultima_carga),
        "ultima_actividad_fecha": ultima_actividad.isoformat() if ultima_actividad else None,
        "dias_sin_actividad": dias_sin,
    }

    try:
        supabase.table("carga_acumulada_jugador").upsert(
            row, on_conflict="jugador_id"
        ).execute()
    except Exception as e:
        logger.error(f"Error upserting carga for {jid}: {e}")

    return row


def recalculate_team_load(equipo_id: UUID) -> list[dict]:
    """Recalculate load for all players in a team."""
    supabase = get_supabase()
    eid = str(equipo_id)

    jugadores = (
        supabase.table("jugadores")
        .select("id")
        .eq("equipo_id", eid)
        .execute()
    )

    results = []
    for j in jugadores.data or []:
        try:
            row = recalculate_player_load(UUID(j["id"]), equipo_id)
            results.append(row)
        except Exception as e:
            logger.error(f"Error recalculating load for player {j['id']}: {e}")

    return results
