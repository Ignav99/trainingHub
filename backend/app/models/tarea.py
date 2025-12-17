"""
TrainingHub Pro - Modelos de Tarea
Schemas Pydantic para tareas de entrenamiento.
"""

from pydantic import BaseModel, Field, computed_field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class FaseJuego(str, Enum):
    """Fases del juego."""
    ATAQUE_ORGANIZADO = "ataque_organizado"
    DEFENSA_ORGANIZADA = "defensa_organizada"
    TRANSICION_AD = "transicion_ataque_defensa"
    TRANSICION_DA = "transicion_defensa_ataque"
    BALON_PARADO_OFENSIVO = "balon_parado_ofensivo"
    BALON_PARADO_DEFENSIVO = "balon_parado_defensivo"


class Densidad(str, Enum):
    """Densidad del esfuerzo."""
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class NivelCognitivo(int, Enum):
    """Niveles de carga cognitiva."""
    BAJO = 1
    MEDIO = 2
    ALTO = 3


# ============ Schemas de Categoría ============

class CategoriaTareaBase(BaseModel):
    """Schema base de categoría de tarea."""
    codigo: str = Field(..., max_length=10, example="JDP")
    nombre: str = Field(..., max_length=100, example="Juego de Posición")
    nombre_corto: Optional[str] = None
    descripcion: Optional[str] = None
    naturaleza: Optional[str] = None  # micro, meso, macro
    objetivo_principal: Optional[str] = None
    icono: Optional[str] = None
    color: Optional[str] = None


class CategoriaTareaResponse(CategoriaTareaBase):
    """Schema de respuesta de categoría."""
    id: UUID
    orden: int
    activo: bool
    
    class Config:
        from_attributes = True


# ============ Schemas de Tarea ============

class ReglaProvocacion(BaseModel):
    """Schema para una regla de provocación."""
    texto: str
    tipo: Optional[str] = None  # técnica, táctica, psicológica


class CoachingPoint(BaseModel):
    """Schema para un coaching point."""
    texto: str
    prioridad: Optional[int] = 1  # 1-3


class TareaBase(BaseModel):
    """Schema base de tarea - campos comunes."""
    titulo: str = Field(..., min_length=5, max_length=255)
    codigo: Optional[str] = Field(None, max_length=50)
    
    # Tiempo
    duracion_total: int = Field(..., gt=0, description="Duración en minutos")
    num_series: int = Field(default=1, ge=1)
    duracion_serie: Optional[int] = None
    tiempo_descanso: Optional[int] = Field(default=0, description="Descanso en segundos")
    
    # Espacio
    espacio_largo: Optional[float] = Field(None, ge=0)
    espacio_ancho: Optional[float] = Field(None, ge=0)
    espacio_forma: str = Field(default="rectangular")
    
    # Jugadores
    num_jugadores_min: int = Field(..., ge=1)
    num_jugadores_max: Optional[int] = None
    num_porteros: int = Field(default=0, ge=0)
    estructura_equipos: Optional[str] = Field(None, example="4vs4+3")
    
    # Descripción
    descripcion: Optional[str] = None
    como_inicia: Optional[str] = None
    como_finaliza: Optional[str] = None
    
    # Reglas de provocación
    reglas_tecnicas: List[str] = Field(default_factory=list)
    reglas_tacticas: List[str] = Field(default_factory=list)
    reglas_psicologicas: List[str] = Field(default_factory=list)
    forma_puntuar: Optional[str] = None
    
    # Contenido táctico
    fase_juego: Optional[FaseJuego] = None
    principio_tactico: Optional[str] = None
    subprincipio_tactico: Optional[str] = None
    accion_tecnica: Optional[str] = None
    intencion_tactica: Optional[str] = None
    
    # Carga física
    tipo_esfuerzo: Optional[str] = None
    ratio_trabajo_descanso: Optional[str] = None
    densidad: Optional[Densidad] = None
    fc_esperada_min: Optional[int] = Field(None, ge=0, le=220)
    fc_esperada_max: Optional[int] = Field(None, ge=0, le=220)
    
    # Carga cognitiva
    nivel_cognitivo: Optional[NivelCognitivo] = None
    
    # Coaching points
    consignas_ofensivas: List[str] = Field(default_factory=list)
    consignas_defensivas: List[str] = Field(default_factory=list)
    errores_comunes: List[str] = Field(default_factory=list)
    
    # Gráfico
    grafico_svg: Optional[str] = None
    grafico_data: Optional[dict] = None
    
    # Metadata
    es_plantilla: bool = False
    es_publica: bool = False
    tags: List[str] = Field(default_factory=list)


