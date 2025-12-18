-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTES 9-10 DE TAREAS (96-115)
-- ============================================================================
-- 20 tareas adicionales - Enfoque: EVO, AVD, SSG especializados
-- ============================================================================

-- ============================================================================
-- EVOLUCIONES (EVO) - 5 tareas adicionales
-- ============================================================================

-- EVO 12: Acción Combinada 1-2
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
    es_plantilla, es_publica, tags
) VALUES (
    'Pared y Continuidad: Automatismos 1-2', 'EVO-012',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    16, 10, 1.25, 0.5,
    40, 30, 'medio_campo',
    6, 8, 1, 'Parejas + POR',
    'Trabajo de paredes 1-2 en secuencia. Parejas realizan paredes consecutivas hasta finalizar. Mínimo 2 paredes antes de disparo. Automatizar combinación rápida.',
    'Primera pareja inicia',
    'Gol o pérdida',
    '["Mínimo 2 paredes antes de finalizar", "Pared = 1 toque obligatorio", "Continuidad inmediata tras pared"]',
    'ataque_organizado', 'Paredes consecutivas', 'Pase y devolución 1 toque', 'Automatizar la pared',
    'Media intensidad', 'media', 145, 165,
    2,
    '["Ofrecer línea clara", "Devolución al primer toque", "Carrera tras pase", "Finalización decidida"]',
    '["No continuar tras pared", "Devolución lenta", "No desmarque tras pase"]',
    '[{"nombre": "Con defensor", "descripcion": "Añadir oposición", "dificultad": "+1"}, {"nombre": "1 pared", "descripcion": "Menos exigencia", "dificultad": "-1"}]',
    '["1 pared → 2 paredes → 3 paredes → Con oposición"]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x10"]',
    '["MD-2", "MD-3"]',
    true, true,
    '["pared", "1-2", "combinación", "automatismo", "finalización"]'
);

-- EVO 13: Ataque Posicional por Banda
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
    'Ataque Posicional: Sobrecarga en Banda', 'EVO-013',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.75, 0.5,
    50, 35, 'banda_area',
    10, 12, 1, 'Lateral + Extremo + Interior + 9 + Apoyo + POR',
    'Trabajo de sobrecarga en banda. 5 jugadores sobrecargan un lado para crear superioridad, generar centro o situación de finalización. Sin oposición para automatizar movimientos.',
    'Lateral inicia con balón',
    'Gol o centro despejado',
    '["5 jugadores en media banda", "Movimientos coordinados de sobrecarga", "3 opciones de finalización: centro, diagonal, combinación"]',
    'ataque_organizado', 'Sobrecarga', 'Superioridad en banda', 'Generar ocasión con sobrecarga lateral',
    'Media intensidad', 'media', 140, 160,
    2,
    '["Lateral profundidad", "Extremo amplitud/profundidad", "Interior conexión", "9 fija y ataca área", "Llegada segunda línea"]',
    '["Movimientos descoordinados", "Todos al mismo espacio", "Centro precipitado"]',
    '[{"nombre": "Con 2 defensores", "descripcion": "Oposición ligera", "dificultad": "+1"}, {"nombre": "Sobrecarga izquierda", "descripcion": "Cambiar lado", "dificultad": "="}]',
    '["Portería reglamentaria", "Conos posiciones x6", "Balones x10"]',
    '["MD-2", "MD-1"]',
    true, true,
    '["sobrecarga", "banda", "ataque posicional", "automatismo", "superioridad"]'
);

