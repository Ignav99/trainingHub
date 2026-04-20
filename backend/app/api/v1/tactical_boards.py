"""
TrainingHub Pro - Tactical Board Router
CRUD endpoints for tactical boards and keyframe frames.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_supabase
from app.models.tactical_board import (
    TacticalBoardCreate,
    TacticalBoardUpdate,
    TacticalBoardFrameCreate,
    TacticalBoardFrameUpdate,
    TacticalBoardFrameReorder,
)
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission

router = APIRouter()


# ============ Boards CRUD ============


@router.post("", status_code=201)
async def create_board(
    data: TacticalBoardCreate,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_CREATE)),
):
    """Crear una nueva pizarra tactica."""
    supabase = get_supabase()
    payload = data.model_dump(exclude_none=True)
    payload["equipo_id"] = str(data.equipo_id)
    payload["created_by"] = auth.user_id
    result = supabase.table("tactical_boards").insert(payload).execute()
    if not result.data:
        raise HTTPException(500, "Error al crear la pizarra.")
    return result.data[0]


@router.get("")
async def list_boards(
    equipo_id: UUID = Query(...),
    tipo: str | None = Query(None),
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_READ)),
):
    """Listar pizarras tacticas de un equipo."""
    supabase = get_supabase()
    q = (
        supabase.table("tactical_boards")
        .select("id,nombre,descripcion,tipo,pitch_type,thumbnail_data,tags,created_at,updated_at")
        .eq("equipo_id", str(equipo_id))
        .order("updated_at", desc=True)
    )
    if tipo:
        q = q.eq("tipo", tipo)
    result = q.execute()
    return {"data": result.data or []}


@router.get("/{board_id}")
async def get_board(
    board_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_READ)),
):
    """Obtener una pizarra tactica con sus frames."""
    supabase = get_supabase()
    result = supabase.table("tactical_boards").select("*").eq("id", str(board_id)).limit(1).execute()
    if not result.data:
        raise HTTPException(404, "Pizarra no encontrada.")
    board = result.data[0]

    # Include frames for animated boards
    frames_result = (
        supabase.table("tactical_board_frames")
        .select("*")
        .eq("board_id", str(board_id))
        .order("orden")
        .execute()
    )
    board["frames"] = frames_result.data or []
    return board


@router.put("/{board_id}")
async def update_board(
    board_id: UUID,
    data: TacticalBoardUpdate,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_UPDATE)),
):
    """Actualizar una pizarra tactica."""
    supabase = get_supabase()
    existing = supabase.table("tactical_boards").select("id").eq("id", str(board_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(404, "Pizarra no encontrada.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No hay campos para actualizar.")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = supabase.table("tactical_boards").update(updates).eq("id", str(board_id)).execute()
    return result.data[0]


@router.delete("/{board_id}")
async def delete_board(
    board_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_DELETE)),
):
    """Eliminar una pizarra tactica y sus frames."""
    supabase = get_supabase()
    existing = supabase.table("tactical_boards").select("id").eq("id", str(board_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(404, "Pizarra no encontrada.")
    supabase.table("tactical_boards").delete().eq("id", str(board_id)).execute()
    return {"status": "deleted"}


@router.post("/{board_id}/duplicate", status_code=201)
async def duplicate_board(
    board_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_CREATE)),
):
    """Duplicar una pizarra tactica con sus frames."""
    supabase = get_supabase()
    original = supabase.table("tactical_boards").select("*").eq("id", str(board_id)).limit(1).execute()
    if not original.data:
        raise HTTPException(404, "Pizarra no encontrada.")

    board = original.data[0]
    # Remove fields that should be regenerated
    for key in ["id", "created_at", "updated_at"]:
        board.pop(key, None)
    board["nombre"] = f"{board['nombre']} (copia)"
    board["created_by"] = auth.user_id

    new_board = supabase.table("tactical_boards").insert(board).execute()
    if not new_board.data:
        raise HTTPException(500, "Error al duplicar la pizarra.")

    new_board_id = new_board.data[0]["id"]

    # Duplicate frames
    frames = (
        supabase.table("tactical_board_frames")
        .select("*")
        .eq("board_id", str(board_id))
        .order("orden")
        .execute()
    )
    for frame in frames.data or []:
        frame.pop("id", None)
        frame.pop("created_at", None)
        frame["board_id"] = new_board_id
        supabase.table("tactical_board_frames").insert(frame).execute()

    return new_board.data[0]


# ============ Frames CRUD ============


@router.post("/{board_id}/frames", status_code=201)
async def create_frame(
    board_id: UUID,
    data: TacticalBoardFrameCreate,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_UPDATE)),
):
    """Anadir un frame/keyframe a una pizarra animada."""
    supabase = get_supabase()
    existing = supabase.table("tactical_boards").select("id").eq("id", str(board_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(404, "Pizarra no encontrada.")

    payload = data.model_dump(exclude_none=True)
    payload["board_id"] = str(board_id)
    result = supabase.table("tactical_board_frames").insert(payload).execute()
    if not result.data:
        raise HTTPException(500, "Error al crear el frame.")

    # Touch board updated_at
    supabase.table("tactical_boards").update(
        {"updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", str(board_id)).execute()

    return result.data[0]


@router.put("/{board_id}/frames/{frame_id}")
async def update_frame(
    board_id: UUID,
    frame_id: UUID,
    data: TacticalBoardFrameUpdate,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_UPDATE)),
):
    """Actualizar un frame."""
    supabase = get_supabase()
    existing = (
        supabase.table("tactical_board_frames")
        .select("id")
        .eq("id", str(frame_id))
        .eq("board_id", str(board_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(404, "Frame no encontrado.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No hay campos para actualizar.")

    result = (
        supabase.table("tactical_board_frames")
        .update(updates)
        .eq("id", str(frame_id))
        .execute()
    )

    # Touch board updated_at
    supabase.table("tactical_boards").update(
        {"updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", str(board_id)).execute()

    return result.data[0]


@router.delete("/{board_id}/frames/{frame_id}")
async def delete_frame(
    board_id: UUID,
    frame_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_UPDATE)),
):
    """Eliminar un frame."""
    supabase = get_supabase()
    existing = (
        supabase.table("tactical_board_frames")
        .select("id")
        .eq("id", str(frame_id))
        .eq("board_id", str(board_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(404, "Frame no encontrado.")

    supabase.table("tactical_board_frames").delete().eq("id", str(frame_id)).execute()

    # Touch board updated_at
    supabase.table("tactical_boards").update(
        {"updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", str(board_id)).execute()

    return {"status": "deleted"}


@router.put("/{board_id}/frames/reorder")
async def reorder_frames(
    board_id: UUID,
    data: TacticalBoardFrameReorder,
    auth: AuthContext = Depends(require_permission(Permission.TACTICAL_BOARD_UPDATE)),
):
    """Reordenar frames de una pizarra."""
    supabase = get_supabase()
    for idx, frame_id in enumerate(data.frame_ids):
        supabase.table("tactical_board_frames").update(
            {"orden": idx}
        ).eq("id", str(frame_id)).eq("board_id", str(board_id)).execute()

    supabase.table("tactical_boards").update(
        {"updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", str(board_id)).execute()

    return {"status": "reordered"}
