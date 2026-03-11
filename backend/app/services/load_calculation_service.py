"""
TrainingHub Pro - Load Calculation Service
EWMA-based training load calculation per player.
Supports session, match, and standalone manual RPE loads.
Writes daily history (carga_diaria_jugador) and snapshot (carga_acumulada_jugador).
"""

import logging
import math
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from app.database import get_supabase

logger = logging.getLogger(__name__)

# --- EWMA constants ---
EWMA_ACUTE_LAMBDA = 2.0 / (7 + 1)    # ~0.25
EWMA_CHRONIC_LAMBDA = 2.0 / (28 + 1)  # ~0.069
MARGEN_LOAD_FACTOR = 0.35
HISTORY_LOOKBACK_DAYS = 56  # fetch 56 days for EWMA warm-up
UPSERT_DAYS = 28            # persist last 28 days to DB

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

GK_MATCH_RPE_MAX = 6.0


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

        base = INTENSITY_BASE_RPE.get(intensidad_objetivo or "media", 5.5)

        densidad = t.get("densidad") or "media"
        density_mod = DENSITY_MODIFIER.get(densidad, 1.0)

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


def calculate_match_load(minutos: int, es_portero: bool = False) -> tuple[float, float]:
    """Calculate match load from minutes played."""
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


# ---------------------------------------------------------------------------
#  Gather raw loads into dict[date, {sesion, partido, manual}]
# ---------------------------------------------------------------------------

def _gather_session_loads(
    supabase, jid: str, es_portero: bool, since: date
) -> dict[date, float]:
    """
    Gather session loads for a player.
    - Manual RPE linked to session → use carga_sesion directly
    - 'sesion' tipo → auto-estimate from tasks
    - 'margen' tipo → auto-estimate × MARGEN_LOAD_FACTOR
    - 'fisio' only → skip (0 load)
    """
    loads: dict[date, float] = defaultdict(float)

    try:
        asistencias = (
            supabase.table("asistencias_sesion")
            .select("sesion_id, tipo_participacion")
            .eq("jugador_id", jid)
            .eq("presente", True)
            .execute()
        )

        if not asistencias.data:
            return loads

        # Classify sessions by participation type
        sesion_tipo_map: dict[str, list[str]] = {}  # sesion_id -> tipos
        all_sesion_ids = []
        for a in asistencias.data:
            sid = a["sesion_id"]
            all_sesion_ids.append(sid)
            tipos = a.get("tipo_participacion") or []
            sesion_tipo_map[sid] = tipos

        if not all_sesion_ids:
            return loads

        # Batch fetch sessions (completed, within lookback)
        sesiones = (
            supabase.table("sesiones")
            .select("id, fecha, intensidad_objetivo, duracion_total, estado")
            .eq("estado", "completada")
            .gte("fecha", since.isoformat())
            .in_("id", all_sesion_ids)
            .execute()
        )

        if not sesiones.data:
            return loads

        sesion_ids_in_range = [s["id"] for s in sesiones.data]

        # Batch fetch manual RPE for all sessions at once
        rpe_records = (
            supabase.table("registros_rpe")
            .select("sesion_id, rpe, duracion_percibida, carga_sesion")
            .eq("jugador_id", jid)
            .in_("sesion_id", sesion_ids_in_range)
            .execute()
        )
        rpe_map: dict[str, dict] = {}
        for r in (rpe_records.data or []):
            if r.get("sesion_id"):
                rpe_map[r["sesion_id"]] = r

        # Batch fetch all sesion_tareas for sessions that need auto-estimation
        needs_auto = set()
        for s in sesiones.data:
            sid = s["id"]
            if sid in rpe_map:
                continue  # has manual RPE
            tipos = sesion_tipo_map.get(sid, [])
            if not tipos or "sesion" in tipos or "margen" in tipos:
                needs_auto.add(sid)

        # Batch fetch sesion_tareas (duracion_override is on sesion_tareas, base duration on tareas)
        tareas_by_sesion: dict[str, list[dict]] = defaultdict(list)
        if needs_auto:
            st_resp = (
                supabase.table("sesion_tareas")
                .select("sesion_id, tarea_id, duracion_override, tareas(duracion_total, densidad, nivel_cognitivo)")
                .in_("sesion_id", list(needs_auto))
                .execute()
            )

            for st in (st_resp.data or []):
                sid = st["sesion_id"]
                t_info = st.get("tareas") or {}
                duracion = st.get("duracion_override") or t_info.get("duracion_total", 0)
                tareas_by_sesion[sid].append({
                    "duracion": duracion,
                    "densidad": t_info.get("densidad"),
                    "nivel_cognitivo": t_info.get("nivel_cognitivo"),
                })

        # Process each session
        for s in sesiones.data:
            sid = s["id"]
            fecha = date.fromisoformat(s["fecha"])
            tipos = sesion_tipo_map.get(sid, [])

            # 1. Manual RPE linked to session
            if sid in rpe_map:
                mr = rpe_map[sid]
                load = mr.get("carga_sesion") or 0
                if not load and mr.get("rpe") and mr.get("duracion_percibida"):
                    load = mr["rpe"] * mr["duracion_percibida"]
                if load:
                    loads[fecha] += float(load)
                continue

            # 2. Fisio-only → skip
            if tipos and "sesion" not in tipos and "margen" not in tipos:
                continue

            # 3. Auto-estimate from tasks
            _, _, session_load = estimate_session_load(
                s.get("intensidad_objetivo"),
                tareas_by_sesion.get(sid, []),
            )

            if session_load > 0:
                # Margen → reduced load
                is_margen = tipos and "margen" in tipos and "sesion" not in tipos
                if is_margen:
                    session_load *= MARGEN_LOAD_FACTOR
                loads[fecha] += round(session_load, 2)

    except Exception as e:
        logger.error(f"Error gathering session loads for {jid}: {e}")

    return loads