-- EVO 14: Desmarque de Apoyo-Ruptura
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
    'Apoyo-Ruptura: Secuencia de Desmarques', 'EVO-014',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    18, 10, 1.5, 0.5,
    50, 40, 'medio_campo',
    6, 8, 1, 'Pasador + Delanteros + POR',
    'Trabajo de secuencia desmarque de apoyo seguido de ruptura. Delantero baja a recibir (apoyo), devuelve, y realiza ruptura al espacio para recibir y finalizar.',
    'Mediocentro con balón',
    'Gol o fuera',
    '["Secuencia: apoyo → devolución → ruptura → pase → finalización", "Timing crítico entre apoyo y ruptura"]',
    'ataque_organizado', 'Apoyo y ruptura', 'Desmarque secuencial', 'Control orientado y carrera', 'Combinar apoyo con ruptura',
    'Alta intensidad', 'alta', 155, 175,
    2,
    '["Apoyo ofreciendo cuerpo", "Devolución primer toque", "Ruptura inmediata", "Comunicar al pasador"]',
    '["Apoyo de espaldas", "No continuar con ruptura", "Timing descoordinado"]',
    '[{"nombre": "Con central", "descripcion": "Añadir marca", "dificultad": "+1"}, {"nombre": "Solo ruptura", "descripcion": "Sin fase de apoyo", "dificultad": "-1"}]',
    '["Solo apoyo → Solo ruptura → Apoyo+ruptura → Con defensor"]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x10"]',
    '["MD-3", "MD-2"]',
    'Explosividad, cambios de ritmo',
    true, true,
    '["apoyo", "ruptura", "desmarque", "delantero", "secuencia", "movimiento"]'
);

-- EVO 15: Finalización Tras Robo
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
    variantes, material, match_days_recomendados,
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Transición: Robo y Finalización Directa', 'EVO-015',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    16, 10, 1.25, 0.5,
    55, 45, 'medio_campo',
    10, 12, 2, '3 robadores + 2 finalizadores + POR vs simuladores',
    'Simulación de robo y finalización directa. 3 jugadores realizan pressing simulado, roban y transicionan en 2-3 toques para que los 2 delanteros finalicen. Máxima velocidad.',
    'Entrenador pasa a simuladores, robadores presionan',
    'Gol o pérdida',
    '["Robo simulado (entrenador señala momento)", "Máximo 4 toques tras robo", "Finalizar en 5 segundos"]',
    'transicion_defensa_ataque', 'Finalización tras robo', 'Pase de transición y remate', 'Convertir robo en gol inmediato',
    'Muy alta intensidad', 'alta', 170, 190,
    2,
    '["Primer pase vertical", "Delanteros preparados para recibir", "Finalización primer toque", "Atacar rechace"]',
    '["Transición lenta", "Exceso de toques", "Delanteros mal posicionados"]',
    '[{"nombre": "Sin límite toques", "descripcion": "Más margen", "dificultad": "-1"}, {"nombre": "3 toques", "descripcion": "Más directo", "dificultad": "+1"}]',
    '["Porterías reglamentarias x2", "Conos", "Petos", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Sprints, explosividad',
    true, true,
    '["robo", "transición", "finalización", "directo", "velocidad"]'
);

-- EVO 16: Juego Combinativo Zona 14
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
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Combinación en Zona 14: Triangulaciones', 'EVO-016',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.75, 0.5,
    35, 40, 'zona_14',
    8, 10, 1, 'Mediapunta + Delantero + Interiores + POR',
    'Trabajo de combinaciones en zona 14. 4-5 atacantes combinan con triangulaciones en espacio reducido frente al área hasta generar ocasión. Énfasis en paredes y terceros.',
    'Interior con balón en zona 14',
    'Gol o pérdida',
    '["Máximo 2 toques", "Al menos 2 triangulaciones antes de finalizar", "Movimiento constante"]',
    'ataque_organizado', 'Juego combinativo', 'Triangulaciones en zona 14', 'Pared y tercer hombre', 'Desarticular defensa con combinaciones',
    'Media intensidad', 'media', 145, 165,
    3,
    '["Triangular constantemente", "Pared al primer toque", "Tercer hombre", "Finalización decidida"]',
    '["Jugar individual", "No triangular", "Finalizar de lejos"]',
    '[{"nombre": "Con 2 defensores", "descripcion": "Oposición real", "dificultad": "+1"}, {"nombre": "Libre de toques", "descripcion": "Sin restricción", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos zona 14", "Balones x10"]',
    '["MD-2", "MD-3"]',
    'Creatividad, visión, paciencia con presión',
    true, true,
    '["zona 14", "triangulaciones", "combinación", "creatividad", "finalización"]'
);

-- ============================================================================
-- ATAQUE VS DEFENSA (AVD) - 5 tareas adicionales
-- ============================================================================

