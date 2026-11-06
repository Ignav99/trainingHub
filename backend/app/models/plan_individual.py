"""Schemas del plan individualizado del futbolista."""

from datetime import date
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AreaPlan(str, Enum):
    FISICO = "fisico"
    TECNICO_TACTICO = "tecnico_tactico"
    EMOCIONAL = "emocional"


class PrioridadPlan(str, Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class EstadoPlan(str, Enum):
    ABIERTA = "abierta"
    EN_TRABAJO = "en_trabajo"
    RESUELTA = "resuelta"


class ResultadoPlan(str, Enum):
    MEJORA = "mejora"
    SE_MANTIENE = "se_mantiene"
    EMPEORA = "empeora"


class MomentoMedicion(str, Enum):
    INICIAL = "inicial"
    SEGUIMIENTO = "seguimiento"
    RESOLUCION = "resolucion"


class MejorSi(str, Enum):
    MAS = "mas"
    MENOS = "menos"


class MedicionCreate(BaseModel):
    fecha: date
    momento: MomentoMedicion = MomentoMedicion.SEGUIMIENTO
    metrica: str = Field(..., min_length=1, max_length=120)
    valor: float
    total: Optional[float] = Field(None, gt=0)
    unidad: Optional[str] = Field(None, max_length=30)
    mejor: MejorSi = MejorSi.MAS
    notas: Optional[str] = Field(None, max_length=1000)


class MedicionUpdate(BaseModel):
    fecha: Optional[date] = None
    momento: Optional[MomentoMedicion] = None
    metrica: Optional[str] = Field(None, min_length=1, max_length=120)
    valor: Optional[float] = None
    total: Optional[float] = Field(None, gt=0)
    unidad: Optional[str] = Field(None, max_length=30)
    mejor: Optional[MejorSi] = None
    notas: Optional[str] = Field(None, max_length=1000)


class EntradaCreate(BaseModel):
    jugador_id: UUID
    equipo_id: UUID
    area: AreaPlan
    titulo: str = Field(..., min_length=1, max_length=160)
    fecha: date
    descripcion: Optional[str] = Field(None, max_length=4000)
    prioridad: PrioridadPlan = PrioridadPlan.MEDIA
    marcas: List[str] = Field(default_factory=list)
    plan: Dict[str, Any] = Field(default_factory=dict)
    revisar_el: Optional[date] = None
    mediciones: List[MedicionCreate] = Field(default_factory=list, max_length=20)
    corte_ids: List[UUID] = Field(default_factory=list, max_length=20)


class EntradaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=160)
    fecha: Optional[date] = None
    descripcion: Optional[str] = Field(None, max_length=4000)
    prioridad: Optional[PrioridadPlan] = None
    estado: Optional[EstadoPlan] = None
    marcas: Optional[List[str]] = None
    plan: Optional[Dict[str, Any]] = None
    revisar_el: Optional[date] = None
    resolucion_fecha: Optional[date] = None
    resolucion_resultado: Optional[ResultadoPlan] = None
    resolucion_texto: Optional[str] = Field(None, max_length=4000)
    limpiar_resolucion: bool = False
    limpiar_revision: bool = False


class CorteEnlace(BaseModel):
    corte_id: UUID
    nota: Optional[str] = Field(None, max_length=300)
