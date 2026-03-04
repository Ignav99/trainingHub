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

# Singleton AsyncAnthropic client — reused across requests for connection pooling
_async_client: anthropic.AsyncAnthropic | None = None


def _get_async_client() -> anthropic.AsyncAnthropic:
    """Return a shared AsyncAnthropic client (created once, reused)."""
    global _async_client
    if _async_client is None:
        settings = get_settings()
        if not settings.ANTHROPIC_API_KEY:
            raise ClaudeError("ANTHROPIC_API_KEY no configurada")
        # Clean the key: Render env vars sometimes include newlines/spaces from copy-paste
        clean_key = "".join(settings.ANTHROPIC_API_KEY.split())
        _async_client = anthropic.AsyncAnthropic(
            api_key=clean_key,
            timeout=120.0,
            max_retries=3,
        )
    return _async_client


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
6. **Biblioteca de ejercicios**: Puedes buscar ejercicios existentes en la biblioteca
7. **Mejores practicas**: Puedes consultar patrones y tendencias de otros entrenadores

## HERRAMIENTAS
Tienes acceso a herramientas para consultar datos reales del equipo del usuario. SIEMPRE usa las herramientas cuando el usuario pregunte sobre:
- Sus jugadores, plantilla, lesionados
- Sesiones pasadas o planificadas
- Resultados de partidos
- Datos de carga/RPE
- Documentos de la base de conocimiento
- Ejercicios de la biblioteca
- Mejores practicas o tendencias

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

TASK_DESIGN_PROMPT = """

## MODO: DISEÑO DE TAREA INDIVIDUAL

### INSTRUCCIÓN CRÍTICA
Cuando el entrenador describe un ejercicio con suficiente detalle (objetivo, jugadores, tipo de tarea), DEBES llamar a la herramienta `proponer_tarea` INMEDIATAMENTE. NO respondas con texto. USA LA HERRAMIENTA.

### FLUJO
1. El entrenador describe lo que necesita → SI tiene suficiente contexto, llama a `proponer_tarea` de inmediato.
2. Si falta información esencial, pregunta brevemente sobre: objetivo táctico, fase de juego, principio táctico, número de jugadores, espacio, Match Day.
3. Si falta el número de jugadores: asume 16. Si falta Match Day: asume MD-3.
4. Genera SIEMPRE tareas NUEVAS y creativas. NUNCA busques existentes.

### REGLAS DEL DISEÑO
- Diseñas UN solo ejercicio/tarea, no una sesión completa
- Respeta la metodología de Match Day para densidad y nivel cognitivo
- Si el entrenador describe un ejercicio concreto, úsalo tal cual pero enriquécelo
- Incluye siempre coaching points y reglas detalladas
- Si el entrenador pide modificaciones ("hazla más grande", "añade variante"), llama a `proponer_tarea` con la versión modificada completa
"""

