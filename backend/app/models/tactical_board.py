"""
Modelos Pydantic para el sistema de Pizarra Táctica.
Incluye TacticalBoard y TacticalBoardFrame con sus variantes Create/Update/Response.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ============ TacticalBoard ============

class TacticalBoardCreate(BaseModel):
    equipo_id: UUID
    nombre: str
    descripcion: Optional[str] = None
    tipo: str = "static"
    pitch_type: str = "full"
    home_team: Optional[list] = None
    away_team: Optional[list] = None
    elements: Optional[list] = None
    arrows: Optional[list] = None
    zones: Optional[list] = None
    thumbnail_data: Optional[str] = None
    tags: Optional[list[str]] = None


class TacticalBoardUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    pitch_type: Optional[str] = None
    home_team: Optional[list] = None
    away_team: Optional[list] = None
    elements: Optional[list] = None
    arrows: Optional[list] = None
    zones: Optional[list] = None
    thumbnail_data: Optional[str] = None
    tags: Optional[list[str]] = None


class TacticalBoardResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    created_by: Optional[UUID] = None
    nombre: str
    descripcion: Optional[str] = None
    tipo: str
    pitch_type: str
    home_team: Optional[list] = None
    away_team: Optional[list] = None
    elements: Optional[list] = None
    arrows: Optional[list] = None
    zones: Optional[list] = None
    thumbnail_data: Optional[str] = None
    tags: Optional[list[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============ TacticalBoardFrame ============

class TacticalBoardFrameCreate(BaseModel):
    orden: int = 0
    nombre: Optional[str] = None
    duration_ms: int = 2000
    elements: Optional[list] = None
    arrows: Optional[list] = None
    zones: Optional[list] = None
    transition_type: str = "linear"
    notes: Optional[str] = None


class TacticalBoardFrameUpdate(BaseModel):
    orden: Optional[int] = None
    nombre: Optional[str] = None
    duration_ms: Optional[int] = None
    elements: Optional[list] = None
    arrows: Optional[list] = None
    zones: Optional[list] = None
    transition_type: Optional[str] = None
    notes: Optional[str] = None


class TacticalBoardFrameResponse(BaseModel):
    id: UUID
    board_id: UUID
    orden: int
    nombre: Optional[str] = None
    duration_ms: int
    elements: Optional[list] = None
    arrows: Optional[list] = None
    zones: Optional[list] = None
    transition_type: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class TacticalBoardFrameReorder(BaseModel):
    frame_ids: list[UUID]
