"""
Revisión de vídeo — packs, carpetas por fase, retención 30 días.
"""

from __future__ import annotations

import logging
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

REVISION_BUCKET = "revision-clips"
MAX_CLIP_BYTES = 200 * 1024 * 1024  # 200 MB
MIN_CLIP_BYTES = 1000
HOT_DAYS = 30

# Fases canónicas (informe de partido / Video Análisis)
FOLDERS_PARTIDO = [
    ("ataque_organizado", "Ataque organizado"),
    ("defensa_organizada", "Defensa organizada"),
    ("transicion_defensa_ataque", "Transición defensa → ataque"),
    ("transicion_ataque_defensa", "Transición ataque → defensa"),
    ("balon_parado_ofensivo", "ABP ofensivo"),
    ("balon_parado_defensivo", "ABP defensivo"),
]

# Informe rival / plan (nombres del scout)
FOLDERS_RIVAL = [
    ("ataque_organizado", "Ataque organizado"),
    ("defensa_organizada", "Defensa organizada"),
    ("transicion_ofensiva", "Transición ofensiva"),
    ("transicion_defensiva", "Transición defensiva"),
    ("abp_ofensiva", "ABP ofensiva"),
    ("abp_defensiva", "ABP defensiva"),
    ("once_probable", "Once probable"),
]


def make_fingerprint(filename: str, size_bytes: Optional[int], duration_ms: Optional[int]) -> str:
    """Huella del fichero local: nombre + tamaño + duración."""
    name = (filename or "local_video").strip() or "local_video"
    return f"{name}|{int(size_bytes or 0)}|{int(duration_ms or 0)}"


def generate_session_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    # Evitar 0/O y 1/I
    alphabet = alphabet.replace("0", "").replace("O", "").replace("1", "").replace("I", "")
    return "".join(secrets.choice(alphabet) for _ in range(length))


def default_folders_for(ambito: str) -> list[tuple[str, str]]:
    if ambito in ("rival", "partido_plan"):
        return list(FOLDERS_RIVAL)
    return list(FOLDERS_PARTIDO)


