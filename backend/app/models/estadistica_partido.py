"""
TrainingHub Pro - Modelos de Estadísticas de Partido
Estadísticas de equipo y análisis táctico por partido.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class EstadisticaPartidoBase(BaseModel):
    """Schema base de estadísticas de partido."""
    # Nuestro equipo
    tiros_a_puerta: int = Field(default=0, ge=0)
    ocasiones_gol: int = Field(default=0, ge=0)
    saques_esquina: int = Field(default=0, ge=0)
    penaltis: int = Field(default=0, ge=0)
    fueras_juego: int = Field(default=0, ge=0)
    faltas_cometidas: int = Field(default=0, ge=0)
    tarjetas_amarillas: int = Field(default=0, ge=0)
    tarjetas_rojas: int = Field(default=0, ge=0)
    balones_perdidos: int = Field(default=0, ge=0)
    balones_recuperados: int = Field(default=0, ge=0)

    # Rival
    rival_tiros_a_puerta: int = Field(default=0, ge=0)
    rival_ocasiones_gol: int = Field(default=0, ge=0)
    rival_saques_esquina: int = Field(default=0, ge=0)
    rival_penaltis: int = Field(default=0, ge=0)
    rival_fueras_juego: int = Field(default=0, ge=0)
    rival_faltas_cometidas: int = Field(default=0, ge=0)
    rival_tarjetas_amarillas: int = Field(default=0, ge=0)
    rival_tarjetas_rojas: int = Field(default=0, ge=0)
    rival_balones_perdidos: int = Field(default=0, ge=0)
    rival_balones_recuperados: int = Field(default=0, ge=0)

    # Goal analysis
    goles_por_periodo: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tipos_gol_favor: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tipos_gol_contra: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Tactical notes
    comentario_tactico: str = Field(default="", max_length=5000)


class EstadisticaPartidoCreate(EstadisticaPartidoBase):
    """Schema para crear estadísticas de partido."""
    partido_id: UUID


class EstadisticaPartidoUpdate(BaseModel):
    """Schema para actualizar estadísticas de partido (todos opcionales)."""
    tiros_a_puerta: Optional[int] = Field(None, ge=0)
    ocasiones_gol: Optional[int] = Field(None, ge=0)
    saques_esquina: Optional[int] = Field(None, ge=0)
    penaltis: Optional[int] = Field(None, ge=0)
    fueras_juego: Optional[int] = Field(None, ge=0)
    faltas_cometidas: Optional[int] = Field(None, ge=0)
    tarjetas_amarillas: Optional[int] = Field(None, ge=0)
    tarjetas_rojas: Optional[int] = Field(None, ge=0)
    balones_perdidos: Optional[int] = Field(None, ge=0)
    balones_recuperados: Optional[int] = Field(None, ge=0)

    rival_tiros_a_puerta: Optional[int] = Field(None, ge=0)
    rival_ocasiones_gol: Optional[int] = Field(None, ge=0)
    rival_saques_esquina: Optional[int] = Field(None, ge=0)
    rival_penaltis: Optional[int] = Field(None, ge=0)
    rival_fueras_juego: Optional[int] = Field(None, ge=0)
    rival_faltas_cometidas: Optional[int] = Field(None, ge=0)
    rival_tarjetas_amarillas: Optional[int] = Field(None, ge=0)
    rival_tarjetas_rojas: Optional[int] = Field(None, ge=0)
    rival_balones_perdidos: Optional[int] = Field(None, ge=0)
    rival_balones_recuperados: Optional[int] = Field(None, ge=0)

    goles_por_periodo: Optional[Dict[str, Any]] = None
    tipos_gol_favor: Optional[Dict[str, Any]] = None
    tipos_gol_contra: Optional[Dict[str, Any]] = None

    comentario_tactico: Optional[str] = Field(None, max_length=5000)


class EstadisticaPartidoResponse(EstadisticaPartidoBase):
    """Schema de respuesta de estadísticas de partido."""
    id: UUID
    partido_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
