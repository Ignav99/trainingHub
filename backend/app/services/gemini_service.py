"""
TrainingHub Pro - Servicio de Gemini AI
Mirror of ClaudeService using Google Gemini (gemini-2.5-flash).
Uses the same system prompts, tools, and _execute_tool logic from claude_service.py.
"""

import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.config import get_settings
from app.services.ai_errors import AIError
from app.services.ai_tools import claude_tools_to_gemini

# Import shared prompts, tools, and execution logic from claude_service (no duplication)
from app.services.claude_service import (
    SYSTEM_PROMPT,
    SESSION_DESIGN_PROMPT,
    TASK_DESIGN_PROMPT,
    GK_DESIGN_PROMPT,
    PRE_MATCH_REPORT_PROMPT,
    DIAGRAM_GENERATION_PROMPT,
    TOOLS,
    SESSION_DESIGN_TOOLS,
    TASK_DESIGN_TOOLS,
    GK_DESIGN_TOOLS,
    PRE_MATCH_TOOLS,
    _execute_tool,
)

logger = logging.getLogger(__name__)

# Singleton Gemini client
_gemini_client: genai.Client | None = None


def _get_gemini_client() -> genai.Client:
    """Return a shared Gemini client (created once, reused)."""
    global _gemini_client
    if _gemini_client is None:
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise AIError("GEMINI_API_KEY no configurada", status_code=503, provider="gemini")
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _safe_parts(candidate) -> list:
    """Safely get parts from a candidate (content or content.parts may be None)."""
    if candidate is None or candidate.content is None or candidate.content.parts is None:
        return []
    return candidate.content.parts


def _extract_text(response) -> str:
    """Extract text from a Gemini response."""
    parts = []
    for candidate in (response.candidates or []):
        for part in _safe_parts(candidate):
            if part.text:
                parts.append(part.text)
    return "".join(parts)


def _get_usage(response) -> tuple[int, int]:
    """Extract token counts from response."""
    usage = response.usage_metadata
    return (
        getattr(usage, "prompt_token_count", 0) or 0,
        getattr(usage, "candidates_token_count", 0) or 0,
    )


def _parse_json_response(text: str) -> dict:
    """Extract and validate JSON from AI response. Shared repair logic."""
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        repaired = text
        open_quotes = repaired.count('"') % 2
        if open_quotes:
            last_quote = repaired.rfind('"')
            repaired = repaired[:last_quote] + '"'
        repaired = repaired.rstrip().rstrip(',')
        open_braces = repaired.count('{') - repaired.count('}')
        open_brackets = repaired.count('[') - repaired.count(']')
        repaired += ']' * max(0, open_brackets) + '}' * max(0, open_braces)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError as e2:
            logger.error(f"Error parsing Gemini JSON response: {text[:500]}")
            raise AIError(f"Respuesta de IA no válida: {str(e2)}", provider="gemini")


# ============ Diagram Generation ============

async def generate_diagram_data_gemini(
    titulo: str,
    descripcion: str,
    categoria_codigo: str = "",
    estructura_equipos: str = "",
    espacio_largo: float = None,
    espacio_ancho: float = None,
    num_jugadores_min: int = 0,
    fase_juego: str = "",
) -> Optional[dict]:
    """Generate a diagram JSON for a training exercise using Gemini AI."""
    try:
        client = _get_gemini_client()
        settings = get_settings()

        user_prompt = f"""Generate a diagram for this football training exercise:

Title: {titulo}
Description: {descripcion or 'No description'}
Category: {categoria_codigo or 'General'}
Team structure: {estructura_equipos or 'Not specified'}
Space: {f'{espacio_largo}x{espacio_ancho}m' if espacio_largo and espacio_ancho else 'Not specified'}
Players: {num_jugadores_min or 'Not specified'}
Game phase: {fase_juego or 'Not specified'}"""

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=DIAGRAM_GENERATION_PROMPT,
                max_output_tokens=2048,
                temperature=0.7,
            ),
        )

        text = _extract_text(response)
        if not text:
            return None

        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        diagram = json.loads(text)

        if not isinstance(diagram, dict):
            return None
        if "pitchType" not in diagram:
            diagram["pitchType"] = "full"
        if "elements" not in diagram:
            diagram["elements"] = []
        if "arrows" not in diagram:
            diagram["arrows"] = []
        if "zones" not in diagram:
            diagram["zones"] = []

        return diagram

    except json.JSONDecodeError:
        logger.warning("Failed to parse diagram JSON from Gemini response")
        return None
    except Exception as e:
        logger.warning("Error generating diagram with Gemini: %s", str(e))
        return None