def _gather_match_loads(
    supabase, jid: str, es_portero: bool, since: date
) -> dict[date, float]:
    """Gather match loads from convocatorias."""
    loads: dict[date, float] = defaultdict(float)

    try:
        convs = (
            supabase.table("convocatorias")
            .select("partido_id, minutos_jugados")
            .eq("jugador_id", jid)
            .gt("minutos_jugados", 0)
            .execute()
        )

        if not convs.data:
            return loads

        partido_ids = [c["partido_id"] for c in convs.data if c.get("minutos_jugados")]

        if not partido_ids:
            return loads

        partidos = (
            supabase.table("partidos")
            .select("id, fecha")
            .gte("fecha", since.isoformat())
            .in_("id", partido_ids)
            .execute()
        )
        partido_fechas = {p["id"]: p["fecha"] for p in (partidos.data or [])}

        for c in convs.data:
            pid = c["partido_id"]
            if pid in partido_fechas and c.get("minutos_jugados"):
                fecha = date.fromisoformat(partido_fechas[pid])
                _, match_load = calculate_match_load(c["minutos_jugados"], es_portero=es_portero)
                if match_load > 0:
                    loads[fecha] += match_load

    except Exception as e:
        logger.error(f"Error gathering match loads for {jid}: {e}")

    return loads


def _gather_manual_loads(
    supabase, jid: str, since: date
) -> dict[date, float]:
    """Gather standalone manual RPE entries (tipo='manual', no sesion_id)."""
    loads: dict[date, float] = defaultdict(float)

    try:
        rpe_records = (
            supabase.table("registros_rpe")
            .select("fecha, rpe, duracion_percibida, carga_sesion")
            .eq("jugador_id", jid)
            .eq("tipo", "manual")
            .is_("sesion_id", "null")
            .gte("fecha", since.isoformat())
            .execute()
        )

        for r in (rpe_records.data or []):
            load = r.get("carga_sesion") or 0
            if not load and r.get("rpe") and r.get("duracion_percibida"):
                load = r["rpe"] * r["duracion_percibida"]
            if load:
                fecha = date.fromisoformat(r["fecha"])
                loads[fecha] += float(load)

    except Exception as e:
        logger.error(f"Error gathering manual loads for {jid}: {e}")

    return loads


# ---------------------------------------------------------------------------
#  EWMA day-by-day walk + monotonia/strain
# ---------------------------------------------------------------------------

