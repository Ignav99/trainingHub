"""
TrainingHub Pro - Router de Portero Tareas
CRUD + AI design for goalkeeper-specific training exercises.
"""

import json
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel

from app.models.portero_tarea import (
    PorteroTareaCreate,
    PorteroTareaUpdate,
    PorteroTareaResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ CRUD ============


@router.get("/{sesion_id}/portero-tareas")
async def list_portero_tareas(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Lista tareas de portero de una sesión."""
    supabase = get_supabase()
    response = (
        supabase.table("portero_tareas")
        .select("*")
        .eq("sesion_id", str(sesion_id))
        .order("orden")
        .execute()
    )
    return {"data": response.data or []}


@router.post("/{sesion_id}/portero-tareas", status_code=status.HTTP_201_CREATED)
async def create_portero_tarea(
    sesion_id: UUID,
    data: PorteroTareaCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Crea una tarea de portero."""
    supabase = get_supabase()

    row = {
        "sesion_id": str(sesion_id),
        "equipo_id": str(data.equipo_id),
        "nombre": data.nombre,
        "descripcion": data.descripcion,
        "duracion": data.duracion,
        "intensidad": data.intensidad,
        "tipo": data.tipo,
        "diagram": data.diagram,
        "notas": data.notas,
        "orden": data.orden or 0,
    }

    response = supabase.table("portero_tareas").insert(row).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear tarea de portero",
        )

    return response.data[0]


@router.put("/{sesion_id}/portero-tareas/{tarea_id}")
async def update_portero_tarea(
    sesion_id: UUID,
    tarea_id: UUID,
    data: PorteroTareaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Actualiza una tarea de portero."""
    supabase = get_supabase()

    payload = data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos para actualizar",
        )

    response = (
        supabase.table("portero_tareas")
        .update(payload)
        .eq("id", str(tarea_id))
        .eq("sesion_id", str(sesion_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea de portero no encontrada",
        )

    return response.data[0]


@router.delete(
    "/{sesion_id}/portero-tareas/{tarea_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_portero_tarea(
    sesion_id: UUID,
    tarea_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Elimina una tarea de portero."""
    supabase = get_supabase()

    existing = (
        supabase.table("portero_tareas")
        .select("id")
        .eq("id", str(tarea_id))
        .eq("sesion_id", str(sesion_id))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea de portero no encontrada",
        )

    supabase.table("portero_tareas").delete().eq("id", str(tarea_id)).execute()
    return None


class ReorderItem(BaseModel):
    id: str
    orden: int


@router.put("/{sesion_id}/portero-tareas/reorder")
async def reorder_portero_tareas(
    sesion_id: UUID,
    items: list[ReorderItem],
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Reordena tareas de portero (batch update de orden)."""
    supabase = get_supabase()

    for item in items:
        supabase.table("portero_tareas").update({"orden": item.orden}).eq(
            "id", item.id
        ).eq("sesion_id", str(sesion_id)).execute()

    return {"ok": True}


# ============ Save to Library ============


class SaveToLibraryRequest(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    duracion: Optional[int] = 10
    grafico_data: Optional[dict] = None


@router.post("/{sesion_id}/portero-tareas/save-to-library")
async def save_portero_tarea_to_library(
    sesion_id: UUID,
    data: SaveToLibraryRequest,
    auth: AuthContext = Depends(require_permission(Permission.TASK_CREATE)),
):
    """Saves a GK exercise to the main tarea library with POR category."""
    supabase = get_supabase()

    # Find POR category ID
    cat = supabase.table("categorias_tarea").select("id").eq("codigo", "POR").single().execute()
    if not cat.data:
        raise HTTPException(status_code=400, detail="Categoria POR no encontrada. Ejecuta el SQL de insercion.")

    tarea_data = {
        "titulo": data.nombre,
        "descripcion": data.descripcion,
        "categoria_id": cat.data["id"],
        "duracion_total": data.duracion,
        "organizacion_id": str(auth.user.organizacion_id),
        "creado_por": str(auth.user.id),
        "es_publica": True,
        "es_plantilla": False,
        "grafico_data": data.grafico_data,
    }

    response = supabase.table("tareas").insert(tarea_data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al guardar en biblioteca")

    return response.data[0]


# ============ AI Design ============


class AIDesignRequest(BaseModel):
    prompt: str
    context: Optional[dict] = None


@router.post("/{sesion_id}/portero-tareas/ai-design")
async def ai_design_portero_tarea(
    sesion_id: UUID,
    data: AIDesignRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Diseña una tarea de portero con IA."""
    from app.services.claude_service import ClaudeService, ClaudeError

    try:
        service = ClaudeService()
        result = await service.design_portero_tarea(
            prompt=data.prompt,
            context=data.context or {},
        )
        return result
    except ClaudeError as e:
        error_msg = str(e)
        if "conexion" in error_msg.lower():
            raise HTTPException(status_code=503, detail=error_msg)
        elif "saturado" in error_msg.lower() or "rate" in error_msg.lower():
            raise HTTPException(status_code=429, detail=error_msg)
        else:
            raise HTTPException(status_code=500, detail=error_msg)
