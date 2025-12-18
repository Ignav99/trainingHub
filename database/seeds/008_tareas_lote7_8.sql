-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTES 7-8 DE TAREAS (76-95)
-- ============================================================================
-- 20 tareas adicionales - Enfoque: Posesión avanzada, PCO, ABP
-- ============================================================================

-- ============================================================================
-- POSESIÓN (POS) - 6 tareas adicionales
-- ============================================================================

-- POS 8: Posesión 10v10 Partido Sin Gol
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
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Posesión 10v10 Campo Completo', 'POS-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    25, 2, 10, 2.5,
    90, 60, 'campo_completo',
    20, 22, 0, '10v10',
    'Posesión a campo completo sin porterías. 10v10 con objetivo de mantener posesión y completar secuencias de pases. Simula partido de posesión a máxima escala.',
    'Saque de centro',
    'Tiempo de serie',
    '["Sin porterías", "Contar pases consecutivos", "15 pases = 1 punto"]',
    '15 pases consecutivos = 1 punto',
    'ataque_organizado', 'Posesión total', 'Dominar el partido con balón',
    'Alta intensidad', 27, 'alta', 155, 175,
    2,
    '["Usar todo el campo", "Paciencia", "Circulación rápida", "Cambios de orientación"]',
    '["Pressing escalonado", "Compactar", "Forzar error"]',
    '["Solo jugar corto", "No usar amplitud", "Pressing desorganizado"]',
    '[{"nombre": "8v8", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "10v10+2", "descripcion": "Con comodines", "dificultad": "-1"}]',
    '["Conos campo completo", "Petos 2 colores", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Resistencia específica partido',
    true, true,
    '["posesión", "10v10", "campo completo", "dominio", "circulación"]'
);

-- POS 9: Posesión con Transición Obligada
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
    'Posesión 5v5+2 con Transición Forzada', 'POS-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    18, 4, 3.5, 1,
    35, 30, 'rectangular',
    12, 12, 0, '5v5+2',
    'Posesión 5v5+2 comodines donde cada 30 segundos el entrenador grita "CAMBIA" y los equipos intercambian roles (el que tenía balón pasa a presionar, el que presionaba recibe balón). Transición mental obligada.',
    'Entrenador pasa a un equipo',
    'Tiempo de serie',
    '["Cada 30 seg cambio de roles", "Comodines siempre en posesión", "Transición inmediata al cambio"]',
    'Mantener balón al cambio = 1 punto',
    'transicion_defensa_ataque', 'Transición mental', 'Adaptarse rápido', 'Cambiar chip instantáneamente',
    'Alta intensidad', 43.8, 'alta', 160, 180,
    2,
    '["Estar siempre preparado para ambos roles", "Transición mental rápida", "Usar comodines"]',
    '["Al cambio, pressing inmediato", "Adaptarse al nuevo rol"]',
    '["Confusión en cambio", "Reacción lenta", "No cambiar mentalidad"]',
    '[{"nombre": "20 segundos", "descripcion": "Cambios más frecuentes", "dificultad": "+1"}, {"nombre": "45 segundos", "descripcion": "Más tiempo por rol", "dificultad": "-1"}]',
    '["Conos x8", "Petos 3 colores", "Balones x6", "Silbato"]',
    '["MD-4", "MD-3"]',
    'Cambios de intensidad, resistencia',
    'Adaptabilidad, concentración, flexibilidad mental',
    true, true,
    '["posesión", "transición", "mental", "adaptabilidad", "cambio roles"]'
);

