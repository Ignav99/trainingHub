"""
TrainingHub Pro - Router de RFEF
Gestión de competiciones y jornadas RFEF.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from math import ceil

from app.models import UsuarioResponse
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


# ============ Competiciones ============

@router.get("/competiciones")
async def list_competiciones(
    equipo_id: Optional[UUID] = None,
    temporada: Optional[str] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista competiciones RFEF del equipo."""
    supabase = get_supabase()

    query = supabase.table("rfef_competiciones").select("*")

    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        # Equipos de la organización
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", str(current_user.organizacion_id)
        ).execute()
        eids = [e["id"] for e in equipos.data]
        if eids:
            query = query.in_("equipo_id", eids)

    if temporada:
        query = query.eq("temporada", temporada)

    query = query.order("created_at", desc=True)
    response = query.execute()

    return {"data": response.data, "total": len(response.data)}


@router.get("/competiciones/{competicion_id}")
async def get_competicion(
    competicion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene una competición con su clasificación."""
    supabase = get_supabase()

    response = supabase.table("rfef_competiciones").select("*").eq(
        "id", str(competicion_id)
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada"
        )

    return response.data


@router.post("/competiciones", status_code=status.HTTP_201_CREATED)
async def create_competicion(
    equipo_id: UUID,
    nombre: str = Query(..., min_length=2),
    categoria: Optional[str] = None,
    grupo: Optional[str] = None,
    temporada: Optional[str] = None,
    rfef_id: Optional[str] = None,
    url_fuente: Optional[str] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Crea una competición RFEF."""
    supabase = get_supabase()

    data = {
        "equipo_id": str(equipo_id),
        "nombre": nombre,
        "categoria": categoria,
        "grupo": grupo,
        "temporada": temporada,
        "rfef_id": rfef_id,
        "url_fuente": url_fuente,
    }

    response = supabase.table("rfef_competiciones").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear competición"
        )

    return response.data[0]


@router.put("/competiciones/{competicion_id}")
async def update_competicion(
    competicion_id: UUID,
    nombre: Optional[str] = None,
    categoria: Optional[str] = None,
    grupo: Optional[str] = None,
    temporada: Optional[str] = None,
    clasificacion: Optional[list] = None,
    calendario: Optional[list] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Actualiza una competición RFEF (clasificación, calendario, etc.)."""
    supabase = get_supabase()

    update_data = {}
    if nombre is not None:
        update_data["nombre"] = nombre
    if categoria is not None:
        update_data["categoria"] = categoria
    if grupo is not None:
        update_data["grupo"] = grupo
    if temporada is not None:
        update_data["temporada"] = temporada
    if clasificacion is not None:
        update_data["clasificacion"] = clasificacion
    if calendario is not None:
        update_data["calendario"] = calendario

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("rfef_competiciones").update(update_data).eq(
        "id", str(competicion_id)
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada"
        )

    return response.data[0]


@router.delete("/competiciones/{competicion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competicion(
    competicion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina una competición y sus jornadas."""
    supabase = get_supabase()
    supabase.table("rfef_competiciones").delete().eq(
        "id", str(competicion_id)
    ).execute()
    return None


# ============ Jornadas ============

@router.get("/competiciones/{competicion_id}/jornadas")
async def list_jornadas(
    competicion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista jornadas de una competición."""
    supabase = get_supabase()

    response = supabase.table("rfef_jornadas").select("*").eq(
        "competicion_id", str(competicion_id)
    ).order("numero").execute()

    return {"data": response.data, "total": len(response.data)}


@router.get("/jornadas/{jornada_id}")
async def get_jornada(
    jornada_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene una jornada con sus partidos."""
    supabase = get_supabase()

    response = supabase.table("rfef_jornadas").select("*").eq(
        "id", str(jornada_id)
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jornada no encontrada"
        )

    return response.data


@router.post("/competiciones/{competicion_id}/jornadas", status_code=status.HTTP_201_CREATED)
async def create_jornada(
    competicion_id: UUID,
    numero: int = Query(..., ge=1),
    fecha: Optional[str] = None,
    partidos: list = [],
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Crea una jornada en una competición."""
    supabase = get_supabase()

    data = {
        "competicion_id": str(competicion_id),
        "numero": numero,
        "fecha": fecha,
        "partidos": partidos,
    }

    response = supabase.table("rfef_jornadas").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear jornada"
        )

    return response.data[0]


@router.put("/jornadas/{jornada_id}")
async def update_jornada(
    jornada_id: UUID,
    fecha: Optional[str] = None,
    partidos: Optional[list] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Actualiza una jornada."""
    supabase = get_supabase()

    update_data = {}
    if fecha is not None:
        update_data["fecha"] = fecha
    if partidos is not None:
        update_data["partidos"] = partidos

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("rfef_jornadas").update(update_data).eq(
        "id", str(jornada_id)
    ).execute()

    return response.data[0] if response.data else None
