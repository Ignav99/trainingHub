"""
TrainingHub Pro - Modelos de Sesión
Schemas Pydantic para sesiones de entrenamiento.
"""

from pydantic import BaseModel, Field, computed_field, model_validator
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
    DESARROLLO_3 = "desarrollo_3"
    DESARROLLO_4 = "desarrollo_4"
    DESARROLLO_5 = "desarrollo_5"
    DESARROLLO_6 = "desarrollo_6"
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


class ContextoPeriodo(str, Enum):
    COMPETICION = "competicion"
    PRETEMPORADA = "pretemporada"
    TRANSICION = "transicion"


class SubfaseAtaque(str, Enum):
    CREACION = "creacion"
    PROGRESION = "progresion"
    FINALIZACION = "finalizacion"


class OpcionCreacionAtaque(str, Enum):
    INICIOS_SAQUE_PUERTA = "inicios_saque_puerta"
    REINICIOS = "reinicios"
    GENERAL = "general"


class SubfaseDefensa(str, Enum):
    BLOQUE_ALTO = "bloque_alto"
    BLOQUE_MEDIO = "bloque_medio"
    BLOQUE_BAJO = "bloque_bajo"
    BLOQUE_MIXTO = "bloque_mixto"


class OpcionBloqueAlto(str, Enum):
    SAQUE_PUERTA = "saque_puerta"
    REINICIOS = "reinicios"
    # legacy
    PRESION_SAQUE_META = "presion_saque_meta"
    BLOQUE_ALTO = "bloque_alto"


class SesionSubfaseItem(BaseModel):
    """Entrada de subfase tipada en la sesión."""
    fase: str  # ataque_organizado | defensa_organizada | …
    subfase: str
    opcion: Optional[str] = None


class AbpConfig(BaseModel):
    """Configuración ABP opcional de la sesión.

    Ofensivo y defensivo tienen tipos independientes.
    Campos legacy (`lado`, `lados`, `tipos`) se sincronizan al leer/escribir.
    """
    activo: bool = False
    ofensivo: List[str] = Field(default_factory=list)  # tipos ABP ofensivo
    defensivo: List[str] = Field(default_factory=list)  # tipos ABP defensivo
    # legacy (compat lectura/escritura)
    lado: Optional[str] = None
    lados: List[str] = Field(default_factory=list)
    tipos: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _migrate_legacy(cls, data):
        if not isinstance(data, dict):
            return data
        ofensivo = [t for t in (data.get("ofensivo") or []) if isinstance(t, str)]
        defensivo = [t for t in (data.get("defensivo") or []) if isinstance(t, str)]
        # Migrar formato antiguo: lados/lado + tipos compartidos
        if not ofensivo and not defensivo:
            tipos = [t for t in (data.get("tipos") or []) if isinstance(t, str)]
            lados = [x for x in (data.get("lados") or []) if x in ("ofensivo", "defensivo")]
            if not lados and data.get("lado") in ("ofensivo", "defensivo"):
                lados = [data["lado"]]
            if tipos and lados:
                if "ofensivo" in lados:
                    ofensivo = list(tipos)
                if "defensivo" in lados:
                    defensivo = list(tipos)
        data["ofensivo"] = ofensivo
        data["defensivo"] = defensivo
        return data

    @model_validator(mode="after")
    def _sync_derived(self):
        ofensivo = list(self.ofensivo or [])
        defensivo = list(self.defensivo or [])
        self.ofensivo = ofensivo
        self.defensivo = defensivo
        lados_u: List[str] = []
        if ofensivo:
            lados_u.append("ofensivo")
        if defensivo:
            lados_u.append("defensivo")
        self.lados = lados_u
        self.lado = lados_u[0] if lados_u else None
        seen = set()
        tipos_flat: List[str] = []
        for t in ofensivo + defensivo:
            if t not in seen:
                seen.add(t)
                tipos_flat.append(t)
        self.tipos = tipos_flat
        if ofensivo or defensivo:
            self.activo = True
        return self


# ============ Schemas de Sesión-Tarea (relación) ============

class GrupoFormacion(BaseModel):
    """Un grupo dentro de un espacio de formacion."""
    nombre: str                    # "Equipo Rojo"
    color: str                     # "#EF4444"
    tipo: str                      # "equipo" | "comodin" | "portero"
    jugador_ids: List[str]         # UUIDs de jugadores


class EspacioFormacion(BaseModel):
    """Un espacio (instancia) de la formacion."""
    nombre: str                    # "Espacio 1"
    estructura: str                # "4v4+2" (adaptada al num real)
    grupos: List[GrupoFormacion]


class FormacionEquipos(BaseModel):
    """Formacion completa de equipos para una tarea."""
    estructura_original: str       # La estructura de la tarea
    auto_generado: bool = False    # True si fue generado por IA
    espacios: List[EspacioFormacion]


class FormacionEquiposUpdate(BaseModel):
    """Schema para actualizar formacion de equipos."""
    formacion_equipos: Optional[FormacionEquipos] = None


