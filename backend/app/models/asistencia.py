"""
TrainingHub Pro - Modelos de Asistencia
Schemas Pydantic para control de asistencia en sesiones.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, time, date
from uuid import UUID
from enum import Enum


class MotivoAusencia(str, Enum):
    """Motivos de ausencia a una sesion."""
    LESION = "lesion"
    ENFERMEDAD = "enfermedad"
    SANCION = "sancion"
    PERMISO = "permiso"
    SELECCION = "seleccion"
    VIAJE = "viaje"
    OTRO = "otro"


# ============ Schemas de Asistencia ============

class AsistenciaCreate(BaseModel):
    """Schema para crear/actualizar asistencia de un jugador."""
    jugador_id: UUID
    presente: bool = True
    motivo_ausencia: Optional[MotivoAusencia] = None
    notas: Optional[str] = None
    hora_llegada: Optional[time] = None


class AsistenciaBatchCreate(BaseModel):
    """Schema para guardar asistencias en batch."""
    asistencias: List[AsistenciaCreate]


class AsistenciaUpdate(BaseModel):
    """Schema para actualizar una asistencia individual."""
    presente: Optional[bool] = None
    motivo_ausencia: Optional[MotivoAusencia] = None
    notas: Optional[str] = None
    hora_llegada: Optional[time] = None


class AsistenciaResponse(BaseModel):
    """Schema de respuesta de asistencia."""
    id: UUID
    sesion_id: UUID
    jugador_id: UUID
    presente: bool
    motivo_ausencia: Optional[str] = None
    notas: Optional[str] = None
    hora_llegada: Optional[time] = None
    created_at: datetime
    updated_at: datetime

    # Datos del jugador (join)
    jugador: Optional[dict] = None

    class Config:
        from_attributes = True


class AsistenciaListResponse(BaseModel):
    """Schema de lista de asistencias con resumen."""
    data: List[AsistenciaResponse]
    total: int
    presentes: int
    ausentes: int


class AsistenciaResumen(BaseModel):
    """Resumen de asistencia de una sesion."""
    total: int
    presentes: int
    ausentes: int
    por_posicion: dict = {}
    motivos_ausencia: dict = {}


class AsistenciaHistoricoJugador(BaseModel):
    """Estadísticas históricas de asistencia de un jugador."""
    jugador_id: UUID
    nombre: str
    apellidos: str
    dorsal: Optional[int] = None
    posicion_principal: str = ""
    total_sesiones: int
    presencias: int
    ausencias: int
    porcentaje: float  # 0-100
    motivos: dict = {}  # {"lesion": 3, "permiso": 1}
    ultima_ausencia: Optional[date] = None


class AsistenciaHistoricoResponse(BaseModel):
    """Respuesta de estadísticas históricas de asistencia."""
    data: List[AsistenciaHistoricoJugador]
    periodo: dict = {}  # {desde, hasta}
    media_equipo: float = 0.0  # % promedio
