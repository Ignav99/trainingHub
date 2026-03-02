"""
TrainingHub Pro - Modelos de Planes y Suscripciones
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class TipoLicencia(str, Enum):
    EQUIPO = "equipo"
    CLUB = "club"


class EstadoSuscripcion(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    GRACE_PERIOD = "grace_period"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class CicloSuscripcion(str, Enum):
    MENSUAL = "mensual"
    ANUAL = "anual"


class AccionHistorial(str, Enum):
    CREATED = "created"
    UPGRADED = "upgraded"
    DOWNGRADED = "downgraded"
    RENEWED = "renewed"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"
    REACTIVATED = "reactivated"


# ============ Planes ============

class PlanResponse(BaseModel):
    """Schema de respuesta de plan."""
    id: UUID
    codigo: str
    nombre: str
    tipo_licencia: TipoLicencia
    max_equipos: int
    max_usuarios_por_equipo: int
    max_jugadores_por_equipo: int
    max_storage_mb: int
    max_ai_calls_month: int
    max_kb_documents: int
    features: dict = {}
    precio_mensual_cents: int
    precio_anual_cents: int
    dias_prueba: int = 0
    orden: int = 0
    activo: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlanListResponse(BaseModel):
    data: List[PlanResponse]


# ============ Suscripciones ============

class SuscripcionResponse(BaseModel):
    """Schema de respuesta de suscripcion."""
    id: UUID
    organizacion_id: UUID
    plan_id: UUID
    estado: EstadoSuscripcion
    ciclo: CicloSuscripcion
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    fecha_proximo_pago: Optional[datetime] = None
    fecha_cancelacion: Optional[datetime] = None
    fecha_gracia_fin: Optional[datetime] = None
    trial_fin: Optional[datetime] = None
    trial_convertido: bool = False
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    uso_equipos: int = 0
    uso_storage_mb: int = 0
    uso_ai_calls_month: int = 0
    uso_ai_calls_reset_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Nested plan info
    plan: Optional[PlanResponse] = None

    class Config:
        from_attributes = True


class SuscripcionCreate(BaseModel):
    """Schema para crear suscripcion."""
    plan_id: UUID
    ciclo: CicloSuscripcion = CicloSuscripcion.MENSUAL


class SuscripcionUpdate(BaseModel):
    """Schema para actualizar suscripcion."""
    plan_id: Optional[UUID] = None
    ciclo: Optional[CicloSuscripcion] = None


class SuscripcionUpgrade(BaseModel):
    """Schema para upgrade de plan."""
    nuevo_plan_codigo: str
    ciclo: CicloSuscripcion = CicloSuscripcion.MENSUAL


class CheckoutSessionRequest(BaseModel):
    """Schema para crear checkout session de Stripe."""
    plan_codigo: str
    ciclo: CicloSuscripcion = CicloSuscripcion.MENSUAL
    success_url: str
    cancel_url: str


class CheckoutSessionResponse(BaseModel):
    """Respuesta con URL de checkout."""
    checkout_url: str
    session_id: str


# ============ Historial ============

class HistorialSuscripcionResponse(BaseModel):
    id: UUID
    organizacion_id: UUID
    plan_anterior_id: Optional[UUID] = None
    plan_nuevo_id: Optional[UUID] = None
    accion: AccionHistorial
    motivo: Optional[str] = None
    metadata: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True


class HistorialListResponse(BaseModel):
    data: List[HistorialSuscripcionResponse]


# ============ Usage ============

class UsageResponse(BaseModel):
    """Current usage vs limits."""
    equipos: int = 0
    max_equipos: int = 1
    storage_mb: int = 0
    max_storage_mb: int = 500
    ai_calls_month: int = 0
    max_ai_calls_month: int = 50
    kb_documents: int = 0
    max_kb_documents: int = 10
    staff_count: Optional[int] = None
    max_staff_per_team: int = 5
    player_count: Optional[int] = None
    max_players_per_team: int = 25