class SesionTareaBase(BaseModel):
    """Schema base para tarea dentro de sesión."""
    tarea_id: UUID
    orden: int = Field(..., ge=1)
    # Opcional en el nuevo diseño libre; default DB-compatible
    fase_sesion: Optional[FaseSesion] = FaseSesion.DESARROLLO_1
    duracion_override: Optional[int] = None
    notas: Optional[str] = None
    responsable: Optional[str] = None
    carga_calculada: Optional[float] = None


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

    # Formacion de equipos per-tarea
    formacion_equipos: Optional[dict] = None
    
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

class SesionTareaUpdate(BaseModel):
    """Schema para actualizar una tarea individual dentro de sesion."""
    orden: Optional[int] = None
    fase_sesion: Optional[FaseSesion] = None
    duracion_override: Optional[int] = None
    notas: Optional[str] = None
    responsable: Optional[str] = None


class SesionTareasBatchUpdate(BaseModel):
    """Schema para reemplazar todas las tareas de una sesion en batch."""
    tareas: List[SesionTareaCreate]


class SesionBase(BaseModel):
    """Schema base de sesión."""
    titulo: str = Field(..., min_length=3, max_length=255)
    fecha: date

    # Match Day
    match_day: MatchDay
    rival: Optional[str] = Field(None, max_length=255)
    competicion: Optional[str] = Field(None, max_length=255)

    # Hora y lugar
    hora: Optional[str] = None
    lugar: Optional[str] = None

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

    # Relaciones con plan de partido
    plan_partido_id: Optional[UUID] = None
    fase_plan: Optional[str] = None

    # Personalizacion
    materiales: Optional[List[str]] = None
    staff_asistentes: Optional[List[dict]] = None
    fase_notas: Optional[dict] = None
    estructura_fases: Optional[List[dict]] = None

    # Taxonomía rediseño
    fases_juego: Optional[List[str]] = None
    subfases: Optional[List[SesionSubfaseItem]] = None
    abp_config: Optional[AbpConfig] = None
    contenidos_tecnicos_of: Optional[List[str]] = None
    contenidos_tecnicos_def: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    objetivo_fisico: Optional[str] = None
    objetivo_psicologico: Optional[str] = None
    contexto_periodo: Optional[ContextoPeriodo] = ContextoPeriodo.COMPETICION
    dia_carga: Optional[str] = None
    partido_id: Optional[UUID] = None
    es_pretemporada: Optional[bool] = False
    carga_sesion: Optional[float] = None
    intensidad_calculada: Optional[str] = None
    share_token: Optional[str] = None


class SesionCreate(SesionBase):
    """Schema para crear sesión."""
    equipo_id: Optional[UUID] = None  # Optional for testing mode
    microciclo_id: Optional[UUID] = None
    dia_numero: Optional[int] = Field(None, ge=1, le=14)
    orden: Optional[int] = Field(None, ge=0)

    # Variables de diseño de sesión (docs/mejoras/variables_sesion.png)
    espacio_disponible: Optional[str] = None
    jugadores_campo: Optional[int] = Field(None, ge=0, le=40)
    numero_sesion: Optional[int] = None
    objetivos: Optional[List[str]] = None
    contenidos_ofensivos: Optional[List[str]] = None
    contenidos_defensivos: Optional[List[str]] = None
    # Nested tareas are accepted by the API type for docs but MUST NOT be
    # inserted with the session row (breaks FK). Create then addTarea.
    tareas: Optional[List[SesionTareaCreate]] = None


class SesionUpdate(BaseModel):
    """Schema para actualizar sesión."""
    titulo: Optional[str] = Field(None, min_length=3, max_length=255)
    fecha: Optional[date] = None
    match_day: Optional[MatchDay] = None
    rival: Optional[str] = None
    competicion: Optional[str] = None
    hora: Optional[str] = None
    lugar: Optional[str] = None
    objetivo_principal: Optional[str] = None
    fase_juego_principal: Optional[str] = None
    principio_tactico_principal: Optional[str] = None
    carga_fisica_objetivo: Optional[str] = None
    intensidad_objetivo: Optional[Intensidad] = None
    notas_pre: Optional[str] = None
    notas_post: Optional[str] = None
    estado: Optional[EstadoSesion] = None
    microciclo_id: Optional[UUID] = None
    dia_numero: Optional[int] = Field(None, ge=1, le=14)
    orden: Optional[int] = Field(None, ge=0)
    plan_partido_id: Optional[UUID] = None
    fase_plan: Optional[str] = None
    materiales: Optional[List[str]] = None
    staff_asistentes: Optional[List[dict]] = None
    fase_notas: Optional[dict] = None
    estructura_fases: Optional[List[dict]] = None

    # Variables de diseño de sesión (docs/mejoras/variables_sesion.png)
    espacio_disponible: Optional[str] = None
    jugadores_campo: Optional[int] = Field(None, ge=0, le=40)
    numero_sesion: Optional[int] = None
    objetivos: Optional[List[str]] = None
    contenidos_ofensivos: Optional[List[str]] = None
    contenidos_defensivos: Optional[List[str]] = None

    # Taxonomía rediseño
    fases_juego: Optional[List[str]] = None
    subfases: Optional[List[SesionSubfaseItem]] = None
    abp_config: Optional[AbpConfig] = None
    contenidos_tecnicos_of: Optional[List[str]] = None
    contenidos_tecnicos_def: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    objetivo_fisico: Optional[str] = None
    objetivo_psicologico: Optional[str] = None
    contexto_periodo: Optional[ContextoPeriodo] = None
    dia_carga: Optional[str] = None
    partido_id: Optional[UUID] = None
    es_pretemporada: Optional[bool] = None
    carga_sesion: Optional[float] = None
    intensidad_calculada: Optional[str] = None
    share_token: Optional[str] = None