-- POS 10: Posesión Tiki-Taka Reducido
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
    consignas_ofensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Tiki-Taka: Posesión 6v3 Ultra Reducido', 'POS-010',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    14, 5, 2, 0.75,
    10, 10, 'cuadrado',
    9, 9, 0, '6v3',
    'Posesión ultra reducida estilo tiki-taka. 6 poseedores en espacio mínimo contra 3 presionadores. Obligatorio 1 toque. Desarrolla velocidad de juego y anticipación.',
    'Entrenador pasa al equipo de 6',
    '10 pases o robo',
    '["1 TOQUE OBLIGATORIO", "Pase a ras de suelo"]',
    '["No repetir pase inmediato", "Movimiento constante tras pasar"]',
    '10 pases consecutivos = 1 punto',
    'ataque_organizado', 'Velocidad de juego', 'Pase a 1 toque', 'Pase y movimiento instantáneo', 'Juego ultrarrápido',
    'Media intensidad', 11.1, 'media', 145, 165,
    3,
    '["Perfilarse antes de recibir", "Saber dónde pasar antes de recibir", "Movimiento constante"]',
    '["Recibir mal perfilado", "No saber siguiente pase", "Estático tras pasar"]',
    '[{"nombre": "2 toques", "descripcion": "Más margen", "dificultad": "-1"}, {"nombre": "6v4", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["Conos x4", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3", "MD-2"]',
    'Velocidad mental, anticipación, concentración',
    true, true,
    '["tiki-taka", "1 toque", "velocidad", "Barcelona", "técnica"]'
);

-- POS 11: Posesión con Jugador Libre
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
    'Posesión 6v6 con Liberado', 'POS-011',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1,
    40, 35, 'rectangular',
    12, 12, 0, '6v6',
    'Posesión 6v6 donde un jugador del equipo en posesión es "liberado" (sin marca directa). El liberado cambia cada 10 pases. Trabaja encontrar al hombre libre.',
    'Entrenador designa primer liberado',
    'Tiempo de serie',
    '["Liberado no puede ser marcado directamente", "Cada 10 pases cambia el liberado", "Liberado 2 toques máximo"]',
    'Pase al liberado = 1 punto extra',
    'ataque_organizado', 'Encontrar al libre', 'Buscar superioridad', 'Identificar y encontrar al libre',
    'Media intensidad', 41.7, 'media', 145, 165,
    2,
    '["Identificar al liberado", "Crear espacio para él", "Usar al liberado para progresar"]',
    '["Presionar zonas, no al liberado", "Anticipar pase al liberado", "Cerrar espacios"]',
    '["No buscar al liberado", "Liberado mal posicionado", "No saber quién es liberado"]',
    '[{"nombre": "2 liberados", "descripcion": "Mayor ventaja", "dificultad": "-1"}, {"nombre": "Liberado 1 toque", "descripcion": "Más exigente", "dificultad": "+1"}]',
    '["Conos x8", "Petos 2 colores + 1 especial", "Balones x6"]',
    '["MD-4", "MD-3"]',
    true, true,
    '["posesión", "liberado", "hombre libre", "visión", "táctica"]'
);

-- POS 12: Posesión con Objetivo Móvil
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
    'Posesión 7v7 con Cuadrado Móvil', 'POS-012',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1,
    50, 40, 'rectangular',
    14, 14, 0, '7v7',
    'Posesión 7v7 con un cuadrado móvil (marcado con 4 conos de diferente color) que el entrenador mueve cada 30 segundos. Punto si completan 5 pases dentro del cuadrado.',
    'Entrenador coloca cuadrado y pasa balón',
    'Tiempo de serie',
    '["Cuadrado de 8x8m se mueve cada 30 seg", "5 pases dentro del cuadrado = punto", "No hay límite de jugadores en cuadrado"]',
    '5 pases en cuadrado = 1 punto',
    'ataque_organizado', 'Control de zona móvil', 'Adaptación espacial', 'Dominar zona designada',
    'Alta intensidad', 35.7, 'alta', 155, 175,
    2,
    '["Mover balón hacia cuadrado", "Dominar cuadrado", "Adaptarse cuando cambia"]',
    '["Defender cuadrado intensamente", "Pressing cuando balón va a cuadrado", "Adaptarse al cambio"]',
    '["No buscar cuadrado", "Reacción lenta al cambio", "Amontonarse en cuadrado"]',
    '[{"nombre": "Cuadrado fijo", "descripcion": "Sin movimiento", "dificultad": "-1"}, {"nombre": "2 cuadrados", "descripcion": "Más opciones", "dificultad": "-1"}]',
    '["Conos normales x8", "Conos color especial x4", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Resistencia con cambios de dirección',
    'Adaptabilidad, concentración, reacción',
    true, true,
    '["posesión", "cuadrado móvil", "adaptación", "zona", "creatividad"]'
);

