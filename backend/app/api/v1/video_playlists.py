"""
TrainingHub Pro - Video Playlists
Endpoints para gestionar playlists de clips/tags de video.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_supabase
from app.models.video_playlist import (
    VideoPlaylistCreate,
    VideoPlaylistItemCreate,
    VideoPlaylistUpdate,
)
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ LIST playlists ============

@router.get("/equipos/{equipo_id}/video-playlists")
async def list_playlists(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    """Lista playlists de un equipo."""
    supabase = get_supabase()

    result = (
        supabase.table("video_playlists")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


# ============ GET playlist with items ============

@router.get("/video-playlists/{playlist_id}")
async def get_playlist(
    playlist_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    """Obtiene una playlist con sus items y tags asociados."""
    supabase = get_supabase()

    playlist = (
        supabase.table("video_playlists")
        .select("*")
        .eq("id", str(playlist_id))
        .limit(1)
        .execute()
    )
    if not playlist.data:
        raise HTTPException(status_code=404, detail="Playlist no encontrada.")

    items = (
        supabase.table("video_playlist_items")
        .select("*, video_tags(*)")
        .eq("playlist_id", str(playlist_id))
        .order("orden", desc=False)
        .execute()
    )

    result = playlist.data[0]
    result["items"] = items.data or []
    return result


# ============ CREATE playlist ============

@router.post("/equipos/{equipo_id}/video-playlists", status_code=201)
async def create_playlist(
    equipo_id: UUID,
    data: VideoPlaylistCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Crea una nueva playlist."""
    supabase = get_supabase()

    row = {
        "equipo_id": str(equipo_id),
        "nombre": data.nombre,
        "descripcion": data.descripcion,
        "created_by": auth.user_id,
    }

    result = supabase.table("video_playlists").insert(row).execute()
    return result.data[0]


# ============ UPDATE playlist ============

@router.put("/video-playlists/{playlist_id}")
async def update_playlist(
    playlist_id: UUID,
    data: VideoPlaylistUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Actualiza una playlist."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_playlists")
        .select("id")
        .eq("id", str(playlist_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Playlist no encontrada.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("video_playlists")
        .update(updates)
        .eq("id", str(playlist_id))
        .execute()
    )
    return result.data[0]


# ============ DELETE playlist ============

@router.delete("/video-playlists/{playlist_id}")
async def delete_playlist(
    playlist_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Elimina una playlist (cascadea items)."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_playlists")
        .select("id")
        .eq("id", str(playlist_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Playlist no encontrada.")

    supabase.table("video_playlists").delete().eq("id", str(playlist_id)).execute()
    return {"status": "deleted"}


# ============ ADD item to playlist ============

@router.post("/video-playlists/{playlist_id}/items", status_code=201)
async def add_playlist_item(
    playlist_id: UUID,
    data: VideoPlaylistItemCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Añade un tag a la playlist."""
    supabase = get_supabase()

    # Verify playlist exists
    existing = (
        supabase.table("video_playlists")
        .select("id")
        .eq("id", str(playlist_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Playlist no encontrada.")

    row = {
        "playlist_id": str(playlist_id),
        "tag_id": str(data.tag_id),
        "orden": data.orden,
    }

    result = supabase.table("video_playlist_items").insert(row).execute()
    return result.data[0]


# ============ REMOVE item from playlist ============

@router.delete("/video-playlist-items/{item_id}")
async def remove_playlist_item(
    item_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Elimina un item de la playlist."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_playlist_items")
        .select("id")
        .eq("id", str(item_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Item no encontrado.")

    supabase.table("video_playlist_items").delete().eq("id", str(item_id)).execute()
    return {"status": "deleted"}


# ============ REORDER playlist items ============

@router.put("/video-playlists/{playlist_id}/reorder")
async def reorder_playlist_items(
    playlist_id: UUID,
    items: list[dict],
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Reordena items de la playlist. Espera [{"id": "...", "orden": 0}, ...]"""
    supabase = get_supabase()

    for item in items:
        supabase.table("video_playlist_items").update(
            {"orden": item["orden"]}
        ).eq("id", item["id"]).eq("playlist_id", str(playlist_id)).execute()

    return {"status": "reordered", "count": len(items)}
