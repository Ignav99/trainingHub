"""
TrainingHub Pro - Shared AI Prompts & Tool Schemas
All prompt constants and tool definitions used by both Claude and OpenAI-compatible services.
"""

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
9 categorias de tareas de futbol con su naturaleza y espacio recomendado (m²/jugador):
- RND (Rondo): conservacion, espacio reducido (~9 m²/jug)
- JDP (Juego de Posición): posesion posicional, espacio medio (~25 m²/jug)
- POS (Posesión): conservacion con objetivo, espacio medio-grande (~30 m²/jug)
- EVO (Evoluciones): acciones combinadas con finalizacion, espacio grande (~40 m²/jug)
- AVD (Ataque vs Defensa): situaciones reales de juego, espacio grande (~50 m²/jug)
- PCO (Partido Condicionado): partido con reglas modificadas, espacio grande (~60 m²/jug)
- ACO (Acciones Combinadas): acciones tecnico-tacticas, espacio medio (~20 m²/jug)
- SSG (Fútbol Reducido / Small-Sided Games): juego real reducido, espacio reducido (~15 m²/jug)
- ABP (Balón Parado): estrategia a balon parado, espacio especifico

## METODOLOGÍA: CATEGORÍAS COMPLEMENTARIAS (PREPARACIÓN FÍSICA)
También eres experto en preparación física y ciencias del deporte aplicadas al fútbol.
4 categorías complementarias para el preparador físico:
- GYM (Fuerza / Gimnasio): sentadillas, peso muerto, press, hip thrust, sentadilla búlgara. Trabajo de fuerza máxima, hipertrofia y potencia.
- PRV (Prevención de Lesiones): nórdicos, Copenhagen, FIFA 11+, propiocepción en bosu. Basado en evidencia científica.
- MOV (Movilidad / Flexibilidad): cadera 90/90, foam roller torácico, estiramientos dinámicos, yoga para futbolistas, liberación miofascial.
- RCF (Recuperación Física): circuito recuperación activa post-partido, baños de contraste, pool recovery.

Campos específicos de gym: grupo_muscular[] (ej: cuádriceps, isquiotibiales, glúteos, core), equipamiento[] (ej: barra olímpica, mancuernas, foam roller), tipo_contraccion (concentrica/excentrica/isometrica/pliometrica), zona_cuerpo (tren_superior/tren_inferior/core/full_body), objetivo_gym (fuerza_maxima/hipertrofia/potencia/resistencia_muscular/movilidad/activacion/recuperacion), series_repeticiones {series, repeticiones, descanso_seg, porcentaje_rm}.

## METODOLOGÍA: MATCH DAY Y CARGA
Relacion entre Match Day, tipo de carga y categorias recomendadas:
- MD+1 Recuperación: carga muy baja, espacios amplios sin oposicion. RND✓✓, ABP✓. Gym: RCF✓✓ (prioritario), MOV✓ (opcional). NO GYM.
- MD-4 Fuerza/Tensión: espacios reducidos, alta intensidad, cambios direccion. SSG✓✓, AVD✓✓, JDP✓✓. Gym: GYM✓✓ (fuerza máxima/potencia), PRV✓ (nórdicos).
- MD-3 Resistencia: espacios grandes, duraciones largas, esfuerzos continuos. POS✓✓, PCO✓✓, AVD✓✓. Gym: GYM✓ (carga moderada), PRV✓ (Copenhagen).
- MD-2 Velocidad: tiempos cortos, alta velocidad, poca densidad. EVO✓✓. Gym: MOV✓✓ + PRV✓ (activación). No GYM pesado.
- MD-1 Activación: carga baja, repaso tactico, automatismos. RND✓✓, ABP✓✓. Gym: MOV✓ (activación ligera). NO GYM.
- MD Partido: No gym, no prevención. Solo competición.

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


# ============ Diagram Generation Prompt ============

