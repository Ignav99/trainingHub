"""
TrainingHub Pro - Router de Partidos
CRUD para partidos y calendario competitivo.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date
from math import ceil

from app.models import (
    PartidoCreate,
    PartidoUpdate,
    PartidoResponse,
    PartidoListResponse,
    TipoCompeticion,
    RivalResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=PartidoListResponse)
async def list_partidos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    equipo_id: Optional[UUID] = None,
    rival_id: Optional[UUID] = None,
    competicion: Optional[TipoCompeticion] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    solo_jugados: bool = False,
    solo_pendientes: bool = False,
    orden: str = Query("fecha", pattern="^(fecha|jornada|created_at)$"),
    direccion: str = Query("desc", pattern="^(asc|desc)$"),
    current_user = Depends(get_current_user),
):
    """
    Lista partidos con filtros.
    """
    supabase = get_supabase()

    # Query con relación a rivales
    query = supabase.table("partidos").select(
        "*, rivales(*)",
        count="exact"
    )

    # Filtrar por equipos de la organización del usuario
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        # Obtener todos los equipos de la organización
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", str(current_user.organizacion_id)
        ).execute()
        equipo_ids = [e["id"] for e in equipos.data]
        if equipo_ids:
            query = query.in_("equipo_id", equipo_ids)

    if rival_id:
        query = query.eq("rival_id", str(rival_id))

    if competicion:
        query = query.eq("competicion", competicion.value)

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())

    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    if solo_jugados:
        query = query.not_.is_("goles_favor", "null")

    if solo_pendientes:
        query = query.is_("goles_favor", "null")

    # Ordenación
    query = query.order(orden, desc=(direccion == "desc"))

    # Paginación
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    # Mapear respuesta con rival
    partidos = []
    for p in response.data:
        rival_data = p.pop("rivales", None)
        partido = PartidoResponse(**p)
        if rival_data:
            partido.rival = RivalResponse(**rival_data)
        partidos.append(partido)

    return PartidoListResponse(
        data=partidos,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{partido_id}", response_model=PartidoResponse)
async def get_partido(
    partido_id: UUID,
    current_user = Depends(get_current_user),
):
    """
    Obtiene un partido por ID.
    """
    supabase = get_supabase()

    response = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", str(partido_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    # Verificar que el equipo pertenece a la organización
    equipo = supabase.table("equipos").select("organizacion_id").eq(
        "id", response.data["equipo_id"]
    ).single().execute()

    if equipo.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este partido"
        )

    rival_data = response.data.pop("rivales", None)
    partido = PartidoResponse(**response.data)
    if rival_data:
        partido.rival = RivalResponse(**rival_data)

    return partido


@router.post("", response_model=PartidoResponse, status_code=status.HTTP_201_CREATED)
async def create_partido(
    partido: PartidoCreate,
    current_user = Depends(get_current_user),
):
    """
    Crea un nuevo partido.
    """
    supabase = get_supabase()

    # Verificar que el equipo pertenece a la organización
    equipo = supabase.table("equipos").select("organizacion_id").eq(
        "id", str(partido.equipo_id)
    ).single().execute()

    if not equipo.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )

    if equipo.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este equipo"
        )

    # Verificar que el rival existe y pertenece a la organización
    rival = supabase.table("rivales").select("organizacion_id").eq(
        "id", str(partido.rival_id)
    ).single().execute()

    if not rival.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    if rival.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El rival no pertenece a tu organización"
        )

    partido_data = partido.model_dump(mode='json')
    partido_data["equipo_id"] = str(partido_data["equipo_id"])
    partido_data["rival_id"] = str(partido_data["rival_id"])

    response = supabase.table("partidos").insert(partido_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear partido"
        )

    # Obtener con relación
    partido_completo = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", response.data[0]["id"]).single().execute()

    rival_data = partido_completo.data.pop("rivales", None)
    result = PartidoResponse(**partido_completo.data)
    if rival_data:
        result.rival = RivalResponse(**rival_data)

    return result


@router.put("/{partido_id}", response_model=PartidoResponse)
async def update_partido(
    partido_id: UUID,
    partido: PartidoUpdate,
    current_user = Depends(get_current_user),
):
    """
    Actualiza un partido existente.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("partidos").select("*, rivales(*)").eq(
        "id", str(partido_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    # Verificar permisos
    equipo = supabase.table("equipos").select("organizacion_id").eq(
        "id", existing.data["equipo_id"]
    ).single().execute()

    if equipo.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este partido"
        )

    update_data = partido.model_dump(exclude_unset=True, mode='json')

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    # Convertir UUIDs
    if update_data.get("rival_id"):
        update_data["rival_id"] = str(update_data["rival_id"])

    response = supabase.table("partidos").update(update_data).eq(
        "id", str(partido_id)
    ).execute()

    # Obtener con relación
    partido_completo = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", str(partido_id)).single().execute()

    rival_data = partido_completo.data.pop("rivales", None)
    result = PartidoResponse(**partido_completo.data)
    if rival_data:
        result.rival = RivalResponse(**rival_data)

    return result


@router.delete("/{partido_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_partido(
    partido_id: UUID,
    current_user = Depends(get_current_user),
):
    """
    Elimina un partido.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("partidos").select("*").eq(
        "id", str(partido_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    # Verificar permisos
    equipo = supabase.table("equipos").select("organizacion_id").eq(
        "id", existing.data["equipo_id"]
    ).single().execute()

    if equipo.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este partido"
        )

    supabase.table("partidos").delete().eq("id", str(partido_id)).execute()

    return None


@router.post("/{partido_id}/resultado", response_model=PartidoResponse)
async def registrar_resultado(
    partido_id: UUID,
    goles_favor: int = Query(..., ge=0),
    goles_contra: int = Query(..., ge=0),
    notas_post: Optional[str] = None,
    current_user = Depends(get_current_user),
):
    """
    Registra el resultado de un partido.
    El campo 'resultado' se calcula automáticamente.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("partidos").select("*").eq(
        "id", str(partido_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    # Verificar permisos
    equipo = supabase.table("equipos").select("organizacion_id").eq(
        "id", existing.data["equipo_id"]
    ).single().execute()

    if equipo.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este partido"
        )

    update_data = {
        "goles_favor": goles_favor,
        "goles_contra": goles_contra,
    }
    if notas_post:
        update_data["notas_post"] = notas_post

    response = supabase.table("partidos").update(update_data).eq(
        "id", str(partido_id)
    ).execute()

    # Obtener con relación
    partido_completo = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", str(partido_id)).single().execute()

    rival_data = partido_completo.data.pop("rivales", None)
    result = PartidoResponse(**partido_completo.data)
    if rival_data:
        result.rival = RivalResponse(**rival_data)

    return result
