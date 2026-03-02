"""
TrainingHub Pro - Modelos de AI Chat
Conversaciones con asistente de IA.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


# ============ Enums ============

class RolMensajeAI(str, Enum):
    """Roles en conversación con IA."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ============ AI Conversación ============

class AIConversacionBase(BaseModel):
    """Schema base de conversación AI."""
    equipo_id: Optional[UUID] = None
    titulo: Optional[str] = Field(None, max_length=255)
    contexto: dict = Field(default_factory=dict)


class AIConversacionCreate(AIConversacionBase):
    """Schema para crear conversación AI."""
    pass


class AIConversacionResponse(AIConversacionBase):
    """Schema de respuesta de conversación AI."""
    id: UUID
    usuario_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ AI Mensaje ============

class AIMensajeBase(BaseModel):
    """Schema base de mensaje AI."""
    rol: RolMensajeAI
    contenido: str = Field(..., min_length=1)


class AIMensajeCreate(AIMensajeBase):
    """Schema para crear mensaje AI."""
    conversacion_id: UUID


class AIMensajeResponse(AIMensajeBase):
    """Schema de respuesta de mensaje AI."""
    id: UUID
    conversacion_id: UUID
    herramientas_usadas: list = Field(default_factory=list)
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    cache_read_input_tokens: Optional[int] = None
    cache_creation_input_tokens: Optional[int] = None
    modelo: Optional[str] = None
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ AI Chat Request/Response ============

class AIChatRequest(BaseModel):
    """Request para chat con IA."""
    mensaje: str = Field(..., min_length=1, max_length=2000)
    conversacion_id: Optional[UUID] = None
    equipo_id: Optional[UUID] = None
    contexto: dict = Field(default_factory=dict)


class AIChatResponse(BaseModel):
    """Response del chat con IA."""
    conversacion_id: UUID
    mensaje: str
    herramientas_usadas: list = Field(default_factory=list)
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
