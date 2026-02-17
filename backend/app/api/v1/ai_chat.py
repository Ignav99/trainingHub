"""
TrainingHub Pro - Router de AI Chat
Conversaciones con asistente de IA.
"""

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
    UsuarioResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user
from app.config import get_settings

router = APIRouter()


@router.get("/conversaciones")
async def list_ai_conversaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista conversaciones AI del usuario actual."""
    supabase = get_supabase()

    query = supabase.table("ai_conversaciones").select(
        "*", count="exact"
    ).eq("usuario_id", str(current_user.id))

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
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene una conversación AI con sus mensajes."""
    supabase = get_supabase()

    conv = supabase.table("ai_conversaciones").select("*").eq(
        "id", str(conversacion_id)
    ).eq("usuario_id", str(current_user.id)).single().execute()

    if not conv.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada"
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
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Envía un mensaje al asistente de IA y obtiene respuesta.
    Crea conversación automáticamente si no existe.
    """
    settings = get_settings()
    supabase = get_supabase()

    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Servicio de IA no disponible. Configure GEMINI_API_KEY."
        )

    # Crear o reutilizar conversación
    conversacion_id = request.conversacion_id

    if not conversacion_id:
        # Crear nueva conversación
        conv_data = {
            "usuario_id": str(current_user.id),
            "titulo": request.mensaje[:50],
            "contexto": request.contexto,
        }
        if request.equipo_id:
            conv_data["equipo_id"] = str(request.equipo_id)

        conv_response = supabase.table("ai_conversaciones").insert(conv_data).execute()
        conversacion_id = conv_response.data[0]["id"]

    # Guardar mensaje del usuario
    supabase.table("ai_mensajes").insert({
        "conversacion_id": str(conversacion_id),
        "rol": "user",
        "contenido": request.mensaje,
    }).execute()

    # Obtener historial para contexto
    historial = supabase.table("ai_mensajes").select("rol, contenido").eq(
        "conversacion_id", str(conversacion_id)
    ).order("created_at").limit(20).execute()

    # Llamar a Gemini
    try:
        from app.services.gemini_service import GeminiService

        gemini = GeminiService()

        # Construir contexto
        context_parts = []
        for msg in historial.data:
            role = "Usuario" if msg["rol"] == "user" else "Asistente"
            context_parts.append(f"{role}: {msg['contenido']}")

        context = "\n".join(context_parts)

        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        system_prompt = (
            "Eres un asistente experto en fútbol y metodología de entrenamiento. "
            "Ayudas a entrenadores con planificación de sesiones, análisis táctico, "
            "gestión de plantilla y periodización táctica. "
            "Responde en español, de forma concisa y profesional."
        )

        response = model.generate_content(
            f"{system_prompt}\n\nHistorial:\n{context}\n\nUsuario: {request.mensaje}",
            generation_config=genai.GenerationConfig(
                temperature=settings.GEMINI_TEMPERATURE,
            ),
        )

        ai_response = response.text
        tokens_input = response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else None
        tokens_output = response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else None

    except Exception as e:
        ai_response = f"Lo siento, hubo un error procesando tu consulta. Por favor, intenta de nuevo. Error: {str(e)}"
        tokens_input = None
        tokens_output = None

    # Guardar respuesta
    supabase.table("ai_mensajes").insert({
        "conversacion_id": str(conversacion_id),
        "rol": "assistant",
        "contenido": ai_response,
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
    }).execute()

    # Actualizar título si es primera interacción
    supabase.table("ai_conversaciones").update({
        "updated_at": "now()"
    }).eq("id", str(conversacion_id)).execute()

    return AIChatResponse(
        conversacion_id=conversacion_id,
        mensaje=ai_response,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
    )


@router.delete("/conversaciones/{conversacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_conversacion(
    conversacion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina una conversación AI y sus mensajes."""
    supabase = get_supabase()

    supabase.table("ai_conversaciones").delete().eq(
        "id", str(conversacion_id)
    ).eq("usuario_id", str(current_user.id)).execute()

    return None