DIAGRAM_GENERATION_PROMPT = """You are an expert football training diagram generator.
Given a training exercise description, generate a JSON diagram representing the exercise on a pitch.

## Output format
Return ONLY valid JSON (no markdown, no explanation), with this structure:
{
  "pitchType": "full" | "half" | "quarter" | "green",
  "elements": [...],
  "arrows": [...],
  "zones": [...]
}

## Pitch types
- "full": Full pitch (1050x680) — for match simulations, 11v11, large games
- "half": Half pitch (525x680) — for attacking/defending exercises, finishing drills
- "quarter": Quarter pitch (525x340) — for small-sided games, rondos, possession
- "green": Plain grass (1050x680) — for fitness, activation, generic exercises

## Elements (players, cones, balls)
Each element: {"type": "player"|"opponent"|"player_gk"|"cone"|"ball", "x": number, "y": number, "color": "#hex", "label": "text"}
- Player colors: "#3B82F6" (team1/black), "#EF4444" (team2/white/opponent), "#F59E0B" (neutral/comodin), "#22C55E" (goalkeeper)
- Labels: short (1-3 chars) — position abbreviations or numbers
- Coordinates must be within the pitch viewbox boundaries (with ~25px margin)

## Arrows (movements, passes)
Each arrow: {"from": {"x": n, "y": n}, "to": {"x": n, "y": n}, "color": "#hex", "type": "movement"|"pass"}
- "movement" = solid line (player runs), "pass" = dashed line (ball movement)
- Color: "#FFFFFF" for generic, "#2ecc71" for attacking runs, "#e74c3c" for defensive

## Zones (highlighted areas)
Each zone: {"x": n, "y": n, "width": n, "height": n, "color": "rgba(r,g,b,0.08)", "label": "text"}
- Use sparingly — only for key tactical zones

## Rules
1. Place players in realistic positions for the described exercise
2. Use 4-8 players minimum to make diagrams meaningful
3. Include at least 2-3 arrows showing the main movement patterns
4. Choose pitchType based on exercise category and space requirements
5. Keep it clean and readable — don't overcrowd"""


# ============ Task Design Prompt & Tools ============

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
- SIEMPRE genera grafico_data con el diagrama tactico del ejercicio
- Si el entrenador pide modificaciones ("hazla más grande", "añade variante"), llama a `proponer_tarea` con la versión modificada completa
- Si el equipo tiene modelo de juego definido, alinea el ejercicio con sus principios
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
                    "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP", "GYM", "PRV", "MOV", "RCF"],
                    "description": "Categoría de la tarea (incluye categorías complementarias de gym/preparación física)",
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
                    "description": "Dimensiones del espacio. Ej: '30x20m', '40x30m'. Para gym, puede ser 'gimnasio' o 'sala fitness'.",
                },
                "num_jugadores": {
                    "type": "string",
                    "description": "Ej: '16', '16+2GK', '10-14'. Para gym individual: '1-4'.",
                },
                "estructura_equipos": {
                    "type": "string",
                    "description": "Ej: '4v4+2 comodines', '8v8', '5v5+GK'",
                },
                "fase_juego": {
                    "type": "string",
                    "enum": ["ataque_organizado", "defensa_organizada", "transicion_ataque_defensa", "transicion_defensa_ataque", "balon_parado_ofensivo", "balon_parado_defensivo"],
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
                "grafico_data": {
                    "type": "object",
                    "description": "Diagrama táctico del ejercicio con pitchType, elements, arrows, zones. Formato igual que en proponer_sesion.",
                },
                # Campos específicos de preparación física (solo para GYM/PRV/MOV/RCF)
                "grupo_muscular": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Grupos musculares trabajados. Ej: ['cuádriceps','glúteos','isquiotibiales']. Solo para categorías GYM/PRV/MOV/RCF.",
                },
                "equipamiento": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Equipamiento necesario. Ej: ['barra olímpica','mancuernas','foam roller']. Solo para GYM/PRV/MOV/RCF.",
                },
                "tipo_contraccion": {
                    "type": "string",
                    "enum": ["concentrica", "excentrica", "isometrica", "pliometrica"],
                    "description": "Tipo de contracción muscular principal. Solo para GYM/PRV/MOV/RCF.",
                },
                "zona_cuerpo": {
                    "type": "string",
                    "enum": ["tren_superior", "tren_inferior", "core", "full_body"],
                    "description": "Zona corporal principal. Solo para GYM/PRV/MOV/RCF.",
                },
                "objetivo_gym": {
                    "type": "string",
                    "enum": ["fuerza_maxima", "hipertrofia", "potencia", "resistencia_muscular", "movilidad", "activacion", "recuperacion"],
                    "description": "Objetivo del ejercicio de preparación física. Solo para GYM/PRV/MOV/RCF.",
                },
                "series_repeticiones": {
                    "type": "object",
                    "properties": {
                        "series": {"type": "integer"},
                        "repeticiones": {"type": "string"},
                        "descanso_seg": {"type": "integer"},
                        "porcentaje_rm": {"type": "integer"},
                    },
                    "description": "Estructura de series y repeticiones. Solo para GYM/PRV/MOV/RCF.",
                },
                "protocolo_progresion": {
                    "type": "string",
                    "description": "Notas sobre progresión del ejercicio a lo largo de semanas. Solo para GYM/PRV/MOV/RCF.",
                },
            },
            "required": [
                "titulo", "descripcion", "categoria_codigo", "duracion_total",
                "num_jugadores", "reglas", "coaching_points", "grafico_data",
            ],
        },
    },
]