TASK_DESIGN_TOOLS = [
    {
        "name": "proponer_tarea",
        "description": "Propone una tarea de entrenamiento completa. DEBES usar esta herramienta siempre que tengas suficiente contexto.",
        "input_schema": {
            "type": "object",
            "properties": {
                "titulo": {
                    "type": "string",
                    "description": "Título descriptivo de la tarea",
                },
                "descripcion": {
                    "type": "string",
                    "description": "Descripción detallada: qué hacen los jugadores, cómo se organiza, dinámica",
                },
                "categoria_codigo": {
                    "type": "string",
                    "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP"],
                    "description": "Categoría de la tarea",
                },
                "duracion_total": {
                    "type": "integer",
                    "description": "Duración total en minutos",
                },
                "num_series": {
                    "type": "integer",
                    "description": "Número de series/repeticiones",
                },
                "espacio": {
                    "type": "string",
                    "description": "Dimensiones del espacio. Ej: '30x20m', '40x30m'",
                },
                "num_jugadores": {
                    "type": "string",
                    "description": "Ej: '16', '16+2GK', '10-14'",
                },
                "estructura_equipos": {
                    "type": "string",
                    "description": "Ej: '4v4+2 comodines', '8v8', '5v5+GK'",
                },
                "fase_juego": {
                    "type": "string",
                    "description": "Fase de juego principal",
                },
                "principio_tactico": {
                    "type": "string",
                    "description": "Principio táctico a trabajar",
                },
                "reglas": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Reglas principales del ejercicio (3-5 reglas)",
                },
                "coaching_points": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Consignas clave para el entrenador (3-5 puntos)",
                },
                "consignas_defensivas": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Consignas defensivas específicas",
                },
                "errores_comunes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "2-3 errores comunes a corregir",
                },
                "variantes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "1-3 variantes o progresiones",
                },
                "material_necesario": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Material necesario: 'Petos 3 colores', 'Conos x20', etc.",
                },
                "posicion_entrenador": {
                    "type": "string",
                    "description": "Dónde se coloca el entrenador durante la tarea",
                },
                "densidad": {
                    "type": "string",
                    "enum": ["baja", "media", "alta"],
                    "description": "Densidad/intensidad física",
                },
                "nivel_cognitivo": {
                    "type": "integer",
                    "enum": [1, 2, 3],
                    "description": "1=bajo, 2=medio, 3=alto",
                },
                "razon": {
                    "type": "string",
                    "description": "Razón pedagógica y metodológica de esta tarea",
                },
            },
            "required": [
                "titulo", "descripcion", "categoria_codigo", "duracion_total",
                "num_jugadores", "reglas", "coaching_points",
            ],
        },
    },
]


SESSION_DESIGN_PROMPT = """

## MODO: DISEÑO DE SESIÓN

### INSTRUCCIÓN CRÍTICA
Cuando el entrenador da contexto (jugadores, objetivos, rival, ejercicios), DEBES llamar a la herramienta `proponer_sesion` INMEDIATAMENTE. NO respondas con texto. USA LA HERRAMIENTA.

### FLUJO
1. El entrenador describe lo que necesita → TÚ llamas a `proponer_sesion` de inmediato.
2. Si falta el número de jugadores: asume 18 (16 + 2 GK). Si falta match_day: asume MD-3.
3. Genera SIEMPRE tareas NUEVAS. NUNCA busques existentes.

### REGLAS DEL DISEÑO
- 4 fases obligatorias: activacion (10-15min), desarrollo_1 (15-25min), desarrollo_2 (20-30min), vuelta_calma (5-10min)
- Respeta la metodología de Match Day
- Si el entrenador describe ejercicios concretos, úsalos tal cual
- Si da contexto táctico, diseña ejercicios coherentes

### CAMPOS PRINCIPALES DE CADA FASE
Obligatorios: fase, duracion, titulo, descripcion, categoria, coaching_points, razon
Opcionales pero recomendados: reglas, num_jugadores, estructura_equipos, espacio, densidad, nivel_cognitivo, fase_juego, principio_tactico, variantes, material_necesario

### DIAGRAMA TÁCTICO (grafico_data) — OPCIONAL
Si incluyes grafico_data, usa este formato:
- pitchType: "full" (con porterías, para EVO/AVD/PCO/SSG) o "green" (sin porterías, para RND/JDP/POS/ACO/ABP)
- Campo horizontal 1050x680px. 1 metro ≈ 10px. Porterías a izquierda/derecha.
- elements: [{"type":"player","x":N,"y":N,"color":"#3B82F6","label":"1"}, {"type":"cone","x":N,"y":N}, ...]
- arrows: [{"from":{"x":N,"y":N},"to":{"x":N,"y":N},"type":"pass","color":"#FFFFFF"}, ...]
- zones: [{"x":N,"y":N,"width":N,"height":N,"color":"rgba(46,204,113,0.08)","label":"Zona A"}]
- Colores: equipo=#3B82F6, rival=#EF4444, comodín=#F59E0B, portero=#22C55E
- Tipos de jugador: "player", "player_gk". Otros: "cone", "ball", "mini_goal"
- Flechas: type="pass" (dashed blanca) o type="movement" (sólida verde)
- DIRECCIÓN: ataques siempre HORIZONTALES (→ o ←). "Verticalidad" táctica = horizontal en diagrama.
"""