-- AVD 12: Ataque Posicional Completo
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
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Ataque Posicional 11v10+POR Campo Real', 'AVD-012',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    28, 3, 8, 2,
    75, 68, 'tres_cuartos_campo',
    22, 22, 1, '11v10+POR',
    'Trabajo de ataque posicional a escala real. 11 atacantes (incluyendo portero que sale) contra 10 defensores + POR. Construir desde atrás y generar ocasión de gol.',
    'Portero atacante con balón',
    'Gol, fuera o robo con contraataque',
    '["Portero atacante puede salir a jugar", "Atacantes mantienen estructura", "Si hay robo, contraataque a mini portería"]',
    'ataque_organizado', 'Ataque posicional completo', 'Construcción y finalización', 'Dominar partido con posesión y finalizar',
    'Media-alta intensidad', 'alta', 150, 170,
    3,
    '["Estructura según sistema del equipo", "Paciencia", "Ocupar zonas", "Buscar espacios para finalizar"]',
    '["Pressing escalonado", "Compactar", "Transición si roban", "Cerrar zona de finalización"]',
    '["Perder estructura", "Precipitarse", "No usar amplitud"]',
    '[{"nombre": "11v9", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "11v11", "descripcion": "Igualdad", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Mini portería contraataque", "Conos", "Petos 2 colores", "Balones x10"]',
    '["MD-3", "MD-2"]',
    'Resistencia específica de partido',
    true, true,
    '["ataque posicional", "11v10", "real", "construcción", "táctico"]'
);

-- AVD 13: Defensa Pressing Escalonado
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
    'Pressing Escalonado 7v8+POR', 'AVD-013',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    22, 5, 3.5, 1,
    60, 65, 'tres_cuartos_campo',
    16, 16, 1, '7v8+POR',
    'Trabajo de pressing escalonado. 7 presionadores organizados en 3 líneas (2-3-2 o similar) contra 8+POR que salen jugando. Objetivo: forzar error y robar en zona alta.',
    'Portero con balón',
    'Robo con gol en mini portería, o balón supera líneas',
    '["Pressing en 3 líneas", "Robo en zona alta = gol en mini portería", "Si superan, replegar ordenado"]',
    'defensa_organizada', 'Pressing escalonado', 'Pressing en líneas', 'Robar alto con organización',
    'Alta intensidad', 'alta', 160, 180,
    3,
    '["Paciencia", "Buscar hombre libre", "Superar líneas con pase", "Usar amplitud"]',
    '["1ª línea cierra opciones centrales", "2ª línea cobertura", "3ª línea vigila", "Pressing gatillo"]',
    '["Pressing individual", "Romper líneas", "No escalonar"]',
    '[{"nombre": "8v8", "descripcion": "Un presionador más", "dificultad": "-1"}, {"nombre": "6v8", "descripcion": "Menos presionadores", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Mini portería x1", "Conos líneas", "Petos 2 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Sprints coordinados, resistencia',
    'Coordinación colectiva, paciencia en pressing',
    true, true,
    '["pressing", "escalonado", "líneas", "organización", "defensa"]'
);

-- AVD 14: Transición Defensiva Colectiva
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
    'Transición Defensiva 6v5+POR Colectiva', 'AVD-014',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    18, 6, 2.5, 0.75,
    55, 50, 'medio_campo',
    12, 12, 1, '6v5+POR',
    'Trabajo de transición defensiva colectiva. 6 atacantes pierden balón (simulado) y deben transicionar a defender contra 5 atacantes + POR que contraatacan. 8 segundos para organizarse.',
    'Entrenador quita balón a equipo de 6, pasa a equipo de 5',
    'Gol, fuera, o defensa recupera y controla',
    '["Pérdida simulada", "6 defensores empiezan en posición de ataque", "8 segundos para evitar gol"]',
    'transicion_ataque_defensa', 'Transición defensiva', 'Repliegue colectivo', 'Organizarse defensivamente tras pérdida',
    'Muy alta intensidad', 'alta', 170, 190,
    2,
    '["Contraataque rápido", "Verticalidad", "Aprovechar desorganización", "Finalizar pronto"]',
    '["Repliegue inmediato", "Priorizar zona central", "Temporizar", "No entrar individual"]',
    '["Repliegue lento", "Ir todos al balón", "No cerrar centro"]',
    '[{"nombre": "6v4", "descripcion": "Menos atacantes en contra", "dificultad": "-1"}, {"nombre": "6v6", "descripcion": "Igualdad", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Petos 2 colores", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Sprints de repliegue, recuperación',
    'Mentalidad de sacrificio, no pánico',
    true, true,
    '["transición defensiva", "repliegue", "colectivo", "organización"]'
);

