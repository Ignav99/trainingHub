"""
TrainingHub Pro - Modelos de Carga Acumulada
Schemas para carga de entrenamiento y wellness.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class NivelCarga(str, Enum):
    BAJO = "bajo"
    OPTIMO = "optimo"
    ALTO = "alto"
    CRITICO = "critico"


class CargaJugadorResponse(BaseModel):
    """Carga acumulada de un jugador."""
    jugador_id: UUID
    equipo_id: UUID
    carga_aguda: float = 0
    carga_cronica: float = 0
    ratio_acwr: Optional[float] = None
    nivel_carga: NivelCarga = NivelCarga.OPTIMO
    ultima_carga: float = 0
    ultima_actividad_fecha: Optional[date] = None
    dias_sin_actividad: int = 0
    wellness_valor: Optional[int] = None
    wellness_fecha: Optional[date] = None
    updated_at: Optional[datetime] = None

    # Joined player info (populated in endpoint)
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    dorsal: Optional[int] = None
    posicion_principal: Optional[str] = None
    estado: Optional[str] = None

    # Aggregated from convocatorias
    tarjetas_amarillas: int = 0
    tarjetas_rojas: int = 0

    class Config:
        from_attributes = True


class CargaEquipoResponse(BaseModel):
    """Carga acumulada de todo el equipo."""
    data: List[CargaJugadorResponse]
    resumen: dict


class WellnessUpdate(BaseModel):
    """Schema para actualizar wellness de un jugador."""
    wellness_valor: int = Field(..., ge=1, le=10)
