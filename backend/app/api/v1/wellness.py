"""
TrainingHub Pro - Wellness Router
Endpoints for wellness registration and aggregates (separate from RPE).
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date, timedelta

from app.models.rpe import WellnessCreate, WellnessResponse, WellnessBulkItem
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


def _wellness_total(row: dict) -> int:
    """Compute wellness total from 5 fields."""
    return sum(row.get(f, 0) or 0 for f in ("sueno", "fatiga", "dolor", "estres", "humor"))


@router.post("", response_model=WellnessResponse, status_code=status.HTTP_201_CREATED)
async def create_wellness(
    data: WellnessCreate,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Create a wellness-only record (tipo='wellness', rpe=null)."""
    supabase = get_supabase()

    row = {
        "jugador_id": str(data.jugador_id),
        "fecha": data.fecha.isoformat(),
        "tipo": "wellness",
        "rpe": None,
        "sueno": data.sueno,
        "fatiga": data.fatiga,
        "dolor": data.dolor,
        "estres": data.estres,
        "humor": data.humor,
    }

    response = supabase.table("registros_rpe").insert(row).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear registro wellness"
        )

    created = response.data[0]
    created["total"] = _wellness_total(created)
    return WellnessResponse(**created)


@router.get("/equipo/{equipo_id}")
async def get_team_wellness(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Get latest wellness aggregates per player for a team."""
    supabase = get_supabase()
    eid = str(equipo_id)
    today = date.today()
    d7_ago = today - timedelta(days=7)

    # Get team players
    jugadores = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal"
    ).eq("equipo_id", eid).eq("estado", "activo").order("dorsal").execute()

    if not jugadores.data:
        return {"data": []}

    jugador_ids = [j["id"] for j in jugadores.data]
    jugador_map = {j["id"]: j for j in jugadores.data}

    # Get all wellness records for these players
    wellness_records = supabase.table("registros_rpe").select(
        "jugador_id, fecha, sueno, fatiga, dolor, estres, humor, created_at"
    ).eq("tipo", "wellness").in_(
        "jugador_id", jugador_ids
    ).order("fecha", desc=True).execute()

    # Group by player
    por_jugador: dict[str, list[dict]] = {}
    for r in wellness_records.data or []:
        jid = r["jugador_id"]
        if jid not in por_jugador:
            por_jugador[jid] = []
        por_jugador[jid].append(r)

    result = []
    for jid in jugador_ids:
        j = jugador_map[jid]
        records = por_jugador.get(jid, [])

        wellness_general_avg = None
        wellness_7d_avg = None
        wellness_last = None
        wellness_last_fecha = None
        wellness_alerta = False

        if records:
            # All-time average
            totals = [_wellness_total(r) for r in records]
            wellness_general_avg = round(sum(totals) / len(totals), 2)

            # 7-day average
            recent = [_wellness_total(r) for r in records if r["fecha"] >= d7_ago.isoformat()]
            if recent:
                wellness_7d_avg = round(sum(recent) / len(recent), 2)

            # Last entry
            last = records[0]  # Already sorted desc
            wellness_last = _wellness_total(last)
            wellness_last_fecha = last["fecha"]

            # Alert: sueño or dolor ≤ 2 in last entry
            wellness_alerta = (last.get("sueno") or 5) <= 2 or (last.get("dolor") or 5) <= 2

        result.append({
            "jugador_id": jid,
            "jugador_nombre": f"{j['nombre']} {j.get('apellidos', '')}".strip(),
            "jugador_dorsal": j.get("dorsal"),
            "posicion_principal": j.get("posicion_principal"),
            "wellness_general_avg": wellness_general_avg,
            "wellness_7d_avg": wellness_7d_avg,
            "wellness_last": wellness_last,
            "wellness_last_fecha": wellness_last_fecha,
            "wellness_alerta": wellness_alerta,
        })

    return {"data": result}


@router.get("/jugador/{jugador_id}/historial")
async def get_player_wellness_history(
    jugador_id: UUID,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    limit: int = Query(50, ge=1, le=200),
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Get wellness history for a specific player."""
    supabase = get_supabase()
    jid = str(jugador_id)

    query = supabase.table("registros_rpe").select(
        "id, jugador_id, fecha, sueno, fatiga, dolor, estres, humor, created_at"
    ).eq("tipo", "wellness").eq("jugador_id", jid)

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())
    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    query = query.order("fecha", desc=True).limit(limit)
    response = query.execute()

    data = []
    for r in response.data or []:
        r["total"] = _wellness_total(r)
        data.append(r)

    return {"data": data}


