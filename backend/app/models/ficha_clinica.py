"""Schemas para el cuaderno clínico del jugador (valoración + tests datados)."""

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class BloqueEvaluacion(str, Enum):
    VALORACION = "valoracion"
    TESTS = "tests"


class MomentoEvaluacion(str, Enum):
    PRETEMPORADA = "pretemporada"
    INICIO_TEMPORADA = "inicio_temporada"
    CONTROL = "control"
    POST_LESION = "post_lesion"
    FIN_TEMPORADA = "fin_temporada"
    OTRO = "otro"


class EvaluacionCreate(BaseModel):
    jugador_id: UUID
    equipo_id: UUID
    bloque: BloqueEvaluacion
    fecha: date
    momento: MomentoEvaluacion = MomentoEvaluacion.CONTROL
    titulo: Optional[str] = Field(None, max_length=160)
    datos: Dict[str, Any] = Field(default_factory=dict)
    notas: Optional[str] = None


class EvaluacionUpdate(BaseModel):
    fecha: Optional[date] = None
    momento: Optional[MomentoEvaluacion] = None
    titulo: Optional[str] = Field(None, max_length=160)
    datos: Optional[Dict[str, Any]] = None
    notas: Optional[str] = None


class EvaluacionResponse(BaseModel):
    id: UUID
    jugador_id: UUID
    equipo_id: UUID
    bloque: BloqueEvaluacion
    fecha: date
    momento: MomentoEvaluacion
    titulo: Optional[str] = None
    datos: Dict[str, Any] = Field(default_factory=dict)
    notas: Optional[str] = None
    creado_por: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EvaluacionListResponse(BaseModel):
    data: List[EvaluacionResponse]
    total: int


class HabitosUpdate(BaseModel):
    comidas: Optional[str] = None
    sueno: Optional[str] = None
    actividades_nocivas: Optional[str] = None
    deportes_externos: Optional[str] = None
    notas: Optional[str] = None
    datos: Optional[Dict[str, Any]] = None


class HabitosResponse(BaseModel):
    id: Optional[UUID] = None
    jugador_id: UUID
    comidas: Optional[str] = None
    sueno: Optional[str] = None
    actividades_nocivas: Optional[str] = None
    deportes_externos: Optional[str] = None
    notas: Optional[str] = None
    datos: Dict[str, Any] = Field(default_factory=dict)
    actualizado_por: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
