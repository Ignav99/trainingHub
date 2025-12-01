"""
TrainingHub Pro - Router de Sesiones
CRUD para sesiones de entrenamiento.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date

from app.models import (
    SesionCreate,
    SesionUpdate,
    SesionResponse,
    SesionListResponse,
    SesionTareaCreate,
    MatchDay,
    EstadoSesion,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=SesionListResponse)
async def list_sesiones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    equipo_id: Optional[UUID] = None,
    match_day: Optional[MatchDay] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[EstadoSesion] = None,
    current_user = Depends(get_current_user),
):
    """Lista sesiones con filtros."""
    # TODO: Implementar
    return SesionListResponse(data=[], total=0, page=1, limit=20, pages=1)


@router.get("/{sesion_id}", response_model=SesionResponse)
async def get_sesion(
    sesion_id: UUID,
    current_user = Depends(get_current_user),
):
    """Obtiene una sesión con todas sus tareas."""
    # TODO: Implementar
    raise HTTPException(status_code=404, detail="Sesión no encontrada")


@router.post("", response_model=SesionResponse, status_code=status.HTTP_201_CREATED)
async def create_sesion(
    sesion: SesionCreate,
    current_user = Depends(get_current_user),
):
    """Crea una nueva sesión."""
    # TODO: Implementar
    raise HTTPException(status_code=501, detail="No implementado")


@router.put("/{sesion_id}", response_model=SesionResponse)
async def update_sesion(
    sesion_id: UUID,
    sesion: SesionUpdate,
    current_user = Depends(get_current_user),
):
    """Actualiza una sesión."""
    # TODO: Implementar
    raise HTTPException(status_code=501, detail="No implementado")


@router.delete("/{sesion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sesion(
    sesion_id: UUID,
    current_user = Depends(get_current_user),
):
    """Elimina una sesión."""
    # TODO: Implementar
    return None


@router.post("/{sesion_id}/tareas", response_model=SesionResponse)
async def add_tarea_to_sesion(
    sesion_id: UUID,
    tarea_data: SesionTareaCreate,
    current_user = Depends(get_current_user),
):
    """Añade una tarea a la sesión."""
    # TODO: Implementar
    raise HTTPException(status_code=501, detail="No implementado")


@router.delete("/{sesion_id}/tareas/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tarea_from_sesion(
    sesion_id: UUID,
    tarea_id: UUID,
    current_user = Depends(get_current_user),
):
    """Elimina una tarea de la sesión."""
    # TODO: Implementar
    return None


@router.post("/{sesion_id}/pdf")
async def generate_pdf(
    sesion_id: UUID,
    current_user = Depends(get_current_user),
):
    """Genera el PDF de la sesión."""
    # TODO: Implementar con PDFService
    raise HTTPException(status_code=501, detail="No implementado")