# ============ GK Training Design Prompt & Tools ============

GK_DESIGN_PROMPT = """
## MODO: DISEÑO DE EJERCICIO DE PORTERO

Eres un experto entrenador de porteros de fútbol. Diseñas ejercicios específicos
para porteros adaptados al contexto de la sesión. Considera:
- El día de la semana respecto al partido (matchday)
- La intensidad objetivo de la sesión
- El número de porteros disponibles
- Progresión lógica de los ejercicios (calentamiento → técnica → táctica → juego)

### INSTRUCCIÓN CRÍTICA
Cuando el entrenador describe un ejercicio con suficiente detalle, DEBES llamar a la herramienta `proponer_tarea_portero` INMEDIATAMENTE.

### TIPOS DE EJERCICIO
- calentamiento: Movilidad, activación, coordinación
- tecnica: Blocaje, despeje, pase, 1v1, salidas
- tactica: Posicionamiento, comunicación, juego de pies, salidas
- juego: Situaciones reales, partidos reducidos con énfasis GK
- recuperacion: Ejercicios de baja intensidad, flexibilidad

### REGLAS
- Diseña UN solo ejercicio, no una sesión completa
- Propón ejercicios concretos con organización, variantes y puntos clave
- Si falta el número de porteros: asume 2
- Incluye siempre coaching points específicos para porteros
"""

GK_DESIGN_TOOLS = [
    {
        "name": "proponer_tarea_portero",
        "description": "Propone un ejercicio de entrenamiento para porteros. DEBES usar esta herramienta siempre que tengas suficiente contexto.",
        "input_schema": {
            "type": "object",
            "properties": {
                "nombre": {
                    "type": "string",
                    "description": "Nombre descriptivo del ejercicio",
                },
                "descripcion": {
                    "type": "string",
                    "description": "Descripción detallada: organización, dinámica, desarrollo del ejercicio, variantes",
                },
                "duracion": {
                    "type": "integer",
                    "description": "Duración en minutos",
                },
                "intensidad": {
                    "type": "string",
                    "enum": ["alta", "media", "baja"],
                    "description": "Intensidad del ejercicio",
                },
                "tipo": {
                    "type": "string",
                    "enum": ["calentamiento", "tecnica", "tactica", "juego", "recuperacion"],
                    "description": "Tipo de ejercicio",
                },
                "coaching_points": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Puntos clave para el entrenador de porteros (3-5)",
                },
                "material_necesario": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Material necesario",
                },
                "variantes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "1-3 variantes o progresiones",
                },
            },
            "required": ["nombre", "descripcion", "duracion", "intensidad", "tipo"],
        },
    },
]


