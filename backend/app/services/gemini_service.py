"""
TrainingHub Pro - Servicio de Google Gemini
Integración con Google Gemini API para recomendaciones inteligentes de sesiones.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)


class GeminiError(Exception):
    """Error en la comunicación con Gemini API."""
    pass


# Prompt del sistema para el metodólogo
SYSTEM_PROMPT = """Eres un metodólogo experto en fútbol profesional especializado en diseño de sesiones de entrenamiento siguiendo:
- Metodología UEFA Pro
- Periodización táctica (Vítor Frade)
- Principios del modelo de juego

Tu trabajo es diseñar sesiones de entrenamiento óptimas seleccionando tareas de una base de datos disponible.

REGLAS IMPORTANTES:
1. SOLO puedes seleccionar tareas del listado que se te proporciona
2. Debes respetar las restricciones del Match Day (carga física, nivel cognitivo)
3. La sesión debe tener coherencia táctica (progresión de micro a macro)
4. Explica brevemente POR QUÉ seleccionas cada tarea
5. Sugiere adaptaciones específicas cuando sea relevante
6. Responde SIEMPRE en formato JSON válido"""


# Configuración de Match Days
MATCH_DAY_CONTEXT = {
    "MD+1": {
        "nombre": "Recuperación",
        "carga_fisica": "Muy baja - recuperación activa",
        "categorias_preferidas": ["RND", "ACO"],
        "categorias_evitar": ["SSG", "AVD", "PCO"],
        "nivel_cognitivo_max": 1,
        "descripcion": "Día post-partido. Regeneración física y mental. Espacios amplios, sin intensidad."
    },
    "MD+2": {
        "nombre": "Regeneración",
        "carga_fisica": "Baja - regeneración",
        "categorias_preferidas": ["RND", "JDP", "ACO"],
        "categorias_evitar": ["SSG", "AVD"],
        "nivel_cognitivo_max": 2,
        "descripcion": "Segundo día post-partido. Inicio de activación progresiva."
    },
    "MD-4": {
        "nombre": "Fuerza/Tensión",
        "carga_fisica": "Alta - fuerza explosiva, aceleraciones",
        "categorias_preferidas": ["SSG", "JDP", "AVD"],
        "categorias_evitar": [],
        "nivel_cognitivo_max": 3,
        "descripcion": "Día de máxima carga. Espacios reducidos, muchos duelos, alta intensidad."
    },
    "MD-3": {
        "nombre": "Resistencia",
        "carga_fisica": "Alta - resistencia a la potencia",
        "categorias_preferidas": ["JDP", "POS", "PCO", "AVD"],
        "categorias_evitar": ["SSG"],
        "nivel_cognitivo_max": 3,
        "descripcion": "Día de volumen. Espacios grandes, tiempos largos, muchos jugadores."
    },
    "MD-2": {
        "nombre": "Velocidad",
        "carga_fisica": "Media - velocidad máxima",
        "categorias_preferidas": ["EVO", "JDP", "AVD"],
        "categorias_evitar": ["SSG", "PCO"],
        "nivel_cognitivo_max": 2,
        "descripcion": "Día de velocidad. Espacios medios-grandes, tiempos cortos, mucha pausa."
    },
    "MD-1": {
        "nombre": "Activación",
        "carga_fisica": "Baja - activación/reacción",
        "categorias_preferidas": ["RND", "ABP", "ACO"],
        "categorias_evitar": ["SSG", "AVD", "PCO"],
        "nivel_cognitivo_max": 2,
        "descripcion": "Día previo al partido. Rondos, ABP, velocidad de reacción. Baja carga."
    },
    "MD": {
        "nombre": "Partido",
        "carga_fisica": "Competición",
        "categorias_preferidas": [],
        "categorias_evitar": [],
        "nivel_cognitivo_max": 3,
        "descripcion": "Día de partido."
    }
}


class GeminiService:
    """Servicio para interactuar con Google Gemini API."""

    def __init__(self):
        settings = get_settings()

        if not settings.GEMINI_API_KEY:
            raise GeminiError("GEMINI_API_KEY no configurada")

        genai.configure(api_key=settings.GEMINI_API_KEY)

        self.model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            generation_config={
                "temperature": settings.GEMINI_TEMPERATURE,
                "top_p": 0.8,
                "max_output_tokens": 4096,
            },
            system_instruction=SYSTEM_PROMPT
        )

    def _build_tasks_context(self, tareas: List[dict]) -> str:
        """Construye el contexto de tareas disponibles para el prompt."""
        tareas_simplificadas = []

        for t in tareas:
            categoria = t.get("categorias_tarea", {}) or t.get("categoria", {})

            tarea_simple = {
                "id": t.get("id"),
                "titulo": t.get("titulo"),
                "cat": categoria.get("codigo", "N/A") if categoria else "N/A",
                "duracion": t.get("duracion_total", 0),
                "jugadores": f"{t.get('num_jugadores_min', 0)}-{t.get('num_jugadores_max') or t.get('num_jugadores_min', 0)}",
                "fase_juego": t.get("fase_juego"),
                "principio": t.get("principio_tactico"),
                "nivel_cog": t.get("nivel_cognitivo", 2),
                "objetivo_fisico": t.get("objetivo_fisico"),
                "objetivo_psico": t.get("objetivo_psicologico"),
            }
            tareas_simplificadas.append(tarea_simple)

        return json.dumps(tareas_simplificadas, ensure_ascii=False, indent=2)

    def _build_match_day_context(self, match_day: str) -> str:
        """Construye el contexto del Match Day."""
        config = MATCH_DAY_CONTEXT.get(match_day, MATCH_DAY_CONTEXT["MD-3"])
        return json.dumps(config, ensure_ascii=False, indent=2)

    async def generate_session_recommendations(
        self,
        tareas: List[dict],
        match_day: str,
        num_jugadores: int,
        duracion_total: int,
        fase_juego: Optional[str] = None,
        principio_tactico: Optional[str] = None,
        notas_adicionales: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Genera recomendaciones de sesión usando Gemini.

        Args:
            tareas: Lista de tareas disponibles
            match_day: Match Day (MD+1, MD-4, etc.)
            num_jugadores: Número de jugadores disponibles
            duracion_total: Duración total deseada en minutos
            fase_juego: Fase de juego objetivo (opcional)
            principio_tactico: Principio táctico objetivo (opcional)
            notas_adicionales: Contexto adicional del entrenador

        Returns:
            Diccionario con la estructura de sesión recomendada
        """
        tasks_context = self._build_tasks_context(tareas)
        md_context = self._build_match_day_context(match_day)

        # Construir el request
        request = {
            "match_day": match_day,
            "jugadores_disponibles": num_jugadores,
            "duracion_total_minutos": duracion_total,
        }

        if fase_juego:
            request["objetivo_tactico"] = {
                "fase_juego": fase_juego,
                "principio": principio_tactico
            }

        if notas_adicionales:
            request["contexto_adicional"] = notas_adicionales

        prompt = f"""
## TAREAS DISPONIBLES (solo puedes elegir de esta lista)
{tasks_context}

## CONFIGURACIÓN DEL MATCH DAY: {match_day}
{md_context}

## SOLICITUD DE SESIÓN
{json.dumps(request, ensure_ascii=False, indent=2)}

## INSTRUCCIONES
Diseña una sesión de entrenamiento completa con 4 fases:
1. **activacion** (12-18 min): Calentamiento, activación neuromuscular
2. **desarrollo_1** (18-25 min): Trabajo sectorial/posicional
3. **desarrollo_2** (20-30 min): Trabajo colectivo/global
4. **vuelta_calma** (8-12 min): Recuperación, estiramientos

Para cada fase, selecciona UNA tarea principal de la lista y explica por qué.

## FORMATO DE RESPUESTA (JSON)
```json
{{
  "titulo_sugerido": "Sesión MD-X: [objetivo principal]",
  "resumen": "Breve descripción de 2-3 líneas sobre el enfoque de la sesión",
  "fases": {{
    "activacion": {{
      "tarea_id": "uuid-de-la-tarea",
      "duracion_sugerida": 15,
      "razon": "Explicación de por qué esta tarea es ideal para esta fase",
      "adaptaciones": ["Adaptación 1 si aplica", "Adaptación 2"],
      "coaching_points": ["Punto clave 1", "Punto clave 2"]
    }},
    "desarrollo_1": {{ ... }},
    "desarrollo_2": {{ ... }},
    "vuelta_calma": {{ ... }}
  }},
  "coherencia_tactica": "Explicación de cómo las tareas se conectan tácticamente",
  "carga_estimada": {{
    "fisica": "Alta/Media/Baja",
    "cognitiva": "Alta/Media/Baja",
    "duracion_total": 85
  }}
}}
```

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional antes o después.
"""

        try:
            response = await self.model.generate_content_async(prompt)
            return self._parse_response(response.text)
        except Exception as e:
            logger.error(f"Error en Gemini API: {e}")
            raise GeminiError(f"Error generando recomendaciones: {str(e)}")

    def _parse_response(self, text: str) -> Dict[str, Any]:
        """Extrae y valida el JSON de la respuesta."""
        # Limpiar markdown code blocks si existen
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        try:
            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Error parseando respuesta de Gemini: {text[:500]}")
            raise GeminiError(f"Respuesta de IA no válida: {str(e)}")