# ============ Session Design Tools ============

SESSION_DESIGN_TOOLS = [
    {
        "name": "proponer_sesion",
        "description": "Genera una sesión de entrenamiento completa con 4 fases. DEBES usar esta herramienta siempre que el entrenador pida una sesión.",
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
                        "required": ["fase", "duracion", "titulo", "descripcion", "categoria", "coaching_points", "razon"],
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
    {
        "name": "buscar_tareas",
        "description": "Busca ejercicios en la biblioteca de la organizacion por categoria, fase de juego o texto.",
        "input_schema": {
            "type": "object",
            "properties": {
                "organizacion_id": {
                    "type": "string",
                    "description": "ID de la organizacion"
                },
                "categoria": {
                    "type": "string",
                    "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP"],
                    "description": "Codigo de categoria de tarea"
                },
                "fase_juego": {
                    "type": "string",
                    "description": "Fase de juego a filtrar"
                },
                "busqueda": {
                    "type": "string",
                    "description": "Texto libre para buscar en titulos de tareas"
                },
                "limite": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (default 10)"
                },
            },
            "required": ["organizacion_id"],
        },
    },
    {
        "name": "consultar_mejores_practicas",
        "description": "Consulta mejores practicas y patrones agregados de todos los entrenadores. Util para saber que categorias de tareas se usan mas en cada Match Day, duraciones medias de sesion, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "match_day": {
                    "type": "string",
                    "description": "Filtrar por Match Day (MD+1, MD-4, MD-3, MD-2, MD-1)"
                },
                "categoria": {
                    "type": "string",
                    "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP"],
                    "description": "Filtrar por categoria de tarea"
                },
                "tipo": {
                    "type": "string",
                    "enum": ["match_day_pattern", "estructura_sesion", "coaching_point"],
                    "description": "Tipo de patron a consultar"
                },
                "limite": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (default 10)"
                },
            },
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
        elif tool_name == "consultar_mejores_practicas":
            return _tool_mejores_practicas(tool_input)
        else:
            return json.dumps({"error": f"Herramienta desconocida: {tool_name}"})
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}")
        return json.dumps({"error": f"Error al ejecutar consulta: {str(e)}"})


