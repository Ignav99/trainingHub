"""
TrainingHub Pro - Modelos ABP (Acciones a Balón Parado)
Schemas Pydantic para jugadas de balón parado.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class TipoABP(str, Enum):
    CORNER = "corner"
    SEMI_CORNER = "semi_corner"
    FALTA_LATERAL = "falta_lateral"
    FALTA_FRONTAL = "falta_frontal"
    FALTA_LEJANA = "falta_lejana"
    PENALTI = "penalti"
    SAQUE_BANDA = "saque_banda"
    SAQUE_PUERTA = "saque_puerta"


class LadoABP(str, Enum):
    OFENSIVO = "ofensivo"
    DEFENSIVO = "defensivo"


class SubtipoABP(str, Enum):
    INSWING = "inswing"
    OUTSWING = "outswing"
    CORTO = "corto"
    DIRECTO = "directo"
    INDIRECTO = "indirecto"
    LARGO = "largo"


class SistemaMarcaje(str, Enum):
    ZONAL = "zonal"
    INDIVIDUAL = "individual"
    MIXTO = "mixto"


class ABPPlayerRol(str, Enum):
    LANZADOR = "lanzador"
    BLOQUEADOR = "bloqueador"
    PALO_CORTO = "palo_corto"
    PALO_LARGO = "palo_largo"
    BORDE_AREA = "borde_area"
    SENUELO = "señuelo"
    RECHACE = "rechace"
    REFERENCIA = "referencia"
    BARRERA = "barrera"
    MARCAJE_ZONAL = "marcaje_zonal"
    MARCAJE_INDIVIDUAL = "marcaje_individual"
    PORTERO = "portero"
    OTRO = "otro"


# ============ Schemas de Fase ============

class ABPFase(BaseModel):
    id: str
    nombre: str = Field(..., max_length=100)
    orden: int = 0
    descripcion: Optional[str] = None
    diagram: dict = Field(default_factory=lambda: {
        "elements": [], "arrows": [], "zones": [], "pitchType": "half"
    })


class ABPAsignacion(BaseModel):
    element_id: str
    jugador_id: Optional[str] = None
    rol: Optional[str] = None


# ============ Schemas de Jugada (Biblioteca) ============

class ABPJugadaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    codigo: Optional[str] = Field(None, max_length=20)
    tipo: str
    lado: str
    subtipo: Optional[str] = None
    descripcion: Optional[str] = None
    senal_codigo: Optional[str] = Field(None, max_length=50)
    sistema_marcaje: Optional[str] = None
    notas_tacticas: Optional[str] = None
    fases: List[ABPFase] = Field(default_factory=list)
    asignaciones: List[ABPAsignacion] = Field(default_factory=list)
    es_plantilla: bool = False
    tags: List[str] = Field(default_factory=list)
    orden: int = 0


class ABPJugadaCreate(ABPJugadaBase):
    equipo_id: Optional[str] = None


class ABPJugadaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    codigo: Optional[str] = Field(None, max_length=20)
    tipo: Optional[str] = None
    lado: Optional[str] = None
    subtipo: Optional[str] = None
    descripcion: Optional[str] = None
    senal_codigo: Optional[str] = Field(None, max_length=50)
    sistema_marcaje: Optional[str] = None
    notas_tacticas: Optional[str] = None
    fases: Optional[List[ABPFase]] = None
    asignaciones: Optional[List[ABPAsignacion]] = None
    es_plantilla: Optional[bool] = None
    tags: Optional[List[str]] = None
    orden: Optional[int] = None


class ABPJugadaResponse(ABPJugadaBase):
    id: UUID
    organizacion_id: UUID
    equipo_id: Optional[UUID] = None
    creado_por: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Schemas de Rival Jugada ============

class ABPRivalJugadaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    tipo: str
    lado: str
    subtipo: Optional[str] = None
    descripcion: Optional[str] = None
    fases: List[ABPFase] = Field(default_factory=list)
    video_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class ABPRivalJugadaCreate(ABPRivalJugadaBase):
    pass


class ABPRivalJugadaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    tipo: Optional[str] = None
    lado: Optional[str] = None
    subtipo: Optional[str] = None
    descripcion: Optional[str] = None
    fases: Optional[List[ABPFase]] = None
    video_url: Optional[str] = None
    tags: Optional[List[str]] = None


class ABPRivalJugadaResponse(ABPRivalJugadaBase):
    id: UUID
    rival_id: UUID
    organizacion_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Schemas de Partido-Jugada ============

class ABPPartidoJugadaCreate(BaseModel):
    jugada_id: str
    asignaciones_override: Optional[List[ABPAsignacion]] = None
    notas: Optional[str] = None
    orden: int = 0


class ABPPartidoJugadaResponse(BaseModel):
    id: UUID
    partido_id: UUID
    jugada_id: UUID
    asignaciones_override: Optional[List[Any]] = None
    notas: Optional[str] = None
    orden: int = 0
    created_at: Optional[datetime] = None
    jugada: Optional[ABPJugadaResponse] = None

    class Config:
        from_attributes = True


# ============ Schemas de Sesion-Jugada ============

class ABPSesionJugadaCreate(BaseModel):
    jugada_id: str
    notas: Optional[str] = None
    orden: int = 0


class ABPSesionJugadaResponse(BaseModel):
    id: UUID
    sesion_id: UUID
    jugada_id: UUID
    notas: Optional[str] = None
    orden: int = 0
    created_at: Optional[datetime] = None
    jugada: Optional[ABPJugadaResponse] = None

    class Config:
        from_attributes = True


# ============ Schemas de Partido Plan ============

class ABPPartidoPlanJugadaItem(BaseModel):
    jugada_id: str
    asignaciones_override: Optional[List[ABPAsignacion]] = None
    notas: Optional[str] = None
    orden: int = 0


class ABPPartidoPlanFullSave(BaseModel):
    comentario_ofensivo: Optional[str] = None
    comentario_defensivo: Optional[str] = None
    jugadas: List[ABPPartidoPlanJugadaItem] = Field(default_factory=list)


class ABPPartidoPlanResponse(BaseModel):
    id: Optional[UUID] = None
    partido_id: UUID
    comentario_ofensivo: Optional[str] = None
    comentario_defensivo: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ABPPartidoPlanFullResponse(BaseModel):
    plan: Optional[ABPPartidoPlanResponse] = None
    jugadas: List[ABPPartidoJugadaResponse] = Field(default_factory=list)
