"""
TrainingHub Pro - Modelos de Descanso
Días de descanso / festivos marcados por el entrenador.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime, date
from uuid import UUID


class DescansoCreate(BaseModel):
    """Schema para crear/toggle descanso."""
    equipo_id: UUID
    fecha: date
    tipo: str = "descanso"
    notas: Optional[str] = None


TIPOS_DESCANSO = ("descanso", "festivo")
MAX_NOTAS_DESCANSO = 200


class DescansoUpsert(BaseModel):
    """Schema para fijar el día (PUT): crea o reemplaza la fila de equipo+fecha.

    Un día personalizado ("Otro") es `tipo='festivo'` con `notas` en JSON
    `{"texto": "...", "color": "<clave de paleta>"}`. La validación del JSON
    vive en el frontend (`lib/diaPersonal.ts`); aquí solo se acota el tamaño.
    """
    equipo_id: UUID
    fecha: date
    tipo: Literal["descanso", "festivo"] = "descanso"
    notas: Optional[str] = Field(default=None, max_length=MAX_NOTAS_DESCANSO)


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
