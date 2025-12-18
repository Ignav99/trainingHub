-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTE 3 DE TAREAS (36-45)
-- ============================================================================
-- 10 tareas adicionales - Enfoque: Técnica individual, porteros, físico
-- ============================================================================

-- ============================================================================
-- JUEGO DE POSICIÓN (JDP) - 2 tareas adicionales
-- ============================================================================

-- JdP 4: Construcción 3-4-3
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, progresiones, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Construcción 10+POR vs 7 en 3-4-3', 'JDP-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    24, 4, 5, 1,
    65, 68, 'tres_cuartos_campo',
    18, 18, 1, '10+POR vs 7',
    'Trabajo posicional de construcción en estructura 3-4-3 (3 centrales, 2 interiores, 2 carrileros, 3 atacantes). 7 defensores presionan. Objetivo: progresar hasta zona de finalización.',
    'Portero con balón',
    'Balón en zona finalización, gol o robo con contraataque',
    '["Máximo 3 toques en zona 1", "2 toques en zona 2", "Libre en zona 3"]',
    '["Obligatorio salir en corto", "Carrileros deben recibir al menos 1 vez", "No balón largo hasta zona 2"]',
    'Llegar a zona 3 = 1 punto, Gol = 3 puntos',
    'ataque_organizado', 'Construcción en 3-4-3', 'Superioridad en salida', 'Pase entre líneas', 'Superar líneas de presión con estructura',
    'Baja-media intensidad', 60.6, 'baja', 120, 145,
    3,
    '["Central central como director", "Interiores escalonados", "Carrileros dar amplitud", "Extremos fijando"]',
    '["Pressing por zonas", "2-3 arriba, 4-3 escalonado", "Forzar error"]',
    '["Falta de escalonamiento", "Todos en línea", "No usar carrileros"]',
    '[{"nombre": "10+POR vs 6", "descripcion": "Menos presión", "dificultad": "-1"}, {"nombre": "10+POR vs 8", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["Salida básica → Con pressing medio → Con pressing alto → Real"]',
    '["Portería reglamentaria", "Conos zonas", "Petos 2 colores", "Balones x10"]',
    '["MD-3", "MD-2"]',
    'Movilidad postural, técnica en calma',
    'Paciencia, lectura táctica, calma bajo presión',
    true, true,
    '["construcción", "3-4-3", "posicional", "salida balón", "estructura", "táctico"]'
);

-- JdP 5: Juego Interior-Exterior
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    es_plantilla, es_publica, tags
) VALUES (
    'Juego Posicional Interior-Exterior 6v4', 'JDP-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    18, 5, 3, 0.5,
    25, 20, 'rectangular',
    10, 10, 0, '6v4 (2 interiores + 4 exteriores)',
    'Juego posicional con 2 jugadores fijos en interior y 4 en exterior del cuadrado. 4 defensores intentan robar. Los interiores trabajan recepción entre líneas y giros.',
    'Entrenador pasa a exterior',
    'Robo o secuencia completada',
    '["Exteriores 2 toques", "Interiores libre de toques"]',
    '["Obligatorio pasar por interior antes de completar secuencia", "Interior debe girar o hacer tercer hombre"]',
    'Secuencia exterior→interior→exterior del lado contrario = 1 punto',
    'ataque_organizado', 'Juego entre líneas', 'Recepción interior y giro', 'Control orientado y giro', 'Activar juego interior',
    'Media intensidad', 25, 'media', 140, 160,
    3,
    '["Movimiento interior para recibir", "Perfilarse antes del pase", "Giro rápido", "Tercer hombre si presionado"]',
    '["Cerrar interiores", "Pressing cuando balón va a interior", "Anticipar pase"]',
    '["Interior de espaldas estático", "No buscar al interior", "Pase predecible al interior"]',
    '[{"nombre": "7v4", "descripcion": "3 interiores", "dificultad": "-1"}, {"nombre": "6v5", "descripcion": "Un defensor más", "dificultad": "+1"}]',
    '["Conos x8", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    true, true,
    '["posicional", "interior", "giro", "entre líneas", "técnica", "recepción"]'
);

-- ============================================================================
-- SSG - 2 tareas adicionales
-- ============================================================================

