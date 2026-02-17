"""
TrainingHub Pro - Router de Convocatorias
Gestión de convocatorias y estadísticas de partido.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID

from app.models import (
    ConvocatoriaCreate,
    ConvocatoriaUpdate,
    ConvocatoriaResponse,
    ConvocatoriaListResponse,
    UsuarioResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/partido/{partido_id}", response_model=ConvocatoriaListResponse)
async def list_convocatorias_partido(
    partido_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista convocatorias de un partido."""
    supabase = get_supabase()

    response = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal, foto_url)",
        count="exact"
    ).eq("partido_id", str(partido_id)).order("titular", desc=True).order("dorsal").execute()

    total = response.count or 0

    return ConvocatoriaListResponse(
        data=[ConvocatoriaResponse(**c) for c in response.data],
        total=total,
        page=1,
        limit=total,
        pages=1,
    )


@router.get("/jugador/{jugador_id}")
async def list_convocatorias_jugador(
    jugador_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Historial de convocatorias de un jugador con estadísticas acumuladas."""
    supabase = get_supabase()

    response = supabase.table("convocatorias").select(
        "*, partidos(fecha, localia, competicion, goles_favor, goles_contra, resultado, rivales(nombre, nombre_corto))"
    ).eq("jugador_id", str(jugador_id)).order("created_at", desc=True).limit(limit).execute()

    # Calcular estadísticas acumuladas
    convocatorias = response.data
    stats = {
        "total_convocatorias": len(convocatorias),
        "titularidades": sum(1 for c in convocatorias if c.get("titular")),
        "minutos_totales": sum(c.get("minutos_jugados", 0) for c in convocatorias),
        "goles": sum(c.get("goles", 0) for c in convocatorias),
        "asistencias": sum(c.get("asistencias", 0) for c in convocatorias),
        "amarillas": sum(1 for c in convocatorias if c.get("tarjeta_amarilla")),
        "rojas": sum(1 for c in convocatorias if c.get("tarjeta_roja")),
    }

    return {"data": convocatorias, "estadisticas": stats}


@router.get("/{convocatoria_id}", response_model=ConvocatoriaResponse)
async def get_convocatoria(
    convocatoria_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene una convocatoria por ID."""
    supabase = get_supabase()

    response = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal)"
    ).eq("id", str(convocatoria_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Convocatoria no encontrada"
        )

    return ConvocatoriaResponse(**response.data)


@router.post("", response_model=ConvocatoriaResponse, status_code=status.HTTP_201_CREATED)
async def create_convocatoria(
    convocatoria: ConvocatoriaCreate,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Crea una convocatoria."""
    supabase = get_supabase()

    data = convocatoria.model_dump(mode="json")
    data["partido_id"] = str(data["partido_id"])
    data["jugador_id"] = str(data["jugador_id"])

    response = supabase.table("convocatorias").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear convocatoria"
        )

    return ConvocatoriaResponse(**response.data[0])


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_convocatorias_batch(
    convocatorias: list[ConvocatoriaCreate],
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Crea múltiples convocatorias a la vez (ej: toda la lista de un partido)."""
    supabase = get_supabase()

    items = []
    for c in convocatorias:
        data = c.model_dump(mode="json")
        data["partido_id"] = str(data["partido_id"])
        data["jugador_id"] = str(data["jugador_id"])
        items.append(data)

    response = supabase.table("convocatorias").insert(items).execute()

    return {"created": len(response.data), "data": response.data}


@router.put("/{convocatoria_id}", response_model=ConvocatoriaResponse)
async def update_convocatoria(
    convocatoria_id: UUID,
    convocatoria: ConvocatoriaUpdate,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Actualiza una convocatoria (ej: registrar estadísticas post-partido)."""
    supabase = get_supabase()

    existing = supabase.table("convocatorias").select("id").eq(
        "id", str(convocatoria_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Convocatoria no encontrada"
        )

    update_data = convocatoria.model_dump(exclude_unset=True, mode="json")

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("convocatorias").update(update_data).eq(
        "id", str(convocatoria_id)
    ).execute()

    return ConvocatoriaResponse(**response.data[0])


@router.delete("/{convocatoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_convocatoria(
    convocatoria_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina una convocatoria."""
    supabase = get_supabase()

    supabase.table("convocatorias").delete().eq(
        "id", str(convocatoria_id)
    ).execute()

    return None
