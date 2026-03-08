"""
TrainingHub Pro - Router de Carga Acumulada
Endpoints para consultar y recalcular carga de entrenamiento.
"""

import logging
from datetime import date

from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID

from app.models.carga import CargaJugadorResponse, CargaEquipoResponse, WellnessUpdate
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

    # Get all players with their carga data
    jugadores = (
        supabase.table("jugadores")
        .select("id, nombre, apellidos, dorsal, posicion_principal, estado")
        .eq("equipo_id", eid)
        .execute()
    )

    if not jugadores.data:
        return CargaEquipoResponse(data=[], resumen={
            "carga_media": 0,
            "jugadores_riesgo": 0,
            "wellness_medio": None,
            "total_jugadores": 0,
        })

    # Get carga rows
    carga_rows = (
        supabase.table("carga_acumulada_jugador")
        .select("*")
        .eq("equipo_id", eid)
        .execute()
    )
    carga_map = {r["jugador_id"]: r for r in (carga_rows.data or [])}

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
            wellness_valor=wellness,
            wellness_fecha=c.get("wellness_fecha"),
            updated_at=c.get("updated_at"),
            nombre=j.get("nombre"),
            apellidos=j.get("apellidos"),
            dorsal=j.get("dorsal"),
            posicion_principal=j.get("posicion_principal"),
            estado=j.get("estado"),
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
