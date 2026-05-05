"""
TrainingHub Pro - Diagram Generator
Uses AI to auto-generate tactical diagrams (grafico_data) for exercises.
"""

import json
import logging
from typing import Optional

from app.services.ai_factory import _build_provider_chain, _get_service
from app.services.ai_errors import AIError

logger = logging.getLogger(__name__)

_FALLBACK_CODES = {429, 503}

DIAGRAM_GENERATION_PROMPT = """Eres un experto en diseno de diagramas tacticos de futbol. Tu tarea es generar un JSON de diagrama tactico basado en la descripcion de un ejercicio.

## FORMATO DE SALIDA
Responde UNICAMENTE con JSON puro (sin markdown, sin ```). El JSON debe seguir este schema:

{
  "elements": [
    {
      "id": "string (unico, 8 chars alfanumericos)",
      "type": "player" | "opponent" | "player_gk" | "cone" | "ball" | "mini_goal",
      "position": { "x": number, "y": number },
      "label": "string (numero del jugador o texto)",
      "color": "string (hex color)"
    }
  ],
  "arrows": [
    {
      "id": "string (unico)",
      "type": "movement" | "pass" | "dribble" | "shot",
      "from": { "x": number, "y": number },
      "to": { "x": number, "y": number },
      "color": "string (hex, opcional)"
    }
  ],
  "zones": [
    {
      "id": "string (unico)",
      "position": { "x": number, "y": number },
      "width": number,
      "height": number,
      "color": "string (hex)",
      "opacity": 0.3,
      "shape": "rectangle" | "ellipse",
      "label": "string (opcional)"
    }
  ],
  "pitchType": "full" | "half"
}

## COORDENADAS
- Campo completo (pitchType="full"): 1050x680, centro en (525, 340), porterias en x=10 y x=1025
- Medio campo (pitchType="half"): 525x680, porteria en x=10, centro en (262, 340)

## COLORES DE EQUIPOS
- Equipo propio (jugadores): #3B82F6 (azul)
- Oponentes: #EF4444 (rojo)
- Porteros: #22C55E (verde)
- Neutrales/comodines: #F59E0B (amarillo)
- Conos: #F59E0B (naranja)

## FLECHAS
- movement (linea continua blanca): desplazamiento del jugador
- pass (linea discontinua): pase del balon
- dribble: conduccion
- shot: tiro a porteria

## REGLAS DE POSICIONAMIENTO
1. Distribuye los jugadores respetando la estructura (ej: 4v4+2 = 4 azules, 4 rojos, 2 amarillos)
2. Si hay porteros, colocalos cerca de la porteria con type="player_gk"
3. Si hay miniporterias, usa type="mini_goal" orientadas correctamente
4. Si la categoria es RND/JDP/POS/ACO usa pitchType="half"
5. Si la categoria es EVO/AVD/PCO/SSG/ABP usa pitchType="full"
6. Conos para delimitar zonas de juego
7. Coloca flechas representando las acciones principales del ejercicio
8. Usa zonas coloreadas semi-transparentes para delimitar espacios de juego
9. Genera entre 5-20 elementos segun la complejidad del ejercicio
10. Los IDs deben ser strings aleatorios de 8 caracteres
"""


async def _simple_completion(system_prompt: str, user_message: str) -> str:
    """Make a simple AI completion without tools, using the provider chain with fallback."""
    chain = _build_provider_chain()
    if not chain:
        raise AIError("No AI providers configured", status_code=500, provider="none")

    last_error = None

    for i, (provider_name, config) in enumerate(chain):
        try:
            service = _get_service(provider_name, config)

            if provider_name == "claude":
                # Use Claude's messages API directly
                from anthropic import AsyncAnthropic
                from app.config import get_settings
                settings = get_settings()
                client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
                response = await client.messages.create(
                    model=settings.CLAUDE_MODEL or "claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_message}],
                )
                return response.content[0].text
            else:
                # OpenAI-compatible: use raw client
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ]
                response = await service.client.chat.completions.create(
                    model=service.model,
                    max_tokens=4096,
                    messages=messages,
                )
                return response.choices[0].message.content or ""

        except AIError as e:
            last_error = e
            if e.status_code in _FALLBACK_CODES and i < len(chain) - 1:
                logger.info(f"Provider {provider_name} returned {e.status_code}, trying next...")
                continue
            raise
        except Exception as e:
            last_error = AIError(str(e), status_code=500, provider=provider_name)
            if i < len(chain) - 1:
                logger.info(f"Provider {provider_name} failed ({e}), trying next...")
                continue
            raise last_error

    raise last_error or AIError("All providers failed", status_code=500, provider="chain")


async def generate_diagram(
    descripcion: str,
    categoria_codigo: Optional[str] = None,
    estructura_equipos: Optional[str] = None,
    espacio: Optional[str] = None,
    titulo: Optional[str] = None,
) -> dict:
    """Generate a tactical diagram using AI based on exercise description.

    Returns:
        dict with grafico_data (elements, arrows, zones, pitchType)
    """
    # Build the user prompt
    parts = []
    if titulo:
        parts.append(f"Titulo: {titulo}")
    parts.append(f"Descripcion: {descripcion}")
    if categoria_codigo:
        parts.append(f"Categoria: {categoria_codigo}")
    if estructura_equipos:
        parts.append(f"Estructura de equipos: {estructura_equipos}")
    if espacio:
        parts.append(f"Espacio: {espacio}")

    parts.append("\nGenera el JSON del diagrama tactico:")

    user_msg = "\n".join(parts)

    try:
        response_text = await _simple_completion(DIAGRAM_GENERATION_PROMPT, user_msg)

        # Parse JSON from response - strip potential markdown code blocks
        json_str = response_text.strip()
        if json_str.startswith("```"):
            lines = json_str.split("\n")
            # Remove first and last lines (``` markers)
            if lines[-1].strip().startswith("```"):
                json_str = "\n".join(lines[1:-1])
            else:
                json_str = "\n".join(lines[1:])
            json_str = json_str.strip()

        diagram_data = json.loads(json_str)

        # Validate basic structure
        if "elements" not in diagram_data:
            diagram_data["elements"] = []
        if "arrows" not in diagram_data:
            diagram_data["arrows"] = []
        if "zones" not in diagram_data:
            diagram_data["zones"] = []
        if "pitchType" not in diagram_data:
            diagram_data["pitchType"] = "half"

        return diagram_data

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse diagram JSON: {e}")
        raise AIError(
            f"AI returned invalid JSON for diagram: {e}",
            status_code=500,
            provider="unknown",
        )
    except AIError:
        raise
    except Exception as e:
        logger.error(f"Diagram generation failed: {e}")
        raise AIError(
            f"Diagram generation failed: {e}",
            status_code=500,
            provider="unknown",
        )
