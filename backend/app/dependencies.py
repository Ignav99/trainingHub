"""
TrainingHub Pro - Dependencias
Funciones de dependencia para inyección en endpoints.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.database import get_supabase
from app.models import UsuarioResponse

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UsuarioResponse:
    """
    Obtiene el usuario actual a partir del token JWT.
    
    Valida el token con Supabase y obtiene los datos del usuario.
    """
    token = credentials.credentials
    
    try:
        supabase = get_supabase()
        
        # Verificar token con Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = user_response.user.id
        
        # Obtener datos del usuario de nuestra tabla
        db_user = supabase.table("usuarios").select(
            "*, organizaciones(*)"
        ).eq("id", user_id).single().execute()
        
        if not db_user.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado en la base de datos",
            )
        
        # Verificar que el usuario está activo
        if not db_user.data.get("activo", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario desactivado",
            )
        
        # Mapear organización
        user_data = db_user.data
        user_data["organizacion"] = user_data.pop("organizaciones", None)
        
        return UsuarioResponse(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticación: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_admin_user(
    current_user: UsuarioResponse = Depends(get_current_user),
) -> UsuarioResponse:
    """
    Verifica que el usuario actual es administrador.
    """
    if current_user.rol != "admin":
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
    Útil para endpoints que funcionan con o sin auth.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