def _compute_ewma_series(
    daily_loads: dict[date, dict],
    start_date: date,
    end_date: date,
) -> list[dict]:
    """
    Walk day-by-day from start_date to end_date.
    Returns list of dicts with date, load breakdown, EWMA, ACWR, monotonia, strain.
    """
    results = []
    ewma_acute = 0.0
    ewma_chronic = 0.0

    # Rolling window for monotonia (last 7 totals)
    last_7_totals: list[float] = []

    current = start_date
    while current <= end_date:
        day_data = daily_loads.get(current, {})
        load_sesion = day_data.get("sesion", 0.0)
        load_partido = day_data.get("partido", 0.0)
        load_manual = day_data.get("manual", 0.0)
        load_total = load_sesion + load_partido + load_manual

        # EWMA update
        ewma_acute = load_total * EWMA_ACUTE_LAMBDA + ewma_acute * (1 - EWMA_ACUTE_LAMBDA)
        ewma_chronic = load_total * EWMA_CHRONIC_LAMBDA + ewma_chronic * (1 - EWMA_CHRONIC_LAMBDA)

        # ACWR — only meaningful when chronic has built up enough (≈3+ days training)
        acwr = round(ewma_acute / ewma_chronic, 3) if ewma_chronic > 50 else None

        # Monotonia & strain (rolling 7-day window)
        last_7_totals.append(load_total)
        if len(last_7_totals) > 7:
            last_7_totals.pop(0)

        monotonia = None
        strain = None
        if len(last_7_totals) == 7:
            mean_7 = sum(last_7_totals) / 7.0
            variance = sum((x - mean_7) ** 2 for x in last_7_totals) / 7.0
            stdev = math.sqrt(variance) if variance > 0 else 0
            if stdev > 0:
                monotonia = round(mean_7 / stdev, 3)
                strain = round(sum(last_7_totals) * monotonia, 2)

        results.append({
            "fecha": current,
            "load_sesion": round(load_sesion, 2),
            "load_partido": round(load_partido, 2),
            "load_manual": round(load_manual, 2),
            "load_total": round(load_total, 2),
            "ewma_acute": round(ewma_acute, 2),
            "ewma_chronic": round(ewma_chronic, 2),
            "acwr": acwr,
            "monotonia": monotonia,
            "strain": strain,
        })

        current += timedelta(days=1)

    return results


# ---------------------------------------------------------------------------
#  Main recalculation
# ---------------------------------------------------------------------------

