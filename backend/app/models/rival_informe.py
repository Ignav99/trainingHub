"""
TrainingHub Pro - Rival Informe Models
Versioned AI reports per rival.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class RivalInformeResponse(BaseModel):
    id: UUID
    rival_id: UUID
    partido_id: Optional[UUID] = None
    tipo: str
    contenido: dict
    intel_snapshot: Optional[dict] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
