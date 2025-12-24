"""
TrainingHub Pro - Modelos de Sesión
Schemas Pydantic para sesiones de entrenamiento.
"""

from pydantic import BaseModel, Field, computed_field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum

from app.models.tarea import TareaResponse


class MatchDay(str, Enum):
    """Match Days relativos al partido."""
    MD_PLUS_1 = "MD+1"  # Recuperación
    MD_PLUS_2 = "MD+2"  # Regeneración
    MD_MINUS_4 = "MD-4"  # Fuerza/Tensión
    MD_MINUS_3 = "MD-3"  # Resistencia
    MD_MINUS_2 = "MD-2"  # Velocidad
    MD_MINUS_1 = "MD-1"  # Activación
    MD = "MD"  # Día de partido


class FaseSesion(str, Enum):
    """Fases dentro de una sesión."""
    ACTIVACION = "activacion"
    DESARROLLO_1 = "desarrollo_1"
    DESARROLLO_2 = "desarrollo_2"
    VUELTA_CALMA = "vuelta_calma"


class EstadoSesion(str, Enum):
    """Estados posibles de una sesión."""
    BORRADOR = "borrador"
    PLANIFICADA = "planificada"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"


class Intensidad(str, Enum):
    """Niveles de intensidad."""
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"
    MUY_BAJA = "muy_baja"


# ============ Schemas de Sesión-Tarea (relación) ============

class SesionTareaBase(BaseModel):
    """Schema base para tarea dentro de sesión."""
    tarea_id: UUID
    orden: int = Field(..., ge=1)
    fase_sesion: FaseSesion
    duracion_override: Optional[int] = None  # Si se modifica la duración
    notas: Optional[str] = None


class SesionTareaCreate(SesionTareaBase):
    """Schema para añadir tarea a sesión."""
    pass


class SesionTareaResponse(SesionTareaBase):
    """Schema de respuesta de tarea en sesión."""
    id: UUID
    sesion_id: UUID
    created_at: datetime
    
    # Tarea completa incluida
    tarea: Optional[TareaResponse] = None
    
    @computed_field
    @property
    def duracion_efectiva(self) -> int:
        """Duración real (override o la de la tarea)."""
        if self.duracion_override:
            return self.duracion_override
        if self.tarea:
            return self.tarea.duracion_total
        return 0
    
    class Config:
        from_attributes = True


# ============ Schemas de Sesión ============

class SesionBase(BaseModel):
    """Schema base de sesión."""
    titulo: str = Field(..., min_length=3, max_length=255)
    fecha: date
    
    # Match Day
    match_day: MatchDay
    rival: Optional[str] = Field(None, max_length=255)
    competicion: Optional[str] = Field(None, max_length=255)
    
    # Objetivo
    objetivo_principal: Optional[str] = None
    fase_juego_principal: Optional[str] = None
    principio_tactico_principal: Optional[str] = None
    
    # Carga
    carga_fisica_objetivo: Optional[str] = None
    intensidad_objetivo: Optional[Intensidad] = None
    
    # Notas
    notas_pre: Optional[str] = None
    notas_post: Optional[str] = None


class SesionCreate(SesionBase):
    """Schema para crear sesión."""
    equipo_id: Optional[UUID] = None  # Optional for testing mode
    tareas: Optional[List[SesionTareaCreate]] = None


class SesionUpdate(BaseModel):
    """Schema para actualizar sesión."""
    titulo: Optional[str] = Field(None, min_length=3, max_length=255)
    fecha: Optional[date] = None
    match_day: Optional[MatchDay] = None
    rival: Optional[str] = None
    competicion: Optional[str] = None
    objetivo_principal: Optional[str] = None
    fase_juego_principal: Optional[str] = None
    principio_tactico_principal: Optional[str] = None
    carga_fisica_objetivo: Optional[str] = None
    intensidad_objetivo: Optional[Intensidad] = None
    notas_pre: Optional[str] = None
    notas_post: Optional[str] = None
    estado: Optional[EstadoSesion] = None


class SesionResponse(SesionBase):
    """Schema de respuesta de sesión."""
    id: UUID
    equipo_id: UUID
    creado_por: Optional[UUID] = None
    
    duracion_total: Optional[int] = None
    estado: EstadoSesion
    pdf_url: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    # Tareas de la sesión (ordenadas)
    tareas: List[SesionTareaResponse] = []
    
    @computed_field
    @property
    def duracion_calculada(self) -> int:
        """Calcula duración total sumando tareas."""
        return sum(t.duracion_efectiva for t in self.tareas)
    
    @computed_field
    @property
    def num_tareas(self) -> int:
        """Número de tareas en la sesión."""
        return len(self.tareas)
    
    class Config:
        from_attributes = True


class SesionListResponse(BaseModel):
    """Schema para lista de sesiones con paginación."""
    data: List[SesionResponse]
    total: int
    page: int
    limit: int
    pages: int


# ============ Schemas para Filtros ============

class SesionFiltros(BaseModel):
    """Filtros para buscar sesiones."""
    equipo_id: Optional[UUID] = None
    match_day: Optional[MatchDay] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    estado: Optional[EstadoSesion] = None
    busqueda: Optional[str] = None


