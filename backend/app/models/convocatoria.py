"""
TrainingHub Pro - Modelos de Convocatoria
Gestión de convocatorias y estadísticas de partido.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID


# ============ Convocatoria ============

class ConvocatoriaBase(BaseModel):
    """Schema base de convocatoria."""
    partido_id: UUID
    jugador_id: UUID
    titular: bool = False
    posicion_asignada: Optional[str] = Field(None, max_length=50)
    dorsal: Optional[int] = Field(None, ge=1, le=99)
    minutos_jugados: int = Field(default=0, ge=0)
    goles: int = Field(default=0, ge=0)
    asistencias: int = Field(default=0, ge=0)
    tarjeta_amarilla: bool = False
    tarjeta_roja: bool = False
    notas: Optional[str] = None


class ConvocatoriaCreate(ConvocatoriaBase):
    """Schema para crear convocatoria."""
    pass


class ConvocatoriaUpdate(BaseModel):
    """Schema para actualizar convocatoria."""
    titular: Optional[bool] = None
    posicion_asignada: Optional[str] = Field(None, max_length=50)
    dorsal: Optional[int] = Field(None, ge=1, le=99)
    minutos_jugados: Optional[int] = Field(None, ge=0)
    goles: Optional[int] = Field(None, ge=0)
    asistencias: Optional[int] = Field(None, ge=0)
    tarjeta_amarilla: Optional[bool] = None
    tarjeta_roja: Optional[bool] = None
    notas: Optional[str] = None


class ConvocatoriaResponse(ConvocatoriaBase):
    """Schema de respuesta de convocatoria."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    jugadores: Optional[dict] = None  # Join data from Supabase

    class Config:
        from_attributes = True


class ConvocatoriaListResponse(BaseModel):
    """Respuesta paginada de convocatorias."""
    data: List[ConvocatoriaResponse]
    total: int
    page: int
    limit: int
    pages: int
