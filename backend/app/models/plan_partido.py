"""
TrainingHub Pro — Modelos Plan de Partido
El corazón táctico. Plan de partido con fases, emparejamientos, momentos y escenarios.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class EstadoPlanPartido(str, Enum):
    BORRADOR = "borrador"
    FINALIZADO = "finalizado"
    COMPARTIDO = "compartido"


class AlturaBloque(str, Enum):
    ALTO = "alto"
    MEDIO = "medio"
    BAJO = "bajo"


class TipoPresion(str, Enum):
    HOMBRE = "hombre"
    ZONA = "zona"
    MIXTA = "mixta"


class TipoEmparejamiento(str, Enum):
    MARCA = "marca"
    PRESION = "presion"
    COBERTURA = "cobertura"


# ============ Sub-modelos ============

class MovimientoClave(BaseModel):
    titulo: str
    descripcion: str
    jugadores_involucrados: List[UUID] = Field(default_factory=list)
    zona_inicio: Optional[dict] = None
    zona_fin: Optional[dict] = None
    referencia_visual: Optional[str] = None


class Emparejamiento(BaseModel):
    nuestro_jugador_id: UUID
    rival_jugador_id: Optional[UUID] = None
    rival_dorsal: Optional[int] = None
    rival_nombre: Optional[str] = None
    tipo: TipoEmparejamiento = TipoEmparejamiento.MARCA
    notas: Optional[str] = None


class EspacioCampo(BaseModel):
    nombre: str
    zona: dict  # coordenadas {x, y, width, height} normalizadas
    descripcion: Optional[str] = None


class FasePlan(BaseModel):
    """Una fase táctica del plan de partido."""
    nombre: str
    descripcion: Optional[str] = None
    altura_bloque: Optional[AlturaBloque] = None
    zona_presion: Optional[dict] = None
    tipo_presion: Optional[TipoPresion] = None
    emparejamientos: List[Emparejamiento] = Field(default_factory=list)
    movimientos_clave: List[MovimientoClave] = Field(default_factory=list)
    espacios_a_atacar: List[EspacioCampo] = Field(default_factory=list)
    espacios_a_proteger: List[EspacioCampo] = Field(default_factory=list)
    referencias_visuales: List[str] = Field(default_factory=list)
    triggers: List[str] = Field(default_factory=list)
    video_clips: List[UUID] = Field(default_factory=list)


class FasePlanABP(BaseModel):
    """Fase específica para ABP."""
    nombre: str
    descripcion: Optional[str] = None
    sistema_marcaje: Optional[str] = None
    referencias: List[UUID] = Field(default_factory=list)  # jugadas ABP
    jugadores_area: List[UUID] = Field(default_factory=list)
    jugadores_rechace: List[UUID] = Field(default_factory=list)
    jugadores_contra: List[UUID] = Field(default_factory=list)
    notas: Optional[str] = None


class CambioPrevisto(BaseModel):
    minuto_aprox: int
    sale_jugador_id: UUID
    entra_jugador_id: UUID
    motivo: Optional[str] = None


class MomentoPartido(BaseModel):
    """Estrategia por momento del partido."""
    rango: str  # "0-15", "15-30", "30-45", "45-60", "60-75", "75-90"
    estrategia: Optional[str] = None
    cambios_previstos: List[CambioPrevisto] = Field(default_factory=list)
    notas: Optional[str] = None


class EscenarioPartido(BaseModel):
    """Plan para diferentes escenarios de marcador."""
    condicion: str  # "0-0_min60", "1-0_favor", "0-1_contra", "empate_min80"
    cambios_sistema: Optional[str] = None
    cambios_jugadores: List[CambioPrevisto] = Field(default_factory=list)
    ajustes_tacticos: Optional[str] = None


# ============ Plan de Partido ============

class PlanPartidoBase(BaseModel):
    partido_id: UUID
    microciclo_id: UUID
    game_model_id: Optional[UUID] = None
    sistema_juego: str = "4-3-3"
    estilo_previsto: Optional[str] = None
    once_inicial: dict = Field(default_factory=dict)  # {posicion: jugador_id}
    suplentes: List[UUID] = Field(default_factory=list)
    descartados: List[UUID] = Field(default_factory=list)
    capitan_id: Optional[UUID] = None
    fase_ataque_organizado: Optional[FasePlan] = None
    fase_defensa_organizada: Optional[FasePlan] = None
    fase_transicion_ofensiva: Optional[FasePlan] = None
    fase_transicion_defensiva: Optional[FasePlan] = None
    fase_abp_ofensivo: Optional[FasePlanABP] = None
    fase_abp_defensivo: Optional[FasePlanABP] = None
    momentos_partido: List[MomentoPartido] = Field(default_factory=list)
    escenarios: List[EscenarioPartido] = Field(default_factory=list)
    estado: EstadoPlanPartido = EstadoPlanPartido.BORRADOR
    notas: Optional[str] = None


class PlanPartidoCreate(PlanPartidoBase):
    pass


class PlanPartidoUpdate(BaseModel):
    sistema_juego: Optional[str] = None
    estilo_previsto: Optional[str] = None
    once_inicial: Optional[dict] = None
    suplentes: Optional[List[UUID]] = None
    descartados: Optional[List[UUID]] = None
    capitan_id: Optional[UUID] = None
    fase_ataque_organizado: Optional[FasePlan] = None
    fase_defensa_organizada: Optional[FasePlan] = None
    fase_transicion_ofensiva: Optional[FasePlan] = None
    fase_transicion_defensiva: Optional[FasePlan] = None
    fase_abp_ofensivo: Optional[FasePlanABP] = None
    fase_abp_defensivo: Optional[FasePlanABP] = None
    momentos_partido: Optional[List[MomentoPartido]] = None
    escenarios: Optional[List[EscenarioPartido]] = None
    estado: Optional[EstadoPlanPartido] = None
    notas: Optional[str] = None


class PlanPartidoResponse(PlanPartidoBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Informe Rival Enriquecido ============

class RivalJugadorClave(BaseModel):
    nombre: str
    dorsal: Optional[int] = None
    posicion: Optional[str] = None
    fortalezas: List[str] = Field(default_factory=list)
    debilidades: List[str] = Field(default_factory=list)
    tipo: str = "neutral"  # "peligroso", "debilidad", "neutral"
    notas: Optional[str] = None


class RivalPartidoHistorico(BaseModel):
    rival_nombre: str
    fecha: Optional[date] = None
    resultado: Optional[str] = None
    goles_favor: Optional[int] = None
    goles_contra: Optional[int] = None
    sistema_rival: Optional[str] = None
    notas: Optional[str] = None


class InformeRivalEnriquecidoCreate(BaseModel):
    rival_id: UUID
    partido_id: Optional[UUID] = None
    sistema_juego: Optional[str] = None
    sistema_variantes: List[str] = Field(default_factory=list)
    estilo: Optional[str] = None
    fortalezas: List[str] = Field(default_factory=list)
    debilidades: List[str] = Field(default_factory=list)
    jugadores_clave: List[RivalJugadorClave] = Field(default_factory=list)
    lesionados_sancionados: List[str] = Field(default_factory=list)
    ultimos_partidos: List[RivalPartidoHistorico] = Field(default_factory=list)
    abp_ofensivo: Optional[str] = None
    abp_defensivo: Optional[str] = None
    mapa_presion: Optional[dict] = None
    notas: Optional[str] = None


class InformeRivalEnriquecidoResponse(InformeRivalEnriquecidoCreate):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Alertas ============

class TipoAlerta(str, Enum):
    MICROCICLO_SIN_SESION = "microciclo_sin_sesion"
    PLAN_PARTIDO_FALTANTE = "plan_partido_faltante"
    JUGADOR_SANCION = "jugador_sancion"
    CARGA_CRITICA = "carga_critica"
    RIVAL_NUEVO_ENTRENADOR = "rival_nuevo_entrenador"
    LESION_RECAIDA = "lesion_recaida"
    FALTA_ABP_PLAN = "falta_abp_plan"
    PERSONALIZADA = "personalizada"


class PrioridadAlerta(str, Enum):
    BAJA = "baja"
    NORMAL = "normal"
    ALTA = "alta"
    URGENTE = "urgente"


class AlertaCreate(BaseModel):
    equipo_id: UUID
    microciclo_id: Optional[UUID] = None
    tipo: TipoAlerta
    prioridad: PrioridadAlerta = PrioridadAlerta.NORMAL
    titulo: str
    mensaje: Optional[str] = None
    entidad_tipo: Optional[str] = None
    entidad_id: Optional[UUID] = None
    accion_url: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class AlertaUpdate(BaseModel):
    resuelta: Optional[bool] = None
    notas_resolucion: Optional[str] = None


class AlertaResponse(AlertaCreate):
    id: UUID
    resuelta: bool = False
    resuelta_por: Optional[UUID] = None
    resuelta_en: Optional[datetime] = None
    notas_resolucion: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Vista Completa Microciclo (WAR ROOM) ============

class VistaCompletaMicrociclo(BaseModel):
    microciclo: dict
    sesiones: List[dict]
    plantilla: dict
    rpe: dict
    plan_partido: Optional[PlanPartidoResponse] = None
    informe_rival: Optional[InformeRivalEnriquecidoResponse] = None
    alertas: List[AlertaResponse] = Field(default_factory=list)


# Needed for date type in RivalPartidoHistorico
from datetime import date
