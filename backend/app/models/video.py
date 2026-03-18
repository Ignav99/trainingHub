"""
TrainingHub Pro - Video Models
Modelos para videos de partidos (Veo, enlaces externos, uploads).
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class VideoPartidoCreate(BaseModel):
    partido_id: UUID
    equipo_id: UUID
    tipo: str  # 'veo' | 'enlace_externo' | 'upload'
    contexto: str  # 'pre_partido' | 'post_partido'
    titulo: str
    descripcion: Optional[str] = None
    url: Optional[str] = None  # Required for veo/enlace_externo, set by upload endpoint


class VideoPartidoUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    url: Optional[str] = None


class VideoPartidoResponse(BaseModel):
    id: UUID
    partido_id: UUID
    equipo_id: UUID
    tipo: str
    contexto: str
    titulo: str
    descripcion: Optional[str] = None
    url: str
    storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