def hot_until_from(now: Optional[datetime] = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    return now + timedelta(days=HOT_DAYS)


def should_keep_hot(
    partido_fecha: Optional[datetime],
    now: Optional[datetime] = None,
) -> bool:
    """No archivar si el partido asociado todavía no se ha jugado."""
    now = now or datetime.now(timezone.utc)
    if partido_fecha is None:
        return False
    if partido_fecha.tzinfo is None:
        partido_fecha = partido_fecha.replace(tzinfo=timezone.utc)
    return partido_fecha.date() >= now.date()


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def drive_connected(org_config: Optional[dict]) -> bool:
    if not org_config:
        return False
    drive = org_config.get("google_drive") or {}
    if isinstance(drive, dict) and drive.get("connected"):
        return True
    return False


def archive_expired_clips(supabase) -> dict:
    """
    Clips > 30 días: volcar a Drive si el club lo tiene conectado.
    Si Drive no está, se dejan en Kabin-e y se avisa. Nunca se borran bytes
    si el volcado no se ha completado.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    result = (
        supabase.table("revision_clips")
        .select("id, equipo_id, storage_path, url, hot_until, status, pack_id")
        .eq("status", "hot")
        .lte("hot_until", now_iso)
        .execute()
    )
    clips = result.data or []
    skipped_future = 0
    skipped_no_drive = 0
    skipped_no_api = 0
    archived = 0
    errors = 0

    for clip in clips:
        try:
            pack = (
                supabase.table("revision_packs")
                .select("id, partido_id, equipo_id")
                .eq("id", clip["pack_id"])
                .limit(1)
                .execute()
            )
            pack_row = (pack.data or [None])[0]
            partido_fecha = None
            org_config = None
            if pack_row and pack_row.get("partido_id"):
                partido = (
                    supabase.table("partidos")
                    .select("id, fecha, equipo_id")
                    .eq("id", pack_row["partido_id"])
                    .limit(1)
                    .execute()
                )
                if partido.data:
                    partido_fecha = parse_iso(partido.data[0].get("fecha"))

            if should_keep_hot(partido_fecha, now):
                extend_until = (partido_fecha + timedelta(days=1)).isoformat() if partido_fecha else now_iso
                supabase.table("revision_clips").update({
                    "hot_until": extend_until,
                    "archive_warning": None,
                    "updated_at": now_iso,
                }).eq("id", clip["id"]).execute()
                skipped_future += 1
                continue

            equipo = (
                supabase.table("equipos")
                .select("id, organizacion_id")
                .eq("id", clip["equipo_id"])
                .limit(1)
                .execute()
            )
            if equipo.data:
                org = (
                    supabase.table("organizaciones")
                    .select("id, config")
                    .eq("id", equipo.data[0]["organizacion_id"])
                    .limit(1)
                    .execute()
                )
                if org.data:
                    org_config = org.data[0].get("config") or {}

            if not drive_connected(org_config):
                supabase.table("revision_clips").update({
                    "archive_warning": "Google Drive no está conectado. El clip se queda en Kabin-e.",
                    "updated_at": now_iso,
                }).eq("id", clip["id"]).execute()
                skipped_no_drive += 1
                continue

            # Drive marcado como conectado, pero no hay API de volcado todavía:
            # no borrar bytes.
            supabase.table("revision_clips").update({
                "archive_warning": "Drive indicado en Configuración, pero el volcado automático aún no está activo. El clip se conserva.",
                "updated_at": now_iso,
            }).eq("id", clip["id"]).execute()
            skipped_no_api += 1
        except Exception as exc:
            logger.exception("Error archivando clip %s: %s", clip.get("id"), exc)
            errors += 1

    return {
        "scanned": len(clips),
        "archived": archived,
        "skipped_future_match": skipped_future,
        "skipped_no_drive": skipped_no_drive,
        "skipped_no_api": skipped_no_api,
        "errors": errors,
    }


def sanitize_clip_filename(filename: str | None) -> str:
    base = "".join(c if c.isalnum() or c in "._-" else "_" for c in (filename or "clip.webm"))
    base = base.strip("._") or "clip.webm"
    if "." not in base:
        base += ".webm"
    return base[:120]


def make_clip_storage_path(
    equipo_id: str,
    pack_id: str,
    filename: str | None,
    now_ms: int | None = None,
) -> str:
    ts = now_ms if now_ms is not None else int(datetime.now(timezone.utc).timestamp() * 1000)
    return f"{equipo_id}/{pack_id}/{ts}_{sanitize_clip_filename(filename)}"


def strip_bucket_prefix(path: str, bucket: str = REVISION_BUCKET) -> str:
    cleaned = (path or "").lstrip("/")
    prefix = f"{bucket}/"
    if cleaned.startswith(prefix):
        return cleaned[len(prefix) :]
    return cleaned


def is_allowed_clip_path(path: str, equipo_id: str, pack_id: str) -> bool:
    if not path or ".." in path or path.startswith("/") or "\\" in path:
        return False
    return path.startswith(f"{equipo_id}/{pack_id}/")


def flatten_pack_graph(row: dict) -> dict:
    """Separa folders/clips/links de un select anidado de PostgREST."""
    pack = dict(row)
    folders = list(pack.pop("revision_folders", None) or [])
    clips_raw = list(pack.pop("revision_clips", None) or [])
    links: list[dict] = []
    clips: list[dict] = []
    for clip_row in clips_raw:
        clip = dict(clip_row)
        nested = clip.pop("revision_clip_links", None) or []
        links.extend(nested)
        clips.append(clip)
    folders.sort(key=lambda f: (f.get("orden") is None, f.get("orden") or 0))
    clips.sort(key=lambda c: c.get("created_at") or "", reverse=True)
    pack["folders"] = folders
    pack["clips"] = clips
    pack["links"] = links
    return pack


def mime_from_filename(filename: str | None) -> str:
    name = (filename or "").lower()
    if name.endswith(".mp4"):
        return "video/mp4"
    if name.endswith(".webm"):
        return "video/webm"
    if name.endswith(".mov"):
        return "video/quicktime"
    if name.endswith(".mkv"):
        return "video/x-matroska"
    return "video/webm"


def normalize_clip_mime(mime: str | None, filename: str | None = None) -> str:
    value = (mime or "").split(";")[0].strip().lower()
    if not value or value == "application/octet-stream":
        return mime_from_filename(filename)
    if value.startswith("video/"):
        return value
    raise ValueError("Solo se permiten archivos de video.")


def normalize_signed_upload_url(
    raw: dict,
    supabase_url: str,
    storage_path: str,
    bucket: str = REVISION_BUCKET,
) -> dict:
    """Normaliza la respuesta de create_signed_upload_url (claves y URL absoluta)."""
    token = str(raw.get("token") or "")
    signed = str(
        raw.get("signed_url")
        or raw.get("signedUrl")
        or raw.get("signedURL")
        or raw.get("url")
        or ""
    )
    path = strip_bucket_prefix(str(raw.get("path") or storage_path), bucket)
    base = supabase_url.rstrip("/")
    if signed and not signed.startswith("http"):
        if not signed.startswith("/"):
            signed = "/" + signed
        if signed.startswith("/storage/v1/"):
            signed = base + signed
        else:
            signed = base + "/storage/v1" + signed
    if token and signed and "token=" not in signed:
        signed = f"{signed}{'&' if '?' in signed else '?'}token={token}"
    return {"signed_url": signed, "token": token, "path": path}


def bucket_file_size_limit(bucket) -> int:
    if bucket is None:
        return 0
    if isinstance(bucket, dict):
        return int(bucket.get("file_size_limit") or 0)
    return int(getattr(bucket, "file_size_limit", 0) or 0)


def ensure_video_bucket(supabase, bucket: str = REVISION_BUCKET) -> None:
    """Crea el bucket o sube su tope a 200MB (el default de Storage es 50MB)."""
    options = {"public": True, "file_size_limit": MAX_CLIP_BYTES}
    try:
        existing = supabase.storage.get_bucket(bucket)
    except Exception:
        existing = None

    if existing is None:
        try:
            supabase.storage.create_bucket(bucket, options=options)
        except Exception as exc:
            logger.warning("could not create %s bucket: %s", bucket, exc)
        return

    if bucket_file_size_limit(existing) >= MAX_CLIP_BYTES:
        return
    try:
        supabase.storage.update_bucket(bucket, options)
    except Exception as exc:
        logger.warning("could not raise %s file size limit to %s: %s", bucket, MAX_CLIP_BYTES, exc)
