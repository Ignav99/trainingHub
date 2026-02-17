"""
TrainingHub Pro - Modelos de Microciclo
Planificación semanal de entrenamiento.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class EstadoMicrociclo(str, Enum):
    """Estados posibles de un microciclo."""
    BORRADOR = "borrador"
    PLANIFICADO = "planificado"
    EN_CURSO = "en_curso"
    COMPLETADO = "completado"


# ============ Microciclo ============

class MicrocicloBase(BaseModel):
    """Schema base de microciclo."""
    equipo_id: UUID
    fecha_inicio: date
    fecha_fin: date
    partido_id: Optional[UUID] = None
    objetivo_principal: Optional[str] = None
    objetivo_tactico: Optional[str] = None
    objetivo_fisico: Optional[str] = None
    estado: EstadoMicrociclo = EstadoMicrociclo.BORRADOR
    notas: Optional[str] = None


class MicrocicloCreate(MicrocicloBase):
    """Schema para crear microciclo."""
    pass


class MicrocicloUpdate(BaseModel):
    """Schema para actualizar microciclo."""
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    partido_id: Optional[UUID] = None
    objetivo_principal: Optional[str] = None
    objetivo_tactico: Optional[str] = None
    objetivo_fisico: Optional[str] = None
    estado: Optional[EstadoMicrociclo] = None
    notas: Optional[str] = None


class MicrocicloResponse(MicrocicloBase):
    """Schema de respuesta de microciclo."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MicrocicloListResponse(BaseModel):
    """Respuesta paginada de microciclos."""
    data: List[MicrocicloResponse]
    total: int
    page: int
    limit: int
    pages: int
