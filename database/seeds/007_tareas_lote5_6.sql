-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTES 5-6 DE TAREAS (56-75)
-- ============================================================================
-- 20 tareas adicionales - Enfoque: Porteros, especialización, situaciones reales
-- ============================================================================

-- ============================================================================
-- JUEGO DE POSICIÓN (JDP) - 4 tareas adicionales
-- ============================================================================

-- JdP 6: Construcción contra Pressing Alto
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
    'Superación Pressing Alto 5+POR vs 5', 'JDP-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    18, 6, 2.5, 0.75,
    40, 50, 'rectangular',
    11, 11, 1, '5+POR vs 5',
    'Trabajo de superación de pressing alto. Línea de 4 + pivote + portero contra 5 presionadores intensos. Objetivo: superar pressing y llegar a zona segura en máximo 8 segundos.',
    'Portero con balón',
    'Balón en zona segura o robo',
    '["8 segundos máximo para superar", "Portero puede salir a jugar"]',
    '["Pressing gatillo: cuando portero toca balón", "Si robo, gol en mini portería"]',
    'Superar pressing = 1 punto, Robo + gol = 2 puntos',
    'ataque_organizado', 'Salida bajo presión', 'Superación de pressing alto', 'Control bajo presión', 'Salir jugando contra pressing',
    'Alta intensidad', 36.4, 'alta', 155, 175,
    3,
    '["Portero leer y decidir rápido", "Opciones cortas y largas", "Pivote ofrecerse", "Desdobles laterales"]',
    '["Pressing agresivo y coordinado", "Cerrar portero", "Anticipar pases"]',
    '["Portero indeciso", "No ofrecer líneas", "Pressing descoordinado"]',
    '[{"nombre": "5+POR vs 4", "descripcion": "Menos presión", "dificultad": "-1"}, {"nombre": "5+POR vs 6", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Mini portería x1", "Conos zona segura", "Petos", "Balones x8"]',
    '["MD-3", "MD-2"]',
    true, true,
    '["pressing alto", "salida balón", "portero", "superación", "intensidad"]'
);

-- JdP 7: Creación desde Mediocampo
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Creación en Zona 14: 7v5+POR', 'JDP-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    20, 5, 3.5, 0.75,
    40, 45, 'zona_14',
    13, 13, 1, '7v5+POR',
    'Trabajo de creación de ocasiones desde zona 14 (mediapunta). 7 atacantes (2 extremos, 2 interiores, 2 delanteros, 1 mediapunta) vs 5 defensores + POR. Énfasis en última decisión.',
    'Mediapunta recibe de espaldas',
    'Gol, fuera o robo controlado',
    '["Empezar siempre con balón en mediapunta", "Mediapunta decide: girar, pared, asistencia"]',
    'Gol = 2 puntos, Ocasión clara = 1 punto',
    'ataque_organizado', 'Creación de ocasiones', 'Juego en zona 14', 'Asistencia y finalización', 'Generar gol desde zona 14',
    'Media intensidad', 46.2, 'media', 145, 165,
    3,
    '["Mediapunta: leer y decidir", "Movimientos de ruptura sincronizados", "Paredes rápidas", "Finalización primer toque"]',
    '["Cerrar mediapunta", "Anticipar pases al área", "No dejar girar"]',
    '["Mediapunta predecible", "Falta de movimiento atacantes", "Remate precipitado"]',
    '[{"nombre": "7v4", "descripcion": "Menos defensores", "dificultad": "-1"}, {"nombre": "7v6", "descripcion": "Más defensores", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos zona 14", "Petos 2 colores", "Balones x10"]',
    '["MD-2", "MD-3"]',
    'Creatividad, visión, decisión bajo presión',
    true, true,
    '["zona 14", "creación", "mediapunta", "finalización", "asistencia", "táctico"]'
);

