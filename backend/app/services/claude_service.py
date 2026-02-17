"""
TrainingHub Pro - Servicio de Claude AI
Agente conversacional inteligente para entrenadores de futbol.
Usa Claude (Anthropic) con tool use para consultar datos del equipo.
"""

import json
import logging
from typing import Any, Optional

import anthropic

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)


class ClaudeError(Exception):
    """Error en la comunicacion con Claude API."""
    pass


# ============ System Prompt ============

SYSTEM_PROMPT = """Eres el asistente de inteligencia artificial de TrainingHub Pro, una plataforma profesional para entrenadores de futbol.

## TU ROL
Eres un metodologo experto en futbol profesional con formacion en:
- Licencia UEFA Pro
- Periodizacion tactica (Vitor Frade, Paco Seirul-lo)
- Modelo de juego y principios tacticos
- Preparacion fisica integrada en el juego
- Psicologia deportiva aplicada al rendimiento

## TUS CAPACIDADES
1. **Planificacion**: Ayudas a disenar microciclos, sesiones y progresiones
2. **Analisis tactico**: Analizas rivales, sistema de juego, fortalezas/debilidades
3. **Gestion de plantilla**: Aconsejas sobre cargas, rotaciones, lesiones
4. **Consultas de datos**: Puedes consultar la base de datos del equipo (jugadores, sesiones, partidos, RPE, etc.)
5. **Knowledge Base**: Puedes buscar en la base de conocimiento del club

## HERRAMIENTAS
Tienes acceso a herramientas para consultar datos reales del equipo del usuario. SIEMPRE usa las herramientas cuando el usuario pregunte sobre:
- Sus jugadores, plantilla, lesionados
- Sesiones pasadas o planificadas
- Resultados de partidos
- Datos de carga/RPE
- Documentos de la base de conocimiento

## REGLAS
1. Responde SIEMPRE en espanol
2. Se conciso pero completo - los entrenadores necesitan informacion practica
3. Cuando des recomendaciones, justifica con principios metodologicos
4. Si no tienes datos suficientes, usa las herramientas antes de responder
5. Adapta tu lenguaje al contexto futbolistico espanol
6. Usa terminologia profesional pero accesible
7. Cuando hables de periodizacion tactica, referencia los Match Days correctos (MD-4 fuerza, MD-3 resistencia, MD-2 velocidad, MD-1 activacion, MD+1 recuperacion)
"""


# ============ Tool Definitions ============

