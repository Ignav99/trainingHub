"""
TrainingHub Pro - Audit Service
Registra acciones de crear/actualizar/eliminar en entidades importantes.
"""

import logging
from typing import Optional

from app.database import get_supabase

logger = logging.getLogger(__name__)


def log_action(
    usuario_id: str,
    accion: str,
    entidad_tipo: str,
    entidad_id: Optional[str] = None,
    datos_anteriores: Optional[dict] = None,
    datos_nuevos: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Registra una accion en el audit log.

    Args:
        usuario_id: ID del usuario que realiza la accion
        accion: 'crear', 'actualizar', 'eliminar'
        entidad_tipo: Tipo de entidad (sesion, jugador, partido, etc.)
        entidad_id: ID de la entidad afectada
        datos_anteriores: Estado previo (para updates/deletes)
        datos_nuevos: Estado nuevo (para creates/updates)
        ip_address: IP del cliente
    """
    try:
        supabase = get_supabase()

        record = {
            "usuario_id": usuario_id,
            "accion": accion,
            "entidad_tipo": entidad_tipo,
        }

        if entidad_id:
            record["entidad_id"] = entidad_id
        if datos_anteriores:
            record["datos_anteriores"] = datos_anteriores
        if datos_nuevos:
            record["datos_nuevos"] = datos_nuevos
        if ip_address:
            record["ip_address"] = ip_address

        supabase.table("audit_log").insert(record).execute()
    except Exception as e:
        # Never fail the main operation because of audit logging
        logger.error(f"Error writing audit log: {e}")


def log_create(
    usuario_id: str,
    entidad_tipo: str,
    entidad_id: str,
    datos: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Shortcut for logging a create action."""
    log_action(
        usuario_id=usuario_id,
        accion="crear",
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        datos_nuevos=datos,
        ip_address=ip_address,
    )


def log_update(
    usuario_id: str,
    entidad_tipo: str,
    entidad_id: str,
    datos_anteriores: Optional[dict] = None,
    datos_nuevos: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Shortcut for logging an update action."""
    log_action(
        usuario_id=usuario_id,
        accion="actualizar",
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        datos_anteriores=datos_anteriores,
        datos_nuevos=datos_nuevos,
        ip_address=ip_address,
    )


def log_delete(
    usuario_id: str,
    entidad_tipo: str,
    entidad_id: str,
    datos_anteriores: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Shortcut for logging a delete action."""
    log_action(
        usuario_id=usuario_id,
        accion="eliminar",
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        datos_anteriores=datos_anteriores,
        ip_address=ip_address,
    )
