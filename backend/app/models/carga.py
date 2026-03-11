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
    monotonia: Optional[float] = None
    strain: Optional[float] = None
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


class CargaDiariaResponse(BaseModel):
    """One day of load data for a player."""
    fecha: date
    load_sesion: float = 0
    load_partido: float = 0
    load_manual: float = 0
    load_total: float = 0
    ewma_acute: float = 0
    ewma_chronic: float = 0
    acwr: Optional[float] = None
    monotonia: Optional[float] = None
    strain: Optional[float] = None


class CargaHistorialResponse(BaseModel):
    """Daily load history for a player."""
    jugador_id: UUID
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    data: List[CargaDiariaResponse]


class CargaSemanalJugador(BaseModel):
    """Weekly totals for one player."""
    jugador_id: UUID
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    dorsal: Optional[int] = None
    semanas: List[dict]  # [{semana: "2026-W10", load_total: 450, ...}]


class CargaSemanalEquipoResponse(BaseModel):
    """Weekly load summary for all players in a team."""
    data: List[CargaSemanalJugador]
