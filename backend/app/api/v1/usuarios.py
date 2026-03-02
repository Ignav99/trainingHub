"""
TrainingHub Pro - Router de Usuarios
"""

from fastapi import APIRouter, HTTPException, Depends, status
from uuid import UUID

from app.models import (
    UsuarioResponse,
    UsuarioUpdate,
    UsuarioListResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.get("/me", response_model=UsuarioResponse)
async def get_current_user_info(
    auth: AuthContext = Depends(require_permission()),
):
    """Obtiene información del usuario actual."""
    return auth.user


@router.put("/me", response_model=UsuarioResponse)
async def update_current_user(
    usuario: UsuarioUpdate,
    auth: AuthContext = Depends(require_permission()),
):
    """Actualiza información del usuario actual."""
    supabase = get_supabase()
    data = usuario.model_dump(exclude_unset=True)

    response = supabase.table("usuarios").update(data).eq(
        "id", auth.user_id
    ).execute()

    return UsuarioResponse(**response.data[0])


@router.get("", response_model=UsuarioListResponse)
async def list_usuarios(
    auth: AuthContext = Depends(require_permission(Permission.CONFIG_TEAM)),
):
    """Lista usuarios de la organización."""
    supabase = get_supabase()
    response = supabase.table("usuarios").select("*").eq(
        "organizacion_id", auth.organizacion_id
    ).execute()

    return UsuarioListResponse(data=response.data, total=len(response.data))


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(
    usuario_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.CONFIG_TEAM)),
):
    """Obtiene un usuario por ID."""
    supabase = get_supabase()
    response = supabase.table("usuarios").select("*").eq("id", str(usuario_id)).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return UsuarioResponse(**response.data)
