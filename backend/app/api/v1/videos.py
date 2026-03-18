"""
TrainingHub Pro - Videos de Partidos
Endpoints para gestionar videos (Veo, enlaces externos, uploads cortos).
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.database import get_supabase
from app.models.video import VideoPartidoCreate, VideoPartidoResponse, VideoPartidoUpdate
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()

VIDEO_BUCKET = "partido-videos"
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_VIDEO_TYPES = (
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/x-matroska",
    "video/mpeg",
    "video/3gpp",
)
VALID_TIPOS = ("veo", "enlace_externo", "upload")
VALID_CONTEXTOS = ("pre_partido", "post_partido")


def _ensure_video_bucket(supabase) -> None:
    """Create the partido-videos bucket if it doesn't exist."""
    try:
        supabase.storage.get_bucket(VIDEO_BUCKET)
    except Exception:
        try:
            supabase.storage.create_bucket(VIDEO_BUCKET, options={"public": True})
        except Exception:
            pass  # May already exist from concurrent request


# ============ LIST ============

@router.get("/partido/{partido_id}")
async def list_videos(
    partido_id: UUID,
    contexto: str | None = None,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Lista videos de un partido, opcionalmente filtrado por contexto."""
    supabase = get_supabase()

    query = (
        supabase.table("videos_partido")
        .select("*")
        .eq("partido_id", str(partido_id))
        .eq("equipo_id", str(auth.equipo_id))
        .order("created_at", desc=False)
    )

    if contexto:
        if contexto not in VALID_CONTEXTOS:
            raise HTTPException(status_code=400, detail=f"Contexto inválido. Use: {VALID_CONTEXTOS}")
        query = query.eq("contexto", contexto)

    result = query.execute()
    return {"data": result.data or []}


# ============ ADD LINK (Veo / External) ============

@router.post("/link", status_code=201)
async def add_video_link(
    data: VideoPartidoCreate,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Añade un enlace de video (Veo o externo) a un partido."""
    if data.tipo not in ("veo", "enlace_externo"):
        raise HTTPException(status_code=400, detail="Use tipo 'veo' o 'enlace_externo' para enlaces.")

    if data.contexto not in VALID_CONTEXTOS:
        raise HTTPException(status_code=400, detail=f"Contexto inválido. Use: {VALID_CONTEXTOS}")

    if not data.url:
        raise HTTPException(status_code=400, detail="URL es requerida para enlaces.")

    supabase = get_supabase()

    # Verify partido exists and belongs to team
    partido = (
        supabase.table("partidos")
        .select("id")
        .eq("id", str(data.partido_id))
        .eq("equipo_id", str(auth.equipo_id))
        .maybe_single()
        .execute()
    )
    if not partido.data:
        raise HTTPException(status_code=404, detail="Partido no encontrado.")

    row = {
        "partido_id": str(data.partido_id),
        "equipo_id": str(auth.equipo_id),
        "tipo": data.tipo,
        "contexto": data.contexto,
        "titulo": data.titulo,
        "descripcion": data.descripcion,
        "url": data.url,
    }

    result = supabase.table("videos_partido").insert(row).execute()
    return result.data[0]


# ============ UPLOAD CLIP ============

@router.post("/upload", status_code=201)
async def upload_video_clip(
    partido_id: str = Form(...),
    equipo_id: str = Form(...),
    contexto: str = Form(...),
    titulo: str = Form(...),
    descripcion: str = Form(None),
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Sube un clip de video corto (máx 50MB) a Supabase Storage."""
    if contexto not in VALID_CONTEXTOS:
        raise HTTPException(status_code=400, detail=f"Contexto inválido. Use: {VALID_CONTEXTOS}")

    # Validate MIME type
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de video.")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 50MB.")

    supabase = get_supabase()

    # Verify partido exists and belongs to team
    partido = (
        supabase.table("partidos")
        .select("id")
        .eq("id", partido_id)
        .eq("equipo_id", str(auth.equipo_id))
        .maybe_single()
        .execute()
    )
    if not partido.data:
        raise HTTPException(status_code=404, detail="Partido no encontrado.")

    # Ensure bucket
    _ensure_video_bucket(supabase)

    # Upload to storage
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in (file.filename or "video"))
    storage_path = f"{partido_id}/{timestamp}_{safe_name}"

    try:
        supabase.storage.from_(VIDEO_BUCKET).upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )
        public_url = supabase.storage.from_(VIDEO_BUCKET).get_public_url(storage_path)
    except Exception as e:
        logger.error(f"Error uploading video clip: {e}")
        raise HTTPException(status_code=500, detail="Error al subir el video.")

    # Insert record
    row = {
        "partido_id": partido_id,
        "equipo_id": str(auth.equipo_id),
        "tipo": "upload",
        "contexto": contexto,
        "titulo": titulo,
        "descripcion": descripcion,
        "url": public_url,
        "storage_path": storage_path,
        "mime_type": file.content_type,
        "size_bytes": len(content),
    }

    result = supabase.table("videos_partido").insert(row).execute()
    return result.data[0]


# ============ UPDATE ============

@router.put("/{video_id}")
async def update_video(
    video_id: UUID,
    data: VideoPartidoUpdate,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Actualiza título/descripción de un video."""
    supabase = get_supabase()

    # Verify exists and belongs to team
    existing = (
        supabase.table("videos_partido")
        .select("id, equipo_id")
        .eq("id", str(video_id))
        .eq("equipo_id", str(auth.equipo_id))
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Video no encontrado.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("videos_partido")
        .update(updates)
        .eq("id", str(video_id))
        .execute()
    )
    return result.data[0]


# ============ DELETE ============

@router.delete("/{video_id}")
async def delete_video(
    video_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Elimina un video. Si es upload, también elimina del storage."""
    supabase = get_supabase()

    # Verify exists and belongs to team
    existing = (
        supabase.table("videos_partido")
        .select("id, tipo, storage_path, equipo_id")
        .eq("id", str(video_id))
        .eq("equipo_id", str(auth.equipo_id))
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Video no encontrado.")

    # Clean up storage for uploads
    if existing.data.get("tipo") == "upload" and existing.data.get("storage_path"):
        try:
            supabase.storage.from_(VIDEO_BUCKET).remove([existing.data["storage_path"]])
        except Exception as e:
            logger.warning(f"Could not delete video from storage: {e}")

    supabase.table("videos_partido").delete().eq("id", str(video_id)).execute()
    return {"status": "deleted"}