-- POS 13: Posesión Cruyff (Ajax)
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
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Posesión Cruyff: Triángulos 3v1 Conectados', 'POS-013',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    16, 4, 3, 1,
    30, 20, 'rectangular',
    12, 12, 0, '3v1 x3 conectados',
    'Tres triángulos 3v1 conectados en línea (9 poseedores + 3 defensores). Objetivo: pasar el balón de un triángulo al otro a través del jugador compartido. Filosofía Cruyff/Ajax.',
    'Entrenador pasa al triángulo central',
    '3 cambios de triángulo o robo',
    '["2 toques en triángulos exteriores", "1 toque en conexión entre triángulos"]',
    '["Jugador compartido entre triángulos", "Obligatorio pasar por jugador compartido para cambiar"]',
    'Cambio de triángulo exitoso = 1 punto',
    'ataque_organizado', 'Circulación por triángulos', 'Conexión entre sectores', 'Pase de conexión', 'Conectar sectores de juego',
    'Media intensidad', 25, 'media', 140, 160,
    3,
    '["Mantener posición en triángulo", "Ofrecer línea al jugador conexión", "Timing de pase al cambio"]',
    '["Presionar jugador conexión", "Cortar pase de cambio", "Anticipar"]',
    '["Jugador conexión mal posicionado", "Pase de cambio flojo", "No mantener forma"]',
    '[{"nombre": "2v1 conectados", "descripcion": "Menos jugadores por triángulo", "dificultad": "+1"}, {"nombre": "4v1 conectados", "descripcion": "Más jugadores", "dificultad": "-1"}]',
    '["3v1 individual → 2 conectados → 3 conectados → Con oposición real"]',
    '["Conos triángulos x9", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Visión de juego, paciencia, disciplina posicional',
    true, true,
    '["Cruyff", "Ajax", "triángulos", "posesión", "conexión", "filosofía"]'
);

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 6 tareas adicionales
-- ============================================================================

-- PCO 7: Partido Sin Conducción
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
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido 7v7 Sin Conducción', 'PCO-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    24, 2, 10, 2,
    55, 40, 'campo_reducido',
    16, 16, 2, '7v7+2POR',
    'Partido 7v7 donde está prohibido conducir más de 3 metros. Obligatorio pasar inmediatamente o en máximo 2 toques. Trabaja velocidad de juego y movimiento sin balón.',
    'Saque de portero',
    'Tiempo de serie',
    '["Máximo 3 metros de conducción", "Si conduces más: falta y saque rival", "2 toques máximo recomendado"]',
    'Gol = 1 punto',
    'ataque_organizado', 'Juego asociativo', 'Circular sin conducir',
    'Alta intensidad', 'alta', 160, 180,
    2,
    '["Pase rápido", "Movimiento constante", "Crear líneas de pase", "Anticipar siguiente jugada"]',
    '["Pressing intenso", "Cerrar líneas de pase", "Anticipar"]',
    '["Conducir más de 3m", "Quedarse quieto sin balón", "No ofrecer líneas"]',
    '[{"nombre": "5m permitidos", "descripcion": "Más margen", "dificultad": "-1"}, {"nombre": "1m permitido", "descripcion": "Ultra exigente", "dificultad": "+2"}]',
    '["Porterías reducidas x2", "Conos x8", "Petos 2 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Velocidad mental, desapego al balón',
    true, true,
    '["sin conducción", "pase rápido", "movimiento", "velocidad", "condicionado"]'
);

