"""
TrainingHub Pro - Audit Service
Registra acciones en el audit log con soporte expandido para el sistema de seguridad.
"""

import logging
from typing import Optional

from app.database import get_supabase

logger = logging.getLogger(__name__)

# Valid actions for audit log
VALID_ACTIONS = {
    "crear", "actualizar", "eliminar",
    "login", "logout", "login_fallido",
    "invitar", "aceptar_invitacion", "revocar_acceso",
    "ver_datos_medicos", "exportar_datos",
    "cambiar_rol", "transferir_propiedad",
    "consentimiento_gdpr", "solicitud_gdpr",
    "cambiar_password", "activar_mfa", "acceso_denegado",
}


def log_action(
    usuario_id: str,
    accion: str,
    entidad_tipo: str,
    entidad_id: Optional[str] = None,
    datos_anteriores: Optional[dict] = None,
    datos_nuevos: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    organizacion_id: Optional[str] = None,
    equipo_id: Optional[str] = None,
    severidad: str = "info",
    resultado: str = "exito",
) -> None:
    """
    Registra una accion en el audit log.

    Args:
        usuario_id: ID del usuario que realiza la accion
        accion: Tipo de accion (ver VALID_ACTIONS)
        entidad_tipo: Tipo de entidad (sesion, jugador, partido, etc.)
        entidad_id: ID de la entidad afectada
        datos_anteriores: Estado previo (para updates/deletes)
        datos_nuevos: Estado nuevo (para creates/updates)
        ip_address: IP del cliente
        user_agent: User-Agent del cliente
        organizacion_id: ID de la organizacion
        equipo_id: ID del equipo
        severidad: 'info', 'warning', 'critical'
        resultado: 'exito', 'fallo', 'denegado'
    """
    try:
        supabase = get_supabase()

        record = {
            "usuario_id": usuario_id,
            "accion": accion,
            "entidad_tipo": entidad_tipo,
            "severidad": severidad,
        }

        if entidad_id:
            record["entidad_id"] = entidad_id
        if datos_anteriores:
            record["datos_anteriores"] = datos_anteriores
        if datos_nuevos:
            record["datos_nuevos"] = datos_nuevos
        if ip_address:
            record["ip_address"] = ip_address
        if user_agent:
            record["user_agent"] = user_agent
        if organizacion_id:
            record["organizacion_id"] = organizacion_id
        if equipo_id:
            record["equipo_id"] = equipo_id

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


def log_login(
    usuario_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
) -> None:
    """Log login attempt."""
    log_action(
        usuario_id=usuario_id,
        accion="login" if success else "login_fallido",
        entidad_tipo="auth",
        ip_address=ip_address,
        user_agent=user_agent,
        severidad="info" if success else "warning",
        resultado="exito" if success else "fallo",
    )


def log_access_denied(
    usuario_id: str,
    entidad_tipo: str,
    permissions_required: list[str],
    ip_address: Optional[str] = None,
) -> None:
    """Log access denied."""
    log_action(
        usuario_id=usuario_id,
        accion="acceso_denegado",
        entidad_tipo=entidad_tipo,
        datos_nuevos={"permissions_required": permissions_required},
        ip_address=ip_address,
        severidad="warning",
        resultado="denegado",
    )
