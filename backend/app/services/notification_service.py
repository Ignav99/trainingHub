"""
TrainingHub Pro - Notification Service
Servicio para crear notificaciones automáticas desde eventos del sistema.
"""

import logging
from typing import Optional
from uuid import UUID

from app.database import get_supabase

logger = logging.getLogger(__name__)


def notify_user(
    usuario_id: str,
    tipo: str,
    titulo: str,
    contenido: Optional[str] = None,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    prioridad: str = "normal",
) -> None:
    """
    Crea una notificación para un usuario.

    Args:
        usuario_id: ID del usuario destinatario
        tipo: Tipo de notificación (sesion_creada, partido_resultado, rpe_pendiente, etc.)
        titulo: Título corto
        contenido: Contenido descriptivo
        entidad_tipo: Tipo de entidad relacionada (sesion, partido, jugador, etc.)
        entidad_id: ID de la entidad
        prioridad: baja, normal, alta, urgente
    """
    try:
        supabase = get_supabase()
        supabase.table("notificaciones").insert({
            "usuario_id": usuario_id,
            "tipo": tipo,
            "titulo": titulo,
            "contenido": contenido,
            "entidad_tipo": entidad_tipo,
            "entidad_id": entidad_id,
            "prioridad": prioridad,
        }).execute()
    except Exception as e:
        logger.error(f"Error creating notification: {e}")


def notify_team_staff(
    equipo_id: str,
    tipo: str,
    titulo: str,
    contenido: Optional[str] = None,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    prioridad: str = "normal",
    exclude_user: Optional[str] = None,
) -> None:
    """
    Envía notificación a todo el staff técnico de un equipo.

    Args:
        equipo_id: ID del equipo
        exclude_user: ID de usuario a excluir (normalmente el que genera la acción)
    """
    try:
        supabase = get_supabase()

        # Obtener usuarios del equipo
        ue_response = supabase.table("usuarios_equipos").select(
            "usuario_id"
        ).eq("equipo_id", equipo_id).execute()

        notifications = []
        for ue in ue_response.data:
            uid = ue["usuario_id"]
            if exclude_user and uid == exclude_user:
                continue

            notifications.append({
                "usuario_id": uid,
                "tipo": tipo,
                "titulo": titulo,
                "contenido": contenido,
                "entidad_tipo": entidad_tipo,
                "entidad_id": entidad_id,
                "prioridad": prioridad,
            })

        if notifications:
            supabase.table("notificaciones").insert(notifications).execute()

    except Exception as e:
        logger.error(f"Error creating team notifications: {e}")


def notify_sesion_created(
    sesion_id: str,
    sesion_titulo: str,
    equipo_id: str,
    creado_por: str,
) -> None:
    """Notifica al staff que se creó una nueva sesión."""
    notify_team_staff(
        equipo_id=equipo_id,
        tipo="sesion_creada",
        titulo="Nueva sesión planificada",
        contenido=f"Se ha creado la sesión '{sesion_titulo}'",
        entidad_tipo="sesion",
        entidad_id=sesion_id,
        exclude_user=creado_por,
    )


def notify_partido_resultado(
    partido_id: str,
    rival_nombre: str,
    goles_favor: int,
    goles_contra: int,
    equipo_id: str,
) -> None:
    """Notifica al staff que se registró un resultado."""
    resultado = f"{goles_favor}-{goles_contra}"
    notify_team_staff(
        equipo_id=equipo_id,
        tipo="partido_resultado",
        titulo=f"Resultado registrado: {resultado}",
        contenido=f"vs {rival_nombre}: {resultado}",
        entidad_tipo="partido",
        entidad_id=partido_id,
    )


def notify_jugador_lesion(
    jugador_nombre: str,
    equipo_id: str,
    jugador_id: str,
) -> None:
    """Notifica al staff que un jugador se ha lesionado."""
    notify_team_staff(
        equipo_id=equipo_id,
        tipo="jugador_lesion",
        titulo=f"Lesión: {jugador_nombre}",
        contenido=f"{jugador_nombre} ha sido marcado como lesionado",
        entidad_tipo="jugador",
        entidad_id=jugador_id,
        prioridad="alta",
    )


def notify_rpe_alerta(
    jugador_nombre: str,
    rpe_valor: int,
    usuario_ids: list[str],
    jugador_id: str,
) -> None:
    """Notifica si un RPE es preocupante (>= 8)."""
    if rpe_valor < 8:
        return

    for uid in usuario_ids:
        notify_user(
            usuario_id=uid,
            tipo="rpe_alerta",
            titulo=f"RPE alto: {jugador_nombre} ({rpe_valor}/10)",
            contenido=f"{jugador_nombre} ha reportado un RPE de {rpe_valor}. Considere ajustar la carga.",
            entidad_tipo="jugador",
            entidad_id=jugador_id,
            prioridad="alta",
        )