def _tool_jugadores(supabase, params: dict) -> str:
    select_fields = (
        "id, nombre, apellidos, dorsal, posicion_principal, posicion_secundaria, "
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
    """Busca en la knowledge base usando busqueda hibrida (vector + texto + RRF) con fallbacks."""
    from app.config import get_settings

    # Get indexed documents for org
    docs = supabase.table("documentos_kb").select("id, titulo").eq(
        "organizacion_id", params["organizacion_id"]
    ).eq("estado", "indexado").execute()

    doc_ids = [d["id"] for d in docs.data]
    doc_map = {d["id"]: d["titulo"] for d in docs.data}

    if not doc_ids:
        return json.dumps({"mensaje": "No hay documentos indexados en la base de conocimiento", "resultados": []})

    limite = params.get("limite", 8)
    settings = get_settings()
    query_text = params["query"]

    # Try hybrid search (vector + text + RRF) first
    if settings.GEMINI_API_KEY:
        try:
            from app.services.embedding_service import generate_query_embedding
            query_embedding = generate_query_embedding(query_text)

            result = supabase.rpc("hybrid_search_kb", {
                "p_query_text": query_text,
                "p_query_embedding": query_embedding,
                "p_match_count": limite,
                "p_filter_doc_ids": doc_ids,
            }).execute()

            results = []
            for row in result.data:
                results.append({
                    "documento": doc_map.get(row["documento_id"], "?"),
                    "contenido": row["contenido"],
                    "score": round(row.get("rrf_score", 0), 4),
                })

            if results:
                return json.dumps({"resultados": results, "total": len(results), "metodo": "hybrid"}, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"KB hybrid search failed, trying vector-only: {e}")

            # Fallback to vector-only search
            try:
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
                    return json.dumps({"resultados": results, "total": len(results), "metodo": "vector"}, ensure_ascii=False)
            except Exception as e2:
                logger.warning(f"KB vector search also failed, falling back to text: {e2}")

    # Final fallback: text search (ILIKE)
    chunks = supabase.table("chunks_kb").select("*").in_(
        "documento_id", doc_ids
    ).ilike("contenido", f"%{query_text}%").limit(limite).execute()

    results = []
    for chunk in chunks.data:
        results.append({
            "documento": doc_map.get(chunk["documento_id"], "?"),
            "contenido": chunk["contenido"],
        })

    return json.dumps({"resultados": results, "total": len(results), "metodo": "text"}, ensure_ascii=False)


def _tool_convocatorias(supabase, params: dict) -> str:
    response = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal)"
    ).eq("partido_id", params["partido_id"]).order("titular", desc=True).execute()

    for c in response.data:
        c["jugador"] = c.pop("jugadores", None)

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_buscar_tareas(supabase, params: dict) -> str:
    """Busca tareas en la biblioteca de la organización."""
    query = supabase.table("tareas").select(
        "id, titulo, descripcion, duracion_total, num_jugadores_min, num_jugadores_max, "
        "num_porteros, fase_juego, principio_tactico, nivel_cognitivo, densidad, "
        "num_series, espacio_largo, espacio_ancho, estructura_equipos, "
        "reglas_tecnicas, reglas_tacticas, consignas_ofensivas, consignas_defensivas, categorias_tarea(codigo, nombre)"
    )

    # Query by organizacion_id (broad: all org tasks) or equipo_id (narrow)
    if params.get("organizacion_id"):
        query = query.eq("organizacion_id", params["organizacion_id"])
    elif params.get("equipo_id"):
        query = query.eq("equipo_id", params["equipo_id"])

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


def _tool_mejores_practicas(params: dict) -> str:
    """Consulta mejores practicas y patrones globales agregados."""
    try:
        from app.services.knowledge_aggregation_service import get_best_practices

        results = get_best_practices(
            match_day=params.get("match_day"),
            categoria=params.get("categoria"),
            tipo=params.get("tipo"),
            limite=params.get("limite", 10),
        )

        if not results:
            return json.dumps({"mensaje": "No hay datos de mejores practicas disponibles todavia.", "resultados": []})

        # Simplify output for Claude
        simplified = []
        for r in results:
            contenido = r.get("contenido", {})
            simplified.append({
                "tipo": r.get("tipo"),
                "match_day": r.get("match_day"),
                "categoria": r.get("categoria_codigo"),
                "descripcion": contenido.get("descripcion", ""),
                "confianza": r.get("confianza"),
                "frecuencia": r.get("frecuencia"),
            })

        return json.dumps({"resultados": simplified, "total": len(simplified)}, ensure_ascii=False, default=str)
    except Exception as e:
        logger.warning(f"Error querying best practices: {e}")
        return json.dumps({"mensaje": "Datos de mejores practicas no disponibles.", "resultados": []})


# ============ Claude Service ============

