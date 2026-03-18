"""
TrainingHub Pro - Router de Carga Acumulada
Endpoints para consultar y recalcular carga de entrenamiento.
"""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import UUID

from app.models.carga import (
    CargaJugadorResponse,
    CargaEquipoResponse,
    CargaHistorialResponse,
    CargaDiariaResponse,
    CargaSemanalEquipoResponse,
    CargaSemanalJugador,
    WellnessUpdate,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.load_calculation_service import recalculate_team_load, recalculate_player_load

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/equipo/{equipo_id}", response_model=CargaEquipoResponse)
async def get_carga_equipo(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Get accumulated load for all players in a team."""
    supabase = get_supabase()
    eid = str(equipo_id)

    # Get all players with their carga data (exclude invitados)
    jugadores = (
        supabase.table("jugadores")
        .select("id, nombre, apellidos, dorsal, posicion_principal, estado")
        .eq("equipo_id", eid)
        .neq("es_invitado", True)
        .execute()
    )

    if not jugadores.data:
        return CargaEquipoResponse(data=[], resumen={
            "carga_media": 0,
            "jugadores_riesgo": 0,
            "wellness_medio": None,
            "total_jugadores": 0,
        })

    # Get carga rows (read-only, no auto-recalc — use POST /recalcular for that)
    carga_rows = (
        supabase.table("carga_acumulada_jugador")
        .select("*")
        .eq("equipo_id", eid)
        .execute()
    )

    carga_map = {r["jugador_id"]: r for r in (carga_rows.data or [])}

    # Aggregate tarjetas from convocatorias
    jugador_ids = [j["id"] for j in jugadores.data]
    tarjetas_map: dict[str, dict] = {}
    try:
        convs = (
            supabase.table("convocatorias")
            .select("jugador_id, tarjeta_amarilla, tarjeta_roja")
            .in_("jugador_id", jugador_ids)
            .execute()
        )
        for c in convs.data or []:
            jid = c["jugador_id"]
            if jid not in tarjetas_map:
                tarjetas_map[jid] = {"amarillas": 0, "rojas": 0}
            if c.get("tarjeta_amarilla"):
                tarjetas_map[jid]["amarillas"] += 1
            if c.get("tarjeta_roja"):
                tarjetas_map[jid]["rojas"] += 1
    except Exception as e:
        logger.warning(f"Error fetching tarjetas for team {eid}: {e}")

    data = []
    total_carga = 0
    jugadores_riesgo = 0
    wellness_sum = 0
    wellness_count = 0

    for j in jugadores.data:
        c = carga_map.get(j["id"], {})
        nivel = c.get("nivel_carga", "optimo")
        carga_aguda = float(c.get("carga_aguda", 0) or 0)
        wellness = c.get("wellness_valor")

        tarjetas = tarjetas_map.get(j["id"], {})
        item = CargaJugadorResponse(
            jugador_id=j["id"],
            equipo_id=eid,
            carga_aguda=carga_aguda,
            carga_cronica=float(c.get("carga_cronica", 0) or 0),
            ratio_acwr=float(c["ratio_acwr"]) if c.get("ratio_acwr") is not None else None,
            nivel_carga=nivel,
            ultima_carga=float(c.get("ultima_carga", 0) or 0),
            ultima_actividad_fecha=c.get("ultima_actividad_fecha"),
            dias_sin_actividad=c.get("dias_sin_actividad", 0),
            monotonia=float(c["monotonia"]) if c.get("monotonia") is not None else None,
            strain=float(c["strain"]) if c.get("strain") is not None else None,
            wellness_valor=wellness,
            wellness_fecha=c.get("wellness_fecha"),
            updated_at=c.get("updated_at"),
            nombre=j.get("nombre"),
            apellidos=j.get("apellidos"),
            dorsal=j.get("dorsal"),
            posicion_principal=j.get("posicion_principal"),
            estado=j.get("estado"),
            tarjetas_amarillas=tarjetas.get("amarillas", 0),
            tarjetas_rojas=tarjetas.get("rojas", 0),
        )
        data.append(item)

        total_carga += carga_aguda
        if nivel in ("alto", "critico"):
            jugadores_riesgo += 1
        if wellness is not None:
            wellness_sum += wellness
            wellness_count += 1

    # Sort by carga_aguda desc, criticos first
    nivel_order = {"critico": 0, "alto": 1, "optimo": 2, "bajo": 3}
    data.sort(key=lambda x: (nivel_order.get(x.nivel_carga, 2), -x.carga_aguda))

    n = len(data)
    resumen = {
        "carga_media": round(total_carga / n, 1) if n > 0 else 0,
        "jugadores_riesgo": jugadores_riesgo,
        "wellness_medio": round(wellness_sum / wellness_count, 1) if wellness_count > 0 else None,
        "total_jugadores": n,
    }

    return CargaEquipoResponse(data=data, resumen=resumen)


@router.get("/jugador/{jugador_id}/historial", response_model=CargaHistorialResponse)
async def get_historial_jugador(
    jugador_id: UUID,
    dias: int = Query(default=28, ge=7, le=56),
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Get daily load history for a player."""
    supabase = get_supabase()
    jid = str(jugador_id)
    since = (date.today() - timedelta(days=dias)).isoformat()

    # Fetch player info
    jug_resp = supabase.table("jugadores").select("nombre, apellidos").eq("id", jid).limit(1).execute()
    jug = jug_resp.data[0] if jug_resp.data else {}

    # Fetch daily rows
    rows = (
        supabase.table("carga_diaria_jugador")
        .select("fecha, load_sesion, load_partido, load_manual, load_total, ewma_acute, ewma_chronic, acwr, monotonia, strain")
        .eq("jugador_id", jid)
        .gte("fecha", since)
        .order("fecha")
        .execute()
    )

    data = []
    for r in (rows.data or []):
        data.append(CargaDiariaResponse(
            fecha=r["fecha"],
            load_sesion=float(r.get("load_sesion") or 0),
            load_partido=float(r.get("load_partido") or 0),
            load_manual=float(r.get("load_manual") or 0),
            load_total=float(r.get("load_total") or 0),
            ewma_acute=float(r.get("ewma_acute") or 0),
            ewma_chronic=float(r.get("ewma_chronic") or 0),
            acwr=float(r["acwr"]) if r.get("acwr") is not None else None,
            monotonia=float(r["monotonia"]) if r.get("monotonia") is not None else None,
            strain=float(r["strain"]) if r.get("strain") is not None else None,
        ))

    return CargaHistorialResponse(
        jugador_id=jugador_id,
        nombre=jug.get("nombre"),
        apellidos=jug.get("apellidos"),
        data=data,
    )


@router.get("/equipo/{equipo_id}/semanal", response_model=CargaSemanalEquipoResponse)
async def get_semanal_equipo(
    equipo_id: UUID,
    semanas: int = Query(default=4, ge=1, le=8),
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Get weekly load summary for all players in a team."""
    supabase = get_supabase()
    eid = str(equipo_id)
    since = (date.today() - timedelta(weeks=semanas)).isoformat()

    # Fetch players
    jugadores = (
        supabase.table("jugadores")
        .select("id, nombre, apellidos, dorsal")
        .eq("equipo_id", eid)
        .execute()
    )
    jug_map = {j["id"]: j for j in (jugadores.data or [])}

    # Fetch daily rows for entire team
    rows = (
        supabase.table("carga_diaria_jugador")
        .select("jugador_id, fecha, load_sesion, load_partido, load_manual, load_total")
        .eq("equipo_id", eid)
        .gte("fecha", since)
        .order("fecha")
        .execute()
    )

    # Group by player → ISO week
    player_weeks: dict[str, dict[str, dict]] = defaultdict(lambda: defaultdict(lambda: {
        "load_sesion": 0.0, "load_partido": 0.0, "load_manual": 0.0, "load_total": 0.0,
    }))

    for r in (rows.data or []):
        jid = r["jugador_id"]
        d = date.fromisoformat(r["fecha"])
        iso_year, iso_week, _ = d.isocalendar()
        week_key = f"{iso_year}-W{iso_week:02d}"
        pw = player_weeks[jid][week_key]
        pw["load_sesion"] += float(r.get("load_sesion") or 0)
        pw["load_partido"] += float(r.get("load_partido") or 0)
        pw["load_manual"] += float(r.get("load_manual") or 0)
        pw["load_total"] += float(r.get("load_total") or 0)

    data = []
    for jid, jug in jug_map.items():
        weeks = player_weeks.get(jid, {})
        semanas_list = []
        for wk in sorted(weeks.keys()):
            w = weeks[wk]
            semanas_list.append({
                "semana": wk,
                "load_sesion": round(w["load_sesion"], 1),
                "load_partido": round(w["load_partido"], 1),
                "load_manual": round(w["load_manual"], 1),
                "load_total": round(w["load_total"], 1),
            })
        data.append(CargaSemanalJugador(
            jugador_id=jid,
            nombre=jug.get("nombre"),
            apellidos=jug.get("apellidos"),
            dorsal=jug.get("dorsal"),
            semanas=semanas_list,
        ))

    return CargaSemanalEquipoResponse(data=data)


@router.put("/wellness/{jugador_id}")
async def update_wellness(
    jugador_id: UUID,
    body: WellnessUpdate,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Save wellness value (1-10) for a player."""
    supabase = get_supabase()
    jid = str(jugador_id)

    # Get player's equipo_id
    jugador = (
        supabase.table("jugadores")
        .select("equipo_id")
        .eq("id", jid)
        .single()
        .execute()
    )
    if not jugador.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    row = {
        "jugador_id": jid,
        "equipo_id": jugador.data["equipo_id"],
        "wellness_valor": body.wellness_valor,
        "wellness_fecha": date.today().isoformat(),
    }

    supabase.table("carga_acumulada_jugador").upsert(
        row, on_conflict="jugador_id"
    ).execute()

    return {"ok": True, "wellness_valor": body.wellness_valor}


@router.post("/recalcular/{equipo_id}")
async def recalcular_carga(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Force recalculation of load for all players in a team."""
    results = recalculate_team_load(equipo_id)
    return {"ok": True, "recalculated": len(results)}
