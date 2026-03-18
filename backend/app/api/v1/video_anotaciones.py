"""
TrainingHub Pro - Video Anotaciones
Endpoints para gestionar anotaciones sobre videos de partidos.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_supabase
from app.models.video_anotacion import (
    VideoAnotacionCreate,
    VideoAnotacionResponse,
    VideoAnotacionUpdate,
)
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ LIST by partido ============

@router.get("/partido/{partido_id}")
async def list_anotaciones(
    partido_id: UUID,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Lista anotaciones de un partido, ordenadas por timestamp."""
    supabase = get_supabase()

    result = (
        supabase.table("video_anotaciones")
        .select("*")
        .eq("partido_id", str(partido_id))
        .eq("equipo_id", str(equipo_id))
        .order("timestamp_seconds", desc=False)
        .execute()
    )
    return {"data": result.data or []}


# ============ CREATE ============

@router.post("/", status_code=201)
async def create_anotacion(
    data: VideoAnotacionCreate,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Crea una nueva anotación sobre un video."""
    supabase = get_supabase()

    # Verify partido exists and belongs to team
    existing = (
        supabase.table("partidos")
        .select("id")
        .eq("id", str(data.partido_id))
        .eq("equipo_id", str(data.equipo_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Partido no encontrado.")

    row = {
        "partido_id": str(data.partido_id),
        "equipo_id": str(data.equipo_id),
        "timestamp_seconds": data.timestamp_seconds,
        "titulo": data.titulo,
        "descripcion": data.descripcion,
        "drawing_data": data.drawing_data,
        "thumbnail_data": data.thumbnail_data,
        "orden": data.orden,
    }
    if data.video_id:
        row["video_id"] = str(data.video_id)

    result = supabase.table("video_anotaciones").insert(row).execute()
    return result.data[0]


# ============ UPDATE ============

@router.put("/{anotacion_id}")
async def update_anotacion(
    anotacion_id: UUID,
    data: VideoAnotacionUpdate,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Actualiza una anotación existente."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_anotaciones")
        .select("id")
        .eq("id", str(anotacion_id))
        .eq("equipo_id", str(equipo_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Anotación no encontrada.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("video_anotaciones")
        .update(updates)
        .eq("id", str(anotacion_id))
        .execute()
    )
    return result.data[0]


# ============ DELETE ============

@router.delete("/{anotacion_id}")
async def delete_anotacion(
    anotacion_id: UUID,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Elimina una anotación."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_anotaciones")
        .select("id")
        .eq("id", str(anotacion_id))
        .eq("equipo_id", str(equipo_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Anotación no encontrada.")

    supabase.table("video_anotaciones").delete().eq("id", str(anotacion_id)).execute()
    return {"status": "deleted"}