class SesionResponse(SesionBase):
    """Schema de respuesta de sesión."""
    id: UUID
    equipo_id: UUID
    creado_por: Optional[UUID] = None
    
    duracion_total: Optional[int] = None
    estado: EstadoSesion
    pdf_url: Optional[str] = None
    microciclo_id: Optional[UUID] = None
    dia_numero: Optional[int] = None
    orden: Optional[int] = None
    plan_partido_id: Optional[UUID] = None
    fase_plan: Optional[str] = None

    # Personalizacion
    materiales: Optional[List[str]] = None
    staff_asistentes: Optional[List[dict]] = None
    fase_notas: Optional[dict] = None
    estructura_fases: Optional[List[dict]] = None

    # Variables de diseño de sesión (docs/mejoras/variables_sesion.png)
    espacio_disponible: Optional[str] = None
    jugadores_campo: Optional[int] = Field(None, ge=0, le=40)
    numero_sesion: Optional[int] = None
    objetivos: Optional[List[str]] = None
    contenidos_ofensivos: Optional[List[str]] = None
    contenidos_defensivos: Optional[List[str]] = None

    # Taxonomía (heredada de Base + echo explícito para response)
    fases_juego: Optional[List[str]] = None
    subfases: Optional[List[SesionSubfaseItem]] = None
    abp_config: Optional[AbpConfig] = None
    contenidos_tecnicos_of: Optional[List[str]] = None
    contenidos_tecnicos_def: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    objetivo_fisico: Optional[str] = None
    objetivo_psicologico: Optional[str] = None
    contexto_periodo: Optional[ContextoPeriodo] = None
    dia_carga: Optional[str] = None
    partido_id: Optional[UUID] = None
    es_pretemporada: Optional[bool] = None
    carga_sesion: Optional[float] = None
    intensidad_calculada: Optional[str] = None
    share_token: Optional[str] = None

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
    keyword: Optional[str] = None
    fase_juego: Optional[str] = None
    abp: Optional[bool] = None
    material: Optional[str] = None
    objetivo_fisico: Optional[str] = None
    objetivo_psicologico: Optional[str] = None
    rival: Optional[str] = None
    contexto_periodo: Optional[ContextoPeriodo] = None


# ============ Schemas para Reordenar Sesiones (DnD) ============

class ReordenarSesionItem(BaseModel):
    """Un item en la operación de reordenamiento DnD."""
    sesion_id: UUID
    dia_numero: int = Field(..., ge=1, le=7, description="Día dentro del microciclo (1=lunes, 7=domingo)")
    orden: int = Field(default=1, ge=1, description="Orden de la sesión dentro del día")


class ReordenarSesionesRequest(BaseModel):
    """Request para reordenar sesiones mediante drag & drop."""
    sesiones: List[ReordenarSesionItem]


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

    # Contexto del plan de partido
    plan_partido_id: Optional[UUID] = None
    
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

    # Diagrama táctico
    grafico_data: Optional[dict] = None

    # Detalles adicionales
    variantes: List[str] = Field(default_factory=list)
    material: List[str] = Field(default_factory=list)
    posicion_entrenador: Optional[str] = None
    errores_comunes: List[str] = Field(default_factory=list)
    consignas_defensivas: List[str] = Field(default_factory=list)

    # Campos de preparación física / gimnasio (opcionales, para GYM/PRV/MOV/RCF)
    grupo_muscular: Optional[List[str]] = None
    equipamiento: Optional[List[str]] = None
    tipo_contraccion: Optional[str] = None
    zona_cuerpo: Optional[str] = None
    objetivo_gym: Optional[str] = None
    series_repeticiones: Optional[dict] = None
    protocolo_progresion: Optional[str] = None


class AIRecomendadorInput(BaseModel):
    """Input para el recomendador con IA (Claude)."""
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

    # Contexto del plan de partido
    plan_partido_id: Optional[UUID] = Field(
        None,
        description="ID del plan de partido para contextualizar recomendaciones"
    )
    fase_plan: Optional[str] = Field(
        None,
        description="Fase del plan de partido a trabajar en la sesión"
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
    generado_por: str = "claude"