-- PCO 8: Partido con Portero-Jugador
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
    'Partido 6v6+2 Portero-Jugador', 'PCO-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    25, 2, 10, 2.5,
    50, 40, 'campo_reducido',
    14, 14, 2, '6v6+2POR-jugador',
    'Partido 6v6 donde los porteros pueden salir a jugar como jugadores de campo (7v6 en posesión). Al perder, el portero debe volver inmediatamente. Trabaja portero como líbero.',
    'Saque de portero',
    'Tiempo de serie',
    '["Portero puede salir hasta medio campo", "Si pierde posesión, volver inmediato", "Gol con portero fuera = vale doble para rival"]',
    'Gol normal = 1 punto, Gol con portero rival fuera = 2 puntos',
    'ataque_organizado', 'Portero-jugador', 'Superioridad con portero',
    'Alta intensidad', 'alta', 158, 178,
    2,
    '["Usar al portero para superioridad", "Transición rápida si pierde", "Portero como pivote"]',
    '["Presionar alto si portero sale", "Transición rápida si roban", "Atacar portería vacía"]',
    '["Portero muy adelantado", "No volver tras pérdida", "No usar al portero"]',
    '[{"nombre": "Portero medio campo solo", "descripcion": "Más limitado", "dificultad": "+1"}, {"nombre": "Portero libre", "descripcion": "Sin límite de zona", "dificultad": "-1"}]',
    '["Porterías reducidas x2", "Conos medio campo", "Petos 2 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia, sprints de portero',
    true, true,
    '["portero-jugador", "superioridad", "sweeper", "condicionado", "transición"]'
);

-- PCO 9: Partido Oleadas
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
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido Oleadas 5v5+POR Continuo', 'PCO-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    22, 1, 20, 2,
    60, 50, 'campo_reducido',
    16, 18, 2, '5v5+2POR oleadas',
    'Partido continuo en oleadas. 2-3 equipos de 5. Un equipo ataca, otro defiende. Tras finalización, inmediatamente entra tercer equipo atacando al que defendía. Rotación continua.',
    'Primer equipo ataca',
    'Tiempo total (20 min)',
    '["Tras gol/fuera: equipo atacante sale, entra otro atacando al que defendía", "Rotación inmediata", "No hay pausa"]',
    'Goles acumulados por equipo',
    'transicion_defensa_ataque', 'Transición continua', 'Adaptarse a cambios continuos',
    'Muy alta intensidad', 'alta', 170, 190,
    2,
    '["Atacar rápido", "Aprovechar desorganización", "Intensidad constante"]',
    '["Transición mental inmediata", "De defender a ser atacado", "Organización rápida"]',
    '["Transición lenta", "No estar preparado para defender", "Bajar intensidad"]',
    '[{"nombre": "4v4 oleadas", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "6v6 oleadas", "descripcion": "Más jugadores", "dificultad": "="}]',
    '["Porterías reglamentarias x2", "Petos 3 colores", "Balones x10", "Conos"]',
    '["MD-4"]',
    'Resistencia a alta intensidad, recuperación',
    'Mentalidad competitiva, adaptabilidad',
    true, true,
    '["oleadas", "continuo", "transiciones", "intensidad", "competición"]'
);

-- PCO 10: Partido Solo Primer Toque
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas,
    forma_puntuar,
    fase_juego, principio_tactico, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido 6v6 Solo 1 Toque', 'PCO-010',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1.5,
    45, 35, 'campo_reducido',
    14, 14, 2, '6v6+2POR',
    'Partido 6v6 donde SOLO se permite 1 toque. Todo jugador debe pasar/tirar al primer toque. Si das 2 toques: falta. Extrema velocidad de juego y decisión.',
    'Saque de portero (este sí puede tener toques libres)',
    'Tiempo de serie',
    '["1 TOQUE OBLIGATORIO", "2 toques = falta y saque rival", "Portero libre de toques en área"]',
    'Gol = 1 punto',
    'ataque_organizado', 'Velocidad extrema', 'Decidir antes de recibir',
    'Alta intensidad', 'alta', 160, 180,
    3,
    '["Saber qué hacer antes de recibir", "Movimiento para facilitar pase", "Perfilarse constantemente"]',
    '["Pressing ultra agresivo", "Anticipar pases", "No dar tiempo"]',
    '["No saber qué hacer", "Mal perfilado", "Pase imposible"]',
    '[{"nombre": "2 toques", "descripcion": "Más margen", "dificultad": "-1"}, {"nombre": "Portero también 1 toque", "descripcion": "Máxima dificultad", "dificultad": "+2"}]',
    '["Porterías reducidas x2", "Conos x8", "Petos 2 colores", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Velocidad mental máxima, anticipación',
    true, true,
    '["1 toque", "velocidad", "decisión", "técnica", "condicionado"]'
);

