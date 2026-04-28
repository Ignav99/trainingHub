"""
TrainingHub Pro - Game Model Router
CRUD endpoints for the Game Model Builder (Modelo de Juego).
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_supabase
from app.models.game_model import GameModelCreate, GameModelUpdate
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission

router = APIRouter()


@router.post("", status_code=201)
async def create_game_model(
    data: GameModelCreate,
    auth: AuthContext = Depends(require_permission(Permission.GAME_MODEL_CREATE)),
):
    """Crear un nuevo modelo de juego para un equipo."""
    supabase = get_supabase()
    payload = data.model_dump(exclude_none=True)
    payload["equipo_id"] = str(data.equipo_id)
    payload["created_by"] = auth.user_id
    result = supabase.table("game_models").insert(payload).execute()
    if not result.data:
        raise HTTPException(500, "Error al crear el modelo de juego.")
    return result.data[0]


@router.get("")
async def list_game_models(
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.GAME_MODEL_READ)),
):
    """Listar modelos de juego de un equipo."""
    supabase = get_supabase()
    result = (
        supabase.table("game_models")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .order("updated_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


@router.get("/{game_model_id}")
async def get_game_model(
    game_model_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.GAME_MODEL_READ)),
):
    """Obtener un modelo de juego por ID."""
    supabase = get_supabase()
    result = (
        supabase.table("game_models")
        .select("*")
        .eq("id", str(game_model_id))
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Modelo de juego no encontrado.")
    return result.data[0]


@router.put("/{game_model_id}")
async def update_game_model(
    game_model_id: UUID,
    data: GameModelUpdate,
    auth: AuthContext = Depends(require_permission(Permission.GAME_MODEL_UPDATE)),
):
    """Actualizar un modelo de juego."""
    supabase = get_supabase()
    existing = (
        supabase.table("game_models")
        .select("id")
        .eq("id", str(game_model_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(404, "Modelo de juego no encontrado.")
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No hay campos para actualizar.")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("game_models")
        .update(updates)
        .eq("id", str(game_model_id))
        .execute()
    )
    return result.data[0]


@router.delete("/{game_model_id}")
async def delete_game_model(
    game_model_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.GAME_MODEL_DELETE)),
):
    """Eliminar un modelo de juego."""
    supabase = get_supabase()
    existing = (
        supabase.table("game_models")
        .select("id")
        .eq("id", str(game_model_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(404, "Modelo de juego no encontrado.")
    supabase.table("game_models").delete().eq("id", str(game_model_id)).execute()
    return {"status": "deleted"}