TOOLS = [
    {
        "name": "consultar_jugadores",
        "description": "Consulta la plantilla de jugadores del equipo. Devuelve informacion sobre jugadores: nombre, posicion, dorsal, estado (activo/lesionado/sancionado), niveles tecnicos y fisicos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipo_id": {
                    "type": "string",
                    "description": "ID del equipo a consultar"
                },
                "estado": {
                    "type": "string",
                    "enum": ["activo", "lesionado", "sancionado"],
                    "description": "Filtrar por estado del jugador (opcional)"
                },
                "posicion": {
                    "type": "string",
                    "description": "Filtrar por posicion (portero, defensa, centrocampista, delantero)"
                },
            },
            "required": ["equipo_id"],
        },
    },
    {
        "name": "consultar_sesiones",
        "description": "Consulta las sesiones de entrenamiento del equipo. Puede filtrar por fecha, match_day o estado.",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipo_id": {
                    "type": "string",
                    "description": "ID del equipo"
                },
                "fecha_desde": {
                    "type": "string",
                    "description": "Fecha inicio en formato YYYY-MM-DD"
                },
                "fecha_hasta": {
                    "type": "string",
                    "description": "Fecha fin en formato YYYY-MM-DD"
                },
                "match_day": {
                    "type": "string",
                    "description": "Filtrar por Match Day (MD+1, MD-4, MD-3, MD-2, MD-1, MD)"
                },
                "estado": {
                    "type": "string",
                    "enum": ["borrador", "planificada", "completada", "cancelada"],
                    "description": "Filtrar por estado"
                },
                "limite": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (default 10)"
                },
            },
            "required": ["equipo_id"],
        },
    },
    {
        "name": "consultar_partidos",
        "description": "Consulta los partidos del equipo. Incluye resultados, rivales y proximos encuentros.",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipo_id": {
                    "type": "string",
                    "description": "ID del equipo"
                },
                "fecha_desde": {
                    "type": "string",
                    "description": "Fecha inicio en formato YYYY-MM-DD"
                },
                "fecha_hasta": {
                    "type": "string",
                    "description": "Fecha fin en formato YYYY-MM-DD"
                },
                "solo_pendientes": {
                    "type": "boolean",
                    "description": "Solo partidos sin resultado (proximos)"
                },
                "limite": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (default 10)"
                },
            },
            "required": ["equipo_id"],
        },
    },
    {
        "name": "consultar_rpe",
        "description": "Consulta los registros de RPE (Rating of Perceived Exertion) de los jugadores. Incluye datos de bienestar: sueno, fatiga, dolor, estres, humor.",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipo_id": {
                    "type": "string",
                    "description": "ID del equipo"
                },
                "jugador_id": {
                    "type": "string",
                    "description": "ID de un jugador especifico (opcional)"
                },
                "fecha_desde": {
                    "type": "string",
                    "description": "Fecha inicio"
                },
                "fecha_hasta": {
                    "type": "string",
                    "description": "Fecha fin"
                },
                "limite": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (default 20)"
                },
            },
            "required": ["equipo_id"],
        },
    },
    {
        "name": "consultar_microciclo",
        "description": "Consulta los microciclos (semanas de entrenamiento) del equipo con sus sesiones asociadas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipo_id": {
                    "type": "string",
                    "description": "ID del equipo"
                },
                "fecha_desde": {
                    "type": "string",
                    "description": "Fecha inicio"
                },
                "fecha_hasta": {
                    "type": "string",
                    "description": "Fecha fin"
                },
                "estado": {
                    "type": "string",
                    "enum": ["borrador", "planificado", "en_curso", "completado"],
                    "description": "Filtrar por estado"
                },
            },
            "required": ["equipo_id"],
        },
    },
    {
        "name": "buscar_knowledge_base",
        "description": "Busca informacion en la base de conocimiento del club. Util para consultar documentos, manuales, metodologia del club, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Texto a buscar en la base de conocimiento"
                },
                "organizacion_id": {
                    "type": "string",
                    "description": "ID de la organizacion"
                },
                "limite": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (default 5)"
                },
            },
            "required": ["query", "organizacion_id"],
        },
    },
    {
        "name": "consultar_convocatorias",
        "description": "Consulta las convocatorias de un partido: titulares, suplentes, minutos jugados, goles, tarjetas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "partido_id": {
                    "type": "string",
                    "description": "ID del partido"
                },
            },
            "required": ["partido_id"],
        },
    },
    {
        "name": "consultar_estadisticas_jugador",
        "description": "Consulta estadisticas acumuladas de un jugador: partidos jugados, goles, asistencias, tarjetas, minutos, RPE promedio.",
        "input_schema": {
            "type": "object",
            "properties": {
                "jugador_id": {
                    "type": "string",
                    "description": "ID del jugador"
                },
            },
            "required": ["jugador_id"],
        },
    },
]


# ============ Tool Execution ============

def _execute_tool(tool_name: str, tool_input: dict) -> str:
    """Ejecuta una herramienta y devuelve el resultado como string JSON."""
    supabase = get_supabase()

    try:
        if tool_name == "consultar_jugadores":
            return _tool_jugadores(supabase, tool_input)
        elif tool_name == "consultar_sesiones":
            return _tool_sesiones(supabase, tool_input)
        elif tool_name == "consultar_partidos":
            return _tool_partidos(supabase, tool_input)
        elif tool_name == "consultar_rpe":
            return _tool_rpe(supabase, tool_input)
        elif tool_name == "consultar_microciclo":
            return _tool_microciclo(supabase, tool_input)
        elif tool_name == "buscar_knowledge_base":
            return _tool_kb_search(supabase, tool_input)
        elif tool_name == "consultar_convocatorias":
            return _tool_convocatorias(supabase, tool_input)
        elif tool_name == "consultar_estadisticas_jugador":
            return _tool_estadisticas_jugador(supabase, tool_input)
        else:
            return json.dumps({"error": f"Herramienta desconocida: {tool_name}"})
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}")
        return json.dumps({"error": f"Error al ejecutar consulta: {str(e)}"})