-- PCO 11: Partido Pressing Zonificado
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido 8v8 Pressing por Zonas', 'PCO-011',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    26, 2, 11, 2,
    70, 55, 'campo_reducido',
    18, 18, 2, '8v8+2POR',
    'Partido 8v8 con campo dividido en 3 zonas. El equipo defensor solo puede presionar en ciertas zonas según indicación del entrenador. Trabaja pressing organizado y lectura.',
    'Saque de portero',
    'Tiempo de serie',
    '["Zona de pressing indicada por entrenador", "Solo se presiona activamente en zona indicada", "Fuera de zona: bloque medio"]',
    'Gol = 1 punto, Robo en zona de pressing = bonus +1',
    'defensa_organizada', 'Pressing zonificado', 'Pressing por sectores', 'Presionar ordenadamente por zonas',
    'Alta intensidad', 'alta', 158, 178,
    3,
    '["Identificar zona de pressing rival", "Salir de zona presionada", "Jugar donde no presionan"]',
    '["Activar pressing solo en zona indicada", "Resto compacto", "Transición si roban"]',
    '["Presionar fuera de zona", "No compactar", "Pressing individual"]',
    '[{"nombre": "Zona fija", "descripcion": "Sin cambios de zona", "dificultad": "-1"}, {"nombre": "Cambio cada 2 min", "descripcion": "Más adaptación", "dificultad": "+1"}]',
    '["Porterías reglamentarias x2", "Conos zonas x6", "Petos 2 colores", "Balones x10"]',
    '["MD-3", "MD-2"]',
    'Resistencia con fases de alta intensidad',
    true, true,
    '["pressing", "zonas", "organización", "táctico", "condicionado"]'
);

-- PCO 12: Partido Recuperación + Ataque Rápido
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
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido 7v7 Bonus por Gol Rápido', 'PCO-012',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    24, 2, 10, 2,
    60, 50, 'campo_reducido',
    16, 16, 2, '7v7+2POR',
    'Partido 7v7 donde los goles anotados en los primeros 6 segundos tras recuperación valen el triple. Enfatiza transición ofensiva ultra rápida.',
    'Saque de centro',
    'Tiempo de serie',
    '["Gol en 0-6 seg tras robo = 3 puntos", "Gol en 6-10 seg = 2 puntos", "Gol normal = 1 punto", "Cronómetro visible"]',
    'Gol 0-6s = 3 pts, 6-10s = 2 pts, +10s = 1 pt',
    'transicion_defensa_ataque', 'Transición ultra rápida', 'Marcar en transición inmediata',
    'Muy alta intensidad', 'alta', 168, 188,
    2,
    '["Robar y atacar inmediato", "Primer pase en vertical", "No frenar", "Finalizar a la primera"]',
    '["Repliegue instantáneo", "Evitar gol rápido", "Transición defensiva"]',
    '["Transición lenta", "Exceso de toques tras robo", "No aprovechar ventana"]',
    '[{"nombre": "8 segundos", "descripcion": "Más margen", "dificultad": "-1"}, {"nombre": "4 segundos", "descripcion": "Menos margen", "dificultad": "+1"}]',
    '["Porterías reglamentarias x2", "Petos 2 colores", "Balones x10", "Cronómetro visible"]',
    '["MD-4", "MD-3"]',
    'Sprints máximos, recuperación',
    'Ambición, mentalidad de transición',
    true, true,
    '["transición rápida", "gol rápido", "bonus", "intensidad", "condicionado"]'
);

-- ============================================================================
-- BALÓN PARADO (ABP) - 4 tareas adicionales
-- ============================================================================

