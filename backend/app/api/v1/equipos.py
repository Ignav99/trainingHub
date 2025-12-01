"""
TrainingHub Pro - Router de Equipos
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from uuid import UUID

from app.models import (
    EquipoCreate,
    EquipoUpdate,
    EquipoResponse,
    EquipoListResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=EquipoListResponse)
async def list_equipos(current_user = Depends(get_current_user)):
    """Lista equipos de la organización del usuario."""
    supabase = get_supabase()
    response = supabase.table("equipos").select("*").eq(
        "organizacion_id", str(current_user.organizacion_id)
    ).eq("activo", True).execute()
    
    return EquipoListResponse(data=response.data, total=len(response.data))


@router.get("/{equipo_id}", response_model=EquipoResponse)
async def get_equipo(equipo_id: UUID, current_user = Depends(get_current_user)):
    """Obtiene un equipo por ID."""
    supabase = get_supabase()
    response = supabase.table("equipos").select("*").eq("id", str(equipo_id)).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    return EquipoResponse(**response.data)


@router.post("", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
async def create_equipo(equipo: EquipoCreate, current_user = Depends(get_current_user)):
    """Crea un nuevo equipo (solo admin)."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear equipos")
    
    supabase = get_supabase()
    data = equipo.model_dump()
    data["organizacion_id"] = str(data["organizacion_id"])
    
    response = supabase.table("equipos").insert(data).execute()
    return EquipoResponse(**response.data[0])


@router.put("/{equipo_id}", response_model=EquipoResponse)
async def update_equipo(equipo_id: UUID, equipo: EquipoUpdate, current_user = Depends(get_current_user)):
    """Actualiza un equipo (solo admin)."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar equipos")
    
    supabase = get_supabase()
    data = equipo.model_dump(exclude_unset=True)
    
    response = supabase.table("equipos").update(data).eq("id", str(equipo_id)).execute()
    return EquipoResponse(**response.data[0])


@router.delete("/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipo(equipo_id: UUID, current_user = Depends(get_current_user)):
    """Desactiva un equipo (solo admin)."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar equipos")
    
    supabase = get_supabase()
    supabase.table("equipos").update({"activo": False}).eq("id", str(equipo_id)).execute()
    return None
