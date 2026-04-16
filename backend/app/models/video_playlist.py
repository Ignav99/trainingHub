"""
TrainingHub Pro - Video Playlist Models
Modelos para playlists de clips/tags de video.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ============ Playlists ============

class VideoPlaylistCreate(BaseModel):
    equipo_id: UUID
    nombre: str
    descripcion: Optional[str] = None


class VideoPlaylistUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class VideoPlaylistResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    nombre: str
    descripcion: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime


# ============ Playlist Items ============

class VideoPlaylistItemCreate(BaseModel):
    tag_id: UUID
    orden: int = 0


class VideoPlaylistItemResponse(BaseModel):
    id: UUID
    playlist_id: UUID
    tag_id: UUID
    orden: int
    created_at: datetime
