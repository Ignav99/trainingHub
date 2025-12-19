"""
TrainingHub Pro - Router del Recomendador
Sistema de recomendación de tareas basado en Match Day y objetivos.
Incluye recomendador con IA (Google Gemini).
"""

import logging
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from app.models import (
    RecomendadorInput,
    RecomendadorOutput,
    TareaRecomendada,
    TareaResponse,
    MatchDay,
    AIRecomendadorInput,
    AIRecomendadorOutput,
    AIFaseRecomendacion,
    AICargaEstimada,
)
from app.database import get_supabase
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Configuración de Match Days para el recomendador
MATCH_DAY_CONFIG = {
    "MD+1": {
        "categorias_preferidas": ["RND", "ACO"],
        "categorias_evitar": ["SSG", "AVD", "PCO"],
        "nivel_cognitivo_max": 1,
        "m2_min": 150,
        "intensidad": "muy_baja",
    },
    "MD-4": {
        "categorias_preferidas": ["SSG", "JDP", "AVD"],
        "categorias_evitar": ["ACO"],
        "nivel_cognitivo_max": 3,
        "m2_max": 100,
        "intensidad": "alta",
    },
    "MD-3": {
        "categorias_preferidas": ["JDP", "POS", "PCO", "AVD"],
        "categorias_evitar": ["SSG"],
        "nivel_cognitivo_max": 3,
        "m2_min": 100,
        "m2_max": 200,
        "intensidad": "alta",
    },
    "MD-2": {
        "categorias_preferidas": ["EVO", "JDP"],
        "categorias_evitar": ["SSG", "PCO"],
        "nivel_cognitivo_max": 2,
        "m2_min": 150,
        "intensidad": "media",
    },
    "MD-1": {
        "categorias_preferidas": ["RND", "ABP", "ACO"],
        "categorias_evitar": ["SSG", "AVD", "PCO"],
        "nivel_cognitivo_max": 2,
        "intensidad": "baja",
    },
}

# Categorías recomendadas por fase de sesión
FASE_CATEGORIAS = {
    "activacion": ["RND", "ACO"],
    "desarrollo_1": ["JDP", "AVD", "POS"],
    "desarrollo_2": ["PCO", "AVD", "EVO"],
    "vuelta_calma": ["ACO", "RND"],
}


def calcular_score(tarea: dict, params: RecomendadorInput, fase: str) -> tuple[float, str]:
    """Calcula el score de una tarea para los parámetros dados."""
    score = 0.0
    razones = []
    
    md_config = MATCH_DAY_CONFIG.get(params.match_day.value, {})
    
    # Obtener código de categoría
    cat_codigo = tarea.get("categoria", {}).get("codigo", "")
    
    # Factor 1: Compatibilidad con Match Day (30%)
    if cat_codigo in md_config.get("categorias_preferidas", []):
        score += 0.30
        razones.append(f"Categoría ideal para {params.match_day.value}")
    elif cat_codigo in md_config.get("categorias_evitar", []):
        score -= 0.20
        razones.append("Categoría no recomendada para este día")
    else:
        score += 0.15
    
    # Factor 2: Fase de sesión (25%)
    if cat_codigo in FASE_CATEGORIAS.get(fase, []):
        score += 0.25
        razones.append(f"Ideal para fase de {fase}")
    else:
        score += 0.10
    
    # Factor 3: Ajuste de jugadores (20%)
    jug_min = tarea.get("num_jugadores_min", 0)
    jug_max = tarea.get("num_jugadores_max") or jug_min + 4
    
    if jug_min <= params.num_jugadores <= jug_max:
        score += 0.20
        razones.append("Número de jugadores óptimo")
    elif abs(params.num_jugadores - jug_min) <= 2:
        score += 0.10
    
    # Factor 4: Nivel cognitivo (15%)
    nivel = tarea.get("nivel_cognitivo", 2)
    nivel_max = md_config.get("nivel_cognitivo_max", 3)
    
    if nivel <= nivel_max:
        score += 0.15
    else:
        score -= 0.10
        razones.append("Nivel cognitivo alto para este día")
    
    # Factor 5: Coincidencia táctica (10%)
    if params.fase_juego and tarea.get("fase_juego") == params.fase_juego:
        score += 0.10
        razones.append("Coincide con objetivo táctico")
    
    # Normalizar score
    score = max(0, min(1, score))
    
    razon = ". ".join(razones) if razones else "Tarea compatible"
    return score, razon


