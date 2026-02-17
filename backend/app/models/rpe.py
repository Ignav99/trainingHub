"""
TrainingHub Pro - Modelos de RPE (Rating of Perceived Exertion)
Registro de carga percibida y wellness de jugadores.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# ============ RPE ============

class RPEBase(BaseModel):
    """Schema base de registro RPE."""
    jugador_id: UUID
    sesion_id: Optional[UUID] = None
    fecha: date = Field(default_factory=date.today)
    rpe: int = Field(..., ge=1, le=10)
    duracion_percibida: Optional[int] = Field(None, ge=0, description="Minutos percibidos")
    sueno: Optional[int] = Field(None, ge=1, le=5)
    fatiga: Optional[int] = Field(None, ge=1, le=5)
    dolor: Optional[int] = Field(None, ge=1, le=5)
    estres: Optional[int] = Field(None, ge=1, le=5)
    humor: Optional[int] = Field(None, ge=1, le=5)
    notas: Optional[str] = None


class RPECreate(RPEBase):
    """Schema para crear registro RPE."""
    pass


class RPEResponse(RPEBase):
    """Schema de respuesta de registro RPE."""
    id: UUID
    carga_sesion: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RPEListResponse(BaseModel):
    """Respuesta paginada de registros RPE."""
    data: List[RPEResponse]
    total: int
    page: int
    limit: int
    pages: int