-- ABP 7: Falta Indirecta
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
    es_plantilla, es_publica, tags
) VALUES (
    'Falta Indirecta - Jugadas Ensayadas', 'ABP-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    20, 10, 1.5, 0.5,
    30, 35, 'area_grande',
    10, 14, 1, 'Atacantes + POR + Barrera',
    'Práctica de faltas indirectas con jugadas ensayadas. Variantes: pase atrás y tiro, pase lateral y centro, pantalla y disparo, combinación en corto.',
    'Señal del entrenador indica variante',
    'Gol, parada o fuera',
    '["4 variantes diferentes", "Señalización acordada", "Barrera reglamentaria"]',
    'ataque_organizado', 'Falta indirecta', 'Jugadas ensayadas', 'Generar gol de falta indirecta',
    'Baja intensidad', 'baja', 95, 120,
    2,
    '["Conocer todas las variantes", "Comunicación clara", "Timing de movimientos", "Remate decidido"]',
    '["Confusión en señal", "Mal timing", "Disparo flojo"]',
    '[{"nombre": "Con oposición", "descripcion": "Defensores activos", "dificultad": "+1"}, {"nombre": "Una variante", "descripcion": "Repetir misma jugada", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Maniquíes/jugadores barrera", "Conos", "Balones x10"]',
    '["MD-2", "MD-1"]',
    true, true,
    '["ABP", "falta indirecta", "jugadas ensayadas", "estrategia", "set piece"]'
);

-- ABP 8: Saque de Puerta Corto
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
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Saque de Puerta Corto - Salida Construida', 'ABP-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    18, 6, 2.5, 0.5,
    50, 60, 'campo_propio',
    12, 14, 1, '6+POR vs 4-5 presionadores',
    'Práctica de salida de puerta en corto contra pressing. Portero + línea defensiva + pivote construyen contra 4-5 presionadores. Objetivo: superar primera línea de presión.',
    'Portero con balón',
    'Balón supera pressing o robo',
    '["Obligatorio salir en corto", "Portero puede volver a recibir", "Superación = pase a jugador en zona segura"]',
    'ataque_organizado', 'Saque de puerta', 'Salida construida', 'Superar pressing desde saque',
    'Baja intensidad', 'baja', 115, 140,
    3,
    '["Portero lee presión", "Centrales abiertos", "Pivote se ofrece", "Laterales dan opción"]',
    '["Pressing coordinado", "Cerrar portero", "Forzar balón largo"]',
    '["Portero indeciso", "No ofrecer opciones", "Pressing descoordinado"]',
    '[{"nombre": "Sin pressing", "descripcion": "Automatizar movimientos", "dificultad": "-1"}, {"nombre": "6 presionadores", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["4+POR vs 2 → 5+POR vs 3 → 6+POR vs 4 → 6+POR vs 5"]',
    '["Portería reglamentaria", "Conos zona segura", "Petos 2 colores", "Balones x8"]',
    '["MD-3", "MD-2"]',
    'Calma bajo presión, confianza',
    true, true,
    '["saque puerta", "salida corta", "construcción", "pressing", "portero"]'
);

-- ABP 9: Penaltis con Presión
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, intencion_tactica,
    tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Penaltis Simulación de Presión', 'ABP-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    20, 1, 18, 2,
    20, 20, 'area_grande',
    10, 14, 2, 'Tanda de penaltis simulada',
    'Simulación de tanda de penaltis con presión máxima. Dividir en 2 equipos. Tanda a 5. Resto de jugadores hacen ruido, presión psicológica. El que falla hace 10 burpees.',
    'Capitán elige orden',
    'Victoria de un equipo',
    '["Tanda a 5 penaltis", "Simulación de presión con gritos", "Perdedor = ejercicio físico"]',
    'ataque_organizado', 'Penalti bajo presión', 'Ejecutar bajo máxima presión',
    'Muy baja intensidad', 'baja', 100, 130,
    1,
    '["Rutina invariable", "No escuchar ruido", "Confianza en decisión"]',
    '["Generar presión legal", "Portero activo mentalmente"]',
    '["Dejarse afectar por presión", "Cambiar rutina", "Dudar"]',
    '[{"nombre": "Sin presión", "descripcion": "Tanda tranquila", "dificultad": "-1"}, {"nombre": "Muerte súbita", "descripcion": "A partir de 5to", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Balones x6"]',
    '["MD-1", "MD-2"]',
    'Control de presión, nervios, mentalidad competitiva',
    true, true,
    '["penaltis", "presión", "mental", "competición", "tanda"]'
);

