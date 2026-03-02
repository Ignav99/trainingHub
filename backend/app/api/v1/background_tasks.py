"""
TrainingHub Pro - Router de Background Tasks
Endpoints para consultar estado y progreso de tareas en background.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID

from app.dependencies import require_permission, AuthContext
from app.services import task_service

router = APIRouter()


@router.get("")
async def list_tasks(
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo de tarea"),
    limit: int = Query(20, ge=1, le=100),
    auth: AuthContext = Depends(require_permission()),
):
    """Lista tareas en background del usuario actual."""
    tasks = task_service.list_tasks(
        usuario_id=auth.user_id,
        estado=estado,
        tipo=tipo,
        limit=limit,
    )
    return {"data": tasks, "total": len(tasks)}


@router.get("/tipos")
async def list_task_types(
    auth: AuthContext = Depends(require_permission()),
):
    """Lista los tipos de tareas disponibles."""
    return {
        "data": [
            {"tipo": k, "descripcion": v}
            for k, v in task_service.TASK_TYPES.items()
        ]
    }


@router.get("/{task_id}")
async def get_task(
    task_id: UUID,
    auth: AuthContext = Depends(require_permission()),
):
    """Obtiene el estado detallado de una tarea."""
    task = task_service.get_task(str(task_id))

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada",
        )

    # Verify ownership
    if task.get("usuario_id") and task["usuario_id"] != auth.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta tarea",
        )

    return task


@router.post("/{task_id}/cancelar")
async def cancel_task(
    task_id: UUID,
    auth: AuthContext = Depends(require_permission()),
):
    """Cancela una tarea pendiente o en proceso."""
    task = task_service.get_task(str(task_id))

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada",
        )

    if task.get("usuario_id") and task["usuario_id"] != auth.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta tarea",
        )

    if task["estado"] in ("completada", "fallida", "cancelada"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La tarea ya esta en estado '{task['estado']}'",
        )

    task_service.update_task(
        str(task_id),
        estado="cancelada",
        mensaje="Cancelada por el usuario",
    )

    return {"message": "Tarea cancelada", "task_id": str(task_id)}
