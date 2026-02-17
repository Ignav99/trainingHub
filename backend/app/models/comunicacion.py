"""
TrainingHub Pro - Modelos de Comunicación
Chat interno, conversaciones y notificaciones.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


# ============ Enums ============

class TipoConversacion(str, Enum):
    """Tipos de conversación."""
    DIRECTA = "directa"
    GRUPO = "grupo"
    CANAL = "canal"


class TipoMensaje(str, Enum):
    """Tipos de mensaje."""
    TEXTO = "texto"
    IMAGEN = "imagen"
    ARCHIVO = "archivo"
    SISTEMA = "sistema"


class RolParticipante(str, Enum):
    """Roles en conversación."""
    ADMIN = "admin"
    MIEMBRO = "miembro"


class PrioridadNotificacion(str, Enum):
    """Prioridad de notificación."""
    BAJA = "baja"
    NORMAL = "normal"
    ALTA = "alta"
    URGENTE = "urgente"


# ============ Conversación ============

class ConversacionBase(BaseModel):
    """Schema base de conversación."""
    equipo_id: Optional[UUID] = None
    tipo: TipoConversacion
    nombre: Optional[str] = Field(None, max_length=255)


class ConversacionCreate(ConversacionBase):
    """Schema para crear conversación."""
    participantes: List[UUID] = Field(default_factory=list)


class ConversacionResponse(ConversacionBase):
    """Schema de respuesta de conversación."""
    id: UUID
    creado_por: UUID
    activa: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Mensaje ============

class MensajeBase(BaseModel):
    """Schema base de mensaje."""
    contenido: str = Field(..., min_length=1)
    tipo: TipoMensaje = TipoMensaje.TEXTO
    archivo_url: Optional[str] = None


class MensajeCreate(MensajeBase):
    """Schema para crear mensaje."""
    conversacion_id: UUID


class MensajeResponse(MensajeBase):
    """Schema de respuesta de mensaje."""
    id: UUID
    conversacion_id: UUID
    autor_id: UUID
    fijado: bool = False
    editado: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Participante ============

class ParticipanteResponse(BaseModel):
    """Schema de respuesta de participante."""
    id: UUID
    conversacion_id: UUID
    usuario_id: UUID
    rol: RolParticipante = RolParticipante.MIEMBRO
    ultimo_leido: Optional[datetime] = None
    silenciado: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Notificación ============

class NotificacionBase(BaseModel):
    """Schema base de notificación."""
    tipo: str = Field(..., max_length=50)
    titulo: str = Field(..., max_length=255)
    contenido: Optional[str] = None
    entidad_tipo: Optional[str] = Field(None, max_length=50)
    entidad_id: Optional[UUID] = None
    prioridad: PrioridadNotificacion = PrioridadNotificacion.NORMAL


class NotificacionCreate(NotificacionBase):
    """Schema para crear notificación."""
    usuario_id: UUID


class NotificacionResponse(NotificacionBase):
    """Schema de respuesta de notificación."""
    id: UUID
    usuario_id: UUID
    leida: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class NotificacionListResponse(BaseModel):
    """Respuesta paginada de notificaciones."""
    data: List[NotificacionResponse]
    total: int
    page: int
    limit: int
    pages: int
