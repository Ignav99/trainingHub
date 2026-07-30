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
    NuevaTemporadaRequest,
    NuevaTemporadaResponse,
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
    response = supabase.table("equipos").select("*").eq("id", str(equipo_id)).eq(
        "organizacion_id", auth.organizacion_id
    ).limit(1).execute()

    if not response or not response.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    return EquipoResponse(**response.data[0])


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

    supabase.table("equipos").update(data).eq("id", str(equipo_id)).eq(
        "organizacion_id", auth.organizacion_id
    ).execute()
    response = supabase.table("equipos").select("*").eq("id", str(equipo_id)).eq(
        "organizacion_id", auth.organizacion_id
    ).limit(1).execute()

    if not response or not response.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    return EquipoResponse(**response.data[0])


@router.delete("/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipo(equipo_id: UUID, auth: AuthContext = Depends(require_permission(Permission.CONFIG_TEAM, equipo_id_param="equipo_id"))):
    """Desactiva un equipo."""
    supabase = get_supabase()
    supabase.table("equipos").update({"activo": False}).eq("id", str(equipo_id)).eq(
        "organizacion_id", auth.organizacion_id
    ).execute()
    return None


@router.post("/{equipo_id}/nueva-temporada", response_model=NuevaTemporadaResponse, status_code=status.HTTP_201_CREATED)
async def nueva_temporada(
    equipo_id: UUID,
    data: NuevaTemporadaRequest,
    auth: AuthContext = Depends(require_permission(Permission.CONFIG_TEAM, equipo_id_param="equipo_id")),
):
    """
    Crea la siguiente temporada de un equipo existente.

    No reutiliza el equipo_id: crea un equipo nuevo (mismo club, misma
    categoria/sistema/config), lo enlaza al anterior via temporada_anterior_id,
    y reasigna a el (jugadores.equipo_id) solo a los jugadores indicados en
    jugadores_continuan -- conservando intacto todo su historial (convocatorias,
    cargas, RPE, fichas medicas), porque nada se borra ni se duplica: solo se
    mueve el puntero de equipo del jugador que sigue.
    El equipo anterior queda desactivado (activo=false) pero consultable.
    """
    supabase = get_supabase()

    anterior = (
        supabase.table("equipos")
        .select("*")
        .eq("id", str(equipo_id))
        .eq("organizacion_id", auth.organizacion_id)
        .maybe_single()
        .execute()
    )
    if not anterior or not anterior.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipo no encontrado")

    allowed, msg = LicenseChecker.check_team_limit(auth.organizacion_id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    old = anterior.data

    nuevo_data = {
        "organizacion_id": auth.organizacion_id,
        "nombre": data.nombre or old["nombre"],
        "categoria": old.get("categoria"),
        "temporada": data.temporada,
        "num_jugadores_plantilla": old.get("num_jugadores_plantilla", 22),
        "sistema_juego": old.get("sistema_juego", "1-4-3-3"),
        "config": old.get("config") or {},
        "temporada_anterior_id": str(equipo_id),
    }
    nuevo_result = supabase.table("equipos").insert(nuevo_data).execute()
    if not nuevo_result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al crear la nueva temporada")
    nuevo = nuevo_result.data[0]

    jugadores_movidos = 0
    if data.jugadores_continuan:
        ids = [str(jid) for jid in data.jugadores_continuan]
        # Validar que los jugadores pertenecen realmente al equipo anterior
        # antes de reasignarlos, para no mover jugadores de otro equipo/club.
        propios = (
            supabase.table("jugadores")
            .select("id")
            .eq("equipo_id", str(equipo_id))
            .in_("id", ids)
            .execute()
        )
        ids_validos = [j["id"] for j in (propios.data or [])]
        if ids_validos:
            supabase.table("jugadores").update({"equipo_id": nuevo["id"]}).in_("id", ids_validos).execute()
            jugadores_movidos = len(ids_validos)

    supabase.table("equipos").update({"activo": False}).eq("id", str(equipo_id)).execute()

    return NuevaTemporadaResponse(
        equipo_anterior_id=equipo_id,
        equipo_nuevo=EquipoResponse(**nuevo),
        jugadores_movidos=jugadores_movidos,
    )
