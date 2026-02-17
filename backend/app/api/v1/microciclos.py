"""
TrainingHub Pro - Router de Microciclos
CRUD para planificación semanal de entrenamiento.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date
from math import ceil

from app.models import (
    MicrocicloCreate,
    MicrocicloUpdate,
    MicrocicloResponse,
    MicrocicloListResponse,
    EstadoMicrociclo,
    UsuarioResponse,
    SesionResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=MicrocicloListResponse)
async def list_microciclos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    equipo_id: Optional[UUID] = None,
    estado: Optional[EstadoMicrociclo] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista microciclos con filtros."""
    supabase = get_supabase()

    query = supabase.table("microciclos").select(
        "*, equipos(nombre, categoria), partidos(*, rivales(nombre, nombre_corto))",
        count="exact"
    )

    # Filtrar por equipos de la organización
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", str(current_user.organizacion_id)
        ).execute()
        equipo_ids = [e["id"] for e in equipos.data]
        if equipo_ids:
            query = query.in_("equipo_id", equipo_ids)

    if estado:
        query = query.eq("estado", estado.value)

    if fecha_desde:
        query = query.gte("fecha_inicio", fecha_desde.isoformat())

    if fecha_hasta:
        query = query.lte("fecha_fin", fecha_hasta.isoformat())

    query = query.order("fecha_inicio", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return MicrocicloListResponse(
        data=[MicrocicloResponse(**m) for m in response.data],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{microciclo_id}", response_model=MicrocicloResponse)
async def get_microciclo(
    microciclo_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene un microciclo por ID."""
    supabase = get_supabase()

    response = supabase.table("microciclos").select(
        "*, equipos(nombre, categoria), partidos(*, rivales(nombre, nombre_corto))"
    ).eq("id", str(microciclo_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    return MicrocicloResponse(**response.data)


@router.get("/{microciclo_id}/sesiones")
async def get_microciclo_sesiones(
    microciclo_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene las sesiones de un microciclo."""
    supabase = get_supabase()

    # Verificar que existe
    micro = supabase.table("microciclos").select("id").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not micro.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    response = supabase.table("sesiones").select(
        "*, equipos(nombre, categoria)"
    ).eq("microciclo_id", str(microciclo_id)).order("fecha").execute()

    sesiones = []
    for s in response.data:
        s["equipo"] = s.pop("equipos", None)
        sesiones.append(s)

    return {"data": sesiones, "total": len(sesiones)}


@router.post("", response_model=MicrocicloResponse, status_code=status.HTTP_201_CREATED)
async def create_microciclo(
    microciclo: MicrocicloCreate,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Crea un nuevo microciclo."""
    supabase = get_supabase()

    data = microciclo.model_dump(mode="json")
    data["equipo_id"] = str(data["equipo_id"])
    if data.get("partido_id"):
        data["partido_id"] = str(data["partido_id"])

    response = supabase.table("microciclos").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear microciclo"
        )

    return MicrocicloResponse(**response.data[0])


@router.put("/{microciclo_id}", response_model=MicrocicloResponse)
async def update_microciclo(
    microciclo_id: UUID,
    microciclo: MicrocicloUpdate,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Actualiza un microciclo."""
    supabase = get_supabase()

    existing = supabase.table("microciclos").select("id").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    update_data = microciclo.model_dump(exclude_unset=True, mode="json")

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    if update_data.get("partido_id"):
        update_data["partido_id"] = str(update_data["partido_id"])

    response = supabase.table("microciclos").update(update_data).eq(
        "id", str(microciclo_id)
    ).execute()

    return MicrocicloResponse(**response.data[0])


@router.delete("/{microciclo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_microciclo(
    microciclo_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina un microciclo."""
    supabase = get_supabase()

    existing = supabase.table("microciclos").select("id").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    supabase.table("microciclos").delete().eq("id", str(microciclo_id)).execute()
    return None
