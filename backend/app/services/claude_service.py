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


def _serialize_content_blocks(content) -> list[dict]:
    """Convert Anthropic SDK Pydantic content blocks to plain dicts.

    Avoids Pydantic 2.5.x model_dump(by_alias=None) serialization bug
    when content blocks are passed back into messages.create().
    """
    serialized = []
    for block in content:
        if block.type == "text":
            serialized.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            serialized.append({
                "type": "tool_use",
                "id": block.id,
                "name": block.name,
                "input": block.input,
            })
    return serialized
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

## METODOLOGÍA: TAXONOMÍA DE TAREAS
9 categorias de tareas con su naturaleza y espacio recomendado (m²/jugador):
- RND (Rondo): conservacion, espacio reducido (~9 m²/jug)
- JDP (Juego de Posición): posesion posicional, espacio medio (~25 m²/jug)
- POS (Posesión): conservacion con objetivo, espacio medio-grande (~30 m²/jug)
- EVO (Evoluciones): acciones combinadas con finalizacion, espacio grande (~40 m²/jug)
- AVD (Ataque vs Defensa): situaciones reales de juego, espacio grande (~50 m²/jug)
- PCO (Partido Condicionado): partido con reglas modificadas, espacio grande (~60 m²/jug)
- ACO (Acciones Combinadas): acciones tecnico-tacticas, espacio medio (~20 m²/jug)
- SSG (Fútbol Reducido / Small-Sided Games): juego real reducido, espacio reducido (~15 m²/jug)
- ABP (Balón Parado): estrategia a balon parado, espacio especifico

## METODOLOGÍA: MATCH DAY Y CARGA
Relacion entre Match Day, tipo de carga y categorias recomendadas:
- MD+1 Recuperación: carga muy baja, espacios amplios sin oposicion. RND✓✓, ABP✓
- MD-4 Fuerza/Tensión: espacios reducidos, alta intensidad, cambios direccion. SSG✓✓, AVD✓✓, JDP✓✓
- MD-3 Resistencia: espacios grandes, duraciones largas, esfuerzos continuos. POS✓✓, PCO✓✓, AVD✓✓
- MD-2 Velocidad: tiempos cortos, alta velocidad, poca densidad. EVO✓✓
- MD-1 Activación: carga baja, repaso tactico, automatismos. RND✓✓, ABP✓✓

## METODOLOGÍA: 5 FASES DE JUEGO
1. Ataque Organizado:
   - Principios: amplitud, movilidad, superioridades, progresion, finalizacion
   - Subprincipios: salida de balon, construccion zona 1, progresion zona 2, creacion zona 3, finalizacion
2. Transición Defensa-Ataque: velocidad, verticalidad, amplitud rapida
3. Defensa Organizada: compactacion, presion, coberturas, vigilancias
4. Transición Ataque-Defensa: reaccion inmediata, pressing 6 seg, repliegue, balance defensivo
5. Balón Parado: corners ofensivos/defensivos, faltas directas/indirectas, saques de banda/esquina

## METODOLOGÍA: NIVEL COGNITIVO
1 Baja: tareas conocidas, automatizadas, baja incertidumbre (ideal MD+1, MD-1)
2 Media: decision con oposicion moderada, lectura del juego (ideal MD-2)
3 Alta: alta incertidumbre, inferioridad numerica, multiples estimulos (ideal MD-4, MD-3)

## METODOLOGÍA: ESTRUCTURA DE SESIÓN
Fases obligatorias de cada sesion: activacion → desarrollo_1 → desarrollo_2 → vuelta_calma
- Activación (10-15 min): rondos, movilidad articular, activacion neuromuscular
- Desarrollo 1 (15-25 min): tarea principal orientada al objetivo tactico
- Desarrollo 2 (15-25 min): tarea de mayor complejidad/transferencia al juego real
- Vuelta a calma (5-10 min): balon parado, estiramientos, charla tactica
"""


# ============ Session Design Prompt ============

SESSION_DESIGN_PROMPT = """

## MODO: DISEÑO DE SESIÓN CONVERSACIONAL
Estás ayudando al entrenador a diseñar una sesión de entrenamiento paso a paso.

### FLUJO DE CONVERSACIÓN
1. Saluda brevemente y pregunta por el Match Day
2. Pregunta cuántos jugadores estarán disponibles
3. Pregunta por el objetivo táctico o la fase de juego a trabajar
4. Pregunta si hay contexto adicional (rival, último partido, jugadores clave fuera)
5. Usa la herramienta `buscar_tareas` para encontrar tareas adecuadas en la biblioteca
6. Usa la herramienta `proponer_sesion` para presentar la sesión completa
7. Después de proponer, pregunta si quiere modificar algo

