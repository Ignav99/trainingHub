"""
TrainingHub Pro - Router de AI Chat
Conversaciones con asistente de IA (Claude).
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from math import ceil

from app.models import (
    AIConversacionCreate,
    AIConversacionResponse,
    AIMensajeResponse,
    AIChatRequest,
    AIChatResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.security.license_checker import LicenseChecker
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/conversaciones")
async def list_ai_conversaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    auth: AuthContext = Depends(require_permission(Permission.AI_USE)),
):
    """Lista conversaciones AI del usuario actual."""
    supabase = get_supabase()

    query = supabase.table("ai_conversaciones").select(
        "*", count="exact"
    ).eq("usuario_id", auth.user_id)

    query = query.order("updated_at", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return {
        "data": [AIConversacionResponse(**c) for c in response.data],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.get("/conversaciones/{conversacion_id}")
async def get_ai_conversacion(
    conversacion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.AI_USE)),
):
    """Obtiene una conversacion AI con sus mensajes."""
    supabase = get_supabase()

    conv = supabase.table("ai_conversaciones").select("*").eq(
        "id", str(conversacion_id)
    ).eq("usuario_id", auth.user_id).single().execute()

    if not conv.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversacion no encontrada"
        )

    mensajes = supabase.table("ai_mensajes").select("*").eq(
        "conversacion_id", str(conversacion_id)
    ).order("created_at").execute()

    return {
        "conversacion": AIConversacionResponse(**conv.data),
        "mensajes": [AIMensajeResponse(**m) for m in mensajes.data],
    }


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_ai(
    request: AIChatRequest,
    auth: AuthContext = Depends(require_permission(Permission.AI_USE)),
):
    """
    Envia un mensaje al asistente de IA (Claude) y obtiene respuesta.
    Crea conversacion automaticamente si no existe.

    El agente tiene acceso a herramientas para consultar datos del equipo:
    jugadores, sesiones, partidos, RPE, microciclos, knowledge base.
    """
    settings = get_settings()
    supabase = get_supabase()

    # Check AI calls quota
    allowed, msg = LicenseChecker.check_ai_calls_limit(auth.organizacion_id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    # Create or reuse conversation
    conversacion_id = request.conversacion_id

    if not conversacion_id:
        conv_data = {
            "usuario_id": auth.user_id,
            "titulo": request.mensaje[:50],
            "contexto": request.contexto,
        }
        if request.equipo_id:
            conv_data["equipo_id"] = str(request.equipo_id)

        conv_response = supabase.table("ai_conversaciones").insert(conv_data).execute()
        conversacion_id = conv_response.data[0]["id"]

    # Save user message
    supabase.table("ai_mensajes").insert({
        "conversacion_id": str(conversacion_id),
        "rol": "user",
        "contenido": request.mensaje,
    }).execute()

    # Get conversation history for context
    historial = supabase.table("ai_mensajes").select("rol, contenido").eq(
        "conversacion_id", str(conversacion_id)
    ).order("created_at").limit(20).execute()

    # Remove the current message from history (we pass it separately)
    historial_previo = historial.data[:-1] if historial.data else []

    # Resolve equipo_id from request or conversation
    equipo_id = str(request.equipo_id) if request.equipo_id else None
    if not equipo_id:
        # Check if conversation has equipo_id
        conv = supabase.table("ai_conversaciones").select("equipo_id").eq(
            "id", str(conversacion_id)
        ).single().execute()
        if conv.data and conv.data.get("equipo_id"):
            equipo_id = conv.data["equipo_id"]

    # Build context with team info if available
    contexto = request.contexto or {}
    if equipo_id:
        try:
            equipo = supabase.table("equipos").select(
                "nombre, categoria"
            ).eq("id", equipo_id).single().execute()
            if equipo.data:
                contexto["equipo_nombre"] = equipo.data.get("nombre")
                contexto["equipo_categoria"] = equipo.data.get("categoria")
        except Exception:
            pass

    # Call AI (with automatic fallback on 429/503)
    try:
        from app.services.ai_factory import call_ai_with_fallback

        result = await call_ai_with_fallback(
            "chat",
            mensaje=request.mensaje,
            historial=historial_previo,
            equipo_id=equipo_id,
            organizacion_id=auth.organizacion_id,
            contexto=contexto,
        )

        ai_response = result["respuesta"]
        tokens_input = result["tokens_input"]
        tokens_output = result["tokens_output"]
        herramientas_usadas = result["herramientas_usadas"]
        cache_read_tokens = result.get("cache_read_input_tokens", 0)
        cache_creation_tokens = result.get("cache_creation_input_tokens", 0)
        modelo = result.get("modelo")

    except Exception as e:
        logger.error(f"Error in AI chat: {e}", exc_info=True)
        ai_response = (
            "Lo siento, hubo un error procesando tu consulta. "
            "Por favor, intenta de nuevo."
        )
        tokens_input = None
        tokens_output = None
        herramientas_usadas = []
        cache_read_tokens = 0
        cache_creation_tokens = 0
        modelo = None

    # Increment AI usage counter
    LicenseChecker.increment_ai_calls(auth.organizacion_id)

    # Save AI response (including cache token metrics for cost analysis)
    msg_data = {
        "conversacion_id": str(conversacion_id),
        "rol": "assistant",
        "contenido": ai_response,
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
        "herramientas_usadas": herramientas_usadas,
    }
    if cache_read_tokens:
        msg_data["cache_read_input_tokens"] = cache_read_tokens
    if cache_creation_tokens:
        msg_data["cache_creation_input_tokens"] = cache_creation_tokens
    if modelo:
        msg_data["modelo"] = modelo

    supabase.table("ai_mensajes").insert(msg_data).execute()

    # Update conversation timestamp
    supabase.table("ai_conversaciones").update({
        "updated_at": "now()"
    }).eq("id", str(conversacion_id)).execute()

    return AIChatResponse(
        conversacion_id=conversacion_id,
        mensaje=ai_response,
        herramientas_usadas=herramientas_usadas,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
    )


@router.patch("/mensajes/{mensaje_id}/feedback")
async def feedback_ai_mensaje(
    mensaje_id: UUID,
    feedback: str = Query(..., regex="^(positivo|negativo)$"),
    auth: AuthContext = Depends(require_permission(Permission.AI_USE)),
):
    """
    Registra feedback (positivo/negativo) en un mensaje del asistente AI.
    Solo se puede dar feedback a mensajes del asistente en conversaciones propias.
    """
    supabase = get_supabase()

    # Verify the message belongs to a conversation owned by this user
    msg = supabase.table("ai_mensajes").select(
        "id, conversacion_id, rol"
    ).eq("id", str(mensaje_id)).single().execute()

    if not msg.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mensaje no encontrado")

    if msg.data["rol"] != "assistant":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se puede dar feedback a mensajes del asistente")

    # Verify conversation ownership
    conv = supabase.table("ai_conversaciones").select("id").eq(
        "id", msg.data["conversacion_id"]
    ).eq("usuario_id", auth.user_id).single().execute()

    if not conv.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta conversacion")

    # Update feedback
    supabase.table("ai_mensajes").update({
        "feedback": feedback
    }).eq("id", str(mensaje_id)).execute()

    return {"message": "Feedback registrado", "feedback": feedback}


@router.delete("/conversaciones/{conversacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_conversacion(
    conversacion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.AI_USE)),
):
    """Elimina una conversacion AI y sus mensajes."""
    supabase = get_supabase()

    supabase.table("ai_conversaciones").delete().eq(
        "id", str(conversacion_id)
    ).eq("usuario_id", auth.user_id).execute()

    return None