-- AVD 15: Situación de Penalti (Provocar/Evitar)
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
    '1v1 en Área: Provocar/Evitar Penalti', 'AVD-015',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    16, 10, 1.25, 0.5,
    20, 25, 'area_grande',
    6, 8, 1, '1v1+POR en área',
    'Duelos 1v1 dentro del área. Atacante intenta marcar o provocar penalti. Defensor intenta robar sin hacer falta. Trabajo de inteligencia en área para ambos roles.',
    'Entrenador pasa al atacante en entrada de área',
    'Gol, penalti, robo limpio o fuera',
    '["Árbitro (entrenador) decide si hay penalti", "Defensor: robar sin falta", "Atacante: gol o provocar penalti legal"]',
    'ataque_organizado', 'Duelo en área', 'Regate o búsqueda de contacto', 'Inteligencia en área',
    'Media intensidad', 'media', 145, 165,
    2,
    '["Encarar", "Proteger balón", "Buscar contacto si no puede superar", "Finalizar si tiene opción"]',
    '["No entrar", "Posición corporal lateral", "Acompañar sin tocar", "Solo tackle si 100% seguro"]',
    '["Atacante: simular sin contacto", "Defensor: entrar y hacer falta"]',
    '[{"nombre": "2v1 área", "descripcion": "Superioridad atacante", "dificultad": "-1"}, {"nombre": "1v2 área", "descripcion": "Doble marca", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos entrada área", "Balones x8"]',
    '["MD-3", "MD-2"]',
    'Inteligencia, sangre fría, decisión',
    true, true,
    '["1v1", "área", "penalti", "duelo", "inteligencia", "defensa"]'
);

-- AVD 16: Defensa de Contraataque
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
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Defensa de Contraataque 2v3+POR', 'AVD-016',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.5, 0.75,
    60, 50, 'medio_campo',
    8, 8, 1, '2v3+POR',
    'Defensa de contraataque en inferioridad 2v3. 2 defensores + POR deben frenar contraataque de 3 atacantes. Énfasis en temporizar y esperar llegada de ayuda (simulada tras 8 seg).',
    'Entrenador pasa al equipo de 3',
    'Gol, robo o 8 segundos (llega ayuda)',
    '["2 defensores vs 3 atacantes", "8 segundos = llega ayuda (fin del ejercicio)", "Temporizar sin entrar"]',
    'defensa_organizada', 'Defensa en inferioridad', 'Temporizar contraataque', 'Evitar gol hasta llegada de ayuda',
    'Alta intensidad', 'alta', 165, 185,
    2,
    '["Atacar rápido", "No dar tiempo", "Buscar pase de gol", "Finalizar antes de 8 seg"]',
    '["Temporizar", "No entrar", "Orientar hacia banda", "Cerrar pase de gol", "Ganar tiempo"]',
    '["Entrar precipitado", "Dejar pase de gol", "No comunicar"]',
    '[{"nombre": "2v2", "descripcion": "Igualdad", "dificultad": "-1"}, {"nombre": "2v4", "descripcion": "Mayor inferioridad", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos", "Petos", "Balones x10", "Cronómetro"]',
    '["MD-4", "MD-3"]',
    'Sprints de repliegue, resistencia',
    true, true,
    '["contraataque", "inferioridad", "temporizar", "defensa", "2v3"]'
);

-- ============================================================================
-- SSG - 5 tareas adicionales
-- ============================================================================

