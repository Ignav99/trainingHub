"""
TrainingHub Pro - Modelos de Invitaciones y Transferencias
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class EstadoInvitacion(str, Enum):
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    EXPIRADA = "expirada"
    REVOCADA = "revocada"


class EstadoTransferencia(str, Enum):
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    EXPIRADA = "expirada"


# ============ Invitaciones ============

class InvitacionCreate(BaseModel):
    """Schema para crear invitacion."""
    email: EmailStr
    nombre: Optional[str] = Field(None, max_length=255)
    equipo_id: Optional[UUID] = None
    rol_organizacion: Optional[str] = None
    rol_en_equipo: Optional[str] = None
    es_invitacion_tutor: bool = False
    jugador_id: Optional[UUID] = None


class InvitacionResponse(BaseModel):
    """Schema de respuesta de invitacion."""
    id: UUID
    email: str
    nombre: Optional[str] = None
    organizacion_id: UUID
    equipo_id: Optional[UUID] = None
    rol_organizacion: Optional[str] = None
    rol_en_equipo: Optional[str] = None
    token: Optional[str] = None
    estado: EstadoInvitacion
    expira_en: datetime
    invitado_por: UUID
    aceptado_por: Optional[UUID] = None
    fecha_respuesta: Optional[datetime] = None
    reinvitaciones: int = 0
    ultimo_reenvio: Optional[datetime] = None
    es_invitacion_tutor: bool = False
    jugador_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvitacionListResponse(BaseModel):
    data: List[InvitacionResponse]
    total: int


class InvitacionVerifyResponse(BaseModel):
    """Info devuelta al verificar un token de invitacion."""
    email: str
    organizacion_nombre: str
    equipo_nombre: Optional[str] = None
    rol_en_equipo: Optional[str] = None
    rol_organizacion: Optional[str] = None
    invitado_por_nombre: str
    es_invitacion_tutor: bool = False
    jugador_nombre: Optional[str] = None


class InvitacionAcceptRequest(BaseModel):
    """Schema para aceptar invitacion (usuario nuevo)."""
    token: str
    nombre: str = Field(..., min_length=2, max_length=255)
    apellidos: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)  # None if existing user


# ============ Transferencias de Propiedad ============

class TransferenciaCreate(BaseModel):
    """Schema para iniciar transferencia de propiedad."""
    equipo_id: UUID
    a_usuario_id: UUID


class TransferenciaResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    de_usuario_id: UUID
    a_usuario_id: UUID
    estado: EstadoTransferencia
    expira_en: datetime
    created_at: datetime
    fecha_respuesta: Optional[datetime] = None

    class Config:
        from_attributes = True
