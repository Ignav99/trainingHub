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
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/me", response_model=UsuarioResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Obtiene información del usuario actual."""
    return current_user


@router.put("/me", response_model=UsuarioResponse)
async def update_current_user(
    usuario: UsuarioUpdate,
    current_user = Depends(get_current_user),
):
    """Actualiza información del usuario actual."""
    supabase = get_supabase()
    data = usuario.model_dump(exclude_unset=True)
    
    response = supabase.table("usuarios").update(data).eq(
        "id", str(current_user.id)
    ).execute()
    
    return UsuarioResponse(**response.data[0])


@router.get("", response_model=UsuarioListResponse)
async def list_usuarios(current_user = Depends(get_current_user)):
    """Lista usuarios de la organización (solo admin)."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    supabase = get_supabase()
    response = supabase.table("usuarios").select("*").eq(
        "organizacion_id", str(current_user.organizacion_id)
    ).execute()
    
    return UsuarioListResponse(data=response.data, total=len(response.data))


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(usuario_id: UUID, current_user = Depends(get_current_user)):
    """Obtiene un usuario por ID (solo admin)."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    supabase = get_supabase()
    response = supabase.table("usuarios").select("*").eq("id", str(usuario_id)).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return UsuarioResponse(**response.data)
