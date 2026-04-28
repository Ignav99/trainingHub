"""
TrainingHub Pro - OpenAI-Compatible AI Service
Works with any OpenAI-compatible API: DeepSeek, Cerebras, Groq, etc.
"""

import json
import logging
from typing import Any, Optional

import openai

from app.services.ai_errors import AIError
from app.services.ai_prompts import (
    SYSTEM_PROMPT,
    DIAGRAM_GENERATION_PROMPT,
    TASK_DESIGN_PROMPT,
    TASK_DESIGN_TOOLS,
    SESSION_DESIGN_PROMPT,
    SESSION_DESIGN_TOOLS,
    GK_DESIGN_PROMPT,
    GK_DESIGN_TOOLS,
    PRE_MATCH_REPORT_PROMPT,
    PRE_MATCH_TOOLS,
    TOOLS,
)
from app.services.ai_tools import claude_tools_to_openai
from app.services.ai_tool_executor import execute_tool

logger = logging.getLogger(__name__)


class OpenAICompatibleService:
    """AI service using any OpenAI-compatible API (DeepSeek, Cerebras, Groq)."""

    def __init__(self, api_key: str, base_url: str, model: str, provider_name: str = "openai"):
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=120.0,
            max_retries=2,
        )
        self.model = model
        self.provider_name = provider_name

    def _raise_error(self, message: str, status_code: int = 500) -> None:
        raise AIError(message, status_code=status_code, provider=self.provider_name)

    def _handle_api_error(self, e: Exception, context: str) -> None:
        """Map OpenAI SDK exceptions to AIError."""
        if isinstance(e, openai.RateLimitError):
            logger.warning(f"{self.provider_name} rate limit in {context}: {e}")
            raise AIError(
                f"{self.provider_name} rate limited. Trying next provider.",
                status_code=429,
                provider=self.provider_name,
            )
        elif isinstance(e, openai.APIConnectionError):
            logger.error(f"{self.provider_name} connection error in {context}: {e}")
            raise AIError(
                f"Connection error with {self.provider_name}.",
                status_code=503,
                provider=self.provider_name,
            )
        elif isinstance(e, openai.APIStatusError):
            logger.error(f"{self.provider_name} API error in {context}: status={e.status_code}")
            status = e.status_code or 500
            if status in (429, 503):
                raise AIError(
                    f"{self.provider_name} unavailable (HTTP {status}).",
                    status_code=status,
                    provider=self.provider_name,
                )
            raise AIError(
                f"Error from {self.provider_name}: {str(e)[:200]}",
                status_code=status,
                provider=self.provider_name,
            )
        else:
            logger.error(f"{self.provider_name} unexpected error in {context}: {e}")
            raise AIError(
                f"Unexpected error from {self.provider_name}: {str(e)[:200]}",
                status_code=500,
                provider=self.provider_name,
            )

    async def _call_with_tools(
        self,
        messages: list[dict],
        tools: list[dict] | None,
        max_tokens: int = 4096,
        max_iterations: int = 10,
        tool_handler: callable = None,
    ) -> tuple[str, list[dict], int, int]:
        """Core tool-use loop for OpenAI-compatible APIs.

        Args:
            messages: Conversation messages
            tools: OpenAI-format tool definitions (or None)
            max_tokens: Max tokens per response
            max_iterations: Max tool-use iterations
            tool_handler: Optional custom handler for special tools (returns tool result string or None to skip)

        Returns:
            (text_response, tools_used, total_input_tokens, total_output_tokens)
        """
        tools_used = []
        total_input = 0
        total_output = 0

        for iteration in range(max_iterations):
            try:
                kwargs: dict[str, Any] = {
                    "model": self.model,
                    "max_tokens": max_tokens,
                    "messages": messages,
                }
                if tools:
                    kwargs["tools"] = tools

                response = await self.client.chat.completions.create(**kwargs)

            except Exception as e:
                self._handle_api_error(e, "tool_call_loop")

            choice = response.choices[0]
            message = choice.message
            usage = response.usage
            if usage:
                total_input += usage.prompt_tokens or 0
                total_output += usage.completion_tokens or 0

            # Check for tool calls
            if message.tool_calls:
                # Add assistant message with tool calls
                messages.append(message.model_dump())

                for tool_call in message.tool_calls:
                    fn = tool_call.function
                    tool_name = fn.name
                    try:
                        tool_input = json.loads(fn.arguments) if fn.arguments else {}
                    except json.JSONDecodeError:
                        tool_input = {}

                    logger.info(f"{self.provider_name} tool call: {tool_name}")

                    # Check custom handler first
                    custom_result = None
                    if tool_handler:
                        custom_result = tool_handler(tool_name, tool_input, tool_call.id)

                    if custom_result is not None:
                        result_content = custom_result
                    else:
                        result_content = execute_tool(tool_name, tool_input)

                    tools_used.append({"nombre": tool_name})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_content,
                    })

                continue  # Let the model process tool results
            else:
                # No tool calls — return text
                text = message.content or ""
                return text, tools_used, total_input, total_output

        # Hit max iterations
        return "", tools_used, total_input, total_output

    # ============ Chat (general assistant) ============

    async def chat(
        self,
        mensaje: str,
        historial: list[dict],
        equipo_id: Optional[str] = None,
        organizacion_id: Optional[str] = None,
        contexto: Optional[dict] = None,
    ) -> dict:
        """General chat with tool use for data queries."""
        system_text = SYSTEM_PROMPT
        dynamic_parts = []
        if equipo_id:
            dynamic_parts.append(f"## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}")
            if organizacion_id:
                dynamic_parts.append(f"- ID de la organizacion: {organizacion_id}")
            dynamic_parts.append(
                "Cuando el usuario pregunte sobre su equipo, usa las herramientas disponibles."
            )
        if contexto:
            if contexto.get("equipo_nombre"):
                dynamic_parts.append(f"- Equipo: {contexto['equipo_nombre']}")
            if contexto.get("equipo_categoria"):
                dynamic_parts.append(f"- Categoria: {contexto['equipo_categoria']}")

        if dynamic_parts:
            system_text += "\n\n" + "\n".join(dynamic_parts)

        messages = [{"role": "system", "content": system_text}]

        # Build history
        for msg in historial:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "system":
                continue
            elif rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            else:
                messages.append({"role": "user", "content": contenido})

        messages.append({"role": "user", "content": mensaje})

        tools = claude_tools_to_openai(TOOLS) if equipo_id else None

        def tool_handler(tool_name, tool_input, tool_call_id):
            # Inject equipo_id/organizacion_id
            if equipo_id and "equipo_id" not in tool_input:
                for t in TOOLS:
                    if t["name"] == tool_name and "equipo_id" in t["input_schema"].get("required", []):
                        tool_input["equipo_id"] = equipo_id
                        break
            if tool_name in ("buscar_knowledge_base", "buscar_tareas") and organizacion_id:
                if "organizacion_id" not in tool_input:
                    tool_input["organizacion_id"] = organizacion_id
            return None  # Use default execute_tool

        text, tools_used, tok_in, tok_out = await self._call_with_tools(
            messages, tools, max_tokens=4096, max_iterations=5, tool_handler=tool_handler,
        )

        return {
            "respuesta": text or "He consultado mucha informacion. Dejame resumir lo que encontre.",
            "tokens_input": tok_in,
            "tokens_output": tok_out,
            "modelo": self.model,
            "provider": self.provider_name,
            "herramientas_usadas": tools_used,
        }

    # ============ Session Design Chat ============

    async def session_design_chat(
        self,
        mensajes: list[dict],
        equipo_id: str,
        organizacion_id: Optional[str] = None,
    ) -> dict:
        """Chat for designing training sessions."""
        system_text = SYSTEM_PROMPT + SESSION_DESIGN_PROMPT
        system_text += f"\n\n## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
        if organizacion_id:
            system_text += f"\n- ID de la organizacion: {organizacion_id}"

        messages = [{"role": "system", "content": system_text}]
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            elif rol == "user":
                messages.append({"role": "user", "content": contenido})

        tools = claude_tools_to_openai(SESSION_DESIGN_TOOLS)
        sesion_propuesta = None

        def tool_handler(tool_name, tool_input, tool_call_id):
            nonlocal sesion_propuesta
            if tool_name == "proponer_sesion":
                sesion_propuesta = tool_input
                return "Sesion propuesta presentada al entrenador. Ahora resume brevemente lo que has propuesto y pregunta si quiere modificar algo."
            if tool_name == "buscar_tareas_biblioteca":
                search_params = {
                    "organizacion_id": organizacion_id,
                    "query": tool_input.get("query", ""),
                    "categoria": tool_input.get("categoria"),
                    "fase_juego": tool_input.get("fase_juego"),
                    "limite": tool_input.get("limite", 5),
                }
                return execute_tool("buscar_tareas", search_params)
            return None

        text, tools_used, tok_in, tok_out = await self._call_with_tools(
            messages, tools, max_tokens=16384, max_iterations=10, tool_handler=tool_handler,
        )

        return {
            "respuesta": text or "He procesado mucha informacion. ¿Quieres que continue?",
            "sesion_propuesta": sesion_propuesta,
            "tokens_input": tok_in,
            "tokens_output": tok_out,
            "provider": self.provider_name,
            "herramientas_usadas": tools_used,
        }

    # ============ Task Design Chat ============

    async def task_design_chat(
        self,
        mensajes: list[dict],
        equipo_id: str,
        organizacion_id: Optional[str] = None,
    ) -> dict:
        """Chat for designing individual training tasks."""
        system_text = SYSTEM_PROMPT + TASK_DESIGN_PROMPT
        system_text += f"\n\n## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
        if organizacion_id:
            system_text += f"\n- ID de la organizacion: {organizacion_id}"

        messages = [{"role": "system", "content": system_text}]
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            elif rol == "user":
                messages.append({"role": "user", "content": contenido})

        tools = claude_tools_to_openai(TASK_DESIGN_TOOLS)
        tarea_propuesta = None

        def tool_handler(tool_name, tool_input, tool_call_id):
            nonlocal tarea_propuesta
            if tool_name == "proponer_tarea":
                tarea_propuesta = tool_input
                return "Tarea propuesta presentada al entrenador. Ahora resume brevemente lo que has propuesto y pregunta si quiere modificar algo."
            return None

        text, tools_used, tok_in, tok_out = await self._call_with_tools(
            messages, tools, max_tokens=8192, max_iterations=10, tool_handler=tool_handler,
        )

        return {
            "respuesta": text or "He procesado mucha informacion. ¿Quieres que continue?",
            "tarea_propuesta": tarea_propuesta,
            "tokens_input": tok_in,
            "tokens_output": tok_out,
            "provider": self.provider_name,
            "herramientas_usadas": tools_used,
        }

    # ============ GK Design ============

    async def design_portero_tarea(
        self,
        prompt: str,
        context: dict,
    ) -> dict:
        """Design a goalkeeper training exercise."""
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

        system_text = SYSTEM_PROMPT + GK_DESIGN_PROMPT + f"\n\n## CONTEXTO DE LA SESIÓN\n{context_text}"

        messages = [
            {"role": "system", "content": system_text},
            {"role": "user", "content": prompt},
        ]

        tools = claude_tools_to_openai(GK_DESIGN_TOOLS)
        tarea_propuesta = None

        def tool_handler(tool_name, tool_input, tool_call_id):
            nonlocal tarea_propuesta
            if tool_name == "proponer_tarea_portero":
                tarea_propuesta = tool_input
                return "Ejercicio propuesto presentado al entrenador. Resume brevemente lo que has propuesto."
            return None

        text, tools_used, tok_in, tok_out = await self._call_with_tools(
            messages, tools, max_tokens=4096, max_iterations=10, tool_handler=tool_handler,
        )

        return {
            "respuesta": text or "He diseñado el ejercicio para porteros.",
            "tarea_propuesta": tarea_propuesta,
            "tokens_input": tok_in,
            "tokens_output": tok_out,
            "provider": self.provider_name,
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
        """Chat for generating pre-match reports or game plans."""
        system_text = SYSTEM_PROMPT + PRE_MATCH_REPORT_PROMPT
        system_text += (
            f"\n\n## DATOS DEL PARTIDO\n"
            f"- Rival: {rival_nombre}\n"
            f"- Localía: {localia}\n"
            f"- Fecha: {fecha}\n\n"
            f"## INTEL DEL RIVAL (datos reales RFEF)\n"
            f"```json\n{json.dumps(intel_data, ensure_ascii=False, default=str)}\n```"
        )

        messages = [{"role": "system", "content": system_text}]
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            elif rol == "user":
                messages.append({"role": "user", "content": contenido})

        tools = claude_tools_to_openai(PRE_MATCH_TOOLS)
        informe_rival = None
        plan_partido = None

        def tool_handler(tool_name, tool_input, tool_call_id):
            nonlocal informe_rival, plan_partido
            if tool_name == "generar_informe_rival":
                informe_rival = tool_input
                return "Informe del rival generado y presentado al entrenador. Resume brevemente las claves del informe."
            elif tool_name == "generar_plan_partido":
                plan_partido = tool_input
                return "Plan de partido generado y presentado al entrenador. Resume brevemente las claves del plan."
            return None

        text, tools_used, tok_in, tok_out = await self._call_with_tools(
            messages, tools, max_tokens=16384, max_iterations=10, tool_handler=tool_handler,
        )

        return {
            "respuesta": text or "He procesado mucha informacion. ¿Quieres que continue?",
            "informe_rival": informe_rival,
            "plan_partido": plan_partido,
            "tokens_input": tok_in,
            "tokens_output": tok_out,
            "provider": self.provider_name,
        }

    # ============ Edit Task with AI ============

    async def edit_task_with_ai(
        self,
        tarea: dict,
        instruccion: str,
        equipo_id: Optional[str] = None,
    ) -> dict:
        """Modify a training task according to user instructions."""
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

        system_text = (
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

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                max_tokens=2048,
                messages=[
                    {"role": "system", "content": system_text},
                    {"role": "user", "content": user_message},
                ],
            )
            text = response.choices[0].message.content or ""
            return self._parse_json_response(text)
        except Exception as e:
            self._handle_api_error(e, "edit_task_with_ai")

    # ============ Create Task from Prompt ============

    async def create_task_from_prompt(
        self,
        prompt: str,
        session_context: Optional[dict] = None,
    ) -> dict:
        """Generate a training task from a user prompt."""
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

        system_text = (
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

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": system_text},
                    {"role": "user", "content": user_message},
                ],
            )
            text = response.choices[0].message.content or ""
            return self._parse_json_response(text)
        except Exception as e:
            self._handle_api_error(e, "create_task_from_prompt")

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
        """Generate session recommendations (JSON response, no tool use)."""
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

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT + "\nIMPORTANTE: Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown."},
                    {"role": "user", "content": prompt},
                ],
            )
            text = response.choices[0].message.content or ""
            return self._parse_json_response(text)
        except Exception as e:
            self._handle_api_error(e, "generate_session_recommendations")

    # ============ Diagram Generation ============

    async def generate_diagram(
        self,
        titulo: str,
        descripcion: str,
        categoria_codigo: str = "",
        estructura_equipos: str = "",
        espacio_largo: float = None,
        espacio_ancho: float = None,
        num_jugadores_min: int = 0,
        fase_juego: str = "",
    ) -> Optional[dict]:
        """Generate a diagram JSON for a training exercise."""
        user_prompt = f"""Generate a diagram for this football training exercise:

Title: {titulo}
Description: {descripcion or 'No description'}
Category: {categoria_codigo or 'General'}
Team structure: {estructura_equipos or 'Not specified'}
Space: {f'{espacio_largo}x{espacio_ancho}m' if espacio_largo and espacio_ancho else 'Not specified'}
Players: {num_jugadores_min or 'Not specified'}
Game phase: {fase_juego or 'Not specified'}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                max_tokens=2048,
                messages=[
                    {"role": "system", "content": DIAGRAM_GENERATION_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )

            text = response.choices[0].message.content or ""
            if not text:
                return None

            # Strip markdown code blocks if present
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
            logger.warning(f"{self.provider_name} diagram JSON parse failed")
            return None
        except Exception as e:
            logger.warning(f"{self.provider_name} diagram generation failed: {e}")
            return None

    # ============ Helpers ============

    def _parse_json_response(self, text: str) -> dict:
        """Extract and validate JSON from AI response."""
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to repair truncated JSON
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
                logger.error(f"Error parsing {self.provider_name} JSON response: {text[:500]}")
                raise AIError(
                    f"Respuesta de IA no válida: {str(e2)}",
                    status_code=500,
                    provider=self.provider_name,
                )