-- SSG 12: Partido Posesión Progresiva
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
    'SSG 6v6 Progresivo (5-8-10 Pases)', 'SSG-012',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1.5,
    45, 35, 'rectangular',
    12, 12, 0, '6v6',
    'Partido 6v6 donde los puntos dependen de pases antes de gol: 5 pases = 1 punto, 8 pases = 2 puntos, 10+ pases = 3 puntos. Combina posesión con finalización.',
    'Saque lateral',
    'Gol o tiempo',
    '["Contar pases antes de gol", "Gol sin pases mínimos = 0 puntos", "Reinicio desde portería tras gol"]',
    'Gol tras 5 pases = 1pt, 8 pases = 2pts, 10+ = 3pts',
    'ataque_organizado', 'Posesión productiva', 'Combinar posesión con gol',
    'Alta intensidad', 43.8, 'alta', 155, 175,
    2,
    '["Circular para acumular pases", "Finalizar cuando lleguen a umbral", "Paciencia con propósito"]',
    '["Pressing para evitar pases", "Cortar secuencias", "Forzar pérdida temprana"]',
    '["Acumular pases sin finalizar", "Finalizar sin pases suficientes"]',
    '[{"nombre": "Solo 10 pases", "descripcion": "Un solo umbral", "dificultad": "+1"}, {"nombre": "3-5-8", "descripcion": "Umbrales más bajos", "dificultad": "-1"}]',
    '["Mini porterías x2", "Conos x8", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Resistencia con posesión',
    true, true,
    '["posesión progresiva", "SSG", "pases", "finalización", "umbrales"]'
);

-- SSG 13: Partido con Zonas de Puntuación
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
    es_plantilla, es_publica, tags
) VALUES (
    'SSG 5v5 Zonas de Puntuación Variable', 'SSG-013',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1,
    40, 30, 'rectangular',
    10, 10, 0, '5v5',
    'Partido 5v5 con mini porterías donde los goles valen diferente según desde qué zona se marcan: zona lejana = 1pt, zona media = 2pts, zona cercana = 3pts. Incentiva progresión.',
    'Saque lateral',
    'Gol o tiempo',
    '["Campo dividido en 3 zonas horizontales", "Gol desde zona 1 (lejos) = 1pt", "Zona 2 = 2pts", "Zona 3 (cerca) = 3pts"]',
    'Gol zona 1 = 1pt, zona 2 = 2pts, zona 3 = 3pts',
    'ataque_organizado', 'Progresión', 'Avanzar para puntuar más',
    'Alta intensidad', 60, 'alta', 160, 180,
    2,
    '["Progresar para más puntos", "No conformarse con gol de lejos", "Buscar zona 3"]',
    '["Defender especialmente zona 3", "No permitir llegada cercana", "Pressing alto"]',
    '["Conformarse con goles de zona 1", "No progresar", "Defender solo cerca"]',
    '[{"nombre": "2 zonas", "descripcion": "Menos complejidad", "dificultad": "-1"}, {"nombre": "4 zonas", "descripcion": "Más opciones", "dificultad": "+1"}]',
    '["Mini porterías x2", "Conos zonas x4", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    true, true,
    '["zonas puntuación", "SSG", "progresión", "variable", "incentivo"]'
);

-- SSG 14: Torneo Relámpago
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
    'Torneo Relámpago 4v4: 2 Minutos', 'SSG-014',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    24, 1, 22, 2,
    30, 22, 'rectangular',
    12, 16, 0, '4v4 (3-4 equipos)',
    'Torneo relámpago con partidos de 2 minutos. 3-4 equipos de 4 jugadores. Todos contra todos. Liga exprés. Ganador = equipo con más puntos totales al final.',
    'Según cuadro de enfrentamientos',
    'Gol o tiempo (2 min)',
    '["Partidos de 2 minutos exactos", "Ganador = 3pts, empate = 1pt", "Diferencia de goles desempata"]',
    'Victoria = 3pts, Empate = 1pt, Derrota = 0pts',
    'transicion_defensa_ataque', 'Competición exprés', 'Ganar partidos cortos',
    'Muy alta intensidad', 41.3, 'alta', 175, 195,
    1,
    '["Intensidad desde el inicio", "Marcar rápido", "No relajarse"]',
    '["No permitir goles", "Defender como final", "Concentración total"]',
    '["Empezar lento", "Especular", "Bajar ritmo"]',
    '[{"nombre": "3 minutos", "descripcion": "Partidos más largos", "dificultad": "-1"}, {"nombre": "90 segundos", "descripcion": "Ultra cortos", "dificultad": "+1"}]',
    '["Mini porterías x2", "Conos x8", "Petos varios colores", "Balones x4", "Cronómetro", "Pizarra"]',
    '["MD-4"]',
    'Intensidad máxima sostenida',
    'Competitividad, presión, mentalidad ganadora',
    true, true,
    '["torneo", "relámpago", "2 minutos", "competición", "intensidad"]'
);

