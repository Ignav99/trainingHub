"""
TrainingHub Pro - Portero Tarea Models
Modelos Pydantic para tareas de entrenamiento de porteros.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class TipoPorteroTarea(str, Enum):
    CALENTAMIENTO = "calentamiento"
    TECNICA = "tecnica"
    TACTICA = "tactica"
    JUEGO = "juego"
    RECUPERACION = "recuperacion"


class PorteroTareaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    duracion: Optional[int] = 10
    intensidad: Optional[str] = "media"
    tipo: Optional[str] = None
    diagram: Optional[dict] = None
    notas: Optional[str] = None
    orden: Optional[int] = 0


class PorteroTareaCreate(PorteroTareaBase):
    sesion_id: UUID
    equipo_id: UUID


class PorteroTareaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    duracion: Optional[int] = None
    intensidad: Optional[str] = None
    tipo: Optional[str] = None
    diagram: Optional[dict] = None
    notas: Optional[str] = None
    orden: Optional[int] = None


class PorteroTareaResponse(PorteroTareaBase):
    id: UUID
    sesion_id: UUID
    equipo_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
