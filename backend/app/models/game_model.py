"""
Modelos Pydantic para el Modelo de Juego (Game Model Builder).
Incluye GameModelCreate, GameModelUpdate y GameModelResponse.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class GameModelCreate(BaseModel):
    equipo_id: UUID
    nombre: str = "Modelo de Juego"
    sistema_juego: Optional[str] = None
    estilo: Optional[str] = None
    descripcion_general: Optional[str] = None
    principios_ataque_organizado: Optional[list] = None
    principios_defensa_organizada: Optional[list] = None
    principios_transicion_of: Optional[list] = None
    principios_transicion_def: Optional[list] = None
    principios_balon_parado: Optional[list] = None
    subprincipios: Optional[dict] = None
    roles_posicionales: Optional[dict] = None
    pressing_tipo: Optional[str] = None
    salida_balon: Optional[str] = None


class GameModelUpdate(BaseModel):
    nombre: Optional[str] = None
    sistema_juego: Optional[str] = None
    estilo: Optional[str] = None
    descripcion_general: Optional[str] = None
    principios_ataque_organizado: Optional[list] = None
    principios_defensa_organizada: Optional[list] = None
    principios_transicion_of: Optional[list] = None
    principios_transicion_def: Optional[list] = None
    principios_balon_parado: Optional[list] = None
    subprincipios: Optional[dict] = None
    roles_posicionales: Optional[dict] = None
    pressing_tipo: Optional[str] = None
    salida_balon: Optional[str] = None


class GameModelResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    created_by: Optional[UUID] = None
    nombre: str
    sistema_juego: Optional[str] = None
    estilo: Optional[str] = None
    descripcion_general: Optional[str] = None
    principios_ataque_organizado: Optional[list] = None
    principios_defensa_organizada: Optional[list] = None
    principios_transicion_of: Optional[list] = None
    principios_transicion_def: Optional[list] = None
    principios_balon_parado: Optional[list] = None
    subprincipios: Optional[dict] = None
    roles_posicionales: Optional[dict] = None
    pressing_tipo: Optional[str] = None
    salida_balon: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
