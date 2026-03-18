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
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.security.license_checker import LicenseChecker

router = APIRouter()


@router.get("", response_model=EquipoListResponse)
async def list_equipos(auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ))):
    """Lista equipos de la organizacion del usuario."""
    supabase = get_supabase()
    response = supabase.table("equipos").select("*").eq(
        "organizacion_id", auth.organizacion_id
    ).eq("activo", True).execute()

    return EquipoListResponse(data=response.data, total=len(response.data))


@router.get("/{equipo_id}", response_model=EquipoResponse)
async def get_equipo(equipo_id: UUID, auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ, equipo_id_param="equipo_id"))):
    """Obtiene un equipo por ID."""
    supabase = get_supabase()
    response = supabase.table("equipos").select("*").eq("id", str(equipo_id)).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    return EquipoResponse(**response.data)


@router.post("", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
async def create_equipo(equipo: EquipoCreate, auth: AuthContext = Depends(require_permission(Permission.CONFIG_TEAM))):
    """Crea un nuevo equipo."""
    # Check team limit for the organization's plan
    allowed, msg = LicenseChecker.check_team_limit(auth.organizacion_id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    supabase = get_supabase()
    data = equipo.model_dump()
    # Always use auth context for organizacion_id
    data["organizacion_id"] = auth.organizacion_id

    response = supabase.table("equipos").insert(data).execute()
    return EquipoResponse(**response.data[0])


@router.put("/{equipo_id}", response_model=EquipoResponse)
async def update_equipo(equipo_id: UUID, equipo: EquipoUpdate, auth: AuthContext = Depends(require_permission(Permission.CONFIG_TEAM, equipo_id_param="equipo_id"))):
    """Actualiza un equipo."""
    supabase = get_supabase()
    data = equipo.model_dump(exclude_unset=True)

    supabase.table("equipos").update(data).eq("id", str(equipo_id)).execute()
    response = supabase.table("equipos").select("*").eq("id", str(equipo_id)).single().execute()
    return EquipoResponse(**response.data)


@router.delete("/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipo(equipo_id: UUID, auth: AuthContext = Depends(require_permission(Permission.CONFIG_TEAM, equipo_id_param="equipo_id"))):
    """Desactiva un equipo."""
    supabase = get_supabase()
    supabase.table("equipos").update({"activo": False}).eq("id", str(equipo_id)).execute()
    return None
