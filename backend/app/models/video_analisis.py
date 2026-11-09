"""
Modelos Pydantic para los análisis de vídeo guardados (herramienta de vídeo).
buttons/events son snapshots JSON del code window del frontend.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class VideoAnalisisCreate(BaseModel):
    equipo_id: UUID
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: Optional[str] = None
    video_filename: Optional[str] = None
    video_fingerprint: Optional[str] = None
    video_duration_ms: Optional[int] = None
    buttons: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)


class VideoAnalisisUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=200)
    descripcion: Optional[str] = None
    video_filename: Optional[str] = None
    video_fingerprint: Optional[str] = None
    video_duration_ms: Optional[int] = None
    buttons: Optional[list[dict[str, Any]]] = None
    events: Optional[list[dict[str, Any]]] = None


class VideoAnalisisResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    created_by: Optional[UUID] = None
    nombre: str
    descripcion: Optional[str] = None
    video_filename: Optional[str] = None
    video_fingerprint: Optional[str] = None
    video_duration_ms: Optional[int] = None
    buttons: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
