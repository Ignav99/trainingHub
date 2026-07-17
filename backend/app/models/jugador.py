"""
TrainingHub Pro - Modelos de Jugador
"""

from pydantic import BaseModel, Field, model_validator
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
    EN_RECUPERACION = "en_recuperacion"
    ENFERMO = "enfermo"
    SANCIONADO = "sancionado"
    VIAJE = "viaje"
    PERMISO = "permiso"
    SELECCION = "seleccion"
    BAJA = "baja"
    INVITADO = "invitado"


class DisponibilidadOperativa(str, Enum):
    FUERA = "fuera"
    INDIVIDUAL = "individual"
    GRUPO_ADAPTADO = "grupo_adaptado"
    PLENO = "pleno"

class TipoJugador(str, Enum):
    """Vínculo del futbolista con el equipo."""
    PLANTILLA = "plantilla"
    JUVENIL = "juvenil"
    PRUEBA = "prueba"
    INVITADO = "invitado"


class FichaEstado(str, Enum):
    """Nivel de ficha / seguimiento."""
    COMPLETA = "completa"
    PRE_FICHA = "pre_ficha"
    MINIMA = "minima"


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
    apellidos: str = Field(default="", max_length=150)
    apodo: Optional[str] = Field(None, max_length=50)
    fecha_nacimiento: Optional[date] = None
    dorsal: Optional[int] = Field(None, ge=1, le=99)

    # Posiciones (DB column: posicion_secundaria)
    posicion_principal: Posicion
    posiciones_secundarias: List[str] = Field(default_factory=list)

    # Físico (DB column: pie_dominante)
    altura: Optional[float] = Field(None, ge=1.0, le=2.5)  # metros
    peso: Optional[float] = Field(None, ge=30, le=150)  # kg
    pierna_dominante: PiernaDominante = Field(default=PiernaDominante.DERECHA)

    @model_validator(mode="before")
    @classmethod
    def _map_db_column_names(cls, data):
        """Handle any DB column name differences gracefully."""
        if isinstance(data, dict):
            # posicion_secundaria (if it exists in DB) → posiciones_secundarias
            if "posicion_secundaria" in data and "posiciones_secundarias" not in data:
                val = data.pop("posicion_secundaria")
                data["posiciones_secundarias"] = val if isinstance(val, list) else (val or [])
            # pie_dominante (if it exists in DB) → pierna_dominante
            if "pie_dominante" in data and "pierna_dominante" not in data:
                data["pierna_dominante"] = data.pop("pie_dominante")
        return data

    # Niveles (1-10)
    nivel_tecnico: int = Field(default=5, ge=1, le=10)
    nivel_tactico: int = Field(default=5, ge=1, le=10)
    nivel_fisico: int = Field(default=5, ge=1, le=10)
    nivel_mental: int = Field(default=5, ge=1, le=10)

    # Estado
    estado: EstadoJugador = Field(default=EstadoJugador.ACTIVO)
    disponibilidad: DisponibilidadOperativa = Field(default=DisponibilidadOperativa.PLENO)
    fecha_lesion: Optional[date] = None
    fecha_vuelta_estimada: Optional[date] = None
    motivo_baja: Optional[str] = None

    # Flags
    es_capitan: bool = Field(default=False)
    es_convocable: bool = Field(default=True)
    es_portero: bool = Field(default=False)
    es_invitado: bool = Field(default=False)

    # Tipología (plantilla / juvenil / prueba / invitado)
    tipo_jugador: TipoJugador = Field(default=TipoJugador.PLANTILLA)
    ficha_estado: FichaEstado = Field(default=FichaEstado.COMPLETA)
    fecha_fin_prueba: Optional[date] = None

    # Notas
    notas: Optional[str] = None

    @model_validator(mode="after")
    def _sync_invitado_flag(self):
        """Deriva es_invitado desde tipo_jugador para compatibilidad legacy."""
        object.__setattr__(self, "es_invitado", self.tipo_jugador != TipoJugador.PLANTILLA)
        return self


class JugadorCreate(JugadorBase):
    """Schema para crear jugador."""
    equipo_id: UUID
    equipo_origen_id: Optional[UUID] = None


class JugadorUpdate(BaseModel):
    """Schema para actualizar jugador."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellidos: Optional[str] = Field(None, min_length=1, max_length=150)
    apodo: Optional[str] = Field(None, max_length=50)
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
    disponibilidad: Optional[DisponibilidadOperativa] = None
    fecha_lesion: Optional[date] = None
    fecha_vuelta_estimada: Optional[date] = None
    motivo_baja: Optional[str] = None

    es_capitan: Optional[bool] = None
    es_convocable: Optional[bool] = None
    es_portero: Optional[bool] = None
    es_invitado: Optional[bool] = None

    tipo_jugador: Optional[TipoJugador] = None
    ficha_estado: Optional[FichaEstado] = None
    fecha_fin_prueba: Optional[date] = None
    equipo_origen_id: Optional[UUID] = None

    notas: Optional[str] = None


class JugadorPromoverPlantilla(BaseModel):
    """Promueve juvenil/prueba/invitado a plantilla con ficha completa."""
    dorsal: Optional[int] = Field(None, ge=1, le=99)
    es_convocable: bool = True
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
    tipo_jugador: Optional[TipoJugador] = None
    ficha_estado: Optional[FichaEstado] = None
    busqueda: Optional[str] = None


class JugadorInvitadoCreate(BaseModel):
    """Schema para crear un jugador no-plantilla (invitado/prueba/juvenil)."""
    nombre: str = Field(..., min_length=1, max_length=100)
    apellidos: str = Field(default="", max_length=150)
    posicion_principal: Posicion = Field(default=Posicion.MC)
    tipo_jugador: TipoJugador = Field(default=TipoJugador.INVITADO)
    ficha_estado: Optional[FichaEstado] = None
    equipo_origen_id: Optional[UUID] = None
    nivel_tecnico: int = Field(default=5, ge=1, le=10)
    nivel_tactico: int = Field(default=5, ge=1, le=10)
    nivel_fisico: int = Field(default=5, ge=1, le=10)
    nivel_mental: int = Field(default=5, ge=1, le=10)
    notas: Optional[str] = None


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
