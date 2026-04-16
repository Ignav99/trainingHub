"""
TrainingHub Pro - Video Tags
Endpoints para gestionar tags sobre videos de partidos.
"""

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.database import get_supabase
from app.models.video_tag import (
    VideoTagBulkCreate,
    VideoTagCreate,
    VideoTagUpdate,
)
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ CREATE tag ============

@router.post("/videos/{video_id}/tags", status_code=201)
async def create_tag(
    video_id: UUID,
    data: VideoTagCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Crea un nuevo tag sobre un video."""
    supabase = get_supabase()

    # Verify video exists
    existing = (
        supabase.table("videos_partido")
        .select("id")
        .eq("id", str(video_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Video no encontrado.")

    row = {
        "video_id": str(video_id),
        "category_id": str(data.category_id),
        "start_ms": data.start_ms,
        "end_ms": data.end_ms,
        "source": data.source,
        "drawing_data": data.drawing_data,
    }

    if data.descriptor_id:
        row["descriptor_id"] = str(data.descriptor_id)
    if data.jugador_id:
        row["jugador_id"] = str(data.jugador_id)
    if data.fase:
        row["fase"] = data.fase
    if data.zona_campo:
        row["zona_campo"] = data.zona_campo
    if data.nota:
        row["nota"] = data.nota
    if data.thumbnail_data:
        row["thumbnail_data"] = data.thumbnail_data
    if data.confidence is not None:
        row["confidence"] = data.confidence

    result = supabase.table("video_tags").insert(row).execute()
    return result.data[0]


# ============ BULK CREATE tags ============

@router.post("/videos/{video_id}/tags/bulk", status_code=201)
async def create_tags_bulk(
    video_id: UUID,
    data: VideoTagBulkCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Crea múltiples tags en lote."""
    supabase = get_supabase()

    # Verify video exists
    existing = (
        supabase.table("videos_partido")
        .select("id")
        .eq("id", str(video_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Video no encontrado.")

    rows = []
    for tag in data.tags:
        row = {
            "video_id": str(video_id),
            "category_id": str(tag.category_id),
            "start_ms": tag.start_ms,
            "end_ms": tag.end_ms,
            "source": tag.source,
            "drawing_data": tag.drawing_data,
        }
        if tag.descriptor_id:
            row["descriptor_id"] = str(tag.descriptor_id)
        if tag.jugador_id:
            row["jugador_id"] = str(tag.jugador_id)
        if tag.fase:
            row["fase"] = tag.fase
        if tag.zona_campo:
            row["zona_campo"] = tag.zona_campo
        if tag.nota:
            row["nota"] = tag.nota
        if tag.thumbnail_data:
            row["thumbnail_data"] = tag.thumbnail_data
        if tag.confidence is not None:
            row["confidence"] = tag.confidence
        rows.append(row)

    if not rows:
        raise HTTPException(status_code=400, detail="No hay tags para crear.")

    result = supabase.table("video_tags").insert(rows).execute()
    return {"data": result.data or [], "count": len(result.data or [])}


# ============ LIST tags with filters ============

@router.get("/videos/{video_id}/tags")
async def list_tags(
    video_id: UUID,
    category_id: Optional[UUID] = Query(None),
    jugador_id: Optional[UUID] = Query(None),
    fase: Optional[str] = Query(None),
    start_ms: Optional[int] = Query(None, description="Filtrar tags desde este ms"),
    end_ms: Optional[int] = Query(None, description="Filtrar tags hasta este ms"),
    source: Optional[str] = Query(None),
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    """Lista tags de un video con filtros opcionales."""
    supabase = get_supabase()

    query = (
        supabase.table("video_tags")
        .select("*")
        .eq("video_id", str(video_id))
    )

    if category_id:
        query = query.eq("category_id", str(category_id))
    if jugador_id:
        query = query.eq("jugador_id", str(jugador_id))
    if fase:
        query = query.eq("fase", fase)
    if source:
        query = query.eq("source", source)
    if start_ms is not None:
        query = query.gte("start_ms", start_ms)
    if end_ms is not None:
        query = query.lte("end_ms", end_ms)

    result = query.order("start_ms", desc=False).execute()
    return {"data": result.data or []}


# ============ UPDATE tag ============

@router.put("/video-tags/{tag_id}")
async def update_tag(
    tag_id: UUID,
    data: VideoTagUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Actualiza un tag existente."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_tags")
        .select("id")
        .eq("id", str(tag_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Tag no encontrado.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    # Convert UUIDs to strings for Supabase
    for key in ("category_id", "descriptor_id", "jugador_id"):
        if key in updates and updates[key] is not None:
            updates[key] = str(updates[key])

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("video_tags")
        .update(updates)
        .eq("id", str(tag_id))
        .execute()
    )
    return result.data[0]


# ============ DELETE tag ============

@router.delete("/video-tags/{tag_id}")
async def delete_tag(
    tag_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Elimina un tag."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_tags")
        .select("id")
        .eq("id", str(tag_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Tag no encontrado.")

    supabase.table("video_tags").delete().eq("id", str(tag_id)).execute()
    return {"status": "deleted"}


# ============ EXPORT CSV ============

@router.get("/videos/{video_id}/tags/export-csv")
async def export_tags_csv(
    video_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Exporta tags de un video como CSV."""
    supabase = get_supabase()

    tags = (
        supabase.table("video_tags")
        .select("*, video_tag_categories(nombre), video_tag_descriptors(nombre), jugadores(nombre, apellidos)")
        .eq("video_id", str(video_id))
        .order("start_ms", desc=False)
        .execute()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "start_ms", "end_ms", "category", "descriptor",
        "player", "fase", "zona_campo", "nota", "source",
    ])

    for tag in (tags.data or []):
        cat_name = ""
        if tag.get("video_tag_categories"):
            cat_name = tag["video_tag_categories"].get("nombre", "")
        desc_name = ""
        if tag.get("video_tag_descriptors"):
            desc_name = tag["video_tag_descriptors"].get("nombre", "")
        player_name = ""
        if tag.get("jugadores"):
            j = tag["jugadores"]
            player_name = f"{j.get('nombre', '')} {j.get('apellidos', '')}".strip()

        writer.writerow([
            tag["start_ms"],
            tag["end_ms"],
            cat_name,
            desc_name,
            player_name,
            tag.get("fase", ""),
            tag.get("zona_campo", ""),
            tag.get("nota", ""),
            tag.get("source", ""),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tags_{video_id}.csv"},
    )