-- JdP 8: Juego Posicional 4-2-3-1
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    es_plantilla, es_publica, tags
) VALUES (
    'Juego Posicional 10+POR vs 8 en 4-2-3-1', 'JDP-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    24, 4, 5, 1,
    60, 55, 'tres_cuartos_campo',
    19, 19, 1, '10+POR vs 8',
    'Trabajo posicional completo en estructura 4-2-3-1. 10 jugadores de campo + POR contra 8 defensores. Énfasis en ocupación de zonas, rotaciones y progresión ordenada.',
    'Portero con balón',
    'Llegada a zona de finalización, gol o robo',
    '["2 toques en zona defensiva", "3 toques en zona media", "Libre en ataque"]',
    '["Rotaciones permitidas manteniendo estructura", "Obligatorio progresión escalonada"]',
    'Gol = 3 puntos, Llegada a zona finalización = 1 punto',
    'ataque_organizado', 'Juego posicional 4-2-3-1', 'Estructura y rotaciones', 'Progresar con estructura',
    'Media intensidad', 52.4, 'media', 140, 160,
    3,
    '["Doble pivote escalonado", "Extremos dar amplitud", "10 entre líneas", "9 fijar centrales"]',
    '["Pressing escalonado", "Cerrar líneas de pase al 10", "Basculación"]',
    '["Perder estructura", "Amontonarse", "No usar amplitud", "10 muy alejado"]',
    '[{"nombre": "10+POR vs 7", "descripcion": "Menos presión", "dificultad": "-1"}, {"nombre": "10+POR vs 9", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos zonas x12", "Petos 2 colores", "Balones x10"]',
    '["MD-3", "MD-2"]',
    true, true,
    '["posicional", "4-2-3-1", "estructura", "rotaciones", "progresión", "táctico"]'
);

-- JdP 9: Juego Posicional 3-5-2
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    es_plantilla, es_publica, tags
) VALUES (
    'Construcción y Progresión 3-5-2', 'JDP-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1,
    55, 60, 'tres_cuartos_campo',
    17, 17, 1, '10+POR vs 6',
    'Trabajo de construcción en sistema 3-5-2 (3 centrales, 2 carrileros, 3 medios, 2 puntas) contra 6 presionadores. Énfasis en superioridad en salida y uso de carrileros.',
    'Central central con balón',
    'Pase al delantero de cara o gol',
    '["Carrileros obligatorio participar en construcción", "Al menos 1 punta debe bajar a recibir"]',
    'Pase a delantero de cara = 1 punto, Gol = 2 puntos',
    'ataque_organizado', 'Construcción 3-5-2', 'Superioridad con 3 centrales', 'Construir con sistema 3-5-2',
    'Baja-media intensidad', 52.9, 'baja', 125, 145,
    3,
    '["3 centrales para superioridad", "Carrileros amplitud", "Medios escalonados", "Puntas asociarse"]',
    '["2 puntas presionan centrales", "Cerrar carrileros", "Mediocampistas zona central"]',
    '["No usar centrales anchos", "Carrileros bajos", "Puntas no bajan"]',
    '[{"nombre": "10+POR vs 5", "descripcion": "Menos presión", "dificultad": "-1"}, {"nombre": "10+POR vs 7", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Petos 2 colores", "Balones x10"]',
    '["MD-3", "MD-2"]',
    true, true,
    '["3-5-2", "construcción", "carrileros", "posicional", "estructura"]'
);

-- ============================================================================
-- EVOLUCIONES (EVO) - 4 tareas adicionales
-- ============================================================================

