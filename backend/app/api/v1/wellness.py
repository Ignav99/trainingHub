"""
TrainingHub Pro - Wellness Router
Endpoints for wellness registration and aggregates (separate from RPE).
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date, timedelta
import logging

from app.models.rpe import WellnessCreate, WellnessResponse, WellnessBulkItem
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.load_calculation_service import recalculate_player_load
from app.services.wellness_write import (
    build_wellness_row,
    note_extra_column_error,
    retry_wellness_write,
    wellness_select,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _wellness_total(row: dict) -> int:
    """Compute wellness total from 5 fields."""
    return sum(row.get(f, 0) or 0 for f in ("sueno", "fatiga", "dolor", "estres", "humor"))


def _run_wellness_query(build_query):
    """Ejecuta un select; si faltan columnas nuevas, reintenta sin ellas."""
    try:
        return build_query(wellness_select()).execute()
    except Exception as e:
        if not note_extra_column_error(e):
            raise
        logger.warning("Wellness select sin columnas extra: %s", e)
        return build_query(wellness_select()).execute()


def _alerta_desde(row: dict) -> bool:
    if (row.get("sueno") or 5) <= 2 or (row.get("dolor") or 5) <= 2:
        return True
    return bool(row.get("molestia"))


def _recalc_jugador(jugador_id: str):
    try:
        supabase = get_supabase()
        jug = supabase.table("jugadores").select("equipo_id").eq(
            "id", jugador_id
        ).single().execute()
        if jug.data:
            recalculate_player_load(UUID(jugador_id), UUID(jug.data["equipo_id"]))
    except Exception as e:
        logger.error("Error in wellness auto-recalc for %s: %s", jugador_id, e)


@router.post("", response_model=WellnessResponse, status_code=status.HTTP_201_CREATED)
async def create_wellness(
    data: WellnessCreate,
    bg: BackgroundTasks,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Create a wellness-only record (tipo='wellness', rpe=null)."""
    supabase = get_supabase()

    row = build_wellness_row(
        jugador_id=str(data.jugador_id),
        fecha=data.fecha.isoformat(),
        sueno=data.sueno,
        fatiga=data.fatiga,
        dolor=data.dolor,
        estres=data.estres,
        humor=data.humor,
        horas_sueno=data.horas_sueno,
        molestia=data.molestia,
        molestia_texto=data.molestia_texto,
        notas=data.notas,
    )

    response = retry_wellness_write(
        lambda payload: supabase.table("registros_rpe").insert(payload).execute(),
        row,
        op="insert",
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear registro wellness"
        )

    created = response.data[0]
    created["total"] = _wellness_total(created)
    bg.add_task(_recalc_jugador, str(data.jugador_id))
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

    # Get team players (plantilla + filial + prueba; no invitados)
    from app.services.jugador_tipo import incluye_tracking_carga

    jugadores = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, tipo_jugador, es_invitado"
    ).eq("equipo_id", eid).eq("estado", "activo").order("dorsal").execute()

    jugadores_data = [j for j in (jugadores.data or []) if incluye_tracking_carga(j)]

    if not jugadores_data:
        return {"data": []}

    jugador_ids = [j["id"] for j in jugadores_data]
    jugador_map = {j["id"]: j for j in jugadores_data}

    # Get all wellness records for these players
    wellness_records = _run_wellness_query(
        lambda cols: supabase.table("registros_rpe").select(cols).eq(
            "tipo", "wellness"
        ).in_(
            "jugador_id", jugador_ids
        ).order("fecha", desc=True)
    )

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
            wellness_alerta = _alerta_desde(last)

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

    def _hist(cols: str):
        query = supabase.table("registros_rpe").select(cols).eq(
            "tipo", "wellness"
        ).eq("jugador_id", jid)
        if fecha_desde:
            query = query.gte("fecha", fecha_desde.isoformat())
        if fecha_hasta:
            query = query.lte("fecha", fecha_hasta.isoformat())
        return query.order("fecha", desc=True).limit(limit)

    response = _run_wellness_query(_hist)

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

    from app.services.jugador_tipo import incluye_tracking_carga

    jugadores = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, tipo_jugador, es_invitado"
    ).eq("equipo_id", eid).eq("estado", "activo").execute()

    jugadores_data = [j for j in (jugadores.data or []) if incluye_tracking_carga(j)]

    if not jugadores_data:
        return {"data": [], "total_alertas": 0}

    jugador_ids = [j["id"] for j in jugadores_data]
    jugador_map = {j["id"]: j for j in jugadores_data}

    # Get latest wellness per player (just fetch recent records)
    records = _run_wellness_query(
        lambda cols: supabase.table("registros_rpe").select(cols).eq(
            "tipo", "wellness"
        ).in_(
            "jugador_id", jugador_ids
        ).order("fecha", desc=True)
    )

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
        molestia = bool(record.get("molestia"))
        if sueno <= 2 or dolor <= 2 or molestia:
            j = jugador_map.get(jid, {})
            reasons = []
            if sueno <= 2:
                reasons.append(f"Sueño: {sueno}/5")
            if dolor <= 2:
                reasons.append(f"Dolor: {dolor}/5")
            if molestia:
                extra = (record.get("molestia_texto") or "").strip()
                reasons.append(f"Molestia: {extra}" if extra else "Molestia")
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
    bg: BackgroundTasks,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Update an existing wellness record."""
    supabase = get_supabase()
    wid = str(wellness_id)

    # Verify record exists and is a wellness record
    existing = supabase.table("registros_rpe").select("id, tipo, jugador_id").eq("id", wid).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if existing.data.get("tipo") != "wellness":
        raise HTTPException(status_code=400, detail="Solo se pueden editar registros de wellness")

    update_data = build_wellness_row(
        jugador_id=str(existing.data.get("jugador_id") or data.jugador_id),
        fecha=data.fecha.isoformat(),
        sueno=data.sueno,
        fatiga=data.fatiga,
        dolor=data.dolor,
        estres=data.estres,
        humor=data.humor,
        horas_sueno=data.horas_sueno,
        molestia=data.molestia,
        molestia_texto=data.molestia_texto,
        notas=data.notas,
    )
    update_data.pop("tipo", None)
    update_data.pop("rpe", None)
    update_data.pop("jugador_id", None)

    retry_wellness_write(
        lambda payload: supabase.table("registros_rpe").update(payload).eq("id", wid).execute(),
        update_data,
        op="update",
    )
    response = supabase.table("registros_rpe").select("*").eq("id", wid).single().execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al actualizar registro")

    updated = response.data
    updated["total"] = _wellness_total(updated)
    if existing.data.get("jugador_id"):
        bg.add_task(_recalc_jugador, existing.data["jugador_id"])
    return updated


@router.delete("/{wellness_id}", status_code=status.HTTP_200_OK)
async def delete_wellness(
    wellness_id: UUID,
    bg: BackgroundTasks,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Delete a wellness record."""
    supabase = get_supabase()
    wid = str(wellness_id)

    # Verify record exists
    existing = supabase.table("registros_rpe").select("id, tipo, jugador_id").eq("id", wid).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if existing.data.get("tipo") != "wellness":
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar registros de wellness")

    jugador_id = existing.data.get("jugador_id")
    supabase.table("registros_rpe").delete().eq("id", wid).execute()
    if jugador_id:
        bg.add_task(_recalc_jugador, jugador_id)
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

    rows = [
        build_wellness_row(
            jugador_id=str(item.jugador_id),
            fecha=item.fecha.isoformat(),
            sueno=item.sueno,
            fatiga=item.fatiga,
            dolor=item.dolor,
            estres=item.estres,
            humor=item.humor,
            horas_sueno=item.horas_sueno,
            molestia=item.molestia,
            molestia_texto=item.molestia_texto,
            notas=item.notas,
        )
        for item in items
    ]

    response = retry_wellness_write(
        lambda payload: supabase.table("registros_rpe").insert(payload).execute(),
        rows,
        op="bulk-insert",
    )

    return {
        "imported": len(response.data),
        "total_sent": len(items),
    }
