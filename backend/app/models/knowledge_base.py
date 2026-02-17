"""
TrainingHub Pro - Modelos de Knowledge Base
Base de conocimiento con embeddings vectoriales.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


# ============ Enums ============

class TipoDocumentoKB(str, Enum):
    """Tipos de documento en KB."""
    MANUAL = "manual"
    PDF = "pdf"
    URL = "url"
    SEED = "seed"


class EstadoDocumentoKB(str, Enum):
    """Estados de procesamiento de documento."""
    PENDIENTE = "pendiente"
    PROCESANDO = "procesando"
    INDEXADO = "indexado"
    ERROR = "error"


# ============ Documento KB ============

class DocumentoKBBase(BaseModel):
    """Schema base de documento KB."""
    titulo: str = Field(..., min_length=1, max_length=255)
    fuente: Optional[str] = Field(None, max_length=255)
    tipo: TipoDocumentoKB = TipoDocumentoKB.MANUAL
    contenido_texto: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class DocumentoKBCreate(DocumentoKBBase):
    """Schema para crear documento KB."""
    pass


class DocumentoKBResponse(DocumentoKBBase):
    """Schema de respuesta de documento KB."""
    id: UUID
    organizacion_id: Optional[UUID] = None
    archivo_url: Optional[str] = None
    estado: EstadoDocumentoKB = EstadoDocumentoKB.PENDIENTE
    num_chunks: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Chunk KB ============

class ChunkKBResponse(BaseModel):
    """Schema de respuesta de chunk KB."""
    id: UUID
    documento_id: UUID
    contenido: str
    posicion: int
    metadata: dict = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Búsqueda KB ============

class KBSearchRequest(BaseModel):
    """Request para búsqueda en KB."""
    query: str = Field(..., min_length=1, max_length=500)
    limite: int = Field(default=5, ge=1, le=20)
    umbral_similitud: float = Field(default=0.7, ge=0, le=1)


class KBSearchResult(BaseModel):
    """Un resultado de búsqueda en KB."""
    chunk: ChunkKBResponse
    similitud: float
    documento_titulo: Optional[str] = None


class KBSearchResponse(BaseModel):
    """Response de búsqueda en KB."""
    resultados: List[KBSearchResult]
    query: str
    total: int