def _tool_jugadores(supabase, params: dict) -> str:
    query = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, posicion_secundaria, "
        "estado, fecha_nacimiento, pie_dominante, "
        "nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental, "
        "fecha_lesion, fecha_vuelta_estimada, es_convocable"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("estado"):
        query = query.eq("estado", params["estado"])

    if params.get("posicion"):
        query = query.ilike("posicion_principal", f"%{params['posicion']}%")

    response = query.order("dorsal").execute()
    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_sesiones(supabase, params: dict) -> str:
    query = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, estado, duracion_total, "
        "objetivo_principal, fase_juego_principal, principio_tactico_principal, "
        "intensidad_objetivo, notas_pre, notas_post"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("fecha_desde"):
        query = query.gte("fecha", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha", params["fecha_hasta"])
    if params.get("match_day"):
        query = query.eq("match_day", params["match_day"])
    if params.get("estado"):
        query = query.eq("estado", params["estado"])

    limite = params.get("limite", 10)
    response = query.order("fecha", desc=True).limit(limite).execute()
    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_partidos(supabase, params: dict) -> str:
    query = supabase.table("partidos").select(
        "id, fecha, hora, localia, competicion, "
        "goles_favor, goles_contra, resultado, "
        "sistema_rival, notas_tacticas, notas_post, "
        "rivales(nombre, nombre_corto, sistema_habitual)"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("fecha_desde"):
        query = query.gte("fecha", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha", params["fecha_hasta"])
    if params.get("solo_pendientes"):
        query = query.is_("goles_favor", "null")

    limite = params.get("limite", 10)
    response = query.order("fecha", desc=True).limit(limite).execute()

    # Flatten rival data
    for p in response.data:
        p["rival"] = p.pop("rivales", None)

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_rpe(supabase, params: dict) -> str:
    # Get player IDs for the team
    jugadores = supabase.table("jugadores").select("id, nombre, apellidos").eq(
        "equipo_id", params["equipo_id"]
    ).execute()

    jugador_ids = [j["id"] for j in jugadores.data]
    jugador_map = {j["id"]: f"{j['nombre']} {j['apellidos']}" for j in jugadores.data}

    if not jugador_ids:
        return json.dumps({"mensaje": "No hay jugadores en este equipo", "registros": []})

    query = supabase.table("registros_rpe").select(
        "id, jugador_id, fecha, rpe, sueno, fatiga, dolor, estres, humor, "
        "carga_sesion, notas"
    )

    if params.get("jugador_id"):
        query = query.eq("jugador_id", params["jugador_id"])
    else:
        query = query.in_("jugador_id", jugador_ids)

    if params.get("fecha_desde"):
        query = query.gte("fecha", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha", params["fecha_hasta"])

    limite = params.get("limite", 20)
    response = query.order("fecha", desc=True).limit(limite).execute()

    # Add player names
    for r in response.data:
        r["jugador_nombre"] = jugador_map.get(r["jugador_id"], "Desconocido")

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_microciclo(supabase, params: dict) -> str:
    query = supabase.table("microciclos").select(
        "id, fecha_inicio, fecha_fin, objetivo_principal, objetivo_tactico, "
        "objetivo_fisico, estado, notas"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("fecha_desde"):
        query = query.gte("fecha_inicio", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha_fin", params["fecha_hasta"])
    if params.get("estado"):
        query = query.eq("estado", params["estado"])

    response = query.order("fecha_inicio", desc=True).limit(5).execute()
    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_kb_search(supabase, params: dict) -> str:
    # Get indexed documents for org
    docs = supabase.table("documentos_kb").select("id, titulo").eq(
        "organizacion_id", params["organizacion_id"]
    ).eq("estado", "indexado").execute()

    doc_ids = [d["id"] for d in docs.data]
    doc_map = {d["id"]: d["titulo"] for d in docs.data}

    if not doc_ids:
        return json.dumps({"mensaje": "No hay documentos indexados en la base de conocimiento", "resultados": []})

    limite = params.get("limite", 5)
    chunks = supabase.table("chunks_kb").select("*").in_(
        "documento_id", doc_ids
    ).ilike("contenido", f"%{params['query']}%").limit(limite).execute()

    results = []
    for chunk in chunks.data:
        results.append({
            "documento": doc_map.get(chunk["documento_id"], "?"),
            "contenido": chunk["contenido"],
        })

    return json.dumps({"resultados": results, "total": len(results)}, ensure_ascii=False)


def _tool_convocatorias(supabase, params: dict) -> str:
    response = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal)"
    ).eq("partido_id", params["partido_id"]).order("titular", desc=True).execute()

    for c in response.data:
        c["jugador"] = c.pop("jugadores", None)

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_estadisticas_jugador(supabase, params: dict) -> str:
    jugador_id = params["jugador_id"]

    # Player info
    jugador = supabase.table("jugadores").select(
        "nombre, apellidos, dorsal, posicion_principal, estado"
    ).eq("id", jugador_id).single().execute()

    if not jugador.data:
        return json.dumps({"error": "Jugador no encontrado"})

    # Convocatorias stats
    convos = supabase.table("convocatorias").select(
        "titular, minutos_jugados, goles, asistencias, tarjeta_amarilla, tarjeta_roja"
    ).eq("jugador_id", jugador_id).execute()

    total_partidos = len(convos.data)
    titularidades = sum(1 for c in convos.data if c.get("titular"))
    minutos = sum(c.get("minutos_jugados", 0) for c in convos.data)
    goles = sum(c.get("goles", 0) for c in convos.data)
    asistencias = sum(c.get("asistencias", 0) for c in convos.data)
    amarillas = sum(1 for c in convos.data if c.get("tarjeta_amarilla"))
    rojas = sum(1 for c in convos.data if c.get("tarjeta_roja"))

    # RPE stats (last 10)
    rpes = supabase.table("registros_rpe").select(
        "rpe, carga_sesion, fecha"
    ).eq("jugador_id", jugador_id).order("fecha", desc=True).limit(10).execute()

    rpe_promedio = None
    if rpes.data:
        rpe_vals = [r["rpe"] for r in rpes.data]
        rpe_promedio = round(sum(rpe_vals) / len(rpe_vals), 1)

    return json.dumps({
        "jugador": jugador.data,
        "estadisticas": {
            "partidos_jugados": total_partidos,
            "titularidades": titularidades,
            "suplencias": total_partidos - titularidades,
            "minutos_totales": minutos,
            "goles": goles,
            "asistencias": asistencias,
            "tarjetas_amarillas": amarillas,
            "tarjetas_rojas": rojas,
        },
        "rpe": {
            "promedio_ultimos_10": rpe_promedio,
            "registros_recientes": rpes.data,
        },
    }, ensure_ascii=False, default=str)


# ============ Claude Service ============

class ClaudeService:
    """Servicio para interactuar con Claude API con tool use."""

    def __init__(self):
        settings = get_settings()

        if not settings.ANTHROPIC_API_KEY:
            raise ClaudeError("ANTHROPIC_API_KEY no configurada")

        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-5-20250929"

    async def chat(
        self,
        mensaje: str,
        historial: list[dict],
        equipo_id: Optional[str] = None,
        organizacion_id: Optional[str] = None,
        contexto: Optional[dict] = None,
    ) -> dict:
        """
        Envia un mensaje al agente Claude y obtiene respuesta.
        Ejecuta herramientas automaticamente si Claude las solicita.

        Args:
            mensaje: Mensaje del usuario
            historial: Historial de mensajes previos [{rol, contenido}]
            equipo_id: ID del equipo activo del usuario
            organizacion_id: ID de la organizacion
            contexto: Contexto adicional (info de equipo, etc.)

        Returns:
            dict con: respuesta, tokens_input, tokens_output, herramientas_usadas
        """
        # Build messages from history
        messages = self._build_messages(historial, mensaje)

        # Build system prompt with context
        system = self._build_system_prompt(equipo_id, organizacion_id, contexto)

        # Determine if we need tools (only if we have equipo_id for queries)
        tools = TOOLS if equipo_id else None

        herramientas_usadas = []
        total_input_tokens = 0
        total_output_tokens = 0

        # Tool use loop (max 5 iterations to prevent infinite loops)
        max_iterations = 5
        for _ in range(max_iterations):
            try:
                kwargs = {
                    "model": self.model,
                    "max_tokens": 4096,
                    "system": system,
                    "messages": messages,
                }
                if tools:
                    kwargs["tools"] = tools

                response = self.client.messages.create(**kwargs)

                total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

            except anthropic.APIError as e:
                logger.error(f"Claude API error: {e}")
                raise ClaudeError(f"Error de comunicacion con Claude: {str(e)}")

            # Check if Claude wants to use tools
            if response.stop_reason == "tool_use":
                # Extract tool calls and text blocks
                assistant_content = response.content
                tool_results = []

                for block in assistant_content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_input = block.input

                        logger.info(f"Claude tool call: {tool_name}({json.dumps(tool_input, default=str)[:200]})")

                        # Inject equipo_id if the tool needs it but Claude didn't provide it
                        if equipo_id and "equipo_id" in {p for t in TOOLS if t["name"] == tool_name for p in t["input_schema"].get("required", [])}:
                            if "equipo_id" not in tool_input:
                                tool_input["equipo_id"] = equipo_id

                        # Inject organizacion_id for KB search
                        if tool_name == "buscar_knowledge_base" and organizacion_id:
                            if "organizacion_id" not in tool_input:
                                tool_input["organizacion_id"] = organizacion_id

                        result = _execute_tool(tool_name, tool_input)

                        herramientas_usadas.append({
                            "nombre": tool_name,
                            "input": tool_input,
                        })

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                # Add assistant response and tool results to messages
                messages.append({"role": "assistant", "content": assistant_content})
                messages.append({"role": "user", "content": tool_results})

                # Continue the loop for Claude to process tool results
                continue

            else:
                # Claude finished - extract text response
                text_response = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        text_response += block.text

                return {
                    "respuesta": text_response,
                    "tokens_input": total_input_tokens,
                    "tokens_output": total_output_tokens,
                    "herramientas_usadas": herramientas_usadas,
                }

        # If we hit max iterations, return what we have
        logger.warning("Claude hit max tool iterations")
        return {
            "respuesta": "He consultado mucha informacion. Dejame resumir lo que encontre.",
            "tokens_input": total_input_tokens,
            "tokens_output": total_output_tokens,
            "herramientas_usadas": herramientas_usadas,
        }

    def _build_messages(self, historial: list[dict], mensaje_actual: str) -> list[dict]:
        """Construye la lista de mensajes para Claude."""
        messages = []

        for msg in historial:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")

            # Map to Claude roles
            if rol == "system":
                continue  # System messages go in system param
            elif rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            else:
                messages.append({"role": "user", "content": contenido})

        # Add current message
        messages.append({"role": "user", "content": mensaje_actual})

        return messages

    def _build_system_prompt(
        self,
        equipo_id: Optional[str],
        organizacion_id: Optional[str],
        contexto: Optional[dict],
    ) -> str:
        """Construye el system prompt con contexto del equipo."""
        system = SYSTEM_PROMPT

        if equipo_id:
            system += f"\n\n## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
            if organizacion_id:
                system += f"\n- ID de la organizacion: {organizacion_id}"

            system += "\n\nCuando el usuario pregunte sobre su equipo, jugadores, sesiones o partidos, USA las herramientas disponibles para consultar datos reales. No inventes datos."

        if contexto:
            if contexto.get("equipo_nombre"):
                system += f"\n- Equipo: {contexto['equipo_nombre']}"
            if contexto.get("equipo_categoria"):
                system += f"\n- Categoria: {contexto['equipo_categoria']}"

        return system