-- EVO 8: Centro-Remate desde Banda
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, errores_comunes,
    variantes, progresiones, material, match_days_recomendados,
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Centro y Remate: Trabajo de Área', 'EVO-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    20, 12, 1.25, 0.5,
    40, 50, 'area_grande',
    8, 12, 2, 'Centrador + Atacantes + POR',
    'Trabajo específico de centro y remate. Extremo centra desde diferentes posiciones (línea de fondo, recortado, frontal). 3-4 atacantes rematan con llegadas escalonadas.',
    'Extremo conduce hacia línea de fondo',
    'Gol o despeje/parada',
    '["Alternar lado de centro", "Variar tipo de centro (raso, medio, al segundo)", "Atacantes con llegadas diferenciadas"]',
    'ataque_organizado', 'Centro al área', 'Centro y remate', 'Generar gol de centro',
    'Media intensidad', 'media', 140, 160,
    2,
    '["Ataque al primer palo", "Llegada al segundo", "Vigilar rechace", "Timing de carrera"]',
    '["Centro malo", "Llegar tarde", "Todos al mismo sitio", "No atacar rechace"]',
    '[{"nombre": "Con defensor", "descripcion": "Añadir marcador en área", "dificultad": "+1"}, {"nombre": "Centro fijo", "descripcion": "Solo un tipo de centro", "dificultad": "-1"}]',
    '["Sin oposición → 1 defensor → 2 defensores → 4 defensores"]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x15"]',
    '["MD-2", "MD-1"]',
    'Salto, coordinación, sprints cortos',
    true, true,
    '["centro", "remate", "área", "finalización", "extremo", "llegadas"]'
);

-- EVO 9: Progresión con Terceros
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    es_plantilla, es_publica, tags
) VALUES (
    'Tercer Hombre: Progresión Escalonada', 'EVO-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    16, 8, 1.5, 0.5,
    50, 40, 'medio_campo',
    9, 12, 1, 'Grupos de 3 + POR',
    'Trabajo de concepto "tercer hombre". Grupos de 3 jugadores progresan con combinaciones obligatorias de terceros. A→B→C→finalización. Sin oposición para automatizar.',
    'Primer jugador con balón en zona inicial',
    'Gol o pérdida',
    '["Obligatorio tercer hombre en cada combinación", "Mínimo 3 combinaciones antes de finalizar"]',
    'Gol con 3+ terceros = 2 puntos, Gol con menos = 1 punto',
    'ataque_organizado', 'Tercer hombre', 'Progresión con terceros', 'Pase y desmarque de apoyo', 'Automatizar combinación de terceros',
    'Media intensidad', 'media', 140, 160,
    2,
    '["Timing de carrera del tercero", "Perfilarse para continuar", "Pase al primer toque"]',
    '["No ofrecer el tercero", "Pase directo sin tercero", "Mal timing"]',
    '[{"nombre": "Con oposición pasiva", "descripcion": "Añadir defensores", "dificultad": "+1"}, {"nombre": "2 combinaciones", "descripcion": "Menos exigencia", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x10"]',
    '["MD-3", "MD-2"]',
    true, true,
    '["tercer hombre", "combinación", "progresión", "automatismo", "asociación"]'
);

-- EVO 10: Ruptura Diagonal
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
    'Desmarque de Ruptura en Diagonal', 'EVO-010',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    18, 10, 1.25, 0.5,
    55, 45, 'medio_campo',
    8, 10, 1, 'Pasador + Atacantes + POR',
    'Trabajo de desmarques de ruptura en diagonal. Mediocentro con balón, atacantes inician en línea y realizan movimientos de ruptura en diagonal para recibir y finalizar.',
    'Mediocentro con balón en zona media',
    'Gol o fuera',
    '["Movimiento siempre en diagonal", "Comunicación con pasador", "Variar tipo de diagonal (interior, exterior)"]',
    'ataque_organizado', 'Ruptura diagonal', 'Desmarque de ruptura', 'Carrera diagonal y control orientado', 'Romper línea defensiva con diagonal',
    'Alta intensidad', 'alta', 155, 175,
    2,
    '["Diagonal de fuera a dentro", "Diagonal de dentro a fuera", "Timing con pasador", "Control orientado a portería"]',
    '["Ruptura en línea recta", "Sin comunicación", "Control de espaldas"]',
    '[{"nombre": "Con defensor", "descripcion": "Añadir central", "dificultad": "+1"}, {"nombre": "Pase señalado", "descripcion": "Pasador indica momento", "dificultad": "-1"}]',
    '["Sin oposición → 1 central pasivo → 1 central activo → 2 centrales"]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x12"]',
    '["MD-2", "MD-3"]',
    'Sprints, aceleraciones, cambios dirección',
    true, true,
    '["ruptura", "diagonal", "desmarque", "finalización", "movimiento"]'
);

