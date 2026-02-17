"""
TrainingHub Pro - Background Task Service
Gestiona tareas de larga duracion con tracking de progreso.
Usa FastAPI BackgroundTasks + tabla en Supabase para persistencia.
"""

import logging
from datetime import datetime
from typing import Optional, Callable, Any
from uuid import uuid4

from app.database import get_supabase

logger = logging.getLogger(__name__)


# ============ Task Types ============

TASK_TYPES = {
    "indexar_documento": "Indexacion de documento KB",
    "generar_embeddings": "Generacion de embeddings",
    "exportar_csv": "Exportacion CSV",
    "exportar_pdf": "Generacion de PDF",
    "importar_datos": "Importacion de datos",
    "reindexar_kb": "Re-indexacion completa KB",
}


# ============ Core Functions ============

def create_task(
    tipo: str,
    usuario_id: Optional[str] = None,
    organizacion_id: Optional[str] = None,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    parametros: Optional[dict] = None,
    mensaje: Optional[str] = None,
) -> dict:
    """
    Registra una nueva tarea en background.

    Returns:
        dict con id y datos de la tarea creada.
    """
    supabase = get_supabase()

    record = {
        "tipo": tipo,
        "estado": "pendiente",
        "progreso": 0,
        "mensaje": mensaje or TASK_TYPES.get(tipo, "Tarea en proceso"),
    }

    if usuario_id:
        record["usuario_id"] = usuario_id
    if organizacion_id:
        record["organizacion_id"] = organizacion_id
    if entidad_tipo:
        record["entidad_tipo"] = entidad_tipo
    if entidad_id:
        record["entidad_id"] = entidad_id
    if parametros:
        record["parametros"] = parametros

    try:
        response = supabase.table("background_tasks").insert(record).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating background task: {e}")
        raise


def update_task(
    task_id: str,
    estado: Optional[str] = None,
    progreso: Optional[int] = None,
    mensaje: Optional[str] = None,
    resultado: Optional[dict] = None,
    error: Optional[str] = None,
) -> None:
    """Actualiza el estado de una tarea."""
    supabase = get_supabase()

    update = {}
    if estado:
        update["estado"] = estado
    if progreso is not None:
        update["progreso"] = min(progreso, 100)
    if mensaje:
        update["mensaje"] = mensaje
    if resultado is not None:
        update["resultado"] = resultado
    if error:
        update["error"] = error

    # Set timestamps based on state
    if estado == "procesando":
        update["started_at"] = datetime.utcnow().isoformat()
    elif estado in ("completada", "fallida", "cancelada"):
        update["completed_at"] = datetime.utcnow().isoformat()

    if not update:
        return

    try:
        supabase.table("background_tasks").update(update).eq("id", task_id).execute()
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {e}")


def get_task(task_id: str) -> Optional[dict]:
    """Obtiene una tarea por ID."""
    supabase = get_supabase()

    try:
        response = supabase.table("background_tasks").select("*").eq(
            "id", task_id
        ).single().execute()
        return response.data
    except Exception:
        return None


def list_tasks(
    usuario_id: Optional[str] = None,
    organizacion_id: Optional[str] = None,
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """Lista tareas con filtros opcionales."""
    supabase = get_supabase()

    query = supabase.table("background_tasks").select("*")

    if usuario_id:
        query = query.eq("usuario_id", usuario_id)
    if organizacion_id:
        query = query.eq("organizacion_id", organizacion_id)
    if estado:
        query = query.eq("estado", estado)
    if tipo:
        query = query.eq("tipo", tipo)

    query = query.order("created_at", desc=True).limit(limit)

    try:
        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        return []


def mark_started(task_id: str, mensaje: Optional[str] = None) -> None:
    """Marca una tarea como en proceso."""
    update_task(task_id, estado="procesando", progreso=0, mensaje=mensaje)


def mark_progress(task_id: str, progreso: int, mensaje: Optional[str] = None) -> None:
    """Actualiza el progreso de una tarea."""
    update_task(task_id, progreso=progreso, mensaje=mensaje)


def mark_completed(task_id: str, resultado: Optional[dict] = None, mensaje: Optional[str] = None) -> None:
    """Marca una tarea como completada."""
    update_task(
        task_id,
        estado="completada",
        progreso=100,
        mensaje=mensaje or "Tarea completada",
        resultado=resultado,
    )


def mark_failed(task_id: str, error: str, mensaje: Optional[str] = None) -> None:
    """Marca una tarea como fallida."""
    update_task(
        task_id,
        estado="fallida",
        mensaje=mensaje or "Tarea fallida",
        error=error,
    )


# ============ Wrapper for Background Execution ============

def run_tracked_task(
    func: Callable,
    task_id: str,
    *args: Any,
    **kwargs: Any,
) -> None:
    """
    Wrapper que ejecuta una funcion y trackea su estado.
    Usar con FastAPI BackgroundTasks:

        task = create_task("indexar_documento", ...)
        background_tasks.add_task(
            run_tracked_task, mi_funcion, task["id"], arg1, arg2
        )
    """
    mark_started(task_id)
    try:
        result = func(task_id, *args, **kwargs)
        if isinstance(result, dict):
            mark_completed(task_id, resultado=result)
        else:
            mark_completed(task_id)
    except Exception as e:
        logger.error(f"Background task {task_id} failed: {e}")
        mark_failed(task_id, error=str(e))
