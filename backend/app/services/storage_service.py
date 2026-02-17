"""
TrainingHub Pro - Storage Service
Upload/download de archivos a Supabase Storage.
"""

import logging
from typing import Optional

from app.database import get_supabase
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def upload_file(
    bucket: str,
    path: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Sube un archivo a Supabase Storage.

    Args:
        bucket: Nombre del bucket (logos, graficos, pdfs)
        path: Ruta dentro del bucket
        data: Contenido del archivo en bytes
        content_type: MIME type del archivo

    Returns:
        URL pública del archivo
    """
    supabase = get_supabase()

    try:
        supabase.storage.from_(bucket).upload(
            path=path,
            file=data,
            file_options={"content-type": content_type, "upsert": "true"},
        )

        return get_public_url(bucket, path)

    except Exception as e:
        logger.error(f"Error uploading file to {bucket}/{path}: {e}")
        raise


def get_public_url(bucket: str, path: str) -> str:
    """
    Obtiene la URL pública de un archivo.

    Args:
        bucket: Nombre del bucket
        path: Ruta dentro del bucket

    Returns:
        URL pública
    """
    supabase = get_supabase()
    result = supabase.storage.from_(bucket).get_public_url(path)
    return result


def delete_file(bucket: str, path: str) -> None:
    """
    Elimina un archivo de Supabase Storage.

    Args:
        bucket: Nombre del bucket
        path: Ruta dentro del bucket
    """
    supabase = get_supabase()

    try:
        supabase.storage.from_(bucket).remove([path])
    except Exception as e:
        logger.error(f"Error deleting file {bucket}/{path}: {e}")
        raise
