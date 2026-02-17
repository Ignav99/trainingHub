"""
TrainingHub Pro - Router de Notificaciones
Gestión de notificaciones del usuario.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from math import ceil

from app.models import (
    NotificacionResponse,
    NotificacionListResponse,
    UsuarioResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=NotificacionListResponse)
async def list_notificaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    solo_no_leidas: bool = False,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista notificaciones del usuario actual."""
    supabase = get_supabase()

    query = supabase.table("notificaciones").select(
        "*", count="exact"
    ).eq("usuario_id", str(current_user.id))

    if solo_no_leidas:
        query = query.eq("leida", False)

    query = query.order("created_at", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return NotificacionListResponse(
        data=[NotificacionResponse(**n) for n in response.data],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/count")
async def count_no_leidas(
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Cuenta notificaciones no leídas."""
    supabase = get_supabase()

    response = supabase.table("notificaciones").select(
        "id", count="exact"
    ).eq("usuario_id", str(current_user.id)).eq("leida", False).execute()

    return {"no_leidas": response.count or 0}


@router.put("/{notificacion_id}/leer")
async def marcar_leida(
    notificacion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Marca una notificación como leída."""
    supabase = get_supabase()

    response = supabase.table("notificaciones").update(
        {"leida": True}
    ).eq("id", str(notificacion_id)).eq(
        "usuario_id", str(current_user.id)
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )

    return {"message": "Notificación marcada como leída"}


@router.put("/leer-todas")
async def marcar_todas_leidas(
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Marca todas las notificaciones como leídas."""
    supabase = get_supabase()

    supabase.table("notificaciones").update(
        {"leida": True}
    ).eq("usuario_id", str(current_user.id)).eq("leida", False).execute()

    return {"message": "Todas las notificaciones marcadas como leídas"}


@router.delete("/{notificacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notificacion(
    notificacion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina una notificación."""
    supabase = get_supabase()

    supabase.table("notificaciones").delete().eq(
        "id", str(notificacion_id)
    ).eq("usuario_id", str(current_user.id)).execute()

    return None
