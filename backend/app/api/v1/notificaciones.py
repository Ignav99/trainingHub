"""
TrainingHub Pro - Router de Notificaciones
Gestión de notificaciones del usuario.
"""

import logging
from datetime import datetime, timedelta, timezone
from math import ceil
from typing import List, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field

from app.models import (
    NotificacionResponse,
    NotificacionListResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.staff_board_service import TIPOS_EMERGENTES, TIPOS_PARA_TI

logger = logging.getLogger(__name__)

router = APIRouter()

EMERGENTES_MAX_DIAS = 7


class IdsBody(BaseModel):
    ids: List[UUID] = Field(..., min_length=1, max_length=50)


def _con_actores(supabase, filas: list[dict]) -> list[dict]:
    ids = list({str(f["actor_id"]) for f in filas if f.get("actor_id")})
    actores = {}
    if ids:
        for u in (
            supabase.table("usuarios").select("id, nombre, apellidos, avatar_url")
            .in_("id", ids).execute().data or []
        ):
            actores[u["id"]] = u
    return [{**f, "actor": actores.get(str(f.get("actor_id"))) if f.get("actor_id") else None} for f in filas]


@router.get("", response_model=NotificacionListResponse)
async def list_notificaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    solo_no_leidas: bool = False,
    ambito: Literal["todo", "para_ti"] = "todo",
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Lista notificaciones del usuario actual. «para_ti» deja solo lo personal del tablero."""
    supabase = get_supabase()

    query = supabase.table("notificaciones").select(
        "*", count="exact"
    ).eq("usuario_id", auth.user_id)

    if solo_no_leidas:
        query = query.eq("leida", False)
    if ambito == "para_ti":
        query = query.in_("tipo", list(TIPOS_PARA_TI))

    query = query.order("created_at", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return NotificacionListResponse(
        data=[NotificacionResponse(**n) for n in _con_actores(supabase, response.data or [])],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/count")
async def count_no_leidas(
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Cuenta notificaciones no leídas, en total y las personales."""
    supabase = get_supabase()

    total = supabase.table("notificaciones").select(
        "id", count="exact"
    ).eq("usuario_id", auth.user_id).eq("leida", False).limit(1).execute()

    para_ti = supabase.table("notificaciones").select(
        "id", count="exact"
    ).eq("usuario_id", auth.user_id).eq("leida", False).in_(
        "tipo", list(TIPOS_PARA_TI)
    ).limit(1).execute()

    return {"no_leidas": total.count or 0, "para_ti": para_ti.count or 0}


@router.get("/emergentes")
async def list_emergentes(
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Menciones, tareas y respuestas que aún no se han enseñado como aviso al entrar."""
    supabase = get_supabase()
    desde = (datetime.now(timezone.utc) - timedelta(days=EMERGENTES_MAX_DIAS)).isoformat()
    try:
        filas = (
            supabase.table("notificaciones").select("*")
            .eq("usuario_id", auth.user_id)
            .eq("leida", False)
            .eq("presentada", False)
            .in_("tipo", list(TIPOS_EMERGENTES))
            .gte("created_at", desde)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001 — sin la migración no hay columna «presentada»
        logger.warning("Avisos emergentes no disponibles: %s", exc)
        return {"data": []}
    return {"data": [NotificacionResponse(**n) for n in _con_actores(supabase, filas)]}


@router.put("/presentadas")
async def marcar_presentadas(
    body: IdsBody,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """El aviso emergente se cerró: deja de salir, pero sigue sin leer en la campana."""
    supabase = get_supabase()
    try:
        supabase.table("notificaciones").update({"presentada": True}).eq(
            "usuario_id", auth.user_id
        ).in_("id", [str(i) for i in body.ids]).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo marcar como presentada: %s", exc)
    return {"message": "ok"}


@router.put("/{notificacion_id}/leer")
async def marcar_leida(
    notificacion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Marca una notificación como leída."""
    supabase = get_supabase()

    response = supabase.table("notificaciones").update(
        {"leida": True}
    ).eq("id", str(notificacion_id)).eq(
        "usuario_id", auth.user_id
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )

    return {"message": "Notificación marcada como leída"}


@router.put("/leer-todas")
async def marcar_todas_leidas(
    ambito: Literal["todo", "para_ti"] = "todo",
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Marca todas las notificaciones (o solo las personales) como leídas."""
    supabase = get_supabase()

    query = supabase.table("notificaciones").update(
        {"leida": True}
    ).eq("usuario_id", auth.user_id).eq("leida", False)
    if ambito == "para_ti":
        query = query.in_("tipo", list(TIPOS_PARA_TI))
    query.execute()

    return {"message": "Todas las notificaciones marcadas como leídas"}


@router.delete("/{notificacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notificacion(
    notificacion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Elimina una notificación."""
    supabase = get_supabase()

    supabase.table("notificaciones").delete().eq(
        "id", str(notificacion_id)
    ).eq("usuario_id", auth.user_id).execute()

    return None