class TareaCreate(TareaBase):
    """Schema para crear tarea."""
    categoria_id: UUID
    equipo_id: Optional[UUID] = None  # None = disponible para toda la org


class TareaUpdate(BaseModel):
    """Schema para actualizar tarea - todos los campos opcionales."""
    titulo: Optional[str] = Field(None, min_length=5, max_length=255)
    categoria_id: Optional[UUID] = None
    
    duracion_total: Optional[int] = Field(None, gt=0)
    num_series: Optional[int] = Field(None, ge=1)
    duracion_serie: Optional[int] = None
    tiempo_descanso: Optional[int] = None
    
    espacio_largo: Optional[float] = None
    espacio_ancho: Optional[float] = None
    espacio_forma: Optional[str] = None
    
    num_jugadores_min: Optional[int] = Field(None, ge=1)
    num_jugadores_max: Optional[int] = None
    num_porteros: Optional[int] = None
    estructura_equipos: Optional[str] = None
    
    descripcion: Optional[str] = None
    como_inicia: Optional[str] = None
    como_finaliza: Optional[str] = None
    
    reglas_tecnicas: Optional[List[str]] = None
    reglas_tacticas: Optional[List[str]] = None
    reglas_psicologicas: Optional[List[str]] = None
    forma_puntuar: Optional[str] = None
    
    fase_juego: Optional[FaseJuego] = None
    principio_tactico: Optional[str] = None
    subprincipio_tactico: Optional[str] = None
    accion_tecnica: Optional[str] = None
    intencion_tactica: Optional[str] = None
    
    tipo_esfuerzo: Optional[str] = None
    ratio_trabajo_descanso: Optional[str] = None
    densidad: Optional[Densidad] = None
    fc_esperada_min: Optional[int] = None
    fc_esperada_max: Optional[int] = None
    
    nivel_cognitivo: Optional[NivelCognitivo] = None
    
    consignas_ofensivas: Optional[List[str]] = None
    consignas_defensivas: Optional[List[str]] = None
    errores_comunes: Optional[List[str]] = None
    
    grafico_svg: Optional[str] = None
    grafico_data: Optional[dict] = None
    
    es_plantilla: Optional[bool] = None
    es_publica: Optional[bool] = None
    tags: Optional[List[str]] = None


class TareaResponse(TareaBase):
    """Schema de respuesta de tarea."""
    id: UUID
    categoria_id: UUID
    organizacion_id: UUID
    equipo_id: Optional[UUID]
    creado_por: Optional[UUID] = None
    
    grafico_url: Optional[str] = None
    
    m2_por_jugador: Optional[float] = None
    valoracion_media: Optional[float] = None
    num_usos: int = 0
    
    created_at: datetime
    updated_at: datetime
    
    # Relaciones
    categoria: Optional[CategoriaTareaResponse] = None
    
    @computed_field
    @property
    def m2_calculado(self) -> Optional[float]:
        """Calcula m² por jugador automáticamente."""
        if self.espacio_largo and self.espacio_ancho and self.num_jugadores_min:
            area = self.espacio_largo * self.espacio_ancho
            return round(area / self.num_jugadores_min, 1)
        return None
    
    class Config:
        from_attributes = True


class TareaListResponse(BaseModel):
    """Schema para lista de tareas con paginación."""
    data: List[TareaResponse]
    total: int
    page: int
    limit: int
    pages: int


# ============ Schemas para Filtros ============

class TareaFiltros(BaseModel):
    """Filtros para buscar tareas."""
    categoria: Optional[str] = None  # código de categoría
    fase_juego: Optional[FaseJuego] = None
    principio_tactico: Optional[str] = None
    jugadores_min: Optional[int] = None
    jugadores_max: Optional[int] = None
    duracion_min: Optional[int] = None
    duracion_max: Optional[int] = None
    nivel_cognitivo: Optional[NivelCognitivo] = None
    tags: Optional[List[str]] = None
    solo_plantillas: bool = False
    solo_publicas: bool = False
    equipo_id: Optional[UUID] = None
    busqueda: Optional[str] = None  # búsqueda en título/descripción
