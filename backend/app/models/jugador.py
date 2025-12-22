"""
TrainingHub Pro - Modelos de Jugador
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class PiernaDominante(str, Enum):
    """Pierna dominante del jugador."""
    DERECHA = "derecha"
    IZQUIERDA = "izquierda"
    AMBAS = "ambas"


class EstadoJugador(str, Enum):
    """Estado actual del jugador."""
    ACTIVO = "activo"
    LESIONADO = "lesionado"
    ENFERMO = "enfermo"
    SANCIONADO = "sancionado"
    VIAJE = "viaje"
    PERMISO = "permiso"
    SELECCION = "seleccion"
    BAJA = "baja"


class Posicion(str, Enum):
    """Posiciones de juego."""
    POR = "POR"  # Portero
    DFC = "DFC"  # Defensa Central
    LTD = "LTD"  # Lateral Derecho
    LTI = "LTI"  # Lateral Izquierdo
    CAD = "CAD"  # Carrilero Derecho
    CAI = "CAI"  # Carrilero Izquierdo
    MCD = "MCD"  # Mediocentro Defensivo
    MC = "MC"    # Mediocentro
    MCO = "MCO"  # Mediocentro Ofensivo
    MID = "MID"  # Interior Derecho
    MII = "MII"  # Interior Izquierdo
    EXD = "EXD"  # Extremo Derecho
    EXI = "EXI"  # Extremo Izquierdo
    MP = "MP"    # Mediapunta
    DC = "DC"    # Delantero Centro
    SD = "SD"    # Segundo Delantero


# ============ Jugador ============

class JugadorBase(BaseModel):
    """Schema base de jugador."""
    nombre: str = Field(..., min_length=1, max_length=100)
    apellidos: str = Field(..., min_length=1, max_length=150)
    fecha_nacimiento: Optional[date] = None
    dorsal: Optional[int] = Field(None, ge=1, le=99)

    # Posiciones
    posicion_principal: Posicion
    posiciones_secundarias: List[str] = Field(default_factory=list)

    # Físico
    altura: Optional[float] = Field(None, ge=1.0, le=2.5)  # metros
    peso: Optional[float] = Field(None, ge=30, le=150)  # kg
    pierna_dominante: PiernaDominante = Field(default=PiernaDominante.DERECHA)

    # Niveles (1-10)
    nivel_tecnico: int = Field(default=5, ge=1, le=10)
    nivel_tactico: int = Field(default=5, ge=1, le=10)
    nivel_fisico: int = Field(default=5, ge=1, le=10)
    nivel_mental: int = Field(default=5, ge=1, le=10)

    # Estado
    estado: EstadoJugador = Field(default=EstadoJugador.ACTIVO)
    fecha_lesion: Optional[date] = None
    fecha_vuelta_estimada: Optional[date] = None
    motivo_baja: Optional[str] = None

    # Flags
    es_capitan: bool = Field(default=False)
    es_convocable: bool = Field(default=True)
    es_portero: bool = Field(default=False)

    # Notas
    notas: Optional[str] = None


class JugadorCreate(JugadorBase):
    """Schema para crear jugador."""
    equipo_id: UUID
    equipo_origen_id: Optional[UUID] = None


class JugadorUpdate(BaseModel):
    """Schema para actualizar jugador."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellidos: Optional[str] = Field(None, min_length=1, max_length=150)
    fecha_nacimiento: Optional[date] = None
    dorsal: Optional[int] = Field(None, ge=1, le=99)
    foto_url: Optional[str] = None

    posicion_principal: Optional[Posicion] = None
    posiciones_secundarias: Optional[List[str]] = None

    altura: Optional[float] = Field(None, ge=1.0, le=2.5)
    peso: Optional[float] = Field(None, ge=30, le=150)
    pierna_dominante: Optional[PiernaDominante] = None

    nivel_tecnico: Optional[int] = Field(None, ge=1, le=10)
    nivel_tactico: Optional[int] = Field(None, ge=1, le=10)
    nivel_fisico: Optional[int] = Field(None, ge=1, le=10)
    nivel_mental: Optional[int] = Field(None, ge=1, le=10)

    estado: Optional[EstadoJugador] = None
    fecha_lesion: Optional[date] = None
    fecha_vuelta_estimada: Optional[date] = None
    motivo_baja: Optional[str] = None

    es_capitan: Optional[bool] = None
    es_convocable: Optional[bool] = None
    es_portero: Optional[bool] = None

    notas: Optional[str] = None


class JugadorResponse(JugadorBase):
    """Schema de respuesta de jugador."""
    id: UUID
    equipo_id: UUID
    equipo_origen_id: Optional[UUID] = None
    foto_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Calculados
    edad: Optional[int] = None
    nivel_global: Optional[float] = None

    class Config:
        from_attributes = True


class JugadorListResponse(BaseModel):
    """Schema de lista de jugadores."""
    data: List[JugadorResponse]
    total: int


class JugadorFiltros(BaseModel):
    """Filtros para buscar jugadores."""
    equipo_id: Optional[UUID] = None
    posicion: Optional[str] = None
    estado: Optional[EstadoJugador] = None
    es_portero: Optional[bool] = None
    es_convocable: Optional[bool] = None
    busqueda: Optional[str] = None


class PosicionResponse(BaseModel):
    """Schema de respuesta de posición."""
    codigo: str
    nombre: str
    nombre_corto: str
    zona: str
    orden: int


class PosicionListResponse(BaseModel):
    """Lista de posiciones."""
    data: List[PosicionResponse]