### REGLAS DEL DISEÑO
- Cada sesión tiene 4 fases: activacion (10-15min), desarrollo_1 (15-25min), desarrollo_2 (20-30min), vuelta_calma (5-10min)
- Selecciona tareas de la biblioteca del equipo cuando sea posible (usa buscar_tareas)
- Si no hay tarea adecuada, crea una nueva con todos los campos necesarios
- Respeta la metodología de Match Day para elegir categorías apropiadas
- La duración total debe coincidir con lo que pida el entrenador (por defecto ~90 min)
- Sé conversacional: NO generes la sesión hasta tener toda la información necesaria
- Si el entrenador da instrucciones parciales, pregunta lo que falta
- Puedes hacer varias preguntas a la vez para ser eficiente

### CUANDO PROPONER
Usa `proponer_sesion` cuando tengas AL MENOS: match_day + num_jugadores + algún objetivo táctico.
NO esperes a tener todo perfecto - propón y luego ajusta si el entrenador pide cambios.

### FORMATO DE TAREAS NUEVAS
Al crear tareas nuevas dentro de proponer_sesion, incluye estos campos:
- temp_id: "nueva_activacion", "nueva_desarrollo1", etc.
- titulo, descripcion, categoria_codigo (RND/JDP/POS/EVO/AVD/PCO/ACO/SSG/ABP)
- duracion_total, num_series, espacio_largo, espacio_ancho
- num_jugadores_min, num_jugadores_max, num_porteros
- estructura_equipos, fase_juego, principio_tactico
- reglas_principales (array), consignas (array)
- nivel_cognitivo (1-3), densidad ("baja"/"media"/"alta")
- grafico_data (diagrama táctico), variantes (array), material_necesario (array)
- posicion_entrenador (string), errores_comunes (array), consignas_defensivas (array)

### GENERACIÓN DE DIAGRAMAS TÁCTICOS (grafico_data)
Cada tarea DEBE incluir un campo `grafico_data` con el diagrama visual del ejercicio.

SISTEMA DE COORDENADAS:
- "half" (medio campo): viewBox 525×680, campo útil x:30-500, y:30-650
  → Usar para: Rondos, JDP, Posesiones, Evoluciones, ABP
- "full" (campo completo): viewBox 1050×680, campo útil x:30-1020, y:30-650
  → Usar para: Partidos Condicionados, SSG, AVD grandes
- "quarter" (cuarto campo): viewBox 525×340, campo útil x:30-500, y:30-310
  → Usar para: Rondos pequeños, Acciones Combinadas

ELEMENTOS (elements array):
- Jugador equipo: {"type":"player","x":N,"y":N,"color":"#3B82F6","label":"1"}
- Jugador rival: {"type":"player","x":N,"y":N,"color":"#EF4444","label":"R1"}
- Comodín: {"type":"player","x":N,"y":N,"color":"#F59E0B","label":"C"}
- Portero: {"type":"player_gk","x":N,"y":N,"color":"#22C55E","label":"GK"}
- Cono: {"type":"cone","x":N,"y":N,"color":"#F59E0B"}
- Balón: {"type":"ball","x":N,"y":N}
- Mini portería: {"type":"mini_goal","x":N,"y":N}

FLECHAS (arrows array):
- Pase: {"from":{"x":N,"y":N},"to":{"x":N,"y":N},"type":"pass","color":"#FFFFFF"}
- Movimiento: {"from":{"x":N,"y":N},"to":{"x":N,"y":N},"type":"movement","color":"#22C55E"}

ZONAS (zones array):
- {"x":N,"y":N,"width":N,"height":N,"color":"rgba(46,204,113,0.08)","label":"Zona A"}