-- ABP 10: Defensa de Saque de Banda
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
    es_plantilla, es_publica, tags
) VALUES (
    'Defensa Saque de Banda Zona Peligrosa', 'ABP-010',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    16, 8, 1.5, 0.5,
    25, 30, 'area_grande',
    12, 14, 1, '5-6 defensores + POR vs 5-6 atacantes',
    'Defensa de saques de banda en zona de peligro (cerca del área). Atacantes intentan generar ocasión desde saque de banda. Defensores practican marcajes y despejes.',
    'Saque de banda atacante',
    'Despeje, gol o pérdida de balón',
    '["Defensores en marcaje nominal", "Comunicación portero", "Despeje a zona segura"]',
    'defensa_organizada', 'Defensa de saque banda', 'Marcaje en zona peligrosa', 'Evitar ocasión de saque de banda',
    'Baja intensidad con picos', 'baja', 110, 135,
    2,
    '["Marcaje pegado", "Anticipar movimientos", "Comunicar", "Despeje lejos de portería"]',
    '["Perder marca", "No comunicar", "Despeje flojo"]',
    '[{"nombre": "Saque largo al área", "descripcion": "Especialista en largo", "dificultad": "+1"}, {"nombre": "Solo corto", "descripcion": "Sin saque largo", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos zona", "Petos 2 colores", "Balones x8"]',
    '["MD-2", "MD-1"]',
    true, true,
    '["saque banda", "defensa", "marcaje", "zona peligrosa", "ABP"]'
);

-- ============================================================================
-- RONDOS (RND) - 4 tareas adicionales
-- ============================================================================

-- RND 10: Rondo Competitivo
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
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo Competitivo: 2 Equipos Alternando', 'RND-010',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    16, 4, 3, 1,
    12, 12, 'cuadrado',
    8, 8, 0, '4v4 (2 defienden por turno)',
    'Rondo competitivo entre 2 equipos de 4. Un equipo defiende (2 jugadores) mientras el otro mantiene posesión (4v2). Cada robo suma punto. Rotación de defensores cada minuto.',
    'Equipo A en posesión',
    'Tiempo de serie',
    '["2 defensores por equipo", "Rotar defensores cada 60 seg", "Robo = punto para equipo defensor"]',
    'Robos acumulados por equipo',
    'ataque_organizado', 'Posesión competitiva', 'Ganar el rondo',
    'Alta intensidad', 18, 'alta', 160, 180,
    2,
    '["Máxima concentración", "Pase seguro", "Movimiento constante"]',
    '["Pressing coordinado", "Cerrar líneas", "Robar para sumar"]',
    '["Pase arriesgado", "Derrota mental", "No presionar intenso"]',
    '[{"nombre": "5v2", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "4v3", "descripcion": "Menos superioridad", "dificultad": "+1"}]',
    '["Conos x4", "Petos 2 colores", "Balones x4", "Marcador"]',
    '["MD-4", "MD-3"]',
    'Competitividad, concentración bajo presión',
    true, true,
    '["rondo", "competitivo", "equipos", "presión", "puntos"]'
);

-- RND 11: Rondo en Movimiento
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
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo Móvil 5v2 Desplazándose', 'RND-011',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    14, 4, 2.5, 1,
    40, 30, 'rectangular',
    7, 7, 0, '5v2 móvil',
    'Rondo 5v2 donde el grupo completo (poseedores y defensores) debe desplazarse de un extremo al otro del campo mientras mantienen el rondo. Combina posesión con desplazamiento.',
    'Grupo en un extremo del campo',
    'Llegada al otro extremo o robo',
    '["Mantener rondo mientras avanzan", "Llegar al otro lado sin perder", "Desplazamiento constante"]',
    'ataque_organizado', 'Posesión en movimiento', 'Pase y desplazamiento', 'Mantener posesión mientras se avanza',
    'Alta intensidad', 57.1, 'alta', 155, 175,
    2,
    '["Avanzar como grupo", "Pase y moverte hacia objetivo", "Comunicación de dirección"]',
    '["Presionar mientras se mueven", "Anticipar dirección", "Robar en desplazamiento"]',
    '["Quedarse quietos", "No avanzar", "Perder forma de rondo"]',
    '[{"nombre": "4v2 móvil", "descripcion": "Menos poseedores", "dificultad": "+1"}, {"nombre": "6v2 móvil", "descripcion": "Más poseedores", "dificultad": "-1"}]',
    '["Conos inicio y final x4", "Petos 2 colores", "Balones x4"]',
    '["MD-4", "MD-3"]',
    'Resistencia con técnica, coordinación grupal',
    true, true,
    '["rondo", "móvil", "desplazamiento", "coordinación", "grupo"]'
);