# ============ Pre-Match Report Prompt & Tools ============

PRE_MATCH_REPORT_PROMPT = """

## MODO: INFORME PRE-PARTIDO / PLAN DE PARTIDO

### TU ROL
Eres un analista táctico profesional de fútbol. Recibes datos reales del rival (clasificación, goleadores, once probable, tarjetas, resultados, head-to-head) y las observaciones del entrenador para generar análisis tácticos de nivel profesional.

### INSTRUCCIÓN CRÍTICA
- Cuando el entrenador pide un INFORME DEL RIVAL → usa la herramienta `generar_informe_rival`
- Cuando el entrenador pide un PLAN DE PARTIDO → usa la herramienta `generar_plan_partido`
- USA la herramienta INMEDIATAMENTE cuando tengas contexto suficiente. NO respondas solo con texto.
- Si el entrenador da observaciones generales, redáctalas en lenguaje táctico profesional.
- Aprovecha TODOS los datos del rival que se proporcionan en el contexto.

### ESTILO
- Terminología futbolística profesional española
- Análisis concreto, no genérico — referencia datos reales del contexto
- Secciones claras y bien estructuradas
- Si no hay datos suficientes para una sección, indica qué información faltaría
"""

PRE_MATCH_TOOLS = [
    {
        "name": "generar_informe_rival",
        "description": "Genera un informe táctico profesional del rival. DEBES usar esta herramienta cuando el entrenador pida un informe del rival.",
        "input_schema": {
            "type": "object",
            "properties": {
                "resumen_general": {
                    "type": "string",
                    "description": "Resumen ejecutivo del rival: sistema, estilo, estado de forma, contexto"
                },
                "fase_ofensiva": {
                    "type": "object",
                    "properties": {
                        "salida_balon": {"type": "string", "description": "Cómo construye desde atrás"},
                        "construccion": {"type": "string", "description": "Fase de elaboración/progresión"},
                        "finalizacion": {"type": "string", "description": "Cómo llega al gol, patrones de ataque"}
                    },
                    "required": ["salida_balon", "construccion", "finalizacion"]
                },
                "fase_defensiva": {
                    "type": "object",
                    "properties": {
                        "pressing": {"type": "string", "description": "Pressing alto: intensidad, gatillos, coordinación"},
                        "bloque_medio": {"type": "string", "description": "Organización en bloque medio"},
                        "bloque_bajo": {"type": "string", "description": "Defensa posicional baja"}
                    },
                    "required": ["pressing", "bloque_medio", "bloque_bajo"]
                },
                "transiciones": {
                    "type": "object",
                    "properties": {
                        "ofensiva": {"type": "string", "description": "Transición defensa-ataque: velocidad, patrón"},
                        "defensiva": {"type": "string", "description": "Transición ataque-defensa: repliegue, contra-pressing"}
                    },
                    "required": ["ofensiva", "defensiva"]
                },
                "balon_parado": {
                    "type": "object",
                    "properties": {
                        "atacando": {"type": "string", "description": "ABP ofensivo: corners, faltas, penaltis"},
                        "defendiendo": {"type": "string", "description": "ABP defensivo: organización, marcajes"}
                    }
                },
                "jugadores_clave": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "nombre": {"type": "string"},
                            "posicion": {"type": "string"},
                            "analisis": {"type": "string", "description": "Análisis del jugador: fortalezas, debilidades, tendencias"},
                            "tipo": {"type": "string", "enum": ["peligroso", "debilidad"]}
                        },
                        "required": ["nombre", "posicion", "analisis", "tipo"]
                    },
                    "description": "Jugadores clave del rival (peligrosos y debilidades)"
                },
                "debilidades_explotables": {
                    "type": "string",
                    "description": "Resumen de debilidades que nuestro equipo puede explotar"
                }
            },
            "required": ["resumen_general", "fase_ofensiva", "fase_defensiva", "transiciones", "jugadores_clave", "debilidades_explotables"]
        }
    },
    {
        "name": "generar_plan_partido",
        "description": "Genera un plan de partido profesional para nuestro equipo. DEBES usar esta herramienta cuando el entrenador pida un plan de partido.",
        "input_schema": {
            "type": "object",
            "properties": {
                "enfoque_general": {
                    "type": "string",
                    "description": "Enfoque táctico general: idea de juego, objetivo principal"
                },
                "plan_ofensivo": {
                    "type": "object",
                    "properties": {
                        "principios": {"type": "string", "description": "Principios ofensivos clave"},
                        "salida_balon": {"type": "string", "description": "Plan de salida de balón ante el pressing rival"},
                        "construccion": {"type": "string", "description": "Fase de elaboración y progresión"},
                        "finalizacion": {"type": "string", "description": "Plan para llegar al gol"}
                    },
                    "required": ["principios", "salida_balon", "construccion", "finalizacion"]
                },
                "plan_defensivo": {
                    "type": "object",
                    "properties": {
                        "principios": {"type": "string", "description": "Principios defensivos clave"},
                        "pressing": {"type": "string", "description": "Plan de pressing: intensidad, gatillos, zonas"},
                        "organizacion_defensiva": {"type": "string", "description": "Organización defensiva: bloque, basculaciones"}
                    },
                    "required": ["principios", "pressing", "organizacion_defensiva"]
                },
                "transiciones": {
                    "type": "object",
                    "properties": {
                        "ofensiva": {"type": "string", "description": "Plan en transiciones defensa-ataque"},
                        "defensiva": {"type": "string", "description": "Plan en transiciones ataque-defensa"}
                    },
                    "required": ["ofensiva", "defensiva"]
                },
                "balon_parado": {
                    "type": "object",
                    "properties": {
                        "atacando": {"type": "string", "description": "Estrategia ABP ofensivo"},
                        "defendiendo": {"type": "string", "description": "Estrategia ABP defensivo"}
                    }
                },
                "plan_sustituciones": {
                    "type": "string",
                    "description": "Plan de sustituciones: cuándo, quién, qué cambia"
                },
                "claves_del_partido": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "3-5 claves/mensajes del partido para el vestuario"
                }
            },
            "required": ["enfoque_general", "plan_ofensivo", "plan_defensivo", "transiciones", "claves_del_partido"]
        }
    }
]


