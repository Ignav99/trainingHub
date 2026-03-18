"""
TrainingHub Pro - Video Anotacion Models
Modelos para anotaciones sobre videos de partidos.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class VideoAnotacionCreate(BaseModel):
    video_id: UUID
    equipo_id: UUID
    timestamp_seconds: float = 0
    titulo: str
    descripcion: Optional[str] = None
    drawing_data: list = []
    thumbnail_data: Optional[str] = None
    orden: int = 0


class VideoAnotacionUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    timestamp_seconds: Optional[float] = None
    drawing_data: Optional[list] = None
    thumbnail_data: Optional[str] = None
    orden: Optional[int] = None


class VideoAnotacionResponse(BaseModel):
    id: UUID
    video_id: UUID
    equipo_id: UUID
    timestamp_seconds: float
    titulo: str
    descripcion: Optional[str] = None
    drawing_data: list
    thumbnail_data: Optional[str] = None
    orden: int
    created_at: datetime
    updated_at: datetime