-- EVO 11: Pressing Tras Pérdida (Automatismo)
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
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, progresiones, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Automatismo: 5 Segundos de Pressing', 'EVO-011',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    16, 6, 2, 0.75,
    30, 25, 'zona_central',
    10, 10, 0, '5v5',
    'Automatismo de pressing tras pérdida. 5v5 en espacio reducido. Al perder, el equipo tiene exactamente 5 segundos de pressing máximo. Si no recuperan, transición al otro equipo.',
    'Entrenador provoca pérdida',
    '5 segundos o robo',
    '["5 segundos exactos de pressing", "Cronómetro visible", "Si no recuperan, pierden punto"]',
    'transicion_ataque_defensa', 'Pressing tras pérdida', 'Reacción inmediata', 'Automatizar reacción a pérdida',
    'Muy alta intensidad', 'alta', 175, 195,
    2,
    '["Cercar al poseedor", "Coberturas rápidas", "5 segundos máxima intensidad"]',
    '["Resistir 5 segundos", "Pase rápido", "Abrir espacio"]',
    '["Reacción lenta", "Pressing individual", "No cubrir segundas líneas"]',
    '[{"nombre": "3 segundos", "descripcion": "Más exigente", "dificultad": "+1"}, {"nombre": "7 segundos", "descripcion": "Más margen", "dificultad": "-1"}]',
    '["3 seg → 5 seg → 7 seg → Sin límite (competición)"]',
    '["Conos x4", "Petos 2 colores", "Balones x6", "Cronómetro visible"]',
    '["MD-4", "MD-3"]',
    'Sprints repetidos, potencia',
    'Mentalidad de pressing, agresividad controlada',
    true, true,
    '["pressing", "automatismo", "5 segundos", "transición", "intensidad", "gegenpressing"]'
);

-- ============================================================================
-- ATAQUE VS DEFENSA (AVD) - 4 tareas adicionales
-- ============================================================================

-- AVD 8: Defensa de Área
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
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Defensa de Área: 6v5+POR Centro Lateral', 'AVD-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    20, 8, 2, 0.75,
    35, 45, 'area_grande',
    12, 12, 1, '6v5+POR',
    'Trabajo de defensa de área ante centros. 6 atacantes + centrador vs 5 defensores + POR. Centros desde banda, defensores trabajan marcaje, despejes y anticipación.',
    'Extremo en banda listo para centrar',
    'Gol, despeje o atrapada',
    '["Variar tipo de centro", "Defensores en posición antes de centro", "Portero comunica"]',
    'defensa_organizada', 'Defensa de área', 'Marcaje en área', 'Evitar gol de centro',
    'Media intensidad con picos', 'media', 135, 160,
    2,
    '["Ataque al balón", "Movimientos para desmarcar", "Ataque a zonas", "Rechace"]',
    '["Posición entre atacante y portería", "Atacar el balón", "Comunicar", "Despeje lejos"]',
    '["Perder marca", "No atacar balón", "Despeje flojo", "Falta de comunicación"]',
    '[{"nombre": "5v4", "descripcion": "Menos atacantes", "dificultad": "-1"}, {"nombre": "6v4", "descripcion": "Más superioridad atacante", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Petos 2 colores", "Balones x12"]',
    '["MD-3", "MD-2"]',
    'Salto, potencia, duelos aéreos',
    'Concentración, agresividad, comunicación',
    true, true,
    '["defensa área", "centros", "marcaje", "cabeza", "despeje"]'
);