-- SSG 4: Fútbol-Tenis
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Fútbol-Tenis 3v3 Competitivo', 'SSG-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    20, 3, 5, 2,
    12, 9, 'rectangular',
    6, 6, 0, '3v3',
    'Fútbol-tenis competitivo. El balón puede botar una vez máximo en cada campo. Máximo 3 toques por equipo antes de pasar. Trabaja control, volea y coordinación.',
    'Saque desde detrás de línea de fondo',
    'Punto cuando balón bota 2 veces o sale fuera en campo rival',
    '["Máximo 3 toques por equipo", "Máximo 1 bote en tu campo", "No usar manos"]',
    '["Alternarse en toques recomendado", "Colocación antes de devolver"]',
    'Set a 15 puntos, partido al mejor de 3 sets',
    'ataque_organizado', 'Técnica de volea', 'Control y volea', 'Precisión en devolución',
    'Baja-media intensidad', 18, 'media', 125, 150,
    2,
    '["Control con el pecho", "Preparar el golpeo", "Buscar zonas vacías", "Comunicación"]',
    '["Golpeo precipitado", "Falta de comunicación", "No preparar volea"]',
    '[{"nombre": "2v2", "descripcion": "Más espacio individual", "dificultad": "+1"}, {"nombre": "4v4", "descripcion": "Más colaboración", "dificultad": "="}, {"nombre": "Sin botes", "descripcion": "Mayor dificultad técnica", "dificultad": "+2"}]',
    '["Red/cinta altura 1m", "Conos x8", "Balones x6"]',
    '["MD-1", "MD+1"]',
    'Coordinación óculo-pédica, agilidad',
    'Competitividad, diversión, cohesión grupal',
    true, true,
    '["fútbol-tenis", "técnica", "volea", "control", "competición", "diversión"]'
);

-- SSG 5: Partido 4 Porterías
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido 4v4 con 4 Porterías', 'SSG-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    18, 4, 3.5, 1,
    35, 35, 'cuadrado',
    8, 8, 0, '4v4',
    'Partido 4v4 con 4 mini porterías (1 en cada lado del cuadrado). Cada equipo defiende 2 porterías (lados opuestos) y ataca las otras 2. Trabaja cambios de orientación y visión.',
    'Balón al aire',
    'Gol o tiempo',
    '["Defiende 2 porterías de lados opuestos", "Ataca las 2 porterías del rival", "Tras gol, reinicio rápido del equipo que recibió"]',
    'Gol = 1 punto',
    'ataque_organizado', 'Cambio de orientación', 'Atacar por sorpresa',
    'Alta intensidad', 76.6, 'alta', 160, 180,
    2,
    '["Mirar antes de recibir", "Cambiar de portería si está cerrada", "Atacar rápido tras robo"]',
    '["Vigilar las 2 porterías", "Comunicación constante", "Basculación rápida"]',
    '["Solo atacar una portería", "No vigilar las dos", "Precipitarse"]',
    '[{"nombre": "5v5", "descripcion": "Más jugadores", "dificultad": "="}, {"nombre": "3v3", "descripcion": "Más espacio individual", "dificultad": "+1"}]',
    '["Mini porterías x4", "Conos x8", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Resistencia con cambios de dirección',
    'Visión periférica, decisión rápida',
    true, true,
    '["4 porterías", "cambio orientación", "SSG", "visión", "intensidad"]'
);

-- ============================================================================
-- RONDOS (RND) - 2 tareas adicionales
-- ============================================================================

-- Rondo 6: Rondo en Rombo
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo en Rombo 4v2 con Pivote', 'RND-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    14, 5, 2, 0.75,
    14, 14, 'rombo',
    6, 6, 0, '4v2 en rombo',
    'Rondo con forma de rombo: 4 exteriores en las esquinas + 1 comodín en el centro. 2 defensores. El pivote central conecta todos los pases. Simula juego con mediapunta/pivote.',
    'Entrenador pasa a un vértice',
    'Robo o 12 pases',
    '["Exteriores 2 toques", "Pivote 1 toque"]',
    '["Obligatorio pasar por pivote cada 3 pases exteriores"]',
    '12 pases = 1 punto, Pase por pivote con continuidad = bonus',
    'ataque_organizado', 'Juego con pivote', 'Conexión a través del centro', 'Pase al pie y apoyo', 'Usar referencia central',
    'Media intensidad', 32.7, 'media', 140, 160,
    2,
    '["Orientarse hacia pivote", "Movimiento tras pase", "Pivote siempre ofrecido", "Tercer hombre"]',
    '["Cerrar pivote", "Pressing coordinado", "Anticipar pase al centro"]',
    '["No usar pivote", "Pivote estático", "Pases predecibles"]',
    '[{"nombre": "Sin pivote obligatorio", "descripcion": "Juego libre", "dificultad": "-1"}, {"nombre": "5v2 con pivote", "descripcion": "Mayor superioridad", "dificultad": "-1"}]',
    '["Conos forma rombo x4 + centro", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Agilidad, cambios de dirección',
    true, true,
    '["rondo", "rombo", "pivote", "mediapunta", "técnica", "posesión"]'
);

