"""Modelos Pydantic para Revisión de vídeo (packs de clips en informes)."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


AMBITOS = ("partido_post", "rival", "partido_plan")
CLIP_STATUSES = ("hot", "en_drive", "missing")
SLOT_TIPOS = ("folder", "once_jugador")


class PackGetOrCreate(BaseModel):
    equipo_id: UUID
    ambito: str
    partido_id: Optional[UUID] = None
    rival_id: Optional[UUID] = None
    microciclo_id: Optional[UUID] = None


class FolderCreate(BaseModel):
    pack_id: UUID
    nombre: str
    parent_id: Optional[UUID] = None
    fase: Optional[str] = None
    orden: Optional[int] = None


class FolderUpdate(BaseModel):
    nombre: Optional[str] = None
    parent_id: Optional[UUID] = None
    orden: Optional[int] = None
    fase: Optional[str] = None


class ClipUpdate(BaseModel):
    titulo: Optional[str] = None
    frase: Optional[str] = None
    nota: Optional[str] = None
    fase: Optional[str] = None
    jugador_id: Optional[UUID] = None
    rival_jugador_nombre: Optional[str] = None
    rival_jugador_dorsal: Optional[str] = None


class ClipLinkCreate(BaseModel):
    folder_id: Optional[UUID] = None
    slot_tipo: str = "folder"
    jugador_id: Optional[UUID] = None
    rival_jugador_nombre: Optional[str] = None
    rival_jugador_dorsal: Optional[str] = None


class SessionCreate(BaseModel):
    equipo_id: UUID
    pack_id: UUID
    clip_id: Optional[UUID] = None


class SessionStateUpdate(BaseModel):
    current_clip_id: Optional[UUID] = None
    current_time_ms: Optional[int] = None
    paused: Optional[bool] = None
    overlay_json: Optional[list[Any]] = None


class LocalSessionCreate(BaseModel):
    partido_id: UUID
    equipo_id: UUID
    filename: str
    size_bytes: Optional[int] = None
    duration_ms: Optional[int] = Field(default=None, description="Duración del fichero local en ms")