@router.get("/equipo/{equipo_id}/alertas")
async def get_team_wellness_alerts(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Get players with critical wellness values (sueño/dolor ≤ 2)."""
    supabase = get_supabase()
    eid = str(equipo_id)

    # Get team players
    jugadores = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal"
    ).eq("equipo_id", eid).eq("estado", "activo").execute()

    if not jugadores.data:
        return {"data": [], "total_alertas": 0}

    jugador_ids = [j["id"] for j in jugadores.data]
    jugador_map = {j["id"]: j for j in jugadores.data}

    # Get latest wellness per player (just fetch recent records)
    records = supabase.table("registros_rpe").select(
        "jugador_id, fecha, sueno, fatiga, dolor, estres, humor"
    ).eq("tipo", "wellness").in_(
        "jugador_id", jugador_ids
    ).order("fecha", desc=True).execute()

    # Get latest per player
    latest_per_player: dict[str, dict] = {}
    for r in records.data or []:
        jid = r["jugador_id"]
        if jid not in latest_per_player:
            latest_per_player[jid] = r

    alertas = []
    for jid, record in latest_per_player.items():
        sueno = record.get("sueno") or 5
        dolor = record.get("dolor") or 5
        if sueno <= 2 or dolor <= 2:
            j = jugador_map.get(jid, {})
            reasons = []
            if sueno <= 2:
                reasons.append(f"Sueño: {sueno}/5")
            if dolor <= 2:
                reasons.append(f"Dolor: {dolor}/5")
            alertas.append({
                "jugador_id": jid,
                "jugador_nombre": f"{j.get('nombre', '')} {j.get('apellidos', '')}".strip(),
                "jugador_dorsal": j.get("dorsal"),
                "fecha": record["fecha"],
                "total": _wellness_total(record),
                "sueno": record.get("sueno"),
                "dolor": record.get("dolor"),
                "razones": reasons,
            })

    return {"data": alertas, "total_alertas": len(alertas)}


@router.put("/{wellness_id}")
async def update_wellness(
    wellness_id: UUID,
    data: WellnessCreate,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Update an existing wellness record."""
    supabase = get_supabase()
    wid = str(wellness_id)

    # Verify record exists and is a wellness record
    existing = supabase.table("registros_rpe").select("id, tipo").eq("id", wid).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if existing.data.get("tipo") != "wellness":
        raise HTTPException(status_code=400, detail="Solo se pueden editar registros de wellness")

    update_data = {
        "fecha": data.fecha.isoformat(),
        "sueno": data.sueno,
        "fatiga": data.fatiga,
        "dolor": data.dolor,
        "estres": data.estres,
        "humor": data.humor,
    }

    response = supabase.table("registros_rpe").update(update_data).eq("id", wid).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al actualizar registro")

    updated = response.data[0]
    updated["total"] = _wellness_total(updated)
    return updated


@router.delete("/{wellness_id}", status_code=status.HTTP_200_OK)
async def delete_wellness(
    wellness_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Delete a wellness record."""
    supabase = get_supabase()
    wid = str(wellness_id)

    # Verify record exists
    existing = supabase.table("registros_rpe").select("id, tipo").eq("id", wid).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if existing.data.get("tipo") != "wellness":
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar registros de wellness")

    supabase.table("registros_rpe").delete().eq("id", wid).execute()
    return {"message": "Registro eliminado"}


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def bulk_import_wellness(
    items: list[WellnessBulkItem],
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Bulk import wellness records from parsed Excel data."""
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No items to import"
        )

    supabase = get_supabase()

    rows = []
    for item in items:
        rows.append({
            "jugador_id": str(item.jugador_id),
            "fecha": item.fecha.isoformat(),
            "tipo": "wellness",
            "rpe": None,
            "sueno": item.sueno,
            "fatiga": item.fatiga,
            "dolor": item.dolor,
            "estres": item.estres,
            "humor": item.humor,
        })

    response = supabase.table("registros_rpe").insert(rows).execute()

    return {
        "imported": len(response.data),
        "total_sent": len(items),
    }
