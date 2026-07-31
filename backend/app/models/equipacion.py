"""
TrainingHub Pro - Modelo de Equipacion (kit)
Equipacion (camiseta/pantalon/medias) para un rival o para el club (organizacion).
Nunca ambos a la vez -- ver constraint equipaciones_un_solo_dueno en la migracion 073.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

PatronCamiseta = Literal["solido", "rayas_verticales", "franjas_horizontales", "mangas_diferentes", "degradado"]
TipoEquipacion = Literal["local", "visitante"]


class EquipacionBase(BaseModel):
    tipo: TipoEquipacion = "local"
    color_camiseta_principal: str = Field(..., pattern="^#[0-9a-fA-F]{6}$")
    color_camiseta_secundario: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    patron_camiseta: PatronCamiseta = "solido"
    color_pantalon: str = Field(..., pattern="^#[0-9a-fA-F]{6}$")
    color_medias: str = Field(..., pattern="^#[0-9a-fA-F]{6}$")


class EquipacionUpsert(EquipacionBase):
    pass


class EquipacionResponse(EquipacionBase):
    id: UUID
    rival_id: Optional[UUID] = None
    organizacion_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