@router.post("/sesion", response_model=RecomendadorOutput)
async def recomendar_sesion(
    params: RecomendadorInput,
):
    """
    Genera recomendaciones de tareas para una sesión.

    Devuelve tareas recomendadas para cada fase:
    - activacion: 15-20 min
    - desarrollo_1: 20-25 min (trabajo sectorial)
    - desarrollo_2: 25-30 min (trabajo colectivo)
    - vuelta_calma: 10 min
    """
    # TODO: Añadir autenticación después de pruebas
    # Por ahora usamos la organización por defecto
    DEFAULT_ORG_ID = "454b26bf-8e28-4dc0-b85c-ba1108d982b6"

    supabase = get_supabase()

    # Obtener todas las tareas disponibles
    response = supabase.table("tareas").select(
        "*, categorias_tarea!inner(codigo, nombre)"
    ).eq(
        "organizacion_id", DEFAULT_ORG_ID
    ).execute()
    
    tareas = response.data
    
    # Preparar recomendaciones por fase
    recomendaciones = {
        "activacion": [],
        "desarrollo_1": [],
        "desarrollo_2": [],
        "vuelta_calma": [],
    }
    
    # Duraciones objetivo por fase
    duraciones_objetivo = {
        "activacion": (12, 20),
        "desarrollo_1": (18, 25),
        "desarrollo_2": (20, 30),
        "vuelta_calma": (8, 15),
    }
    
    for fase in recomendaciones.keys():
        dur_min, dur_max = duraciones_objetivo[fase]
        
        # Filtrar y puntuar tareas
        candidatas = []
        for tarea in tareas:
            # Mapear categoría
            tarea["categoria"] = tarea.get("categorias_tarea", {})
            
            # Filtrar por duración
            duracion = tarea.get("duracion_total", 0)
            if duracion < dur_min - 5 or duracion > dur_max + 10:
                continue
            
            # Filtrar excluidas
            if params.excluir_tareas and tarea["id"] in [str(t) for t in params.excluir_tareas]:
                continue
            
            # Calcular score
            score, razon = calcular_score(tarea, params, fase)
            
            if score > 0.3:  # Umbral mínimo
                candidatas.append(TareaRecomendada(
                    tarea=TareaResponse(**tarea),
                    score=round(score, 2),
                    razon=razon,
                ))
        
        # Ordenar por score y tomar top 3
        candidatas.sort(key=lambda x: x.score, reverse=True)
        recomendaciones[fase] = candidatas[:3]
    
    # Calcular metadata
    duracion_total = 0
    niveles = []
    
    for fase, recs in recomendaciones.items():
        if recs:
            duracion_total += recs[0].tarea.duracion_total
            if recs[0].tarea.nivel_cognitivo:
                niveles.append(recs[0].tarea.nivel_cognitivo.value)
    
    md_config = MATCH_DAY_CONFIG.get(params.match_day.value, {})
    
    return RecomendadorOutput(
        recomendaciones=recomendaciones,
        metadata={
            "duracion_total_estimada": duracion_total,
            "carga_fisica_recomendada": md_config.get("intensidad", "media"),
            "nivel_cognitivo_promedio": round(sum(niveles) / len(niveles), 1) if niveles else 2,
            "match_day": params.match_day.value,
        }
    )