-- SSG 15: Partido Ascenso-Descenso
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
    'SSG Ascenso-Descenso: 3 Canchas', 'SSG-015',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    25, 1, 23, 2,
    75, 60, 'tres_campos_paralelos',
    18, 24, 0, '3v3 en 3 campos (6 equipos)',
    '3 campos paralelos (A, B, C). 6 equipos de 3. Ganador en B sube a A, perdedor en B baja a C. Rotación constante. Objetivo: llegar y mantenerse en campo A.',
    'Sorteo inicial de campos',
    'Gol o tiempo (3 min por partido)',
    '["Partidos de 3 min", "Ganador sube campo, perdedor baja", "Empate = se queda", "Campo A = máximo nivel"]',
    'Terminar en campo A = ganador',
    'transicion_defensa_ataque', 'Ascenso-descenso', 'Ganar para subir',
    'Muy alta intensidad', 33.3, 'alta', 170, 190,
    1,
    '["Ganar para ascender", "Intensidad máxima", "No permitir descenso"]',
    '["Evitar goles para no bajar", "Defender nivel", "Presión constante"]',
    '["Conformarse con empate", "Relajarse en campo alto"]',
    '[{"nombre": "2 campos", "descripcion": "Solo sube/baja", "dificultad": "-1"}, {"nombre": "4 campos", "descripcion": "Más niveles", "dificultad": "+1"}]',
    '["Mini porterías x6 (2 por campo)", "Conos x24", "Petos 6 colores", "Balones x9"]',
    '["MD-4"]',
    'Motivación por ascenso, presión de descenso',
    true, true,
    '["ascenso-descenso", "3 campos", "competición", "motivación", "SSG"]'
);

-- SSG 16: Partido Reinicio Rápido
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
    'SSG 5v5 Reinicio Inmediato', 'SSG-016',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    18, 4, 3.5, 1.5,
    35, 28, 'rectangular',
    10, 10, 0, '5v5',
    'Partido 5v5 donde tras cada gol o fuera, el reinicio es INMEDIATO desde donde quedó el balón (el que tiene más cerca saca). Sin pausa. Transiciones constantes.',
    'Balón al aire',
    'Tiempo',
    '["Reinicio inmediato tras gol", "Saque desde donde el balón salió/quedó", "No hay pausa", "Jugador más cercano saca"]',
    'Goles acumulados',
    'transicion_defensa_ataque', 'Transiciones continuas', 'Estar siempre activo',
    'Muy alta intensidad', 49, 'alta', 170, 190,
    2,
    '["Estar siempre preparado", "No celebrar goles", "Transición inmediata", "Atacar reinicio rápido"]',
    '["Nunca bajar guardia", "Posicionarse tras gol", "Transición defensiva constante"]',
    '["Relajarse tras gol", "No estar listo para reinicio", "Celebrar"]',
    '[{"nombre": "Con pausa 3 seg", "descripcion": "Pequeña pausa", "dificultad": "-1"}, {"nombre": "Entrenador saca", "descripcion": "Reinicio neutral", "dificultad": "="}]',
    '["Mini porterías x2", "Conos x8", "Petos 2 colores", "Balones x8"]',
    '["MD-4"]',
    'Resistencia a alta intensidad sin pausa',
    'Concentración continua, no relajarse',
    true, true,
    '["reinicio rápido", "transiciones", "SSG", "sin pausa", "intensidad"]'
);

-- ============================================================================
-- RONDOS (RND) - 2 tareas adicionales
-- ============================================================================

