"""
TrainingHub Pro - Video Analisis Router
Análisis de vídeo guardados: botonera + recortes de un vídeo local, con nombre.
Mismo patrón que tactical_boards (snapshot JSON por equipo).
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_supabase
from app.models.video_analisis import VideoAnalisisCreate, VideoAnalisisUpdate
from app.security.dependencies import AuthContext, require_permission, require_team_access
from app.security.permissions import Permission

router = APIRouter()

LIST_COLUMNS = (
    "id,equipo_id,created_by,nombre,descripcion,video_filename,video_fingerprint,"
    "video_duration_ms,created_at,updated_at"
)


NOT_FOUND = "Análisis no encontrado."


def _get_for_user(
    supabase, analisis_id: UUID, auth: AuthContext, permission: Permission, columns: str = "*"
) -> dict:
    """Load an analysis and check the caller may act on it in its own team."""
    if columns != "*" and "equipo_id" not in columns.split(","):
        columns = f"{columns},equipo_id"
    result = (
        supabase.table("video_analisis")
        .select(columns)
        .eq("id", str(analisis_id))
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, NOT_FOUND)
    row = result.data[0]
    require_team_access(auth, row.get("equipo_id"), permission, NOT_FOUND)
    return row


@router.post("", status_code=201)
async def create_analisis(
    data: VideoAnalisisCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_ANALISIS_CREATE)),
):
    """Guardar un análisis nuevo."""
    supabase = get_supabase()
    payload = data.model_dump()
    payload["equipo_id"] = str(data.equipo_id)
    payload["created_by"] = auth.user_id
    result = supabase.table("video_analisis").insert(payload).execute()
    if not result.data:
        raise HTTPException(500, "Error al guardar el análisis.")
    return result.data[0]


@router.get("")
async def list_analisis(
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_ANALISIS_READ)),
):
    """Listar análisis de un equipo (sin buttons/events; con el nº de recortes)."""
    supabase = get_supabase()
    result = (
        supabase.table("video_analisis")
        .select(LIST_COLUMNS + ",events")
        .eq("equipo_id", str(equipo_id))
        .order("updated_at", desc=True)
        .execute()
    )
    rows = []
    for row in result.data or []:
        events = row.pop("events", None) or []
        row["clips_count"] = len(events)
        rows.append(row)
    return {"data": rows}


@router.get("/{analisis_id}")
async def get_analisis(
    analisis_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_ANALISIS_READ)),
):
    """Obtener un análisis completo (botonera + recortes)."""
    supabase = get_supabase()
    return _get_for_user(supabase, analisis_id, auth, Permission.VIDEO_ANALISIS_READ)


@router.put("/{analisis_id}")
async def update_analisis(
    analisis_id: UUID,
    data: VideoAnalisisUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_ANALISIS_UPDATE)),
):
    """Actualizar nombre y/o snapshot de un análisis."""
    supabase = get_supabase()
    _get_for_user(supabase, analisis_id, auth, Permission.VIDEO_ANALISIS_UPDATE, "id")
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No hay campos para actualizar.")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("video_analisis")
        .update(updates)
        .eq("id", str(analisis_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Error al actualizar el análisis.")
    return result.data[0]


@router.delete("/{analisis_id}")
async def delete_analisis(
    analisis_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_ANALISIS_DELETE)),
):
    """Eliminar un análisis guardado."""
    supabase = get_supabase()
    _get_for_user(supabase, analisis_id, auth, Permission.VIDEO_ANALISIS_DELETE, "id")
    supabase.table("video_analisis").delete().eq("id", str(analisis_id)).execute()
    return {"status": "deleted"}
