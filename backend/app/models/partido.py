"""
TrainingHub Pro - Modelos de Partido y Rival
Gestión de partidos, rivales y calendario competitivo.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class TipoCompeticion(str, Enum):
    """Tipo de competición."""
    LIGA = "liga"
    COPA = "copa"
    AMISTOSO = "amistoso"
    TORNEO = "torneo"
    OTRO = "otro"


class LocaliaPartido(str, Enum):
    """Localía del partido."""
    LOCAL = "local"
    VISITANTE = "visitante"
    NEUTRAL = "neutral"


class ResultadoPartido(str, Enum):
    """Resultado del partido."""
    VICTORIA = "victoria"
    EMPATE = "empate"
    DERROTA = "derrota"


# ============ Rival ============

class RivalBase(BaseModel):
    """Schema base de rival."""
    nombre: str = Field(..., min_length=1, max_length=100)
    nombre_corto: Optional[str] = Field(None, max_length=10)
    escudo_url: Optional[str] = None
    estadio: Optional[str] = Field(None, max_length=100)
    ciudad: Optional[str] = Field(None, max_length=100)
    notas: Optional[str] = None


class RivalCreate(RivalBase):
    """Schema para crear rival."""
    pass


class RivalUpdate(BaseModel):
    """Schema para actualizar rival."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    nombre_corto: Optional[str] = Field(None, max_length=10)
    escudo_url: Optional[str] = None
    estadio: Optional[str] = Field(None, max_length=100)
    ciudad: Optional[str] = Field(None, max_length=100)
    notas: Optional[str] = None


class RivalResponse(RivalBase):
    """Schema de respuesta de rival."""
    id: UUID
    organizacion_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RivalListResponse(BaseModel):
    """Respuesta paginada de rivales."""
    data: List[RivalResponse]
    total: int
    page: int
    limit: int
    pages: int


# ============ Partido ============

class PartidoBase(BaseModel):
    """Schema base de partido."""
    rival_id: UUID
    fecha: date
    hora: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")  # HH:MM
    localia: LocaliaPartido = LocaliaPartido.LOCAL
    competicion: TipoCompeticion = TipoCompeticion.LIGA
    jornada: Optional[int] = Field(None, ge=1)

    # Resultado
    goles_favor: Optional[int] = Field(None, ge=0)
    goles_contra: Optional[int] = Field(None, ge=0)

    # Notas y análisis
    notas_pre: Optional[str] = None
    notas_post: Optional[str] = None
    video_url: Optional[str] = None
    informe_url: Optional[str] = None


class PartidoCreate(PartidoBase):
    """Schema para crear partido."""
    equipo_id: Optional[UUID] = None  # Optional: backend will use default in test mode


class PartidoUpdate(BaseModel):
    """Schema para actualizar partido."""
    rival_id: Optional[UUID] = None
    fecha: Optional[date] = None
    hora: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    localia: Optional[LocaliaPartido] = None
    competicion: Optional[TipoCompeticion] = None
    jornada: Optional[int] = Field(None, ge=1)
    goles_favor: Optional[int] = Field(None, ge=0)
    goles_contra: Optional[int] = Field(None, ge=0)
    notas_pre: Optional[str] = None
    notas_post: Optional[str] = None
    video_url: Optional[str] = None
    informe_url: Optional[str] = None


class PartidoResponse(PartidoBase):
    """Schema de respuesta de partido."""
    id: UUID
    equipo_id: UUID
    resultado: Optional[ResultadoPartido] = None
    created_at: datetime
    updated_at: datetime

    # Relación
    rival: Optional[RivalResponse] = None

    class Config:
        from_attributes = True


class PartidoListResponse(BaseModel):
    """Respuesta paginada de partidos."""
    data: List[PartidoResponse]
    total: int
    page: int
    limit: int
    pages: int


class PartidoFiltros(BaseModel):
    """Filtros para listar partidos."""
    equipo_id: Optional[UUID] = None
    rival_id: Optional[UUID] = None
    competicion: Optional[TipoCompeticion] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    solo_jugados: bool = False
    solo_pendientes: bool = False