def recalculate_player_load(jugador_id: UUID, equipo_id: UUID) -> dict:
    """
    Recalculate accumulated load for a single player using EWMA.
    Writes daily rows to carga_diaria_jugador and snapshot to carga_acumulada_jugador.
    """
    supabase = get_supabase()
    today = date.today()
    since = today - timedelta(days=HISTORY_LOOKBACK_DAYS)

    jid = str(jugador_id)
    eid = str(equipo_id)

    # Fetch player metadata
    es_portero = False
    jugador_estado = None
    try:
        jug_resp = supabase.table("jugadores").select("es_portero, estado").eq("id", jid).limit(1).execute()
        if jug_resp.data:
            es_portero = bool(jug_resp.data[0].get("es_portero"))
            jugador_estado = jug_resp.data[0].get("estado")
    except Exception:
        pass

    # Gather raw loads
    session_loads = _gather_session_loads(supabase, jid, es_portero, since)
    match_loads = _gather_match_loads(supabase, jid, es_portero, since)
    manual_loads = _gather_manual_loads(supabase, jid, since)

    # Merge into daily dict
    all_dates = set(session_loads.keys()) | set(match_loads.keys()) | set(manual_loads.keys())
    daily_loads: dict[date, dict] = {}
    for d in all_dates:
        daily_loads[d] = {
            "sesion": session_loads.get(d, 0.0),
            "partido": match_loads.get(d, 0.0),
            "manual": manual_loads.get(d, 0.0),
        }

    # Compute EWMA series
    series = _compute_ewma_series(daily_loads, since, today)

    # Get today's values from the last entry
    today_entry = series[-1] if series else None
    ewma_acute = today_entry["ewma_acute"] if today_entry else 0
    ewma_chronic = today_entry["ewma_chronic"] if today_entry else 0
    acwr = today_entry["acwr"] if today_entry else None
    monotonia = today_entry["monotonia"] if today_entry else None
    strain = today_entry["strain"] if today_entry else None
    nivel = _determine_nivel(acwr)

    # When ACWR can't be calculated (low chronic), use acute to determine level
    if acwr is None and ewma_acute < 5:
        nivel = "bajo"  # insufficient training stimulus

    # Override for injured/sick/recovering players
    if jugador_estado in ("lesionado", "enfermo", "en_recuperacion"):
        nivel = "bajo"

    # Last activity & inactivity days
    activity_dates = [d for d in all_dates if d >= since]
    ultima_actividad = max(activity_dates) if activity_dates else None
    dias_sin = (today - ultima_actividad).days if ultima_actividad else 0

    # Discount planned rest days
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

    ultima_carga = today_entry["load_total"] if today_entry else 0

    # --- Bulk upsert daily rows (last UPSERT_DAYS) ---
    cutoff = today - timedelta(days=UPSERT_DAYS)
    daily_rows = []
    for entry in series:
        if entry["fecha"] >= cutoff:
            daily_rows.append({
                "jugador_id": jid,
                "equipo_id": eid,
                "fecha": entry["fecha"].isoformat(),
                "load_sesion": float(entry["load_sesion"]),
                "load_partido": float(entry["load_partido"]),
                "load_manual": float(entry["load_manual"]),
                "load_total": float(entry["load_total"]),
                "ewma_acute": float(entry["ewma_acute"]),
                "ewma_chronic": float(entry["ewma_chronic"]),
                "acwr": float(entry["acwr"]) if entry["acwr"] is not None else None,
                "monotonia": float(entry["monotonia"]) if entry["monotonia"] is not None else None,
                "strain": float(entry["strain"]) if entry["strain"] is not None else None,
            })

    if daily_rows:
        try:
            supabase.table("carga_diaria_jugador").upsert(
                daily_rows, on_conflict="jugador_id,fecha"
            ).execute()
        except Exception as e:
            logger.error(f"Error upserting carga_diaria for {jid}: {e}")

    # --- Wellness aggregation (unchanged) ---
    d7_ago = today - timedelta(days=7)
    wellness_total_val = None
    wellness_general_avg = None
    wellness_7d_avg = None
    wellness_last = None
    wellness_last_fecha = None
    wellness_alerta = False

    try:
        w_records = (
            supabase.table("registros_rpe")
            .select("fecha, sueno, fatiga, dolor, estres, humor")
            .eq("jugador_id", jid)
            .eq("tipo", "wellness")
            .order("fecha", desc=True)
            .execute()
        )
        w_data = w_records.data or []

        if w_data:
            def _w_total(r: dict) -> int:
                return sum(r.get(f, 0) or 0 for f in ("sueno", "fatiga", "dolor", "estres", "humor"))

            all_totals = [_w_total(r) for r in w_data]
            wellness_general_avg = round(sum(all_totals) / len(all_totals), 2)

            recent_7d = [_w_total(r) for r in w_data if r["fecha"] >= d7_ago.isoformat()]
            if recent_7d:
                wellness_7d_avg = round(sum(recent_7d) / len(recent_7d), 2)

            last_w = w_data[0]
            wellness_last = _w_total(last_w)
            wellness_last_fecha = last_w["fecha"]
            wellness_alerta = (last_w.get("sueno") or 5) <= 2 or (last_w.get("dolor") or 5) <= 2
    except Exception as e:
        logger.error(f"Error calculating wellness for {jid}: {e}")

    # --- Upsert snapshot (backwards compatible) ---
    row = {
        "jugador_id": jid,
        "equipo_id": eid,
        "carga_aguda": float(ewma_acute),
        "carga_cronica": float(ewma_chronic),
        "ratio_acwr": float(acwr) if acwr is not None else None,
        "nivel_carga": nivel,
        "ultima_carga": float(ultima_carga),
        "ultima_actividad_fecha": ultima_actividad.isoformat() if ultima_actividad else None,
        "dias_sin_actividad": dias_sin,
        "monotonia": float(monotonia) if monotonia is not None else None,
        "strain": float(strain) if strain is not None else None,
        "wellness_total": wellness_last,
        "wellness_general_avg": float(wellness_general_avg) if wellness_general_avg is not None else None,
        "wellness_7d_avg": float(wellness_7d_avg) if wellness_7d_avg is not None else None,
        "wellness_last": wellness_last,
        "wellness_last_fecha": wellness_last_fecha,
        "wellness_alerta": wellness_alerta,
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


def recalculate_all_teams() -> int:
    """Recalculate load for ALL teams. Used by scheduler."""
    supabase = get_supabase()
    try:
        equipos = supabase.table("equipos").select("id").execute()
        count = 0
        for eq in (equipos.data or []):
            try:
                recalculate_team_load(UUID(eq["id"]))
                count += 1
            except Exception as e:
                logger.error(f"Error recalculating team {eq['id']}: {e}")
        logger.info(f"Daily load recalculation completed for {count} teams")
        return count
    except Exception as e:
        logger.error(f"Error in recalculate_all_teams: {e}")
        return 0