class ClaudeService:
    """Servicio para interactuar con Claude API con tool use (async)."""

    def __init__(self):
        self.client = _get_async_client()
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
        total_cache_read = 0
        total_cache_creation = 0

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

                response = await self.client.messages.create(**kwargs)

                total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

                # Track prompt caching stats
                usage = response.usage
                cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
                cache_creation = getattr(usage, "cache_creation_input_tokens", 0) or 0
                total_cache_read += cache_read
                total_cache_creation += cache_creation
                if cache_read or cache_creation:
                    logger.info(
                        f"Prompt cache: read={cache_read}, creation={cache_creation}, "
                        f"input={usage.input_tokens}, output={usage.output_tokens}"
                    )

            except anthropic.APIConnectionError as e:
                logger.error(f"Claude connection error in chat: {e}")
                raise ClaudeError("Error de conexion con Claude. Inténtalo de nuevo en unos segundos.")
            except anthropic.RateLimitError as e:
                logger.error(f"Claude rate limit in chat: {e}")
                raise ClaudeError("Claude está saturado. Espera unos segundos e inténtalo de nuevo.")
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

                        # Inject organizacion_id for KB search and buscar_tareas
                        if tool_name in ("buscar_knowledge_base", "buscar_tareas") and organizacion_id:
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
                    "cache_read_input_tokens": total_cache_read,
                    "cache_creation_input_tokens": total_cache_creation,
                    "modelo": self.model,
                    "herramientas_usadas": herramientas_usadas,
                }

        # If we hit max iterations, return what we have
        logger.warning("Claude hit max tool iterations")
        return {
            "respuesta": "He consultado mucha informacion. Dejame resumir lo que encontre.",
            "tokens_input": total_input_tokens,
            "tokens_output": total_output_tokens,
            "cache_read_input_tokens": total_cache_read,
            "cache_creation_input_tokens": total_cache_creation,
            "modelo": self.model,
            "herramientas_usadas": herramientas_usadas,
        }

    async def edit_task_with_ai(
        self,
        tarea: dict,
        instruccion: str,
        equipo_id: Optional[str] = None,
    ) -> dict:
        """
        Modifica una tarea de entrenamiento segun las instrucciones del usuario usando IA.

        Args:
            tarea: Datos actuales de la tarea (dict)
            instruccion: Instruccion del usuario (e.g. "Hazla mas intensa")
            equipo_id: ID del equipo (para contexto)

        Returns:
            dict con los campos modificados de la tarea
        """
        # Build a compact representation of the task
        task_fields = {
            k: tarea.get(k)
            for k in [
                "titulo", "descripcion", "duracion_total", "num_jugadores_min",
                "num_jugadores_max", "espacio_largo", "espacio_ancho",
                "reglas_tecnicas", "reglas_tacticas",
                "consignas_ofensivas", "consignas_defensivas",
                "errores_comunes", "variantes", "progresiones",
                "estructura_equipos", "material",
                "posicion_entrenador", "situacion_tactica",
            ]
            if tarea.get(k) is not None
        }

        system_prompt = [
            {
                "type": "text",
                "text": (
                    "Eres un asistente experto en metodologia de entrenamiento de futbol. "
                    "Tu tarea es modificar un ejercicio de entrenamiento segun la instruccion del usuario. "
                    "Responde SOLO con un JSON valido que contenga UNICAMENTE los campos que modificas. "
                    "Los campos posibles son: titulo, descripcion, duracion_total (int minutos), "
                    "num_jugadores_min (int), num_jugadores_max (int), espacio_largo (int metros), "
                    "espacio_ancho (int metros), reglas_tecnicas (str), reglas_tacticas (str), "
                    "consignas_ofensivas (str), consignas_defensivas (str), errores_comunes (str), "
                    "variantes (str), progresiones (str), estructura_equipos (str como '4v4+2'), "
                    "material (array str), posicion_entrenador (str), situacion_tactica (str). "
                    "NO incluyas campos que no cambias. NO incluyas explicaciones fuera del JSON."
                ),
                "cache_control": {"type": "ephemeral"},
            }
        ]

        user_message = (
            f"## Tarea actual\n```json\n{json.dumps(task_fields, ensure_ascii=False, indent=2)}\n```\n\n"
            f"## Instruccion\n{instruccion}"
        )

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )

            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text

            return self._parse_json_response(text)

        except anthropic.APIConnectionError as e:
            logger.error(f"Claude connection error in edit_task_with_ai: {e}")
            raise ClaudeError("Error de conexion con Claude. Inténtalo de nuevo en unos segundos.")
        except anthropic.RateLimitError as e:
            logger.error(f"Claude rate limit in edit_task_with_ai: {e}")
            raise ClaudeError("Claude está saturado. Espera unos segundos e inténtalo de nuevo.")
        except anthropic.APIError as e:
            logger.error(f"Claude API error in edit_task_with_ai: {e}")
            raise ClaudeError(f"Error al editar tarea con IA: {str(e)}")

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
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    },
                    {
                        "type": "text",
                        "text": "IMPORTANTE: Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown.",
                    },
                ],
                messages=[{"role": "user", "content": prompt}],
            )

            text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text += block.text

            return self._parse_json_response(text)

        except anthropic.APIConnectionError as e:
            logger.error(f"Claude connection error in session recommendations: {e}")
            raise ClaudeError("Error de conexion con Claude. Inténtalo de nuevo en unos segundos.")
        except anthropic.RateLimitError as e:
            logger.error(f"Claude rate limit in session recommendations: {e}")
            raise ClaudeError("Claude está saturado. Espera unos segundos e inténtalo de nuevo.")
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
    ) -> list[dict]:
        """Construye el system prompt con contexto del equipo.

        Returns a list of content blocks for prompt caching support.
        The static part uses cache_control for Anthropic prompt caching.
        """
        # Static block — cached across requests (saves ~90% on repeated calls)
        blocks = [
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            },
        ]

        # Dynamic block — changes per request, NOT cached
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
            blocks.append({
                "type": "text",
                "text": "\n".join(dynamic_parts),
            })

        return blocks

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
        # Build system prompt for session design with prompt caching
        system = [
            {
                "type": "text",
                "text": SYSTEM_PROMPT + SESSION_DESIGN_PROMPT,
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": f"## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
                + (f"\n- ID de la organizacion: {organizacion_id}" if organizacion_id else ""),
            },
        ]

        # Build messages
        messages = []
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            elif rol == "user":
                messages.append({"role": "user", "content": contenido})

        # Tools: only session design tools (proponer_sesion)
        # No team query tools — the AI should generate directly from user context
        tools = SESSION_DESIGN_TOOLS

        herramientas_usadas = []
        sesion_propuesta = None
        total_input_tokens = 0
        total_output_tokens = 0

        # Count user messages to decide if we should force tool use
        user_msg_count = sum(1 for m in messages if m.get("role") == "user")
        first_user_msg = messages[-1].get("content", "") if messages else ""
        first_msg_is_substantial = isinstance(first_user_msg, str) and len(first_user_msg) > 80

        max_iterations = 3
        for iteration in range(max_iterations):
            try:
                kwargs = {
                    "model": self.model,
                    "max_tokens": 16384,
                    "system": system,
                    "messages": messages,
                    "tools": tools,
                }

                # Force tool use on the first API call if user gave enough context
                if iteration == 0 and user_msg_count == 1 and first_msg_is_substantial:
                    kwargs["tool_choice"] = {"type": "tool", "name": "proponer_sesion"}
                    logger.info("Forcing proponer_sesion tool use (substantial first message)")

                response = await self.client.messages.create(**kwargs)

                total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

            except anthropic.APIConnectionError as e:
                cause = e.__cause__
                logger.error(
                    f"Claude connection error in session design: {e} | "
                    f"cause={type(cause).__name__}: {cause}" if cause else f"Claude connection error: {e}",
                    exc_info=True,
                )
                raise ClaudeError("Error de conexion con Claude. Inténtalo de nuevo en unos segundos.")
            except anthropic.RateLimitError as e:
                logger.error(f"Claude rate limit in session design: {e}")
                raise ClaudeError("Claude está saturado. Espera unos segundos e inténtalo de nuevo.")
            except anthropic.APIError as e:
                logger.error(f"Claude API error in session design: status={e.status_code} body={e.body}", exc_info=True)
                raise ClaudeError(f"Error de comunicacion con Claude: {str(e)}")

            logger.info(f"Session design iteration {iteration}: stop_reason={response.stop_reason}, "
                        f"content_types={[b.type for b in response.content]}, "
                        f"tokens_in={response.usage.input_tokens}, tokens_out={response.usage.output_tokens}")

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

                        # Unknown tool in session design — skip
                        logger.warning(f"Unexpected tool in session design: {tool_name}")
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": "Herramienta no disponible. Usa proponer_sesion para generar la sesión directamente.",
                        })
                        herramientas_usadas.append({"nombre": tool_name})

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

    # ============ Task Design Chat ============

    async def task_design_chat(
        self,
        mensajes: list[dict],
        equipo_id: str,
        organizacion_id: Optional[str] = None,
    ) -> dict:
        """
        Chat conversacional para diseñar UNA tarea individual con IA.

        Returns:
            dict con: respuesta, tarea_propuesta (si el AI la generó), herramientas_usadas
        """
        system = [
            {
                "type": "text",
                "text": SYSTEM_PROMPT + TASK_DESIGN_PROMPT,
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": f"## CONTEXTO ACTUAL\n- ID del equipo activo: {equipo_id}"
                + (f"\n- ID de la organizacion: {organizacion_id}" if organizacion_id else ""),
            },
        ]

        messages = []
        for msg in mensajes:
            rol = msg.get("rol", "user")
            contenido = msg.get("contenido", "")
            if rol == "assistant":
                messages.append({"role": "assistant", "content": contenido})
            elif rol == "user":
                messages.append({"role": "user", "content": contenido})

        tools = TASK_DESIGN_TOOLS

        herramientas_usadas = []
        tarea_propuesta = None
        total_input_tokens = 0
        total_output_tokens = 0

        # Decide if we should force tool use
        user_msg_count = sum(1 for m in messages if m.get("role") == "user")
        first_user_msg = messages[-1].get("content", "") if messages else ""
        first_msg_is_substantial = isinstance(first_user_msg, str) and len(first_user_msg) > 80

        max_iterations = 3
        for iteration in range(max_iterations):
            try:
                kwargs = {
                    "model": self.model,
                    "max_tokens": 8192,
                    "system": system,
                    "messages": messages,
                    "tools": tools,
                }

                # Force tool use on first call if user gave enough context
                if iteration == 0 and user_msg_count == 1 and first_msg_is_substantial:
                    kwargs["tool_choice"] = {"type": "tool", "name": "proponer_tarea"}
                    logger.info("Forcing proponer_tarea tool use (substantial first message)")

                response = await self.client.messages.create(**kwargs)

                total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

            except anthropic.APIConnectionError as e:
                logger.error(f"Claude connection error in task design: {e}")
                raise ClaudeError("Error de conexion con Claude. Inténtalo de nuevo en unos segundos.")
            except anthropic.RateLimitError as e:
                logger.error(f"Claude rate limit in task design: {e}")
                raise ClaudeError("Claude está saturado. Espera unos segundos e inténtalo de nuevo.")
            except anthropic.APIError as e:
                logger.error(f"Claude API error in task design: {e}")
                raise ClaudeError(f"Error de comunicacion con Claude: {str(e)}")

            logger.info(f"Task design iteration {iteration}: stop_reason={response.stop_reason}, "
                        f"content_types={[b.type for b in response.content]}, "
                        f"tokens_in={response.usage.input_tokens}, tokens_out={response.usage.output_tokens}")

            if response.stop_reason == "tool_use":
                assistant_content = response.content
                tool_results = []

                for block in assistant_content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_input = block.input

                        logger.info(f"Task design tool: {tool_name}")

                        if tool_name == "proponer_tarea":
                            tarea_propuesta = tool_input
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": "Tarea propuesta presentada al entrenador. Ahora resume brevemente lo que has propuesto y pregunta si quiere modificar algo.",
                            })
                            herramientas_usadas.append({"nombre": tool_name})
                            continue

                        logger.warning(f"Unexpected tool in task design: {tool_name}")
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": "Herramienta no disponible. Usa proponer_tarea para generar la tarea directamente.",
                        })
                        herramientas_usadas.append({"nombre": tool_name})

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
                    "tarea_propuesta": tarea_propuesta,
                    "tokens_input": total_input_tokens,
                    "tokens_output": total_output_tokens,
                    "herramientas_usadas": herramientas_usadas,
                }

        return {
            "respuesta": "He procesado mucha informacion. ¿Quieres que continue?",
            "tarea_propuesta": tarea_propuesta,
            "tokens_input": total_input_tokens,
            "tokens_output": total_output_tokens,
            "herramientas_usadas": herramientas_usadas,
        }