# ============ Session Design Prompt & Tools ============

SESSION_DESIGN_PROMPT = """

## MODO: DISEÑO DE SESIÓN

### INSTRUCCIÓN CRÍTICA
SIEMPRE que el entrenador pida una sesión, describa cambios, o quiera modificar algo, DEBES llamar a la herramienta `proponer_sesion` con la sesión COMPLETA actualizada. NO respondas solo con texto. USA LA HERRAMIENTA SIEMPRE.

Esto incluye:
- Primera petición → llama a `proponer_sesion`
- "Cambia el ejercicio de desarrollo_1" → llama a `proponer_sesion` con TODA la sesión, modificando solo lo pedido
- "Hazla más intensa" → llama a `proponer_sesion` con la sesión ajustada
- "Regenera" → llama a `proponer_sesion` con una sesión nueva
- Cualquier modificación → llama a `proponer_sesion` con la versión actualizada completa

La ÚNICA vez que NO debes llamar a la herramienta es cuando el entrenador hace una pregunta informativa sin pedir cambios.

### FLUJO
1. El entrenador describe lo que necesita → PRIMERO busca en la biblioteca con `buscar_tareas_biblioteca` para cada fase, LUEGO llama a `proponer_sesion`.
2. El entrenador pide cambios → TÚ llamas a `proponer_sesion` con la sesión completa actualizada (mantén lo que no cambia, modifica solo lo pedido).
3. Si falta el número de jugadores: asume 18 (16 + 2 GK). Si falta match_day: asume MD-3.
4. Para CADA fase, busca primero en la biblioteca con `buscar_tareas_biblioteca`.
   - Relevancia >= 70% → proponla como tarea existente (incluye tarea_id en la fase).
   - Relevancia 50-69% → proponla adaptada (incluye tarea_id + describe adaptaciones en la descripción).
   - Relevancia < 50% → crea tarea nueva (sin tarea_id).
5. No hay límite de iteraciones. El entrenador puede pedir cambios INFINITAS veces hasta estar satisfecho.

### REGLAS DEL DISEÑO
- 4 fases obligatorias: activacion (10-15min), desarrollo_1 (15-25min), desarrollo_2 (20-30min), vuelta_calma (5-10min)
- Respeta la metodología de Match Day
- Si el entrenador describe ejercicios concretos, úsalos tal cual
- Si da contexto táctico, diseña ejercicios coherentes
- Consulta el MODELO DE JUEGO del equipo para alinear cada ejercicio con los principios del entrenador

### CAMPOS PRINCIPALES DE CADA FASE
Obligatorios: fase, duracion, titulo, descripcion, categoria, coaching_points, razon
Opcionales pero recomendados: reglas, num_jugadores, estructura_equipos, espacio, densidad, nivel_cognitivo, fase_juego, principio_tactico, variantes, material_necesario

### DIAGRAMA TÁCTICO (grafico_data) — OBLIGATORIO
SIEMPRE genera grafico_data para cada tarea/fase con el diagrama del ejercicio.
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


SESSION_DESIGN_TOOLS = [
    {
        "name": "buscar_tareas_biblioteca",
        "description": "Busca tareas existentes en la biblioteca del club antes de proponer una sesion. Usa esto para reutilizar ejercicios que ya existen. Prioriza buscar por principio_tactico y fase_juego que coincidan con el modelo de juego del equipo.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Busqueda semantica en lenguaje natural. Ej: 'rondo de conservacion con superioridad', 'juego de posicion 4v4+3'"
                },
                "categoria": {
                    "type": "string",
                    "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP", "GYM", "PRV", "MOV", "RCF"],
                    "description": "Filtrar por categoria de tarea"
                },
                "fase_juego": {
                    "type": "string",
                    "description": "Filtrar por fase de juego"
                },
                "limite": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (default 5)"
                },
            },
            "required": ["query"],
        },
    },
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
                            "tarea_id": {
                                "type": "string",
                                "description": "UUID de tarea existente de la biblioteca para reutilizar. Vacío o ausente = crear nueva tarea."
                            },
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
                                "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP", "GYM", "PRV", "MOV", "RCF"],
                                "description": "Categoría de la tarea (incluye gym/preparación física)"
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
                        "required": ["fase", "duracion", "titulo", "descripcion", "categoria", "coaching_points", "razon", "grafico_data"],
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


# ============ Chat Tools (data query) ============

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
        "description": "Busca ejercicios en la biblioteca de la organizacion. Soporta busqueda semantica con 'query' (lenguaje natural) o filtros por categoria/fase_juego/busqueda.",
        "input_schema": {
            "type": "object",
            "properties": {
                "organizacion_id": {
                    "type": "string",
                    "description": "ID de la organizacion"
                },
                "query": {
                    "type": "string",
                    "description": "Busqueda semantica en lenguaje natural. Ej: 'rondos de conservacion con superioridad numerica'"
                },
                "categoria": {
                    "type": "string",
                    "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP", "GYM", "PRV", "MOV", "RCF"],
                    "description": "Codigo de categoria de tarea (incluye gym/preparación física)"
                },
                "fase_juego": {
                    "type": "string",
                    "description": "Fase de juego a filtrar"
                },
                "busqueda": {
                    "type": "string",
                    "description": "Texto libre para buscar en titulos de tareas (keyword search)"
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
                    "enum": ["RND", "JDP", "POS", "EVO", "AVD", "PCO", "ACO", "SSG", "ABP", "GYM", "PRV", "MOV", "RCF"],
                    "description": "Filtrar por categoria de tarea (incluye gym/preparación física)"
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
