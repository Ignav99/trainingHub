"""
TrainingHub Pro - Router de Comunicación
Chat interno: conversaciones, mensajes y participantes.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from math import ceil

from app.models import (
    ConversacionCreate,
    ConversacionResponse,
    MensajeCreate,
    MensajeResponse,
    ParticipanteResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


# ============ Conversaciones ============

@router.get("/conversaciones")
async def list_conversaciones(
    auth: AuthContext = Depends(require_permission(Permission.COMUNICACION_SEND_MESSAGE)),
):
    """Lista conversaciones del usuario actual."""
    supabase = get_supabase()

    # Obtener conversaciones donde el usuario es participante
    participaciones = supabase.table("conversacion_participantes").select(
        "conversacion_id"
    ).eq("usuario_id", auth.user_id).execute()

    conv_ids = [p["conversacion_id"] for p in participaciones.data]

    if not conv_ids:
        return {"data": [], "total": 0}

    response = supabase.table("conversaciones").select(
        "*, conversacion_participantes(usuario_id, rol, ultimo_leido)"
    ).in_("id", conv_ids).eq("activa", True).order("updated_at", desc=True).execute()

    return {"data": response.data, "total": len(response.data)}


@router.get("/conversaciones/{conversacion_id}")
async def get_conversacion(
    conversacion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.COMUNICACION_SEND_MESSAGE)),
):
    """Obtiene una conversación con sus participantes."""
    supabase = get_supabase()

    response = supabase.table("conversaciones").select(
        "*, conversacion_participantes(*, usuarios(nombre, apellidos, avatar_url))"
    ).eq("id", str(conversacion_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada"
        )

    return response.data


@router.post("/conversaciones", status_code=status.HTTP_201_CREATED)
async def create_conversacion(
    conv: ConversacionCreate,
    auth: AuthContext = Depends(require_permission(Permission.COMUNICACION_CREATE_GRUPO)),
):
    """Crea una conversación y añade participantes."""
    supabase = get_supabase()

    # Crear conversación
    conv_data = {
        "tipo": conv.tipo.value,
        "nombre": conv.nombre,
        "creado_por": auth.user_id,
    }
    if conv.equipo_id:
        conv_data["equipo_id"] = str(conv.equipo_id)

    response = supabase.table("conversaciones").insert(conv_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear conversación"
        )

    conv_id = response.data[0]["id"]

    # Añadir creador como admin
    participantes = [{
        "conversacion_id": conv_id,
        "usuario_id": auth.user_id,
        "rol": "admin",
    }]

    # Añadir otros participantes
    for uid in conv.participantes:
        if str(uid) != auth.user_id:
            participantes.append({
                "conversacion_id": conv_id,
                "usuario_id": str(uid),
                "rol": "miembro",
            })

    if participantes:
        supabase.table("conversacion_participantes").insert(participantes).execute()

    return response.data[0]


# ============ Mensajes ============

@router.get("/conversaciones/{conversacion_id}/mensajes")
async def list_mensajes(
    conversacion_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    auth: AuthContext = Depends(require_permission(Permission.COMUNICACION_SEND_MESSAGE)),
):
    """Lista mensajes de una conversación."""
    supabase = get_supabase()

    query = supabase.table("mensajes").select(
        "*, usuarios:autor_id(nombre, apellidos, avatar_url)",
        count="exact"
    ).eq("conversacion_id", str(conversacion_id))

    query = query.order("created_at", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    # Actualizar último leído
    supabase.table("conversacion_participantes").update({
        "ultimo_leido": "now()"
    }).eq("conversacion_id", str(conversacion_id)).eq(
        "usuario_id", auth.user_id
    ).execute()

    return {
        "data": response.data,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.post("/mensajes", status_code=status.HTTP_201_CREATED)
async def create_mensaje(
    mensaje: MensajeCreate,
    auth: AuthContext = Depends(require_permission(Permission.COMUNICACION_SEND_MESSAGE)),
):
    """Envía un mensaje en una conversación."""
    supabase = get_supabase()

    data = {
        "conversacion_id": str(mensaje.conversacion_id),
        "autor_id": auth.user_id,
        "contenido": mensaje.contenido,
        "tipo": mensaje.tipo.value,
    }
    if mensaje.archivo_url:
        data["archivo_url"] = mensaje.archivo_url

    response = supabase.table("mensajes").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al enviar mensaje"
        )

    # Actualizar updated_at de la conversación
    supabase.table("conversaciones").update({
        "updated_at": "now()"
    }).eq("id", str(mensaje.conversacion_id)).execute()

    return response.data[0]


@router.put("/mensajes/{mensaje_id}")
async def update_mensaje(
    mensaje_id: UUID,
    contenido: str = Query(..., min_length=1),
    auth: AuthContext = Depends(require_permission(Permission.COMUNICACION_SEND_MESSAGE)),
):
    """Edita un mensaje propio."""
    supabase = get_supabase()

    response = supabase.table("mensajes").update({
        "contenido": contenido,
        "editado": True,
    }).eq("id", str(mensaje_id)).eq(
        "autor_id", auth.user_id
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensaje no encontrado o no eres el autor"
        )

    return response.data[0]


@router.delete("/mensajes/{mensaje_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mensaje(
    mensaje_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.COMUNICACION_SEND_MESSAGE)),
):
    """Elimina un mensaje propio."""
    supabase = get_supabase()

    supabase.table("mensajes").delete().eq(
        "id", str(mensaje_id)
    ).eq("autor_id", auth.user_id).execute()

    return None
