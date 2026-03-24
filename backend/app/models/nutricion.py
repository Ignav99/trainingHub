"""
TrainingHub Pro - Modelos del Modulo de Nutricion
Perfiles nutricionales, plantillas de comidas, planes diarios,
suplementacion y composicion corporal.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


# ============ Enums ============

class ObjetivoNutricional(str, Enum):
    MANTENIMIENTO = "mantenimiento"
    GANANCIA_MUSCULAR = "ganancia_muscular"
    PERDIDA_GRASA = "perdida_grasa"
    RENDIMIENTO = "rendimiento"
    RECUPERACION = "recuperacion"


class TipoComida(str, Enum):
    DESAYUNO = "desayuno"
    ALMUERZO = "almuerzo"
    COMIDA = "comida"
    MERIENDA = "merienda"
    CENA = "cena"
    SNACK_PRE = "snack_pre"
    SNACK_POST = "snack_post"


class ContextoNutricional(str, Enum):
    DIA_NORMAL = "dia_normal"
    PRE_PARTIDO = "pre_partido"
    POST_PARTIDO = "post_partido"
    DIA_DESCANSO = "dia_descanso"
    VIAJE = "viaje"
    CUALQUIERA = "cualquiera"


# ============ Perfil Nutricional ============

class PerfilNutricionalCreate(BaseModel):
    jugador_id: UUID
    equipo_id: UUID
    peso_kg: Optional[float] = None
    altura_cm: Optional[float] = None
    porcentaje_grasa: Optional[float] = None
    masa_muscular_kg: Optional[float] = None
    metabolismo_basal_kcal: Optional[int] = None
    objetivo: Optional[ObjetivoNutricional] = None
    alergias: Optional[List[str]] = None
    intolerancias: Optional[List[str]] = None
    preferencias_dieta: Optional[str] = None
    notas: Optional[str] = None


class PerfilNutricionalUpdate(BaseModel):
    peso_kg: Optional[float] = None
    altura_cm: Optional[float] = None
    porcentaje_grasa: Optional[float] = None
    masa_muscular_kg: Optional[float] = None
    metabolismo_basal_kcal: Optional[int] = None
    objetivo: Optional[ObjetivoNutricional] = None
    alergias: Optional[List[str]] = None
    intolerancias: Optional[List[str]] = None
    preferencias_dieta: Optional[str] = None
    notas: Optional[str] = None


class PerfilNutricionalResponse(BaseModel):
    id: UUID
    jugador_id: UUID
    equipo_id: UUID
    peso_kg: Optional[float] = None
    altura_cm: Optional[float] = None
    porcentaje_grasa: Optional[float] = None
    masa_muscular_kg: Optional[float] = None
    metabolismo_basal_kcal: Optional[int] = None
    objetivo: Optional[str] = None
    alergias: Optional[List[str]] = None
    intolerancias: Optional[List[str]] = None
    preferencias_dieta: Optional[str] = None
    notas: Optional[str] = None
    updated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Plantilla Nutricional ============

class AlimentoItem(BaseModel):
    nombre: str
    cantidad_g: Optional[float] = None
    calorias: Optional[int] = None
    proteinas_g: Optional[float] = None
    carbohidratos_g: Optional[float] = None
    grasas_g: Optional[float] = None


class PlantillaNutricionalCreate(BaseModel):
    equipo_id: UUID
    nombre: str = Field(..., min_length=1, max_length=255)
    tipo_comida: TipoComida
    contexto: Optional[ContextoNutricional] = None
    descripcion: Optional[str] = None
    alimentos: List[AlimentoItem] = []
    calorias_total: Optional[int] = None
    proteinas_total_g: Optional[float] = None
    carbohidratos_total_g: Optional[float] = None
    grasas_total_g: Optional[float] = None
    notas: Optional[str] = None


class PlantillaNutricionalUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=255)
    tipo_comida: Optional[TipoComida] = None
    contexto: Optional[ContextoNutricional] = None
    descripcion: Optional[str] = None
    alimentos: Optional[List[AlimentoItem]] = None
    calorias_total: Optional[int] = None
    proteinas_total_g: Optional[float] = None
    carbohidratos_total_g: Optional[float] = None
    grasas_total_g: Optional[float] = None
    notas: Optional[str] = None


class PlantillaNutricionalResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    nombre: str
    tipo_comida: str
    contexto: Optional[str] = None
    descripcion: Optional[str] = None
    alimentos: list = []
    calorias_total: Optional[int] = None
    proteinas_total_g: Optional[float] = None
    carbohidratos_total_g: Optional[float] = None
    grasas_total_g: Optional[float] = None
    notas: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Plan Nutricional Dia ============

class ComidaPlan(BaseModel):
    tipo_comida: str
    plantilla_id: Optional[str] = None
    nombre: str
    alimentos: List[AlimentoItem] = []
    calorias: Optional[int] = None
    proteinas_g: Optional[float] = None
    carbos_g: Optional[float] = None
    grasas_g: Optional[float] = None
    hora_sugerida: Optional[str] = None


class PlanNutricionalDiaCreate(BaseModel):
    equipo_id: UUID
    jugador_id: Optional[UUID] = None
    fecha: date
    contexto: Optional[ContextoNutricional] = None
    comidas: List[ComidaPlan] = []
    calorias_objetivo: Optional[int] = None
    proteinas_objetivo_g: Optional[float] = None
    carbohidratos_objetivo_g: Optional[float] = None
    grasas_objetivo_g: Optional[float] = None
    hidratacion_litros: Optional[float] = None
    notas: Optional[str] = None


class PlanNutricionalDiaUpdate(BaseModel):
    jugador_id: Optional[UUID] = None
    fecha: Optional[date] = None
    contexto: Optional[ContextoNutricional] = None
    comidas: Optional[List[ComidaPlan]] = None
    calorias_objetivo: Optional[int] = None
    proteinas_objetivo_g: Optional[float] = None
    carbohidratos_objetivo_g: Optional[float] = None
    grasas_objetivo_g: Optional[float] = None
    hidratacion_litros: Optional[float] = None
    notas: Optional[str] = None


class PlanNutricionalDiaResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    jugador_id: Optional[UUID] = None
    fecha: date
    contexto: Optional[str] = None
    comidas: list = []
    calorias_objetivo: Optional[int] = None
    proteinas_objetivo_g: Optional[float] = None
    carbohidratos_objetivo_g: Optional[float] = None
    grasas_objetivo_g: Optional[float] = None
    hidratacion_litros: Optional[float] = None
    notas: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Suplementacion ============

class SuplementacionCreate(BaseModel):
    jugador_id: UUID
    equipo_id: UUID
    nombre: str = Field(..., min_length=1, max_length=255)
    dosis: Optional[str] = None
    frecuencia: Optional[str] = None
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    activo: bool = True
    notas: Optional[str] = None


class SuplementacionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=255)
    dosis: Optional[str] = None
    frecuencia: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activo: Optional[bool] = None
    notas: Optional[str] = None


class SuplementacionResponse(BaseModel):
    id: UUID
    jugador_id: UUID
    equipo_id: UUID
    nombre: str
    dosis: Optional[str] = None
    frecuencia: Optional[str] = None
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    activo: bool = True
    notas: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Composicion Corporal ============

class ComposicionCorporalCreate(BaseModel):
    jugador_id: UUID
    equipo_id: UUID
    fecha: date
    peso_kg: float
    porcentaje_grasa: Optional[float] = None
    masa_muscular_kg: Optional[float] = None
    imc: Optional[float] = None
    agua_corporal_pct: Optional[float] = None
    notas: Optional[str] = None


class ComposicionCorporalResponse(BaseModel):
    id: UUID
    jugador_id: UUID
    equipo_id: UUID
    fecha: date
    peso_kg: float
    porcentaje_grasa: Optional[float] = None
    masa_muscular_kg: Optional[float] = None
    imc: Optional[float] = None
    agua_corporal_pct: Optional[float] = None
    notas: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Overview (aggregated) ============

class NutricionOverviewResponse(BaseModel):
    perfil: Optional[PerfilNutricionalResponse] = None
    plan_hoy: Optional[PlanNutricionalDiaResponse] = None
    suplementos_activos: List[SuplementacionResponse] = []
    ultima_composicion: Optional[ComposicionCorporalResponse] = None
    peso_trend: List[dict] = []  # [{fecha, peso_kg}]
    recomendaciones: List[dict] = []  # [{tipo, mensaje, prioridad}]