-- AVD 9: Duelos en Banda
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Duelos 1v1 en Banda con Centro', 'AVD-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    18, 10, 1.25, 0.5,
    35, 20, 'banda',
    6, 8, 1, '1v1 + rematadores + POR',
    'Duelos individuales en banda. Extremo vs lateral en 1v1. Si el extremo supera, centra para 2 rematadores. Si el lateral roba, despeja a zona segura.',
    'Extremo recibe en banda',
    'Centro y remate, o robo con despeje',
    '["1v1 puro, sin ayudas", "Si supera, obligatorio centrar", "2 llegadas al área"]',
    'ataque_organizado', 'Duelo en banda', 'Regate y centro', 'Superar en 1v1 y centrar',
    'Alta intensidad', 87.5, 'alta', 170, 190,
    1,
    '["Encarar al defensor", "Cambio de ritmo", "Centro tenso al área"]',
    '["Posición corporal", "No entrar", "Orientar hacia fuera", "Defender el centro"]',
    '["Regate predecible", "Centro flojo", "Defensor entra precipitado"]',
    '[{"nombre": "2v1 para extremo", "descripcion": "Apoyo de interior", "dificultad": "-1"}, {"nombre": "1v2", "descripcion": "Doble marca", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos zona banda", "Petos", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Potencia, agilidad, velocidad',
    'Valentía, determinación, competitividad',
    true, true,
    '["duelo", "1v1", "banda", "regate", "centro", "lateral"]'
);

-- AVD 10: Situación de Gol
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Situaciones de Gol: 2v1+POR', 'AVD-010',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    16, 12, 1, 0.5,
    35, 25, 'area_grande',
    8, 10, 2, '2v1+POR',
    'Práctica de situaciones de gol en superioridad 2v1. Atacantes deben decidir: conducir o pasar, cuándo finalizar, cómo superar al defensor. Defensor trabaja temporización.',
    'Entrenador pasa a uno de los atacantes',
    'Gol, parada o robo',
    '["Defensor no puede hacer falta", "Atacantes máximo 5 toques entre ambos"]',
    'ataque_organizado', 'Finalización 2v1', 'Asistencia o conducción', 'Convertir superioridad en gol',
    'Media intensidad', 'media', 145, 165,
    2,
    '["Leer al defensor", "Si cierra pase: conducir", "Si cierra conducción: pase", "Finalización rápida"]',
    '["Temporizar", "Orientar hacia banda", "Cerrar pase al segundo", "No entrar"]',
    '["Decisión lenta", "Pase cuando hay que conducir", "Finalización precipitada"]',
    '[{"nombre": "2v2", "descripcion": "Igualdad numérica", "dificultad": "+1"}, {"nombre": "3v1", "descripcion": "Mayor superioridad", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos salida", "Petos", "Balones x10"]',
    '["MD-3", "MD-2"]',
    'Decisión rápida, confianza, sangre fría',
    true, true,
    '["2v1", "finalización", "superioridad", "decisión", "gol"]'
);

-- AVD 11: Defensa en Inferioridad
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
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Defensa en Inferioridad 3v4+POR', 'AVD-011',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.5, 0.75,
    45, 40, 'medio_campo',
    8, 8, 1, '3v4+POR',
    'Trabajo de defensa en inferioridad numérica. 3 defensores + POR contra 4 atacantes. Énfasis en temporización, no entrar, cerrar espacios y esperar refuerzos.',
    'Entrenador pasa a atacantes',
    'Gol, robo o 10 segundos',
    '["Defensores no pueden hacer falta", "10 segundos límite (simula llegada de ayuda)"]',
    'defensa_organizada', 'Defensa en inferioridad', 'Temporización', 'Evitar gol hasta llegada de ayuda',
    'Alta intensidad', 'alta', 160, 180,
    2,
    '["Aprovechar superioridad", "Circulación rápida", "Buscar 1v1 o pase de gol"]',
    '["Temporizar sin entrar", "Cerrar centro", "Comunicar", "Esperar"]',
    '["Entrar al balón", "Dejar pase de gol", "No comunicar"]',
    '[{"nombre": "2v3", "descripcion": "Mayor inferioridad", "dificultad": "+1"}, {"nombre": "3v3", "descripcion": "Igualdad", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos", "Petos", "Balones x8", "Cronómetro"]',
    '["MD-4", "MD-3"]',
    'Resistencia, agilidad, desplazamientos',
    'Concentración, paciencia, no pánico',
    true, true,
    '["inferioridad", "temporización", "defensa", "comunicación", "táctica"]'
);

