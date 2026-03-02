"""
TrainingHub Pro - Dependencias
Funciones de dependencia para inyeccion en endpoints.
Mantiene compatibilidad con el sistema anterior mientras integra el nuevo sistema de permisos.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.database import get_supabase
from app.models import UsuarioResponse

# Re-export from new security module for backwards compatibility
from app.security.dependencies import (
    get_current_user_from_token,
    require_permission,
    require_any_permission,
    AuthContext,
)

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UsuarioResponse:
    """
    Obtiene el usuario actual a partir del token JWT.
    Wrapper de compatibilidad que delega al nuevo sistema.
    """
    return await get_current_user_from_token(credentials)


async def get_current_admin_user(
    current_user: UsuarioResponse = Depends(get_current_user),
) -> UsuarioResponse:
    """
    Verifica que el usuario actual es administrador.
    Ahora soporta superadmin_plataforma y admin.
    """
    admin_roles = {"admin", "superadmin_plataforma"}
    if current_user.rol not in admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[UsuarioResponse]:
    """
    Obtiene el usuario actual si hay token, None si no.
    Util para endpoints que funcionan con o sin auth.
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