-- RND 12: Rondo Posicional De Zerbi
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
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo De Zerbi: 7v3+1 con Estructura', 'RND-012',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    18, 4, 3.5, 1,
    25, 20, 'rectangular',
    11, 11, 0, '7v3+1 comodín flotante',
    'Rondo posicional estilo De Zerbi. 7 poseedores en posiciones fijas (simula estructura de equipo), 3 presionadores y 1 comodín flotante. Énfasis en mantener forma mientras se circula.',
    'Entrenador pasa al "central"',
    'Robo o 15 pases',
    '["2 toques para posiciones fijas", "Comodín 1 toque"]',
    '["Jugadores mantienen posiciones aproximadas", "Pressing en parejas coordinado"]',
    '15 pases manteniendo estructura = 1 punto',
    'ataque_organizado', 'Posesión estructurada', 'Circulación posicional', 'Pase al pie con orientación', 'Circular manteniendo forma de equipo',
    'Media intensidad', 22.7, 'media', 140, 160,
    3,
    '["Mantener posición aproximada", "Triangular con vecinos", "Usar comodín para cambiar"]',
    '["Pressing coordinado en 3", "Cerrar comodín", "Forzar pase largo"]',
    '["Abandonar posición", "No usar comodín", "Pases predecibles"]',
    '[{"nombre": "6v2+1", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "8v3+1", "descripcion": "Más jugadores", "dificultad": "-1"}]',
    '["Conos posiciones x7", "Petos 2 colores + comodín", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Disciplina posicional, visión estructural',
    true, true,
    '["De Zerbi", "rondo", "estructura", "posicional", "Brighton", "italiano"]'
);

-- RND 13: Rondo con Pivote Móvil
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
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo 6v2 con Pivote Interior Móvil', 'RND-013',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    16, 5, 2.5, 0.75,
    15, 15, 'cuadrado',
    8, 8, 0, '6v2 (4 ext + 2 pivotes móviles)',
    'Rondo con 4 jugadores en el exterior y 2 pivotes que se mueven por el interior. Los pivotes crean superioridad pero deben estar en constante movimiento. Defensores cazan a pivotes.',
    'Entrenador pasa al exterior',
    'Robo o 12 pases con pivotes',
    '["Pivotes en movimiento constante", "Obligatorio usar pivote cada 3 pases", "Pivotes 1 toque"]',
    'Secuencia con ambos pivotes = 1 punto',
    'ataque_organizado', 'Uso del pivote', 'Conexión interior', 'Pase al pivote móvil', 'Jugar con mediapunta/pivote móvil',
    'Media-alta intensidad', 28.1, 'media', 150, 170,
    2,
    '["Pivotes siempre ofreciéndose", "Exteriores buscar a pivotes", "Rotación de pivotes"]',
    '["Cerrar pivotes", "Pressing al pivote cuando recibe", "Anticipar"]',
    '["Pivotes estáticos", "No usar pivotes", "Pivotes predecibles"]',
    '[{"nombre": "1 pivote", "descripcion": "Menos opciones interiores", "dificultad": "+1"}, {"nombre": "5v1 + 2 pivotes", "descripcion": "Menos presión", "dificultad": "-1"}]',
    '["Conos x4", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    true, true,
    '["rondo", "pivote", "interior", "móvil", "mediapunta"]'
);

-- ============================================================================
-- FIN DE LOTES 7-8 - 20 TAREAS ADICIONALES (76-95)
-- ============================================================================
-- Resumen Lotes 7-8:
-- - 6 POS adicionales (POS-008 a 013) → Total POS: 13
-- - 6 PCO adicionales (PCO-007 a 012) → Total PCO: 12
-- - 4 ABP adicionales (ABP-007 a 010) → Total ABP: 10
-- - 4 RND adicionales (RND-010 a 013) → Total RND: 13
-- ============================================================================
-- TOTAL ACUMULADO: 95 tareas
-- ============================================================================
