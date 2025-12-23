"""
TrainingHub Pro - Router de Rivales
CRUD para equipos rivales.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from math import ceil

from app.models import (
    RivalCreate,
    RivalUpdate,
    RivalResponse,
    RivalListResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=RivalListResponse)
async def list_rivales(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    busqueda: Optional[str] = None,
    orden: str = Query("nombre", pattern="^(nombre|created_at)$"),
    direccion: str = Query("asc", pattern="^(asc|desc)$"),
    current_user = Depends(get_current_user),
):
    """
    Lista todos los rivales de la organización.
    """
    supabase = get_supabase()

    query = supabase.table("rivales").select("*", count="exact")

    # Filtrar por organización del usuario
    query = query.eq("organizacion_id", str(current_user.organizacion_id))

    # Búsqueda
    if busqueda:
        query = query.or_(f"nombre.ilike.%{busqueda}%,ciudad.ilike.%{busqueda}%")

    # Ordenación
    query = query.order(orden, desc=(direccion == "desc"))

    # Paginación
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return RivalListResponse(
        data=[RivalResponse(**r) for r in response.data],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{rival_id}", response_model=RivalResponse)
async def get_rival(
    rival_id: UUID,
    current_user = Depends(get_current_user),
):
    """
    Obtiene un rival por ID.
    """
    supabase = get_supabase()

    response = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    # Verificar que pertenece a la organización
    if response.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este rival"
        )

    return RivalResponse(**response.data)


@router.post("", response_model=RivalResponse, status_code=status.HTTP_201_CREATED)
async def create_rival(
    rival: RivalCreate,
    current_user = Depends(get_current_user),
):
    """
    Crea un nuevo rival.
    """
    supabase = get_supabase()

    rival_data = rival.model_dump(exclude_unset=True)
    rival_data["organizacion_id"] = str(current_user.organizacion_id)

    response = supabase.table("rivales").insert(rival_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear rival"
        )

    return RivalResponse(**response.data[0])


@router.put("/{rival_id}", response_model=RivalResponse)
async def update_rival(
    rival_id: UUID,
    rival: RivalUpdate,
    current_user = Depends(get_current_user),
):
    """
    Actualiza un rival existente.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    # Verificar permisos
    if existing.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este rival"
        )

    update_data = rival.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("rivales").update(update_data).eq(
        "id", str(rival_id)
    ).execute()

    return RivalResponse(**response.data[0])


@router.delete("/{rival_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rival(
    rival_id: UUID,
    current_user = Depends(get_current_user),
):
    """
    Elimina un rival.
    No se puede eliminar si tiene partidos asociados.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    # Verificar permisos
    if existing.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este rival"
        )

    # Verificar si tiene partidos asociados
    partidos = supabase.table("partidos").select("id").eq(
        "rival_id", str(rival_id)
    ).execute()

    if partidos.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar: el rival tiene {len(partidos.data)} partidos asociados"
        )

    supabase.table("rivales").delete().eq("id", str(rival_id)).execute()

    return None
