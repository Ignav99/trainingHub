"""
TrainingHub Pro - Modelos de Usuario, Equipo y Organización
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class RolUsuario(str, Enum):
    """Roles de usuario en el sistema."""
    ADMIN = "admin"
    TECNICO_PRINCIPAL = "tecnico_principal"
    TECNICO_ASISTENTE = "tecnico_asistente"
    VISUALIZADOR = "visualizador"


class RolEnEquipo(str, Enum):
    """Roles específicos dentro de un equipo."""
    ENTRENADOR_PRINCIPAL = "entrenador_principal"
    SEGUNDO_ENTRENADOR = "segundo_entrenador"
    PREPARADOR_FISICO = "preparador_fisico"
    ENTRENADOR_PORTEROS = "entrenador_porteros"
    ANALISTA = "analista"
    DELEGADO = "delegado"


# ============ Organización ============

class OrganizacionBase(BaseModel):
    """Schema base de organización."""
    nombre: str = Field(..., min_length=2, max_length=255)
    color_primario: str = Field(default="#1a365d", pattern="^#[0-9A-Fa-f]{6}$")
    color_secundario: str = Field(default="#ffffff", pattern="^#[0-9A-Fa-f]{6}$")
    config: dict = Field(default_factory=dict)


class OrganizacionCreate(OrganizacionBase):
    """Schema para crear organización."""
    pass


class OrganizacionUpdate(BaseModel):
    """Schema para actualizar organización."""
    nombre: Optional[str] = Field(None, min_length=2, max_length=255)
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None
    config: Optional[dict] = None


class OrganizacionResponse(OrganizacionBase):
    """Schema de respuesta de organización."""
    id: UUID
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Equipo ============

class EquipoBase(BaseModel):
    """Schema base de equipo."""
    nombre: str = Field(..., min_length=2, max_length=255)
    categoria: Optional[str] = Field(None, max_length=100)
    temporada: Optional[str] = Field(None, max_length=20)
    num_jugadores_plantilla: int = Field(default=22, ge=5, le=50)
    sistema_juego: str = Field(default="1-4-3-3", max_length=20)
    config: dict = Field(default_factory=dict)


class EquipoCreate(EquipoBase):
    """Schema para crear equipo."""
    organizacion_id: UUID


class EquipoUpdate(BaseModel):
    """Schema para actualizar equipo."""
    nombre: Optional[str] = Field(None, min_length=2, max_length=255)
    categoria: Optional[str] = None
    temporada: Optional[str] = None
    num_jugadores_plantilla: Optional[int] = None
    sistema_juego: Optional[str] = None
    config: Optional[dict] = None
    activo: Optional[bool] = None


class EquipoResponse(EquipoBase):
    """Schema de respuesta de equipo."""
    id: UUID
    organizacion_id: UUID
    activo: bool
    created_at: datetime
    updated_at: datetime
    
    # Estadísticas
    num_sesiones: Optional[int] = None
    num_tareas: Optional[int] = None
    
    class Config:
        from_attributes = True


class EquipoListResponse(BaseModel):
    """Schema para lista de equipos."""
    data: List[EquipoResponse]
    total: int


# ============ Usuario ============

class UsuarioBase(BaseModel):
    """Schema base de usuario."""
    email: EmailStr
    nombre: str = Field(..., min_length=2, max_length=255)
    apellidos: Optional[str] = Field(None, max_length=255)
    rol: RolUsuario = Field(default=RolUsuario.TECNICO_ASISTENTE)
    config: dict = Field(default_factory=dict)


class UsuarioCreate(UsuarioBase):
    """Schema para crear usuario (registro)."""
    password: str = Field(..., min_length=8)
    organizacion_nombre: Optional[str] = None  # Si crea nueva org


class UsuarioUpdate(BaseModel):
    """Schema para actualizar usuario."""
    nombre: Optional[str] = Field(None, min_length=2, max_length=255)
    apellidos: Optional[str] = None
    config: Optional[dict] = None


class UsuarioUpdateAdmin(UsuarioUpdate):
    """Schema para que admin actualice usuario."""
    rol: Optional[RolUsuario] = None
    activo: Optional[bool] = None


class UsuarioResponse(UsuarioBase):
    """Schema de respuesta de usuario."""
    id: UUID
    organizacion_id: Optional[UUID] = None  # Optional: user may not have org yet
    avatar_url: Optional[str] = None
    activo: bool = True  # Default to True if not set
    created_at: datetime
    updated_at: datetime

    # Equipos del usuario
    equipos: List[EquipoResponse] = []

    # Organización
    organizacion: Optional[OrganizacionResponse] = None

    class Config:
        from_attributes = True


class UsuarioListResponse(BaseModel):
    """Schema para lista de usuarios."""
    data: List[UsuarioResponse]
    total: int


# ============ Relación Usuario-Equipo ============

class UsuarioEquipoBase(BaseModel):
    """Schema base de relación usuario-equipo."""
    usuario_id: UUID
    equipo_id: UUID
    rol_en_equipo: RolEnEquipo = Field(default=RolEnEquipo.SEGUNDO_ENTRENADOR)


class UsuarioEquipoCreate(UsuarioEquipoBase):
    """Schema para asignar usuario a equipo."""
    pass


class UsuarioEquipoResponse(UsuarioEquipoBase):
    """Schema de respuesta de relación."""
    id: UUID
    created_at: datetime
    
    usuario: Optional[UsuarioResponse] = None
    equipo: Optional[EquipoResponse] = None
    
    class Config:
        from_attributes = True


# ============ Auth ============

class LoginRequest(BaseModel):
    """Schema para login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema de respuesta de token."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UsuarioResponse


class RefreshTokenRequest(BaseModel):
    """Schema para refrescar token."""
    refresh_token: str