REGLAS DE DIAGRAMAS:
1. Distribuir jugadores según la descripción del ejercicio
2. Pases = flechas dashed blancas, movimientos = flechas sólidas verdes
3. Rondos: jugadores en círculo/cuadrado, defensores dentro
4. JDP/posesiones: estructura táctica con amplitud y profundidad
5. Evoluciones: mostrar la secuencia de acciones
6. Conos para delimitar, minigoals si se usan
7. Labels: números 1-11 equipo, R1-R11 rivales, C comodines, GK porteros
"""


# ============ Session Design Tools ============

SESSION_DESIGN_TOOLS = [
    {
        "name": "buscar_tareas",
        "description": "Busca tareas en la biblioteca del equipo. Usa esta herramienta para encontrar tareas existentes que encajen en la sesión.",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipo_id": {
                    "type": "string",
                    "description": "ID del equipo"
                },
                "categoria": {
                    "type": "string",
                    "description": "Código de categoría: RND, JDP, POS, EVO, AVD, PCO, ACO, SSG, ABP"
                },
                "fase_juego": {
                    "type": "string",
                    "description": "Fase de juego: ataque_organizado, defensa_organizada, transicion_ataque_defensa, transicion_defensa_ataque"
                },
                "busqueda": {
                    "type": "string",
                    "description": "Texto libre para buscar en títulos/descripciones"
                },
                "limite": {
                    "type": "integer",
                    "description": "Número máximo de resultados (default 10)"
                },
            },
            "required": ["equipo_id"],
        },
    },
    {
        "name": "proponer_sesion",
        "description": "Propone una sesión de entrenamiento completa al entrenador. Llama a esta herramienta cuando tengas suficiente información (match_day, jugadores, objetivo). Cada fase DEBE incluir un ejercicio detallado.",
        "input_schema": {
            "type": "object",
            "properties": {
                "titulo_sugerido": {
                    "type": "string",
                    "description": "Título descriptivo de la sesión"
                },
                "match_day": {
                    "type": "string",
                    "enum": ["MD+1", "MD-4", "MD-3", "MD-2", "MD-1", "MD"],
                    "description": "Match Day"
                },
                "resumen": {
                    "type": "string",
                    "description": "Resumen de 2-3 frases explicando el diseño"
                },
                "fases": {
                    "type": "array",
                    "description": "Array de 4 fases de la sesión, en orden: activacion, desarrollo_1, desarrollo_2, vuelta_calma",
                    "items": {
                        "type": "object",
                        "properties": {
                            "fase": {
                                "type": "string",
                                "enum": ["activacion", "desarrollo_1", "desarrollo_2", "vuelta_calma"],
                                "description": "Nombre de la fase"
                            },
                            "duracion": {
                                "type": "integer",
                                "description": "Duración en minutos de esta fase"
                            },
                            "tarea_id": {
                                "type": "string",
                                "description": "ID de la tarea existente (si se encontró con buscar_tareas). Omitir si es tarea nueva."
                            },
                            "titulo": {
                                "type": "string",
                                "description": "Título del ejercicio"
                            },
                            "descripcion": {
                                "type": "string",
                                "description": "Descripción detallada del ejercicio: qué hacen los jugadores, cómo se organiza, dinámica"
                            },
                            "categoria": {
                                "type": "string",
                                "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP"],
                                "description": "Categoría de la tarea"
                            },
                            "num_jugadores": {
                                "type": "string",
                                "description": "Ej: '16', '16+2GK', '10-14'"
                            },
                            "estructura_equipos": {
                                "type": "string",
                                "description": "Ej: '4v4+2 comodines', '8v8', '5v5+GK'"
                            },
                            "espacio": {
                                "type": "string",
                                "description": "Dimensiones del espacio. Ej: '30x20m', '40x30m', 'medio campo'"
                            },
                            "num_series": {
                                "type": "integer",
                                "description": "Número de series/repeticiones"
                            },
                            "duracion_serie": {
                                "type": "integer",
                                "description": "Duración de cada serie en minutos"
                            },
                            "densidad": {
                                "type": "string",
                                "enum": ["baja", "media", "alta"],
                                "description": "Densidad/intensidad física"
                            },
                            "nivel_cognitivo": {
                                "type": "integer",
                                "enum": [1, 2, 3],
                                "description": "1=bajo, 2=medio, 3=alto"
                            },
                            "fase_juego": {
                                "type": "string",
                                "description": "Fase de juego principal"
                            },
                            "principio_tactico": {
                                "type": "string",
                                "description": "Principio táctico a trabajar"
                            },
                            "reglas": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Reglas principales del ejercicio (2-4 reglas)"
                            },
                            "coaching_points": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Consignas clave para el entrenador (2-4 puntos)"
                            },
                            "razon": {
                                "type": "string",
                                "description": "Por qué se elige este ejercicio para esta fase"
                            },
                            "grafico_data": {
                                "type": "object",
                                "description": "Diagrama táctico del ejercicio con field_type, elements, arrows, zones"
                            },
                            "variantes": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "1-3 variantes/progresiones. Obligatorio para JDP, POS, EVO, AVD, PCO."
                            },
                            "material_necesario": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Material: 'Petos 3 colores', 'Conos x20', 'Porterías pequeñas x2', 'Balones x10'"
                            },
                            "posicion_entrenador": {
                                "type": "string",
                                "description": "Dónde se coloca el entrenador principal y asistentes durante la tarea"
                            },
                            "errores_comunes": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "2-3 errores comunes a corregir"
                            },
                            "consignas_defensivas": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Consignas defensivas"
                            },
                        },
                        "required": ["fase", "duracion", "titulo", "descripcion", "categoria", "coaching_points", "razon", "grafico_data", "variantes", "material_necesario"],
                    },
                },
                "coherencia_tactica": {
                    "type": "string",
                    "description": "Explicación de por qué las tareas elegidas son coherentes entre sí"
                },
                "carga_estimada": {
                    "type": "object",
                    "properties": {
                        "fisica": {
                            "type": "string",
                            "enum": ["muy_baja", "baja", "media", "alta"],
                        },
                        "cognitiva": {
                            "type": "string",
                            "enum": ["baja", "media", "alta"],
                        },
                        "duracion_total": {"type": "integer"},
                    },
                    "required": ["fisica", "cognitiva", "duracion_total"],
                },
            },
            "required": ["titulo_sugerido", "match_day", "resumen", "fases", "coherencia_tactica", "carga_estimada"],
        },
    },
]


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
        elif tool_name == "buscar_tareas":
            return _tool_buscar_tareas(supabase, tool_input)
        else:
            return json.dumps({"error": f"Herramienta desconocida: {tool_name}"})
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}")
        return json.dumps({"error": f"Error al ejecutar consulta: {str(e)}"})


def _tool_jugadores(supabase, params: dict) -> str:
    select_fields = (
        "id, nombre, apellidos, apodo, dorsal, posicion_principal, posicion_secundaria, "
        "estado, fecha_nacimiento, pie_dominante, "
        "nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental, "
        "fecha_lesion, fecha_vuelta_estimada, es_convocable"
    )
    query = supabase.table("jugadores").select(select_fields).eq("equipo_id", params["equipo_id"])

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
    """Busca en la knowledge base usando busqueda semantica (embeddings) con fallback a texto."""
    from app.config import get_settings

    # Get indexed documents for org
    docs = supabase.table("documentos_kb").select("id, titulo").eq(
        "organizacion_id", params["organizacion_id"]
    ).eq("estado", "indexado").execute()

    doc_ids = [d["id"] for d in docs.data]
    doc_map = {d["id"]: d["titulo"] for d in docs.data}

    if not doc_ids:
        return json.dumps({"mensaje": "No hay documentos indexados en la base de conocimiento", "resultados": []})

    limite = params.get("limite", 5)
    settings = get_settings()

    # Try semantic search with embeddings first
    if settings.GEMINI_API_KEY:
        try:
            from app.services.embedding_service import generate_query_embedding
            query_embedding = generate_query_embedding(params["query"])
            result = supabase.rpc("search_kb_chunks", {
                "query_embedding": query_embedding,
                "match_count": limite,
                "filter_doc_ids": doc_ids,
            }).execute()

            results = []
            for row in result.data:
                results.append({
                    "documento": doc_map.get(row["documento_id"], "?"),
                    "contenido": row["contenido"],
                    "similitud": round(1 - row.get("distance", 0.5), 3),
                })

            if results:
                return json.dumps({"resultados": results, "total": len(results)}, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"KB semantic search failed, falling back to text: {e}")

    # Fallback: text search
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


def _tool_buscar_tareas(supabase, params: dict) -> str:
    """Busca tareas en la biblioteca del equipo."""
    query = supabase.table("tareas").select(
        "id, titulo, descripcion, duracion_total, num_jugadores_min, num_jugadores_max, "
        "num_porteros, fase_juego, principio_tactico, nivel_cognitivo, densidad, "
        "num_series, espacio_largo, espacio_ancho, estructura_equipos, "
        "reglas_principales, consignas, categorias_tarea(codigo, nombre)"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("categoria"):
        # Join filter on categorias_tarea
        query = query.eq("categorias_tarea.codigo", params["categoria"])

    if params.get("fase_juego"):
        query = query.eq("fase_juego", params["fase_juego"])

    if params.get("busqueda"):
        query = query.ilike("titulo", f"%{params['busqueda']}%")

    limite = params.get("limite", 10)
    response = query.order("created_at", desc=True).limit(limite).execute()

    # Flatten categoria
    for t in response.data:
        cat = t.pop("categorias_tarea", None)
        t["categoria"] = cat

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
                messages.append({"role": "assistant", "content": _serialize_content_blocks(assistant_content)})
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
        """
        Genera recomendaciones de sesion usando Claude.
        Replica la funcionalidad de GeminiService pero con Anthropic Claude.
        """
        # Build simplified task list for context
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

        # Match Day context
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
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT + "\n\nIMPORTANTE: Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown.",
                messages=[{"role": "user", "content": prompt}],
            )

            text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text += block.text

            return self._parse_json_response(text)

        except anthropic.APIError as e:
            logger.error(f"Claude API error in session recommendations: {e}")
            raise ClaudeError(f"Error generando recomendaciones: {str(e)}")

    def _parse_json_response(self, text: str) -> dict:
        """Extrae y valida JSON de la respuesta de Claude."""
        # Clean markdown code blocks if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        try:
            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Claude JSON response: {text[:500]}")
            raise ClaudeError(f"Respuesta de IA no válida: {str(e)}")

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

    # ============ Session Design Chat ============

    async def session_design_chat(
        self,
        mensajes: list[dict],
        equipo_id: str,
        organizacion_id: Optional[str] = None,
    ) -> dict:
        """
        Chat conversacional para diseñar sesiones paso a paso.
        El AI guia al entrenador y al final propone una sesion estructurada.

        Returns:
            dict con: respuesta, sesion_propuesta (si el AI la generó), herramientas_usadas
        """
        # Build system prompt for session design
        system = SYSTEM_PROMPT + SESSION_DESIGN_PROMPT
        system += f"\n\n## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
        if organizacion_id:
            system += f"\n- ID de la organizacion: {organizacion_id}"

        # Build messages
        messages = []
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            elif rol == "user":
                messages.append({"role": "user", "content": contenido})

        # Tools: regular team tools + session-specific tools
        tools = TOOLS + SESSION_DESIGN_TOOLS

        herramientas_usadas = []
        sesion_propuesta = None
        total_input_tokens = 0
        total_output_tokens = 0

        max_iterations = 8
        for _ in range(max_iterations):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=8192,
                    system=system,
                    messages=messages,
                    tools=tools,
                )

                total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

            except anthropic.APIError as e:
                logger.error(f"Claude API error in session design: {e}")
                raise ClaudeError(f"Error de comunicacion con Claude: {str(e)}")

            if response.stop_reason == "tool_use":
                assistant_content = response.content
                tool_results = []

                for block in assistant_content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_input = block.input

                        logger.info(f"Session design tool: {tool_name}")

                        # Handle proponer_sesion specially
                        if tool_name == "proponer_sesion":
                            sesion_propuesta = tool_input
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": "Sesion propuesta presentada al entrenador. Ahora resume brevemente lo que has propuesto y pregunta si quiere modificar algo.",
                            })
                            herramientas_usadas.append({"nombre": tool_name})
                            continue

                        # Inject equipo_id for team tools
                        if "equipo_id" in tool_input or any(
                            t["name"] == tool_name and "equipo_id" in t["input_schema"].get("required", [])
                            for t in tools
                        ):
                            if "equipo_id" not in tool_input:
                                tool_input["equipo_id"] = equipo_id

                        if tool_name == "buscar_knowledge_base" and organizacion_id:
                            if "organizacion_id" not in tool_input:
                                tool_input["organizacion_id"] = organizacion_id

                        result = _execute_tool(tool_name, tool_input)

                        herramientas_usadas.append({"nombre": tool_name, "input": tool_input})
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                messages.append({"role": "assistant", "content": _serialize_content_blocks(assistant_content)})
                messages.append({"role": "user", "content": tool_results})
                continue

            else:
                text_response = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        text_response += block.text

                return {
                    "respuesta": text_response,
                    "sesion_propuesta": sesion_propuesta,
                    "tokens_input": total_input_tokens,
                    "tokens_output": total_output_tokens,
                    "herramientas_usadas": herramientas_usadas,
                }

        return {
            "respuesta": "He procesado mucha informacion. ¿Quieres que continue?",
            "sesion_propuesta": sesion_propuesta,
            "tokens_input": total_input_tokens,
            "tokens_output": total_output_tokens,
            "herramientas_usadas": herramientas_usadas,
        }