-- Rondo 7: Rondo con Comodín Exterior
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo 4v4+4 Comodines Exteriores', 'RND-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    18, 4, 3.5, 1,
    20, 20, 'cuadrado',
    12, 12, 0, '4v4+4',
    'Rondo 4v4 con 4 comodines exteriores (1 en cada lado). Los comodines siempre juegan con el equipo en posesión creando 8v4. Transición inmediata al robo.',
    'Entrenador pasa a un equipo',
    'Robo con 5 pases del nuevo equipo o tiempo',
    '["Comodines 1 toque obligatorio", "Equipo interior 2 toques"]',
    '["Comodines no pueden pasar entre ellos", "Transición inmediata al robo"]',
    '10 pases consecutivos = 1 punto, Robo = cambio de roles',
    'ataque_organizado', 'Superioridad perimetral', 'Uso de apoyo exterior', 'Pase y apoyo exterior', 'Circular con superioridad en banda',
    'Media-alta intensidad', 33.3, 'media', 150, 170,
    2,
    '["Usar comodines para progresar", "Circular rápido", "No abusar del mismo comodín", "Transición al robo"]',
    '["Pressing en 4 coordinado", "Cerrar líneas a comodines", "Anticipar y robar en transición"]',
    '["Solo usar comodines", "No circular", "Transición lenta"]',
    '[{"nombre": "3v3+4", "descripcion": "Menos interiores", "dificultad": "+1"}, {"nombre": "5v5+4", "descripcion": "Más interiores", "dificultad": "-1"}]',
    '["Conos x4", "Petos 3 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia intermitente, cambios dirección',
    'Concentración, adaptabilidad',
    true, true,
    '["rondo", "comodines", "superioridad", "transiciones", "intensidad"]'
);

-- ============================================================================
-- BALÓN PARADO (ABP) - 2 tareas adicionales
-- ============================================================================

-- ABP 5: Falta Directa
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, subprincipio_tactico, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Falta Directa - Zona Frontal', 'ABP-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    20, 12, 1.5, 0.5,
    25, 30, 'area_grande',
    8, 12, 1, 'Lanzadores + Barrera + POR',
    'Práctica de faltas directas desde diferentes distancias (18-25m). Con barrera reglamentaria. Trabajo de diferentes efectos: rosca, potencia, por encima, por debajo de barrera.',
    'Señal del entrenador',
    'Gol, parada o fuera',
    '["Barrera de 3-4 jugadores", "Alternar lanzadores", "Variar posición de falta"]',
    'ataque_organizado', 'Falta directa', 'Lanzamiento de falta', 'Marcar de falta directa',
    'Muy baja intensidad', 'baja', 90, 115,
    2,
    '["Elegir tipo de golpeo antes", "Carrera consistente", "Punto de golpeo preciso", "Seguir el balón tras golpeo"]',
    '["Cambiar decisión", "Golpeo inconsistente", "No apuntar a zona específica"]',
    '[{"nombre": "Sin barrera", "descripcion": "Solo portero", "dificultad": "-1"}, {"nombre": "Barrera + muro", "descripcion": "Añadir jugador saltando", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Maniquíes/jugadores barrera", "Conos marcas", "Balones x10"]',
    '["MD-2", "MD-1"]',
    'Concentración, rutina, confianza',
    true, true,
    '["ABP", "falta directa", "estrategia", "técnica", "golpeo", "especialista"]'
);

-- ABP 6: Saque de Esquina Defensivo
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, subprincipio_tactico, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Defensa de Córner - Sistema Mixto', 'ABP-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    20, 10, 1.5, 0.5,
    30, 40, 'area_grande',
    14, 18, 1, '7-9 defensores + POR vs 6-8 atacantes',
    'Defensa de córners con sistema mixto: 3 jugadores en zona (primer palo, punto penalti, segundo palo) + resto marcaje individual. Incluye salida en contraataque tras despeje.',
    'Señal visual del lanzador',
    'Despeje con salida o gol',
    '["3 en zona siempre", "Resto marcaje nominal", "Comunicación portero", "Primer despeje a banda", "Salida rápida si se despeja"]',
    'defensa_organizada', 'Defensa de córner', 'Sistema mixto', 'Evitar gol y salir rápido',
    'Baja intensidad con picos', 'baja', 105, 135,
    2,
    '["Zona siempre ocupada", "No perder marca", "Atacar el balón en despeje", "Comunicar quién va", "Primer despeje afuera"]',
    '["Dejar zona libre", "Perder marca", "Despeje al centro", "Chocar entre defensores"]',
    '[{"nombre": "Todo zonal", "descripcion": "8 en zona", "dificultad": "-1"}, {"nombre": "Todo individual", "descripcion": "Solo marcaje", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos posiciones zona", "Petos", "Balones x10"]',
    '["MD-1", "MD-2"]',
    'Concentración, comunicación, liderazgo',
    true, true,
    '["ABP", "córner", "defensa", "zona", "marcaje", "mixto"]'
);