@router.post("/ai-sesion", response_model=AIRecomendadorOutput)
async def recomendar_sesion_ai(
    params: AIRecomendadorInput,
):
    """
    Genera recomendaciones de sesión usando IA (Google Gemini).

    A diferencia del endpoint básico, este usa un modelo de lenguaje
    para analizar el contexto y generar recomendaciones más inteligentes
    con explicaciones detalladas.

    Parámetros adicionales:
    - notas_rival: Información sobre el próximo rival
    - areas_enfoque: Aspectos específicos a trabajar
    - notas_ultimo_partido: Feedback del partido anterior
    - notas_plantilla: Estado de la plantilla (lesiones, etc.)
    """
    # TODO: Añadir autenticación después de pruebas
    DEFAULT_ORG_ID = "454b26bf-8e28-4dc0-b85c-ba1108d982b6"

    settings = get_settings()

    # Verificar que Gemini está configurado
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Servicio de IA no disponible. Configure GEMINI_API_KEY."
        )

    supabase = get_supabase()

    # Obtener tareas disponibles
    response = supabase.table("tareas").select(
        "*, categorias_tarea!inner(codigo, nombre)"
    ).eq(
        "organizacion_id", DEFAULT_ORG_ID
    ).execute()

    tareas = response.data

    # Filtrar tareas excluidas
    if params.excluir_tareas:
        excluir_ids = [str(t) for t in params.excluir_tareas]
        tareas = [t for t in tareas if t["id"] not in excluir_ids]

    # Pre-filtrar tareas por número de jugadores (para reducir contexto)
    tareas_filtradas = [
        t for t in tareas
        if t.get("num_jugadores_min", 0) <= params.num_jugadores + 4
    ]

    # Limitar a 80 tareas para no exceder contexto
    tareas_filtradas = tareas_filtradas[:80]

    # Construir notas adicionales
    notas_adicionales = []
    if params.notas_rival:
        notas_adicionales.append(f"Rival: {params.notas_rival}")
    if params.areas_enfoque:
        notas_adicionales.append(f"Áreas de enfoque: {', '.join(params.areas_enfoque)}")
    if params.notas_ultimo_partido:
        notas_adicionales.append(f"Último partido: {params.notas_ultimo_partido}")
    if params.notas_plantilla:
        notas_adicionales.append(f"Plantilla: {params.notas_plantilla}")

    notas_str = "\n".join(notas_adicionales) if notas_adicionales else None

    try:
        # Importar servicio de Gemini
        from app.services.gemini_service import GeminiService, GeminiError

        gemini = GeminiService()

        # Generar recomendaciones
        ai_response = await gemini.generate_session_recommendations(
            tareas=tareas_filtradas,
            match_day=params.match_day.value,
            num_jugadores=params.num_jugadores,
            duracion_total=params.duracion_total,
            fase_juego=params.fase_juego,
            principio_tactico=params.principio_tactico,
            notas_adicionales=notas_str,
        )

        # Mapear IDs de tareas a objetos completos
        tareas_map = {t["id"]: t for t in tareas}

        fases_con_tareas = {}
        for fase_nombre, fase_data in ai_response.get("fases", {}).items():
            tarea_id = fase_data.get("tarea_id")
            tarea_obj = None

            if tarea_id and tarea_id in tareas_map:
                tarea_dict = tareas_map[tarea_id]
                tarea_dict["categoria"] = tarea_dict.get("categorias_tarea", {})
                tarea_obj = TareaResponse(**tarea_dict)

            fases_con_tareas[fase_nombre] = AIFaseRecomendacion(
                tarea_id=tarea_id or "",
                tarea=tarea_obj,
                duracion_sugerida=fase_data.get("duracion_sugerida", 15),
                razon=fase_data.get("razon", ""),
                adaptaciones=fase_data.get("adaptaciones", []),
                coaching_points=fase_data.get("coaching_points", []),
            )

        # Construir respuesta
        carga = ai_response.get("carga_estimada", {})

        return AIRecomendadorOutput(
            titulo_sugerido=ai_response.get("titulo_sugerido", f"Sesión {params.match_day.value}"),
            resumen=ai_response.get("resumen", ""),
            fases=fases_con_tareas,
            coherencia_tactica=ai_response.get("coherencia_tactica", ""),
            carga_estimada=AICargaEstimada(
                fisica=carga.get("fisica", "Media"),
                cognitiva=carga.get("cognitiva", "Media"),
                duracion_total=carga.get("duracion_total", params.duracion_total),
            ),
            match_day=params.match_day.value,
            generado_por="gemini",
        )

    except Exception as e:
        logger.error(f"Error en recomendador AI: {e}")

        # Fallback: usar recomendador básico
        logger.info("Usando fallback al recomendador básico")

        basic_input = RecomendadorInput(
            match_day=params.match_day,
            num_jugadores=params.num_jugadores,
            num_porteros=params.num_porteros,
            espacio_disponible=params.espacio_disponible,
            duracion_total=params.duracion_total,
            fase_juego=params.fase_juego,
            principio_tactico=params.principio_tactico,
            excluir_tareas=params.excluir_tareas,
        )

        # Obtener recomendaciones básicas
        basic_result = await recomendar_sesion(basic_input)

        # Convertir a formato AI
        fases_convertidas = {}
        for fase_nombre, tareas_rec in basic_result.recomendaciones.items():
            if tareas_rec:
                top_tarea = tareas_rec[0]
                fases_convertidas[fase_nombre] = AIFaseRecomendacion(
                    tarea_id=str(top_tarea.tarea.id),
                    tarea=top_tarea.tarea,
                    duracion_sugerida=top_tarea.tarea.duracion_total,
                    razon=top_tarea.razon,
                    adaptaciones=[],
                    coaching_points=[],
                )

        return AIRecomendadorOutput(
            titulo_sugerido=f"Sesión {params.match_day.value}",
            resumen="Recomendación generada con sistema de reglas (fallback)",
            fases=fases_convertidas,
            coherencia_tactica="Sesión diseñada siguiendo reglas de periodización táctica.",
            carga_estimada=AICargaEstimada(
                fisica=basic_result.metadata.get("carga_fisica_recomendada", "Media"),
                cognitiva="Media",
                duracion_total=basic_result.metadata.get("duracion_total_estimada", params.duracion_total),
            ),
            match_day=params.match_day.value,
            generado_por="reglas",
        )
