"""
TrainingHub Pro - Modelos de Descanso
Días de descanso / festivos marcados por el entrenador.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID


class DescansoCreate(BaseModel):
    """Schema para crear/toggle descanso."""
    equipo_id: UUID
    fecha: date
    tipo: str = "descanso"
    notas: Optional[str] = None


class DescansoResponse(BaseModel):
    """Schema de respuesta de descanso."""
    id: UUID
    equipo_id: UUID
    fecha: date
    tipo: str
    notas: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