-- ============================================================================
-- EVOLUCIONES (EVO) - 2 tareas adicionales
-- ============================================================================

-- EVO 6: Finalización Combinada Central
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, errores_comunes,
    variantes, progresiones, material, match_days_recomendados,
    es_plantilla, es_publica, tags
) VALUES (
    'Finalización por el Centro con Combinación', 'EVO-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    18, 10, 1.25, 0.5,
    40, 35, 'medio_campo',
    8, 10, 2, 'Mediapunta + 9 + Interiores + POR',
    'Automatismo de finalización por el centro: pared mediapunta-delantero, desdoblamiento de interior, asistencia y remate. Sin oposición primero, luego con defensores pasivos.',
    'Mediapunta con balón en zona 14',
    'Gol o parada',
    '["Secuencia: 10→9→10→Interior→9 remata", "Timing específico de desmarques"]',
    'ataque_organizado', 'Finalización central', 'Juego combinativo en zona 14', 'Pared y remate', 'Generar ocasión por el centro',
    'Media intensidad', 'media', 140, 160,
    2,
    '["Pared al primer toque", "Desmarque del 9 al espacio", "Interior apoyo para asistencia", "Remate colocado"]',
    '["Pared lenta", "Remate precipitado", "Mal timing de desmarque"]',
    '[{"nombre": "Con 1 defensor", "descripcion": "Oposición ligera", "dificultad": "+1"}, {"nombre": "Variante diagonal", "descripcion": "Diferente ángulo", "dificultad": "="}]',
    '["Sin oposición → 1 defensor pasivo → 2 defensores → Real"]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x12"]',
    '["MD-2", "MD-1"]',
    true, true,
    '["finalización", "centro", "combinación", "pared", "automatismo", "gol"]'
);

-- EVO 7: Movimientos Delantero Centro
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, errores_comunes,
    variantes, progresiones, material, match_days_recomendados,
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Movimientos del 9: Desmarque y Finalización', 'EVO-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    20, 10, 1.5, 0.5,
    45, 40, 'medio_campo',
    6, 8, 1, '9 + Extremos + Mediocentro + POR',
    'Trabajo específico de movimientos del delantero centro: apoyo-ruptura, diagonal al primer palo, arrastre para compañero, movimiento de engaño. Finalización tras cada movimiento.',
    'Mediocentro con balón',
    'Gol o fuera',
    '["4 tipos de movimiento a trabajar", "Cada serie un movimiento diferente", "Servicio variado (raso, aéreo, diagonal)"]',
    'ataque_organizado', 'Desmarque de ruptura', 'Movimientos de 9', 'Control y remate', 'Crear y aprovechar espacio',
    'Media-alta intensidad', 'media', 150, 170,
    2,
    '["Movimiento explosivo", "Comunicar al pasador", "Perfilarse para remate", "Atacar balón con convicción"]',
    '["Movimiento predecible", "No comunicar", "Mal timing", "Remate débil"]',
    '[{"nombre": "Con central pasivo", "descripcion": "Añadir marca", "dificultad": "+1"}, {"nombre": "Solo 2 movimientos", "descripcion": "Simplificar", "dificultad": "-1"}]',
    '["Sin oposición → Marca pasiva → Marca activa"]',
    '["Portería reglamentaria", "Conos posiciones", "Petos", "Balones x12"]',
    '["MD-2", "MD-1", "MD-4"]',
    'Explosividad, sprints cortos',
    true, true,
    '["movimientos", "delantero", "9", "desmarque", "finalización", "remate"]'
);

-- ============================================================================
-- FIN DEL LOTE 3 - 10 TAREAS ADICIONALES (36-45)
-- ============================================================================
-- Resumen Lote 3:
-- - 2 Juegos de Posición adicionales (JDP-004, 005) → Total JDP: 5
-- - 2 SSG adicionales (SSG-004, 005) → Total SSG: 5
-- - 2 Rondos adicionales (RND-006, 007) → Total RND: 7
-- - 2 ABP adicionales (ABP-005, 006) → Total ABP: 6
-- - 2 Evoluciones adicionales (EVO-006, 007) → Total EVO: 7
-- ============================================================================
-- TOTAL ACUMULADO: 45 tareas
-- ============================================================================