-- RND 14: Rondo Pressing Direccional
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
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo Pressing Orientado 5v3 a Portería', 'RND-014',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    16, 5, 2.5, 0.75,
    20, 15, 'rectangular',
    8, 8, 0, '5v3',
    'Rondo 5v3 direccional. 5 poseedores deben llegar a una mini portería tras 6 pases. 3 defensores orientan el pressing hacia el lado contrario. Trabaja pressing con orientación.',
    'Entrenador pasa a equipo de 5',
    '6 pases + gol en mini portería, o robo',
    '["6 pases antes de poder finalizar", "Defensores orientan pressing hacia lado sin portería"]',
    '6 pases + gol = 1 punto, Robo = 1 punto',
    'defensa_organizada', 'Pressing orientado', 'Orientar hacia lado débil', 'Robar orientando al rival',
    'Alta intensidad', 37.5, 'alta', 160, 180,
    3,
    '["Circular para acumular pases", "Progresar hacia portería", "No dejarse orientar"]',
    '["Orientar lejos de portería", "Pressing coordinado", "Cerrar lado de portería"]',
    '["Dejarse llevar al lado débil", "No identificar orientación", "Pressing descoordinado"]',
    '[{"nombre": "4v2", "descripcion": "Menos presión", "dificultad": "-1"}, {"nombre": "5v4", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["Mini portería x1", "Conos x6", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Lectura del pressing, inteligencia táctica',
    true, true,
    '["rondo", "pressing", "orientación", "direccional", "táctica"]'
);

-- RND 15: Rondo con Superioridad Variable
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
    'Rondo Superioridad Variable 5v2→5v3→5v4', 'RND-015',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    16, 3, 4, 1.5,
    14, 14, 'cuadrado',
    9, 9, 0, '5v2 → 5v3 → 5v4 progresivo',
    'Rondo con superioridad decreciente. Empieza 5v2, cada 90 segundos entra un defensor más (5v3, luego 5v4). Poseedores deben adaptarse a menor superioridad.',
    'Entrenador pasa al equipo de 5',
    'Tiempo de serie (4 min total)',
    '["90 seg = 5v2, 90 seg = 5v3, 90 seg = 5v4", "Defensor entra al silbato", "Adaptación inmediata"]',
    'Pases acumulados durante toda la serie',
    'ataque_organizado', 'Adaptación a superioridad', 'Ajustar juego según contexto',
    'Alta intensidad', 21.8, 'alta', 155, 180,
    2,
    '["Aprovechar 5v2", "Adaptarse a 5v3", "Máxima concentración en 5v4"]',
    '["2 defensores: presión básica", "3 defensores: cerrar triángulos", "4 defensores: pressing total"]',
    '["No adaptarse al cambio", "Mismo ritmo con más defensores"]',
    '[{"nombre": "Superioridad creciente", "descripcion": "5v4→5v3→5v2", "dificultad": "-1"}, {"nombre": "Sin aviso", "descripcion": "Entra sin silbato", "dificultad": "+1"}]',
    '["Conos x4", "Petos 2 colores", "Balones x4", "Silbato"]',
    '["MD-4", "MD-3"]',
    'Adaptabilidad, concentración progresiva',
    true, true,
    '["rondo", "superioridad variable", "adaptación", "progresivo"]'
);

-- ============================================================================
-- ABP - 3 tareas adicionales
-- ============================================================================

-- ABP 11: Córner Variantes Ofensivas
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
    'Córner Ofensivo: 5 Variantes Tácticas', 'ABP-011',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    25, 12, 1.5, 0.5,
    30, 40, 'area_grande',
    12, 16, 1, '8-10 atacantes + POR',
    'Trabajo de 5 variantes de córner ofensivo: primer palo con bloqueo, segundo palo, córner en corto, córner atrás, córner con movimiento de engaño. Señalización codificada.',
    'Señal del lanzador indica variante',
    'Gol o despeje',
    '["5 variantes codificadas", "Todos conocen todas", "Señalización visual acordada"]',
    'ataque_organizado', 'Córner ofensivo', '5 variantes de córner', 'Generar gol con variedad',
    'Baja intensidad con picos', 'baja', 105, 135,
    2,
    '["Conocer señales", "Timing de carrera", "Atacar balón", "Vigiar rechace"]',
    '["Confundir señal", "Timing incorrecto", "Todos al mismo punto"]',
    '[{"nombre": "Con defensores activos", "descripcion": "Oposición real", "dificultad": "+1"}, {"nombre": "3 variantes", "descripcion": "Menos complejidad", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x12"]',
    '["MD-2", "MD-1"]',
    true, true,
    '["córner", "variantes", "ofensivo", "ABP", "estrategia"]'
);