# ============ Schemas para Recomendador ============

class RecomendadorInput(BaseModel):
    """Input para el sistema de recomendación."""
    match_day: MatchDay
    num_jugadores: int = Field(..., ge=4, le=30)
    num_porteros: int = Field(default=2, ge=0, le=4)
    espacio_disponible: str = Field(
        default="campo_completo",
        pattern="^(campo_completo|medio_campo|area_doble|area_simple)$"
    )
    duracion_total: int = Field(..., ge=30, le=150)
    
    # Objetivo táctico
    fase_juego: Optional[str] = None
    principio_tactico: Optional[str] = None
    
    # Preferencias
    enfasis_fisico: Optional[List[str]] = None  # ["fuerza", "velocidad"]
    excluir_categorias: Optional[List[str]] = None
    excluir_tareas: Optional[List[UUID]] = None


class TareaRecomendada(BaseModel):
    """Una tarea recomendada con su score."""
    tarea: TareaResponse
    score: float = Field(..., ge=0, le=1)
    razon: str


class RecomendadorOutput(BaseModel):
    """Output del sistema de recomendación."""
    recomendaciones: dict[str, List[TareaRecomendada]]  # por fase_sesion
    metadata: dict


# ============ Match Day Config ============

class MatchDayConfig(BaseModel):
    """Configuración de un Match Day."""
    codigo: str
    nombre: str
    dias_desde_partido: int
    carga_fisica: str
    espacios_recomendados: str
    nivel_cognitivo_max: int
    descripcion: str
    categorias_preferidas: List[str] = []
    categorias_evitar: List[str] = []


# ============ Schemas para Recomendador AI ============

class AITareaNueva(BaseModel):
    """Tarea nueva sugerida por la IA cuando no encuentra una existente."""
    # Identificador temporal (no es UUID aún)
    temp_id: str = Field(..., description="ID temporal para referencia")

    # Campos básicos de la tarea
    titulo: str = Field(..., min_length=5, max_length=255)
    descripcion: str
    categoria_codigo: str = Field(..., description="Código de categoría: RND, JDP, SSG, etc.")

    # Tiempo
    duracion_total: int = Field(..., gt=0)
    num_series: int = Field(default=1, ge=1)

    # Espacio
    espacio_largo: Optional[float] = None
    espacio_ancho: Optional[float] = None

    # Jugadores
    num_jugadores_min: int = Field(..., ge=1)
    num_jugadores_max: Optional[int] = None
    num_porteros: int = Field(default=0)
    estructura_equipos: Optional[str] = None

    # Contenido táctico
    fase_juego: Optional[str] = None
    principio_tactico: Optional[str] = None

    # Reglas
    reglas_principales: List[str] = Field(default_factory=list)
    consignas: List[str] = Field(default_factory=list)

    # Carga
    nivel_cognitivo: int = Field(default=2, ge=1, le=3)
    densidad: str = Field(default="media")


class AIRecomendadorInput(BaseModel):
    """Input para el recomendador con IA (Gemini)."""
    match_day: MatchDay
    num_jugadores: int = Field(..., ge=4, le=30)
    num_porteros: int = Field(default=2, ge=0, le=4)
    espacio_disponible: str = Field(
        default="campo_completo",
        pattern="^(campo_completo|medio_campo|area_doble|area_simple)$"
    )
    duracion_total: int = Field(..., ge=30, le=150)

    # Objetivo táctico
    fase_juego: Optional[str] = None
    principio_tactico: Optional[str] = None

    # Contexto adicional para la IA
    notas_rival: Optional[str] = Field(
        None,
        description="Info sobre el rival: sistema, estilo de juego",
        max_length=500
    )
    areas_enfoque: Optional[List[str]] = Field(
        None,
        description="Áreas específicas a trabajar"
    )
    notas_ultimo_partido: Optional[str] = Field(
        None,
        description="Aspectos a mejorar del último partido",
        max_length=500
    )
    notas_plantilla: Optional[str] = Field(
        None,
        description="Lesiones, ausencias, etc.",
        max_length=300
    )

    # Preferencias
    excluir_tareas: Optional[List[UUID]] = None


class AIFaseRecomendacion(BaseModel):
    """Recomendación de tarea para una fase de sesión."""
    # Puede ser tarea existente O tarea nueva
    tarea_id: Optional[str] = None  # ID de tarea existente
    tarea: Optional[TareaResponse] = None  # Tarea existente completa

    # O puede ser una tarea nueva sugerida por la IA
    tarea_nueva: Optional[AITareaNueva] = None
    es_tarea_nueva: bool = False

    # Común para ambos
    duracion_sugerida: int
    razon: str
    adaptaciones: List[str] = []
    coaching_points: List[str] = []


class AICargaEstimada(BaseModel):
    """Estimación de carga de la sesión."""
    fisica: str
    cognitiva: str
    duracion_total: int


class AIRecomendadorOutput(BaseModel):
    """Output del recomendador con IA."""
    titulo_sugerido: str
    resumen: str
    fases: dict[str, AIFaseRecomendacion]
    coherencia_tactica: str
    carga_estimada: AICargaEstimada

    # Metadatos
    match_day: str
    generado_por: str = "gemini"
