"""
TrainingHub Pro - Modelos de Entrenamientos al Margen
Sistema de trabajo personalizado para jugadores al margen.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


# ============ ENUMS ============

class EstadoEntrenamientoMargen(str, Enum):
    PLANIFICADO = "planificado"
    EN_CURSO = "en_curso"
    COMPLETADO = "completado"
    CANCELADO = "cancelado"


class FaseRecuperacion(str, Enum):
    FASE_1_CONTROL_DOLOR = "fase_1_control_dolor"
    FASE_2_MOVILIDAD = "fase_2_movilidad"
    FASE_3_FUERZA_BASE = "fase_3_fuerza_base"
    FASE_4_FUERZA_FUNCIONAL = "fase_4_fuerza_funcional"
    FASE_5_CARRERA_LINEAL = "fase_5_carrera_lineal"
    FASE_6_CAMBIOS_DIRECCION = "fase_6_cambios_direccion"
    FASE_7_ENTRENAMIENTO_EQUIPO = "fase_7_entrenamiento_equipo"
    FASE_8_COMPETICION = "fase_8_competicion"


class TipoEjercicioMargen(str, Enum):
    MOVILIDAD = "movilidad"
    ACTIVACION = "activacion"
    FUERZA = "fuerza"
    PROPIOCEPTIVO = "propioceptivo"
    CARDIO = "cardio"
    CAMPO = "campo"
    PLIOMETRIA = "pliometria"
    FLEXIBILIDAD = "flexibilidad"
    OTRO = "otro"


# ============ TAREA SCHEMAS ============

class EntrenamientoMargenTareaCreate(BaseModel):
    tarea_id: Optional[UUID] = None
    orden: int = Field(default=1, ge=1)
    titulo_custom: Optional[str] = Field(None, max_length=255)
    descripcion_custom: Optional[str] = None
    duracion: Optional[int] = Field(None, ge=1)
    series: int = Field(default=1, ge=1)
    repeticiones: Optional[str] = Field(None, max_length=50)
    descanso: Optional[str] = Field(None, max_length=50)
    carga: Optional[str] = Field(None, max_length=100)
    tipo_ejercicio: Optional[TipoEjercicioMargen] = None
    notas: Optional[str] = None


class EntrenamientoMargenTareaResponse(BaseModel):
    id: UUID
    entrenamiento_margen_id: UUID
    tarea_id: Optional[UUID] = None
    orden: int
    titulo_custom: Optional[str] = None
    descripcion_custom: Optional[str] = None
    duracion: Optional[int] = None
    series: int = 1
    repeticiones: Optional[str] = None
    descanso: Optional[str] = None
    carga: Optional[str] = None
    tipo_ejercicio: Optional[str] = None
    notas: Optional[str] = None
    created_at: datetime
    # Nested tarea from library (if tarea_id set)
    tarea: Optional[dict] = None

    class Config:
        from_attributes = True


# ============ ENTRENAMIENTO SCHEMAS ============

class EntrenamientoMargenCreate(BaseModel):
    sesion_id: UUID
    jugador_id: UUID
    registro_medico_id: Optional[UUID] = None
    objetivo: Optional[str] = None
    notas: Optional[str] = None
    responsable: Optional[str] = Field(None, max_length=100)
    fase_recuperacion: Optional[FaseRecuperacion] = None
    duracion_estimada: Optional[int] = Field(None, ge=1)
    tareas: List[EntrenamientoMargenTareaCreate] = Field(default_factory=list)


class EntrenamientoMargenUpdate(BaseModel):
    registro_medico_id: Optional[UUID] = None
    objetivo: Optional[str] = None
    notas: Optional[str] = None
    responsable: Optional[str] = Field(None, max_length=100)
    estado: Optional[EstadoEntrenamientoMargen] = None
    fase_recuperacion: Optional[FaseRecuperacion] = None
    duracion_estimada: Optional[int] = Field(None, ge=1)
    rpe_post: Optional[int] = Field(None, ge=1, le=10)


class EntrenamientoMargenResponse(BaseModel):
    id: UUID
    sesion_id: UUID
    jugador_id: UUID
    registro_medico_id: Optional[UUID] = None
    objetivo: Optional[str] = None
    notas: Optional[str] = None
    responsable: Optional[str] = None
    estado: str = "planificado"
    fase_recuperacion: Optional[str] = None
    duracion_estimada: Optional[int] = None
    rpe_post: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    # Nested relations
    tareas: List[EntrenamientoMargenTareaResponse] = Field(default_factory=list)
    jugador: Optional[dict] = None
    registro_medico: Optional[dict] = None

    class Config:
        from_attributes = True


# ============ CONSTANTS ============

FASES_RECUPERACION_INFO = [
    {"codigo": "fase_1_control_dolor", "nombre": "Fase 1 — Control del dolor", "descripcion": "Reposo activo, crioterapia, electroestimulacion", "orden": 1},
    {"codigo": "fase_2_movilidad", "nombre": "Fase 2 — Movilidad", "descripcion": "ROM activo/pasivo, estiramientos suaves", "orden": 2},
    {"codigo": "fase_3_fuerza_base", "nombre": "Fase 3 — Fuerza base", "descripcion": "Isometricos, carga baja, activacion muscular", "orden": 3},
    {"codigo": "fase_4_fuerza_funcional", "nombre": "Fase 4 — Fuerza funcional", "descripcion": "Concentricos/excentricos, cargas progresivas", "orden": 4},
    {"codigo": "fase_5_carrera_lineal", "nombre": "Fase 5 — Carrera lineal", "descripcion": "Trote continuo, incrementos velocidad", "orden": 5},
    {"codigo": "fase_6_cambios_direccion", "nombre": "Fase 6 — Cambios de direccion", "descripcion": "Agilidad, multidireccion, pliometria ligera", "orden": 6},
    {"codigo": "fase_7_entrenamiento_equipo", "nombre": "Fase 7 — Entrenamiento equipo", "descripcion": "Integración parcial con equipo, sin contacto completo", "orden": 7},
    {"codigo": "fase_8_competicion", "nombre": "Fase 8 — Competicion", "descripcion": "Entrenamiento completo, apto para convocatoria", "orden": 8},
]

TIPOS_EJERCICIO_MARGEN_INFO = [
    {"codigo": "movilidad", "nombre": "Movilidad", "color": "#06B6D4"},
    {"codigo": "activacion", "nombre": "Activacion", "color": "#22C55E"},
    {"codigo": "fuerza", "nombre": "Fuerza", "color": "#EF4444"},
    {"codigo": "propioceptivo", "nombre": "Propioceptivo", "color": "#8B5CF6"},
    {"codigo": "cardio", "nombre": "Cardio", "color": "#F59E0B"},
    {"codigo": "campo", "nombre": "Campo", "color": "#3B82F6"},
    {"codigo": "pliometria", "nombre": "Pliometria", "color": "#EC4899"},
    {"codigo": "flexibilidad", "nombre": "Flexibilidad", "color": "#14B8A6"},
    {"codigo": "otro", "nombre": "Otro", "color": "#6B7280"},
]