-- ABP 12: Falta Lateral Defensiva
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
    'Defensa Falta Lateral: Zona + Marcaje', 'ABP-012',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    20, 10, 1.5, 0.5,
    30, 40, 'area_grande',
    14, 18, 1, '7-9 defensores + POR vs 6-8 atacantes',
    'Defensa de faltas laterales con sistema mixto. 4 en zona (línea de gol), resto marcaje individual. Incluye práctica de salida en contraataque tras despeje.',
    'Lanzador indica tipo de falta',
    'Despeje con contraataque o gol',
    '["4 en zona línea de gol", "Resto marcaje nominal", "Barrera si necesario", "Salida rápida tras despeje"]',
    'defensa_organizada', 'Defensa falta lateral', 'Sistema mixto', 'Evitar gol y salir rápido',
    'Baja intensidad con picos', 'baja', 100, 130,
    2,
    '["Zona siempre ocupada", "No perder marca", "Comunicar con portero", "Despejar a banda", "Transición si despejamos"]',
    '["Zona vacía", "Perder marca", "Despeje al centro", "No salir tras despeje"]',
    '[{"nombre": "Solo zona", "descripcion": "8 en zona", "dificultad": "-1"}, {"nombre": "Solo individual", "descripcion": "Sin zona", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Petos 2 colores", "Balones x10"]',
    '["MD-2", "MD-1"]',
    'Concentración, comunicación, liderazgo',
    true, true,
    '["falta lateral", "defensa", "zona", "marcaje", "ABP"]'
);

-- ABP 13: Saque Centro Defensivo
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
    'Defensa Saque Centro: Presión Inmediata', 'ABP-013',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    16, 8, 1.5, 0.5,
    60, 68, 'medio_campo',
    16, 20, 1, '8-10 defensores + POR vs 8-9 atacantes',
    'Defensa de saque de centro con pressing inmediato. Al tocar balón el rival, activar pressing coordinado para recuperar rápido. Trabajo de primeros 10 segundos de partido.',
    'Saque de centro rival',
    '10 segundos o robo',
    '["Pressing inmediato al saque", "Objetivo: robar en primeros 10 seg", "Si roban, transición a mini portería"]',
    'defensa_organizada', 'Pressing saque centro', 'Presión inicial', 'Robar inmediatamente tras saque',
    'Alta intensidad', 'alta', 165, 185,
    2,
    '["Pressing agresivo desde el inicio", "Cercar al receptor", "No dejar progresión", "Transición si roban"]',
    '["Pressing tardío", "Ir todos al balón", "Dejar progresar fácil"]',
    '[{"nombre": "Sin pressing", "descripcion": "Solo organización", "dificultad": "-1"}, {"nombre": "8 segundos", "descripcion": "Menos tiempo", "dificultad": "+1"}]',
    '["Mini portería x1", "Conos medio campo", "Petos 2 colores", "Balones x6"]',
    '["MD-1", "MD (pre-partido)"]',
    'Intensidad desde el inicio, concentración',
    true, true,
    '["saque centro", "pressing", "defensa", "inicio", "ABP"]'
);

-- ============================================================================
-- FIN DE LOTES 9-10 - 20 TAREAS ADICIONALES (96-115)
-- ============================================================================
-- Resumen Lotes 9-10:
-- - 5 EVO adicionales (EVO-012 a 016) → Total EVO: 16
-- - 5 AVD adicionales (AVD-012 a 016) → Total AVD: 16
-- - 5 SSG adicionales (SSG-012 a 016) → Total SSG: 16
-- - 2 RND adicionales (RND-014, 015) → Total RND: 15
-- - 3 ABP adicionales (ABP-011 a 013) → Total ABP: 13
-- ============================================================================
-- TOTAL ACUMULADO: 115 tareas
-- ============================================================================