-- ============================================================================
-- SSG - 4 tareas adicionales
-- ============================================================================

-- SSG 8: Partido Multi-Balón
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
    'SSG 4v4 Multi-Balón (2 Balones)', 'SSG-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    16, 4, 3, 1.5,
    30, 25, 'rectangular',
    8, 8, 0, '4v4 con 2 balones',
    'Partido 4v4 con DOS balones en juego simultáneamente. Cada balón que entre en mini portería suma. Trabaja atención dividida, comunicación y caos controlado.',
    'Entrenador lanza los 2 balones',
    'Tiempo',
    '["2 balones siempre en juego", "Si uno sale, entrenador mete otro inmediatamente", "No se puede tener los 2 balones"]',
    'Gol con cualquier balón = 1 punto',
    'transicion_defensa_ataque', 'Atención dividida', 'Gestionar el caos',
    'Muy alta intensidad', 46.9, 'alta', 170, 190,
    3,
    '["Comunicar qué balón atacar", "Visión periférica", "Decisiones rápidas"]',
    '["Comunicar qué balón defender", "Organizar prioridades", "No perder los 2"]',
    '["Perseguir solo un balón", "No comunicar", "Confusión total"]',
    '[{"nombre": "3 balones", "descripcion": "Máximo caos", "dificultad": "+2"}, {"nombre": "1 balón", "descripcion": "Normal", "dificultad": "-1"}]',
    '["Mini porterías x4", "Conos x8", "Petos 2 colores", "Balones x8"]',
    '["MD-4"]',
    'Agilidad, cambios dirección, resistencia',
    'Concentración, adaptabilidad, comunicación bajo estrés',
    true, true,
    '["multi-balón", "caos", "SSG", "comunicación", "atención", "intensidad"]'
);

-- SSG 9: Partido con Superioridad Temporal
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'SSG 5v5 con Superioridad Temporal', 'SSG-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1.5,
    40, 30, 'rectangular',
    10, 12, 0, '5v5 + 1 rotativo',
    'Partido 5v5 donde el equipo que tiene balón recibe un comodín (6v5). El comodín cambia al equipo que tiene posesión en cada momento. Superioridad siempre para el poseedor.',
    'Saque lateral',
    'Gol o tiempo',
    '["Comodín siempre con equipo en posesión", "Al perder, comodín cambia inmediatamente", "Comodín 2 toques"]',
    'Gol = 1 punto',
    'ataque_organizado', 'Superioridad temporal', 'Aprovechar ventaja numérica',
    'Alta intensidad', 60, 'alta', 160, 180,
    2,
    '["Usar al comodín rápido", "Transición aprovechando comodín", "Circular para encontrar superioridad"]',
    '["Pressing para robar rápido", "Ganar comodín", "Defender 5v6 compactos"]',
    '["No usar comodín", "Transición lenta", "No compactar en inferioridad"]',
    '[{"nombre": "4v4+1", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "6v6+1", "descripcion": "Más jugadores", "dificultad": "="}]',
    '["Mini porterías x2", "Conos x8", "Petos 3 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Resistencia con transiciones frecuentes',
    true, true,
    '["superioridad", "comodín", "SSG", "transiciones", "posesión"]'
);

