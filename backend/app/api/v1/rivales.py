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
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.get("", response_model=RivalListResponse)
async def list_rivales(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    busqueda: Optional[str] = None,
    orden: str = Query("nombre", pattern="^(nombre|created_at)$"),
    direccion: str = Query("asc", pattern="^(asc|desc)$"),
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """
    Lista todos los rivales de la organización.
    """
    supabase = get_supabase()

    query = supabase.table("rivales").select("*", count="exact")

    # Filtrar por organización del usuario
    query = query.eq("organizacion_id", auth.organizacion_id)

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


@router.get("/{rival_id}/perfil-competicion")
async def get_rival_perfil_competicion(
    rival_id: UUID,
    competicion_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """
    Perfil completo de un rival dentro de una competición.
    Incluye stats de clasificación, últimos 5 resultados, y head-to-head.
    """
    supabase = get_supabase()

    # Get rival
    rival_res = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not rival_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    rival = rival_res.data
    rival_nombre = rival.get("rfef_nombre") or rival.get("nombre", "")
    rival_nombre_lower = rival_nombre.lower()

    competition_stats = None
    last_5_results = []

    # If competicion_id provided, get stats from clasificacion
    if competicion_id:
        comp_res = supabase.table("rfef_competiciones").select(
            "clasificacion"
        ).eq("id", str(competicion_id)).single().execute()

        if comp_res.data:
            clasificacion = comp_res.data.get("clasificacion", [])
            for equipo in clasificacion:
                equipo_nombre = equipo.get("equipo", "").lower()
                if equipo_nombre == rival_nombre_lower or rival_nombre_lower in equipo_nombre or equipo_nombre in rival_nombre_lower:
                    competition_stats = {
                        "posicion": equipo.get("posicion"),
                        "puntos": equipo.get("puntos"),
                        "pj": equipo.get("pj"),
                        "pg": equipo.get("pg"),
                        "pe": equipo.get("pe"),
                        "pp": equipo.get("pp"),
                        "gf": equipo.get("gf"),
                        "gc": equipo.get("gc"),
                        "ultimos_5": equipo.get("ultimos_5", []),
                    }
                    break

        # Get last 5 results from jornadas
        jornadas_res = supabase.table("rfef_jornadas").select("*").eq(
            "competicion_id", str(competicion_id)
        ).order("numero", desc=True).execute()

        for jornada in jornadas_res.data or []:
            for partido in jornada.get("partidos", []):
                local = (partido.get("local") or "").lower()
                visitante = (partido.get("visitante") or "").lower()
                is_involved = rival_nombre_lower in local or local in rival_nombre_lower or rival_nombre_lower in visitante or visitante in rival_nombre_lower

                if is_involved and partido.get("goles_local") is not None:
                    last_5_results.append({
                        "jornada": jornada["numero"],
                        "local": partido.get("local"),
                        "visitante": partido.get("visitante"),
                        "goles_local": partido.get("goles_local"),
                        "goles_visitante": partido.get("goles_visitante"),
                        "fecha": partido.get("fecha", ""),
                    })
                    if len(last_5_results) >= 5:
                        break
            if len(last_5_results) >= 5:
                break

    # Head-to-head: partidos from our DB against this rival
    h2h_res = supabase.table("partidos").select(
        "id, fecha, localia, goles_favor, goles_contra, resultado, jornada, competicion"
    ).eq("rival_id", str(rival_id)).order("fecha", desc=True).limit(10).execute()

    head_to_head = h2h_res.data or []

    return {
        "rival": rival,
        "competition_stats": competition_stats,
        "last_5_results": last_5_results,
        "head_to_head": head_to_head,
    }


@router.get("/{rival_id}", response_model=RivalResponse)
async def get_rival(
    rival_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
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

    return RivalResponse(**response.data)


@router.post("", response_model=RivalResponse, status_code=status.HTTP_201_CREATED)
async def create_rival(
    rival: RivalCreate,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_CREATE)),
):
    """
    Crea un nuevo rival.
    """
    supabase = get_supabase()

    rival_data = rival.model_dump(exclude_unset=True)
    rival_data["organizacion_id"] = auth.organizacion_id

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
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
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
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_DELETE)),
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
