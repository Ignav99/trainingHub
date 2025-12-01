"""
TrainingHub Pro - Router del Recomendador
Sistema de recomendación de tareas basado en Match Day y objetivos.
"""

from fastapi import APIRouter, Depends
from typing import List

from app.models import (
    RecomendadorInput,
    RecomendadorOutput,
    TareaRecomendada,
    TareaResponse,
    MatchDay,
)
from app.database import get_supabase
from app.dependencies import get_current_user

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
    current_user = Depends(get_current_user),
):
    """
    Genera recomendaciones de tareas para una sesión.
    
    Devuelve tareas recomendadas para cada fase:
    - activacion: 15-20 min
    - desarrollo_1: 20-25 min (trabajo sectorial)
    - desarrollo_2: 25-30 min (trabajo colectivo)
    - vuelta_calma: 10 min
    """
    supabase = get_supabase()
    
    # Obtener todas las tareas disponibles
    response = supabase.table("tareas").select(
        "*, categorias_tarea!inner(codigo, nombre)"
    ).eq(
        "organizacion_id", str(current_user.organizacion_id)
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