-- SSG 10: Partido King of the Court
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
    'King of the Court: 3v3 Eliminatorio', 'SSG-010',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    20, 1, 18, 2,
    25, 18, 'rectangular',
    9, 12, 0, '3v3 (3-4 equipos)',
    'Sistema "King of the Court". 3-4 equipos de 3. Dos equipos juegan, el que marca se queda, el que recibe sale y entra el siguiente. El equipo que más partidos seguidos gane, gana.',
    'Saque del equipo que se quedó',
    'Gol (cambio de equipo)',
    '["El que marca gol se queda", "El que recibe gol sale", "Entra siguiente equipo", "Sin tiempo límite por partido"]',
    'Partidos ganados consecutivos',
    'transicion_defensa_ataque', 'Competición máxima', 'Ganar y mantenerse',
    'Muy alta intensidad', 50, 'alta', 175, 195,
    1,
    '["Intensidad máxima desde inicio", "Finalizar rápido", "No especular"]',
    '["Evitar gol a toda costa", "Concentración total", "No regalar"]',
    '["Empezar lento", "Especular", "Bajar intensidad"]',
    '[{"nombre": "2v2", "descripcion": "Más intensidad individual", "dificultad": "+1"}, {"nombre": "4v4", "descripcion": "Más táctico", "dificultad": "="}]',
    '["Mini porterías x2", "Conos x8", "Petos varios colores", "Balones x4"]',
    '["MD-4"]',
    'Intensidad máxima sostenida',
    'Competitividad, mentalidad ganadora, presión',
    true, true,
    '["king of court", "eliminatorio", "competición", "SSG", "intensidad"]'
);

-- SSG 11: Pressing Trap Game
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'SSG 5v5 Pressing Trap con Zonas', 'SSG-011',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1,
    45, 35, 'rectangular',
    10, 10, 0, '5v5',
    'Partido 5v5 con zonas de pressing trap en las bandas. Si el equipo defensor logra robar en zona de trap (marcada), el gol siguiente vale doble. Trabaja pressing orientado.',
    'Saque lateral',
    'Gol o tiempo',
    '["Zonas de trap marcadas en bandas", "Robo en zona trap = siguiente gol x2", "Bonus válido solo si marcan inmediatamente"]',
    'Gol normal = 1 punto, Gol tras robo en trap = 2 puntos',
    'defensa_organizada', 'Pressing trap', 'Orientar hacia zona', 'Robar en zona predeterminada',
    'Alta intensidad', 63, 'alta', 160, 180,
    3,
    '["Evitar zonas de trap", "Salir rápido de banda", "Usar el centro"]',
    '["Orientar hacia trap", "Cercar en zona", "Anticipar", "Transición inmediata"]',
    '["Ir a trap sin coordinación", "No orientar", "Transición lenta tras robo"]',
    '[{"nombre": "Trap en centro", "descripcion": "Zona de trap en el medio", "dificultad": "+1"}, {"nombre": "Sin trap", "descripcion": "Partido normal", "dificultad": "-1"}]',
    '["Mini porterías x2", "Conos zonas trap x8", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Sprints cortos, cambios dirección',
    'Coordinación colectiva, lectura de juego',
    true, true,
    '["pressing trap", "zonas", "SSG", "orientar", "robo", "táctica"]'
);

-- ============================================================================
-- FIN DE LOTES 5-6 - 20 TAREAS ADICIONALES (56-75)
-- ============================================================================
-- Resumen Lotes 5-6:
-- - 4 JDP adicionales (JDP-006 a 009) → Total JDP: 9
-- - 4 EVO adicionales (EVO-008 a 011) → Total EVO: 11
-- - 4 AVD adicionales (AVD-008 a 011) → Total AVD: 11
-- - 4 SSG adicionales (SSG-008 a 011) → Total SSG: 11
-- ============================================================================
-- TOTAL ACUMULADO: 75 tareas
-- ============================================================================
