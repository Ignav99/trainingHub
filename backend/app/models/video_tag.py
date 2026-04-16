"""
TrainingHub Pro - Video Tag Models
Modelos para categorías de tags, descriptores y tags sobre videos.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ============ Tag Categories ============

class VideoTagCategoryCreate(BaseModel):
    equipo_id: UUID
    nombre: str
    color: str = "#3B82F6"
    shortcut_key: Optional[str] = None
    fase: Optional[str] = None
    default_duration_secs: int = 10
    orden: int = 0


class VideoTagCategoryUpdate(BaseModel):
    nombre: Optional[str] = None
    color: Optional[str] = None
    shortcut_key: Optional[str] = None
    fase: Optional[str] = None
    default_duration_secs: Optional[int] = None
    orden: Optional[int] = None


class VideoTagCategoryResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    nombre: str
    color: str
    shortcut_key: Optional[str] = None
    fase: Optional[str] = None
    default_duration_secs: int
    orden: int
    created_at: datetime
    updated_at: datetime


# ============ Tag Descriptors ============

class VideoTagDescriptorCreate(BaseModel):
    category_id: UUID
    nombre: str
    color: Optional[str] = None
    shortcut_key: Optional[str] = None
    orden: int = 0


class VideoTagDescriptorUpdate(BaseModel):
    nombre: Optional[str] = None
    color: Optional[str] = None
    shortcut_key: Optional[str] = None
    orden: Optional[int] = None


class VideoTagDescriptorResponse(BaseModel):
    id: UUID
    category_id: UUID
    nombre: str
    color: Optional[str] = None
    shortcut_key: Optional[str] = None
    orden: int
    created_at: datetime


# ============ Tags ============

class VideoTagCreate(BaseModel):
    video_id: UUID
    category_id: UUID
    descriptor_id: Optional[UUID] = None
    jugador_id: Optional[UUID] = None
    start_ms: int
    end_ms: int
    fase: Optional[str] = None
    zona_campo: Optional[str] = None
    nota: Optional[str] = None
    drawing_data: list = []
    thumbnail_data: Optional[str] = None
    source: str = "manual"
    confidence: Optional[float] = None


class VideoTagBulkCreate(BaseModel):
    tags: list[VideoTagCreate]


class VideoTagUpdate(BaseModel):
    category_id: Optional[UUID] = None
    descriptor_id: Optional[UUID] = None
    jugador_id: Optional[UUID] = None
    start_ms: Optional[int] = None
    end_ms: Optional[int] = None
    fase: Optional[str] = None
    zona_campo: Optional[str] = None
    nota: Optional[str] = None
    drawing_data: Optional[list] = None
    thumbnail_data: Optional[str] = None


class VideoTagResponse(BaseModel):
    id: UUID
    video_id: UUID
    category_id: UUID
    descriptor_id: Optional[UUID] = None
    jugador_id: Optional[UUID] = None
    start_ms: int
    end_ms: int
    fase: Optional[str] = None
    zona_campo: Optional[str] = None
    nota: Optional[str] = None
    drawing_data: list
    thumbnail_data: Optional[str] = None
    source: str
    confidence: Optional[float] = None
    created_at: datetime
    updated_at: datetime