# ============ Gemini Service ============

class GeminiService:
    """Service for interacting with Gemini AI with tool use (async).
    Mirrors ClaudeService interface exactly.
    """

    def __init__(self):
        self.client = _get_gemini_client()
        settings = get_settings()
        self.model = settings.GEMINI_MODEL
        self.temperature = settings.GEMINI_TEMPERATURE

    async def _call_gemini(
        self,
        system: str,
        contents: list,
        tools: list[types.FunctionDeclaration] | None = None,
        max_output_tokens: int = 4096,
        force_tool: str | None = None,
        temperature: float | None = None,
    ):
        """Make a single Gemini API call."""
        config_kwargs = {
            "system_instruction": system,
            "max_output_tokens": max_output_tokens,
            "temperature": temperature if temperature is not None else self.temperature,
        }

        if tools:
            config_kwargs["tools"] = [types.Tool(function_declarations=tools)]
            if force_tool:
                config_kwargs["tool_config"] = types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode="ANY",
                        allowed_function_names=[force_tool],
                    )
                )

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            return response
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                raise AIError(
                    "Gemini está saturado. Espera unos segundos e inténtalo de nuevo.",
                    status_code=429,
                    provider="gemini",
                )
            elif "connection" in error_str.lower() or "timeout" in error_str.lower():
                raise AIError(
                    "Error de conexion con Gemini. Inténtalo de nuevo en unos segundos.",
                    status_code=503,
                    provider="gemini",
                )
            else:
                logger.error(f"Gemini API error: {e}", exc_info=True)
                raise AIError(
                    f"Error de comunicacion con Gemini: {error_str}",
                    status_code=500,
                    provider="gemini",
                )

    def _build_system_prompt(
        self,
        equipo_id: Optional[str],
        organizacion_id: Optional[str],
        contexto: Optional[dict],
    ) -> str:
        """Build system prompt string (Gemini uses a single string, not blocks)."""
        parts = [SYSTEM_PROMPT]

        dynamic_parts = []
        if equipo_id:
            dynamic_parts.append(f"## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}")
            if organizacion_id:
                dynamic_parts.append(f"- ID de la organizacion: {organizacion_id}")
            dynamic_parts.append(
                "Cuando el usuario pregunte sobre su equipo, jugadores, sesiones o partidos, "
                "USA las herramientas disponibles para consultar datos reales. No inventes datos."
            )

        if contexto:
            if contexto.get("equipo_nombre"):
                dynamic_parts.append(f"- Equipo: {contexto['equipo_nombre']}")
            if contexto.get("equipo_categoria"):
                dynamic_parts.append(f"- Categoria: {contexto['equipo_categoria']}")

        if dynamic_parts:
            parts.append("\n".join(dynamic_parts))

        return "\n\n".join(parts)

    def _build_messages(self, historial: list[dict], mensaje_actual: str) -> list:
        """Build Gemini contents list from message history."""
        contents = []
        for msg in historial:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "system":
                continue
            elif rol == "assistant":
                contents.append(types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=contenido)],
                ))
            else:
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=contenido)],
                ))

        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=mensaje_actual)],
        ))
        return contents

    # ============ Chat (with data-query tools) ============

    async def chat(
        self,
        mensaje: str,
        historial: list[dict],
        equipo_id: Optional[str] = None,
        organizacion_id: Optional[str] = None,
        contexto: Optional[dict] = None,
    ) -> dict:
        """General AI chat with tool use. Mirrors ClaudeService.chat()."""
        contents = self._build_messages(historial, mensaje)
        system = self._build_system_prompt(equipo_id, organizacion_id, contexto)

        gemini_tools = claude_tools_to_gemini(TOOLS) if equipo_id else None

        herramientas_usadas = []
        total_input = 0
        total_output = 0

        max_iterations = 5
        for _ in range(max_iterations):
            response = await self._call_gemini(
                system=system,
                contents=contents,
                tools=gemini_tools,
                max_output_tokens=4096,
            )

            inp, out = _get_usage(response)
            total_input += inp
            total_output += out

            candidate = response.candidates[0]
            parts = _safe_parts(candidate)
            has_function_call = any(
                part.function_call and part.function_call.name
                for part in parts
            )

            if has_function_call:
                contents.append(candidate.content)

                function_response_parts = []
                for part in parts:
                    if part.function_call and part.function_call.name:
                        tool_name = part.function_call.name
                        tool_input = dict(part.function_call.args) if part.function_call.args else {}

                        logger.info(f"Gemini tool call: {tool_name}({json.dumps(tool_input, default=str)[:200]})")

                        # Inject equipo_id / organizacion_id if needed
                        if equipo_id:
                            for t in TOOLS:
                                if t["name"] == tool_name and "equipo_id" in t["input_schema"].get("required", []):
                                    if "equipo_id" not in tool_input:
                                        tool_input["equipo_id"] = equipo_id
                                    break

                        if tool_name in ("buscar_knowledge_base", "buscar_tareas") and organizacion_id:
                            if "organizacion_id" not in tool_input:
                                tool_input["organizacion_id"] = organizacion_id

                        result = _execute_tool(tool_name, tool_input)
                        herramientas_usadas.append({"nombre": tool_name, "input": tool_input})

                        function_response_parts.append(
                            types.Part.from_function_response(
                                name=tool_name,
                                response={"result": result},
                            )
                        )

                contents.append(types.Content(role="user", parts=function_response_parts))
                continue
            else:
                text_response = _extract_text(response)
                return {
                    "respuesta": text_response,
                    "tokens_input": total_input,
                    "tokens_output": total_output,
                    "cache_read_input_tokens": 0,
                    "cache_creation_input_tokens": 0,
                    "modelo": self.model,
                    "herramientas_usadas": herramientas_usadas,
                }

        logger.warning("Gemini hit max tool iterations in chat")
        return {
            "respuesta": "He consultado mucha informacion. Dejame resumir lo que encontre.",
            "tokens_input": total_input,
            "tokens_output": total_output,
            "cache_read_input_tokens": 0,
            "cache_creation_input_tokens": 0,
            "modelo": self.model,
            "herramientas_usadas": herramientas_usadas,
        }

    # ============ Session Design Chat ============

    async def session_design_chat(
        self,
        mensajes: list[dict],
        equipo_id: str,
        organizacion_id: Optional[str] = None,
    ) -> dict:
        """Session design chat. Mirrors ClaudeService.session_design_chat()."""
        system = (
            SYSTEM_PROMPT + SESSION_DESIGN_PROMPT
            + f"\n\n## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
            + (f"\n- ID de la organizacion: {organizacion_id}" if organizacion_id else "")
        )

        contents = []
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                contents.append(types.Content(role="model", parts=[types.Part.from_text(text=contenido)]))
            elif rol == "user":
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=contenido)]))

        gemini_tools = claude_tools_to_gemini(SESSION_DESIGN_TOOLS)

        herramientas_usadas = []
        sesion_propuesta = None
        total_input = 0
        total_output = 0

        user_msg_count = sum(1 for m in mensajes if m.get("rol") == "user")
        first_user_msg = mensajes[-1].get("contenido", "") if mensajes else ""
        first_msg_is_substantial = isinstance(first_user_msg, str) and len(first_user_msg) > 80

        max_iterations = 3
        for iteration in range(max_iterations):
            force_tool = None
            if iteration == 0 and user_msg_count == 1 and first_msg_is_substantial:
                force_tool = "proponer_sesion"
                logger.info("Forcing proponer_sesion tool use (Gemini, substantial first message)")

            response = await self._call_gemini(
                system=system,
                contents=contents,
                tools=gemini_tools,
                max_output_tokens=16384,
                force_tool=force_tool,
            )

            inp, out = _get_usage(response)
            total_input += inp
            total_output += out

            candidate = response.candidates[0]
            parts = _safe_parts(candidate)
            has_function_call = any(
                part.function_call and part.function_call.name
                for part in parts
            )

            if has_function_call:
                contents.append(candidate.content)

                function_response_parts = []
                for part in parts:
                    if part.function_call and part.function_call.name:
                        tool_name = part.function_call.name
                        tool_input = dict(part.function_call.args) if part.function_call.args else {}

                        logger.info(f"Session design tool (Gemini): {tool_name}")

                        if tool_name == "proponer_sesion":
                            sesion_propuesta = tool_input
                            herramientas_usadas.append({"nombre": tool_name})
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": "Sesion propuesta presentada al entrenador. Ahora resume brevemente lo que has propuesto y pregunta si quiere modificar algo."},
                                )
                            )
                        else:
                            logger.warning(f"Unexpected tool in session design: {tool_name}")
                            herramientas_usadas.append({"nombre": tool_name})
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": "Herramienta no disponible. Usa proponer_sesion para generar la sesión directamente."},
                                )
                            )

                contents.append(types.Content(role="user", parts=function_response_parts))
                continue
            else:
                text_response = _extract_text(response)
                return {
                    "respuesta": text_response,
                    "sesion_propuesta": sesion_propuesta,
                    "tokens_input": total_input,
                    "tokens_output": total_output,
                    "herramientas_usadas": herramientas_usadas,
                }

        return {
            "respuesta": "He procesado mucha informacion. ¿Quieres que continue?",
            "sesion_propuesta": sesion_propuesta,
            "tokens_input": total_input,
            "tokens_output": total_output,
            "herramientas_usadas": herramientas_usadas,
        }

    # ============ Task Design Chat ============

    async def task_design_chat(
        self,
        mensajes: list[dict],
        equipo_id: str,
        organizacion_id: Optional[str] = None,
    ) -> dict:
        """Task design chat. Mirrors ClaudeService.task_design_chat()."""
        system = (
            SYSTEM_PROMPT + TASK_DESIGN_PROMPT
            + f"\n\n## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
            + (f"\n- ID de la organizacion: {organizacion_id}" if organizacion_id else "")
        )

        contents = []
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                contents.append(types.Content(role="model", parts=[types.Part.from_text(text=contenido)]))
            elif rol == "user":
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=contenido)]))

        gemini_tools = claude_tools_to_gemini(TASK_DESIGN_TOOLS)

        herramientas_usadas = []
        tarea_propuesta = None
        total_input = 0
        total_output = 0

        user_msg_count = sum(1 for m in mensajes if m.get("rol") == "user")
        first_user_msg = mensajes[-1].get("contenido", "") if mensajes else ""
        first_msg_is_substantial = isinstance(first_user_msg, str) and len(first_user_msg) > 80

        max_iterations = 3
        for iteration in range(max_iterations):
            force_tool = None
            if iteration == 0 and user_msg_count == 1 and first_msg_is_substantial:
                force_tool = "proponer_tarea"
                logger.info("Forcing proponer_tarea tool use (Gemini, substantial first message)")

            response = await self._call_gemini(
                system=system,
                contents=contents,
                tools=gemini_tools,
                max_output_tokens=8192,
                force_tool=force_tool,
            )

            inp, out = _get_usage(response)
            total_input += inp
            total_output += out

            candidate = response.candidates[0]
            parts = _safe_parts(candidate)
            has_function_call = any(
                part.function_call and part.function_call.name
                for part in parts
            )

            if has_function_call:
                contents.append(candidate.content)

                function_response_parts = []
                for part in parts:
                    if part.function_call and part.function_call.name:
                        tool_name = part.function_call.name
                        tool_input = dict(part.function_call.args) if part.function_call.args else {}

                        logger.info(f"Task design tool (Gemini): {tool_name}")

                        if tool_name == "proponer_tarea":
                            tarea_propuesta = tool_input
                            herramientas_usadas.append({"nombre": tool_name})
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": "Tarea propuesta presentada al entrenador. Ahora resume brevemente lo que has propuesto y pregunta si quiere modificar algo."},
                                )
                            )
                        else:
                            logger.warning(f"Unexpected tool in task design: {tool_name}")
                            herramientas_usadas.append({"nombre": tool_name})
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": "Herramienta no disponible. Usa proponer_tarea para generar la tarea directamente."},
                                )
                            )

                contents.append(types.Content(role="user", parts=function_response_parts))
                continue
            else:
                text_response = _extract_text(response)
                return {
                    "respuesta": text_response,
                    "tarea_propuesta": tarea_propuesta,
                    "tokens_input": total_input,
                    "tokens_output": total_output,
                    "herramientas_usadas": herramientas_usadas,
                }

        return {
            "respuesta": "He procesado mucha informacion. ¿Quieres que continue?",
            "tarea_propuesta": tarea_propuesta,
            "tokens_input": total_input,
            "tokens_output": total_output,
            "herramientas_usadas": herramientas_usadas,
        }

    # ============ GK Training Design ============

    async def design_portero_tarea(self, prompt: str, context: dict) -> dict:
        """Design a goalkeeper training exercise. Mirrors ClaudeService.design_portero_tarea()."""
        context_parts = []
        if context.get("match_day"):
            context_parts.append(f"- Match Day: {context['match_day']}")
        if context.get("intensidad_objetivo"):
            context_parts.append(f"- Intensidad objetivo de la sesión: {context['intensidad_objetivo']}")
        if context.get("duracion_disponible"):
            context_parts.append(f"- Duración disponible: {context['duracion_disponible']} min")
        if context.get("num_porteros"):
            context_parts.append(f"- Número de porteros: {context['num_porteros']}")
        if context.get("nivel"):
            context_parts.append(f"- Nivel del equipo: {context['nivel']}")

        context_text = "\n".join(context_parts) if context_parts else "Sin contexto adicional"

        system = (
            SYSTEM_PROMPT + GK_DESIGN_PROMPT
            + f"\n\n## CONTEXTO DE LA SESIÓN\n{context_text}"
        )

        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        gemini_tools = claude_tools_to_gemini(GK_DESIGN_TOOLS)

        tarea_propuesta = None
        total_input = 0
        total_output = 0

        max_iterations = 3
        for iteration in range(max_iterations):
            force_tool = "proponer_tarea_portero" if iteration == 0 else None

            response = await self._call_gemini(
                system=system,
                contents=contents,
                tools=gemini_tools,
                max_output_tokens=4096,
                force_tool=force_tool,
            )

            inp, out = _get_usage(response)
            total_input += inp
            total_output += out

            candidate = response.candidates[0]
            parts = _safe_parts(candidate)
            has_function_call = any(
                part.function_call and part.function_call.name
                for part in parts
            )

            if has_function_call:
                contents.append(candidate.content)

                function_response_parts = []
                for part in parts:
                    if part.function_call and part.function_call.name and part.function_call.name == "proponer_tarea_portero":
                        tarea_propuesta = dict(part.function_call.args) if part.function_call.args else {}
                        function_response_parts.append(
                            types.Part.from_function_response(
                                name="proponer_tarea_portero",
                                response={"result": "Ejercicio propuesto presentado al entrenador. Resume brevemente lo que has propuesto."},
                            )
                        )

                contents.append(types.Content(role="user", parts=function_response_parts))
                continue
            else:
                text_response = _extract_text(response)
                return {
                    "respuesta": text_response,
                    "tarea_propuesta": tarea_propuesta,
                    "tokens_input": total_input,
                    "tokens_output": total_output,
                }

        return {
            "respuesta": "He diseñado el ejercicio para porteros.",
            "tarea_propuesta": tarea_propuesta,
            "tokens_input": total_input,
            "tokens_output": total_output,
        }

    # ============ Pre-Match Chat ============

    async def pre_match_chat(
        self,
        mensajes: list[dict],
        intel_data: dict,
        rival_nombre: str,
        localia: str,
        fecha: str,
        tipo: str = "informe",
    ) -> dict:
        """Pre-match chat for rival reports / match plans. Mirrors ClaudeService.pre_match_chat()."""
        system = (
            SYSTEM_PROMPT + PRE_MATCH_REPORT_PROMPT
            + f"\n\n## DATOS DEL PARTIDO\n"
            f"- Rival: {rival_nombre}\n"
            f"- Localía: {localia}\n"
            f"- Fecha: {fecha}\n\n"
            f"## INTEL DEL RIVAL (datos reales RFEF)\n"
            f"```json\n{json.dumps(intel_data, ensure_ascii=False, default=str)}\n```"
        )

        contents = []
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                contents.append(types.Content(role="model", parts=[types.Part.from_text(text=contenido)]))
            elif rol == "user":
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=contenido)]))

        gemini_tools = claude_tools_to_gemini(PRE_MATCH_TOOLS)

        informe_rival = None
        plan_partido = None
        total_input = 0
        total_output = 0

        user_msg_count = sum(1 for m in mensajes if m.get("rol") == "user")
        target_tool = "generar_informe_rival" if tipo == "informe" else "generar_plan_partido"

        max_iterations = 3
        for iteration in range(max_iterations):
            force_tool = target_tool if iteration == 0 and user_msg_count == 1 else None
            if force_tool:
                logger.info(f"Forcing {force_tool} tool use (Gemini, first message)")

            response = await self._call_gemini(
                system=system,
                contents=contents,
                tools=gemini_tools,
                max_output_tokens=16384,
                force_tool=force_tool,
            )

            inp, out = _get_usage(response)
            total_input += inp
            total_output += out

            candidate = response.candidates[0]
            parts = _safe_parts(candidate)
            has_function_call = any(
                part.function_call and part.function_call.name
                for part in parts
            )

            if has_function_call:
                contents.append(candidate.content)

                function_response_parts = []
                for part in parts:
                    if part.function_call and part.function_call.name:
                        tool_name = part.function_call.name
                        tool_input = dict(part.function_call.args) if part.function_call.args else {}

                        logger.info(f"Pre-match tool (Gemini): {tool_name}")

                        if tool_name == "generar_informe_rival":
                            informe_rival = tool_input
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": "Informe del rival generado y presentado al entrenador. Resume brevemente las claves del informe."},
                                )
                            )
                        elif tool_name == "generar_plan_partido":
                            plan_partido = tool_input
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": "Plan de partido generado y presentado al entrenador. Resume brevemente las claves del plan."},
                                )
                            )
                        else:
                            logger.warning(f"Unexpected tool in pre-match chat: {tool_name}")
                            function_response_parts.append(
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": "Herramienta no disponible."},
                                )
                            )

                contents.append(types.Content(role="user", parts=function_response_parts))
                continue
            else:
                text_response = _extract_text(response)
                return {
                    "respuesta": text_response,
                    "informe_rival": informe_rival,
                    "plan_partido": plan_partido,
                    "tokens_input": total_input,
                    "tokens_output": total_output,
                }

        return {
            "respuesta": "He procesado mucha informacion. ¿Quieres que continue?",
            "informe_rival": informe_rival,
            "plan_partido": plan_partido,
            "tokens_input": total_input,
            "tokens_output": total_output,
        }

    # ============ Edit Task with AI ============

    async def edit_task_with_ai(self, tarea: dict, instruccion: str, equipo_id: Optional[str] = None) -> dict:
        """Modify a training task per user instructions. Mirrors ClaudeService.edit_task_with_ai()."""
        task_fields = {
            k: tarea.get(k)
            for k in [
                "titulo", "descripcion", "duracion_total", "num_jugadores_min",
                "num_jugadores_max", "espacio_largo", "espacio_ancho",
                "reglas_tecnicas", "reglas_tacticas",
                "consignas_ofensivas", "consignas_defensivas",
                "errores_comunes", "variantes", "progresiones",
                "estructura_equipos", "material",
            ]
            if tarea.get(k) is not None
        }

        system_prompt = (
            "Eres un asistente experto en metodologia de entrenamiento de futbol. "
            "Tu tarea es modificar un ejercicio de entrenamiento segun la instruccion del usuario. "
            "Responde SOLO con un JSON valido que contenga UNICAMENTE los campos que modificas. "
            "Los campos posibles son: titulo, descripcion, duracion_total (int minutos), "
            "num_jugadores_min (int), num_jugadores_max (int), espacio_largo (int metros), "
            "espacio_ancho (int metros), reglas_tecnicas (str), reglas_tacticas (str), "
            "consignas_ofensivas (str), consignas_defensivas (str), errores_comunes (str), "
            "variantes (str), progresiones (str), estructura_equipos (str como '4v4+2'), "
            "material (array str), "
            "fase_juego (str, DEBE ser uno de: 'ataque_organizado', 'defensa_organizada', 'transicion_ataque_defensa', 'transicion_defensa_ataque', 'balon_parado_ofensivo', 'balon_parado_defensivo'), "
            "principio_tactico (str), densidad (str: 'alta', 'media' o 'baja'), "
            "nivel_cognitivo (int 1-3). "
            "NO incluyas campos que no cambias. NO incluyas explicaciones fuera del JSON."
        )

        user_message = (
            f"## Tarea actual\n```json\n{json.dumps(task_fields, ensure_ascii=False, indent=2)}\n```\n\n"
            f"## Instruccion\n{instruccion}"
        )

        response = await self._call_gemini(
            system=system_prompt,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=user_message)])],
            max_output_tokens=2048,
        )

        text = _extract_text(response)
        return _parse_json_response(text)

    # ============ Create Task from Prompt ============

    async def create_task_from_prompt(self, prompt: str, session_context: Optional[dict] = None) -> dict:
        """Generate a training task from a prompt. Mirrors ClaudeService.create_task_from_prompt()."""
        context_str = ""
        if session_context:
            parts = []
            if session_context.get("match_day"):
                parts.append(f"Match Day: {session_context['match_day']}")
            if session_context.get("objetivo"):
                parts.append(f"Objetivo de la sesion: {session_context['objetivo']}")
            if session_context.get("fase_juego"):
                parts.append(f"Fase de juego principal: {session_context['fase_juego']}")
            if parts:
                context_str = "\n## Contexto de la sesion\n" + "\n".join(parts)

        system_prompt = (
            "Eres un experto en metodologia de entrenamiento de futbol. "
            "Crea un ejercicio a partir de la descripcion del usuario. "
            "Responde SOLO con un JSON valido. Se CONCISO — titulo max 80 chars, descripcion max 300 chars, "
            "cada campo de texto max 200 chars. Campos posibles: "
            "titulo (str), descripcion (str), duracion_total (int min), "
            "num_jugadores_min (int), num_jugadores_max (int), espacio_largo (int m), "
            "espacio_ancho (int m), reglas_tecnicas (str), reglas_tacticas (str), "
            "consignas_ofensivas (str), consignas_defensivas (str), errores_comunes (str), "
            "variantes (str), progresiones (str), estructura_equipos (str ej '4v4+2'), "
            "material (array str), "
            "fase_juego (str, DEBE ser uno de: 'ataque_organizado', 'defensa_organizada', 'transicion_ataque_defensa', 'transicion_defensa_ataque', 'balon_parado_ofensivo', 'balon_parado_defensivo'), "
            "principio_tactico (str), densidad (str, DEBE ser: 'alta', 'media' o 'baja'), "
            "nivel_cognitivo (int 1-3), num_series (int). "
            "NO incluyas explicaciones fuera del JSON."
        )

        user_message = f"## Crear tarea\n{prompt}{context_str}"

        response = await self._call_gemini(
            system=system_prompt,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=user_message)])],
            max_output_tokens=4096,
        )

        text = _extract_text(response)
        return _parse_json_response(text)

    # ============ Session Recommendations ============

    async def generate_session_recommendations(
        self,
        tareas: list[dict],
        match_day: str,
        num_jugadores: int,
        duracion_total: int,
        fase_juego: Optional[str] = None,
        principio_tactico: Optional[str] = None,
        notas_adicionales: Optional[str] = None,
    ) -> dict:
        """Generate session recommendations. Mirrors ClaudeService.generate_session_recommendations()."""
        tareas_simplificadas = []
        for t in tareas:
            cat = t.get("categorias_tarea", {}) or t.get("categoria", {})
            tareas_simplificadas.append({
                "id": t.get("id"),
                "titulo": t.get("titulo"),
                "cat": cat.get("codigo", "N/A") if cat else "N/A",
                "duracion": t.get("duracion_total", 0),
                "jugadores": f"{t.get('num_jugadores_min', 0)}-{t.get('num_jugadores_max') or t.get('num_jugadores_min', 0)}",
                "fase_juego": t.get("fase_juego"),
                "principio": t.get("principio_tactico"),
                "nivel_cog": t.get("nivel_cognitivo", 2),
            })

        tasks_json = json.dumps(tareas_simplificadas, ensure_ascii=False, indent=2)

        md_context = {
            "MD+1": {"nombre": "Recuperación", "carga": "Muy baja", "cats_preferidas": ["RND", "ACO"], "cats_evitar": ["SSG", "AVD", "PCO"], "nivel_cog_max": 1},
            "MD+2": {"nombre": "Regeneración", "carga": "Baja", "cats_preferidas": ["RND", "JDP", "ACO"], "cats_evitar": ["SSG", "AVD"], "nivel_cog_max": 2},
            "MD-4": {"nombre": "Fuerza/Tensión", "carga": "Alta", "cats_preferidas": ["SSG", "JDP", "AVD"], "cats_evitar": [], "nivel_cog_max": 3},
            "MD-3": {"nombre": "Resistencia", "carga": "Alta", "cats_preferidas": ["JDP", "POS", "PCO", "AVD"], "cats_evitar": ["SSG"], "nivel_cog_max": 3},
            "MD-2": {"nombre": "Velocidad", "carga": "Media", "cats_preferidas": ["EVO", "JDP", "AVD"], "cats_evitar": ["SSG", "PCO"], "nivel_cog_max": 2},
            "MD-1": {"nombre": "Activación", "carga": "Baja", "cats_preferidas": ["RND", "ABP", "ACO"], "cats_evitar": ["SSG", "AVD", "PCO"], "nivel_cog_max": 2},
            "MD":   {"nombre": "Partido", "carga": "Competición", "cats_preferidas": [], "cats_evitar": [], "nivel_cog_max": 3},
        }
        md_info = json.dumps(md_context.get(match_day, md_context["MD-3"]), ensure_ascii=False)

        request_info = f"Match Day: {match_day}, Jugadores: {num_jugadores}, Duración: {duracion_total} min"
        if fase_juego:
            request_info += f", Fase de juego: {fase_juego}"
        if principio_tactico:
            request_info += f", Principio táctico: {principio_tactico}"
        if notas_adicionales:
            request_info += f"\nContexto adicional: {notas_adicionales}"

        prompt = f"""Diseña una sesión de entrenamiento con estos parámetros:
{request_info}

CONFIGURACIÓN DEL MATCH DAY:
{md_info}

TAREAS DISPONIBLES (usa IDs exactos cuando selecciones una):
{tasks_json}

INSTRUCCIONES:
1. PREFERENCIA: Selecciona tareas existentes de la lista (usa su ID exacto)
2. Si NO hay tarea adecuada para una fase: CREA una nueva con todos los campos
3. Adapta cada tarea para {num_jugadores} jugadores
4. La duración total debe ser ~{duracion_total} minutos
5. Las 4 fases son OBLIGATORIAS: activacion (12-18 min), desarrollo_1 (18-25 min), desarrollo_2 (20-30 min), vuelta_calma (8-12 min)

Para tarea existente usa: {{"tarea_id": "ID", "es_tarea_nueva": false, "duracion_sugerida": N, "razon": "...", "adaptaciones": [...], "coaching_points": [...]}}
Para tarea nueva usa: {{"tarea_id": null, "es_tarea_nueva": true, "tarea_nueva": {{"temp_id": "nueva_fase_1", "titulo": "...", "descripcion": "...", "categoria_codigo": "RND", "duracion_total": N, "num_series": N, "espacio_largo": N, "espacio_ancho": N, "num_jugadores_min": {num_jugadores}, "num_jugadores_max": {num_jugadores + 2}, "num_porteros": 0, "estructura_equipos": "...", "fase_juego": "...", "principio_tactico": "...", "reglas_principales": [...], "consignas": [...], "nivel_cognitivo": N, "densidad": "media"}}, "duracion_sugerida": N, "razon": "...", "adaptaciones": [], "coaching_points": [...]}}

Responde SOLO con JSON válido:
{{"titulo_sugerido": "...", "resumen": "...", "fases": {{"activacion": {{...}}, "desarrollo_1": {{...}}, "desarrollo_2": {{...}}, "vuelta_calma": {{...}}}}, "coherencia_tactica": "...", "carga_estimada": {{"fisica": "Alta/Media/Baja", "cognitiva": "Alta/Media/Baja", "duracion_total": {duracion_total}}}}}"""

        system = SYSTEM_PROMPT + "\n\nIMPORTANTE: Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown."

        response = await self._call_gemini(
            system=system,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
            max_output_tokens=4096,
        )

        text = _extract_text(response)
        return _parse_json_response(text)
