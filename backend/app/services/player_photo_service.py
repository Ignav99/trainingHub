"""Player photo upload helpers — validated, org-scoped, cache-busted URLs."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

PLAYER_PHOTOS_BUCKET = "player-photos"
ALLOWED_MIME = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_BYTES = 5 * 1024 * 1024


def _ensure_bucket(supabase) -> None:
    bucket_options = {
        "public": True,
        "file_size_limit": MAX_BYTES,
        "allowed_mime_types": list(ALLOWED_MIME.keys()),
    }
    try:
        bucket = supabase.storage.get_bucket(PLAYER_PHOTOS_BUCKET)
    except Exception:
        try:
            supabase.storage.create_bucket(PLAYER_PHOTOS_BUCKET, options=bucket_options)
        except Exception as e:
            logger.warning("Could not create player-photos bucket (may exist): %s", e)
        return

    # Bucket already existed (e.g. from a prior iteration): force it public.
    # A pre-existing private bucket would silently break photo display even
    # though upload/DB update succeed, since the service role bypasses RLS.
    is_public = getattr(bucket, "public", None)
    if is_public is None and isinstance(bucket, dict):
        is_public = bucket.get("public")
    if is_public is not True:
        try:
            supabase.storage.update_bucket(PLAYER_PHOTOS_BUCKET, options=bucket_options)
        except Exception as e:
            logger.error(
                "player-photos bucket exists but is not public and could not be updated: %s",
                e,
            )


def validate_player_photo(content_type: Optional[str], content: bytes) -> str:
    """Return normalized extension or raise ValueError."""
    if not content_type or content_type.lower() not in ALLOWED_MIME:
        raise ValueError("Solo se permiten imágenes JPEG, PNG o WebP")
    if len(content) > MAX_BYTES:
        raise ValueError("La foto no puede superar 5MB")
    if len(content) < 32:
        raise ValueError("Archivo de imagen inválido")
    # Magic bytes (best-effort; never trust only MIME)
    head = content[:12]
    mime = content_type.lower()
    if mime in ("image/jpeg", "image/jpg") and not head.startswith(b"\xff\xd8"):
        raise ValueError("El archivo no es un JPEG válido")
    if mime == "image/png" and not head.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("El archivo no es un PNG válido")
    if mime == "image/webp" and not (head.startswith(b"RIFF") and b"WEBP" in head):
        raise ValueError("El archivo no es un WebP válido")
    return ALLOWED_MIME[mime]


def storage_path_for(organizacion_id: str, jugador_id: str, ext: str) -> str:
    return f"{organizacion_id}/jugadores/{jugador_id}/avatar.{ext}"


def _cache_bust(url: str) -> str:
    ts = int(datetime.now(timezone.utc).timestamp())
    # strip previous v= (and any now-dangling trailing separators) first, so
    # the separator decision below reflects the actual cleaned base — Supabase's
    # get_public_url() can return a URL with a bare trailing "?" and no params.
    base = re.sub(r"[?&]v=\d+", "", url).rstrip("?&")
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}v={ts}"


def upload_player_photo(
    supabase,
    *,
    organizacion_id: str,
    jugador_id: str,
    content: bytes,
    content_type: str,
) -> Tuple[str, str]:
    """
    Upload avatar and return (public_url_with_cache_bust, storage_path).
    Replaces previous avatar.* variants for this player.
    """
    ext = validate_player_photo(content_type, content)
    _ensure_bucket(supabase)
    path = storage_path_for(organizacion_id, jugador_id, ext)
    prefix = f"{organizacion_id}/jugadores/{jugador_id}/"

    # Remove old variants (jpg/png/webp) so we don't leave orphans
    try:
        listed = supabase.storage.from_(PLAYER_PHOTOS_BUCKET).list(prefix.rstrip("/"))
        to_remove = []
        for item in listed or []:
            name = item.get("name") if isinstance(item, dict) else None
            if name and name.startswith("avatar."):
                to_remove.append(f"{prefix}{name}")
        if to_remove:
            supabase.storage.from_(PLAYER_PHOTOS_BUCKET).remove(to_remove)
    except Exception as e:
        logger.warning("Could not list/remove old player photos: %s", e)

    try:
        supabase.storage.from_(PLAYER_PHOTOS_BUCKET).upload(
            path,
            content,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        # retry after remove single path
        try:
            supabase.storage.from_(PLAYER_PHOTOS_BUCKET).remove([path])
        except Exception:
            pass
        supabase.storage.from_(PLAYER_PHOTOS_BUCKET).upload(
            path,
            content,
            file_options={"content-type": content_type, "upsert": "true"},
        )

    public_url = supabase.storage.from_(PLAYER_PHOTOS_BUCKET).get_public_url(path)
    if isinstance(public_url, dict):
        public_url = public_url.get("publicUrl") or public_url.get("public_url") or ""
    return _cache_bust(str(public_url)), path


def delete_player_photo(
    supabase,
    *,
    organizacion_id: str,
    jugador_id: str,
) -> None:
    _ensure_bucket(supabase)
    prefix = f"{organizacion_id}/jugadores/{jugador_id}/"
    to_remove = []
    try:
        listed = supabase.storage.from_(PLAYER_PHOTOS_BUCKET).list(prefix.rstrip("/"))
        for item in listed or []:
            name = item.get("name") if isinstance(item, dict) else None
            if name and name.startswith("avatar."):
                to_remove.append(f"{prefix}{name}")
    except Exception:
        # Fallback known extensions
        for ext in ("jpg", "jpeg", "png", "webp"):
            to_remove.append(storage_path_for(organizacion_id, jugador_id, ext))
    if to_remove:
        try:
            supabase.storage.from_(PLAYER_PHOTOS_BUCKET).remove(to_remove)
        except Exception as e:
            logger.warning("Could not delete player photos: %s", e)
