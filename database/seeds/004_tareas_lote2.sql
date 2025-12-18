-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTE 2 DE TAREAS (26-35)
-- ============================================================================
-- 10 tareas adicionales - Enfoque: Defensa, transiciones, físico
-- ============================================================================

-- ============================================================================
-- ATAQUE VS DEFENSA (AVD) - 3 tareas adicionales
-- ============================================================================

-- AVD 3: Repliegue Intensivo
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
    'Repliegue Intensivo 4v6+POR', 'AVD-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    20, 6, 2.5, 1,
    55, 65, 'medio_campo',
    11, 11, 1, '4v6+POR',
    'Trabajo de repliegue defensivo. 4 atacantes salen en contraataque contra 6 defensores que deben replegar desde posición adelantada. Simula pérdida en campo rival.',
    'Entrenador pasa a atacantes (defensores en campo contrario)',
    'Gol, fuera o recuperación defensiva',
    '["Atacantes máximo 8 segundos para finalizar", "Defensores empiezan 50m de su portería"]',
    'transicion_ataque_defensa', 'Repliegue', 'Recuperación de posiciones', 'Ganar terreno al balón',
    'Muy alta intensidad', 'alta', 170, 190,
    2,
    '["Verticalidad", "Superioridad numérica", "No dar tiempo al repliegue", "Finalizar rápido"]',
    '["Sprint de repliegue", "Retardar balón", "Cerrar línea de gol primero", "No entrar, temporizar"]',
    '["Repliegue lento", "Ir al balón todos", "Dejar espacio a espalda"]',
    '[{"nombre": "3v6", "descripcion": "Más ventaja defensiva", "dificultad": "-1"}, {"nombre": "4v5", "descripcion": "Menos defensores", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos posición inicial", "Petos", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Sprints de repliegue, recuperación',
    'Mentalidad defensiva, sacrificio',
    true, true,
    '["repliegue", "transición", "defensa", "intensidad", "sprint"]'
);

-- AVD 4: Defensa en Bloque Bajo
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
    'Defensa Bloque Bajo 10v8+POR', 'AVD-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1,
    45, 65, 'campo_propio',
    19, 19, 1, '10v8+POR',
    'Trabajo de defensa en bloque bajo (4-4-2 o 5-3-2). 8 defensores + POR defienden contra 10 atacantes. Énfasis en compactar, basculaciones y vigilancias. Al robo, transición a mini portería.',
    'Entrenador pasa a atacantes',
    'Gol, robo con transición o tiempo',
    '["Defensores en 2 líneas de 4 + línea de 2 o 5-3-2", "No pressing alto permitido", "Gol en mini tras robo vale x3"]',
    'defensa_organizada', 'Bloque bajo', 'Compactación defensiva', 'Evitar ocasiones y salir al contraataque',
    'Media intensidad', 'media', 135, 155,
    2,
    '["Paciencia", "Circulación para abrir hueco", "Centros al área", "Disparos desde fuera"]',
    '["Línea defensiva junta", "Basculación", "Vigilancias", "No salir al balón", "Cerrar espacios"]',
    '["Romper línea defensiva", "Salir a balón lejano", "Espacios entre líneas"]',
    '[{"nombre": "10v9", "descripcion": "Un defensor más", "dificultad": "-1"}, {"nombre": "10v7", "descripcion": "Un defensor menos", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Mini portería contraataque", "Conos", "Petos", "Balones x10"]',
    '["MD-3", "MD-2"]',
    'Resistencia posicional, desplazamientos',
    'Paciencia defensiva, concentración',
    true, true,
    '["bloque bajo", "defensa", "basculación", "compacto", "transición", "táctico"]'
);

-- AVD 5: Duelos 1v1 por Zonas
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
    'Duelos 1v1 Secuenciales con Finalización', 'AVD-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    18, 10, 1.2, 0.5,
    30, 20, 'rectangular',
    6, 10, 1, '1v1 en secuencia',
    'Duelos 1v1 individuales. Atacante parte con balón, debe superar al defensor y finalizar en portería. Si el defensor roba, puede contraatacar a mini portería. Rotación rápida.',
    'Entrenador pasa al atacante',
    'Gol, fuera o robo con contragol',
    '["Máximo 6 segundos para finalizar", "Defensor puede marcar en mini portería si roba"]',
    'ataque_organizado', 'Duelo individual', 'Regate y finalización', 'Superar al rival en 1v1',
    'Muy alta intensidad', 150, 'alta', 170, 195,
    1,
    '["Encarar al defensor", "Amago antes de regate", "Cambio de ritmo", "Finalización rápida"]',
    '["Posición corporal", "No entrar", "Orientar hacia fuera", "Tackle solo cuando seguro"]',
    '["Regate predecible", "Finalizar de lejos", "Defensor entra precipitado"]',
    '[{"nombre": "2v1", "descripcion": "Superioridad atacante", "dificultad": "-1"}, {"nombre": "1v2", "descripcion": "Inferioridad atacante", "dificultad": "+2"}]',
    '["Portería reglamentaria", "Mini portería x1", "Conos x4", "Petos", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Potencia, explosividad, agilidad',
    'Valentía, competitividad, confianza',
    true, true,
    '["duelos", "1v1", "regate", "defensa", "finalización", "intensidad"]'
);

-- ============================================================================
-- EVOLUCIONES (EVO) - 2 tareas adicionales
-- ============================================================================

-- EVO 4: Automatismo de Banda
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
    'Automatismo Lateral-Extremo-Interior', 'EVO-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    16, 8, 1.5, 0.5,
    45, 30, 'banda_area',
    8, 10, 1, 'Lateral + Extremo + Interior + 9 + POR',
    'Automatismo de combinación por banda: Lateral pasa a extremo, extremo combina con interior, pared y centro al área donde ataca el 9 y llegada de segunda línea.',
    'Lateral con balón',
    'Gol o despeje',
    '["Secuencia fija de pases", "Timing de llegadas al área específico", "3 jugadores deben llegar al área"]',
    'ataque_organizado', 'Ataque por banda', 'Combinación de banda', 'Pared y centro', 'Generar centro tras combinación',
    'Media intensidad', 'media', 145, 165,
    2,
    '["Timing de pared", "Desmarque del 9 al primer palo", "Llegada segunda línea segundo palo", "Rechace vigilado"]',
    '["Descoordinación timing", "Centro flojo", "Nadie al área"]',
    '[{"nombre": "Con defensor pasivo", "descripcion": "Añadir oposición ligera", "dificultad": "+1"}, {"nombre": "Variante por dentro", "descripcion": "Finalización sin centro", "dificultad": "="}]',
    '["Sin oposición → Con 1 defensor → Con 2 defensores → Real"]',
    '["Portería reglamentaria", "Conos posiciones x6", "Balones x10"]',
    '["MD-2", "MD-1"]',
    true, true,
    '["automatismo", "banda", "centro", "combinación", "finalización", "coordinación"]'
);

-- EVO 5: Pressing tras Pérdida
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, subprincipio_tactico, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, progresiones, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Gegenpressing 6v6 Zona Central', 'EVO-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    16, 5, 2.5, 1,
    35, 30, 'zona_central',
    12, 12, 0, '6v6',
    'Trabajo de pressing tras pérdida (gegenpressing). Al perder balón, 6 segundos de pressing intenso para recuperar. Si no recuperan, repliegue. Al robar, transición inmediata a mini portería.',
    'Entrenador pasa a un equipo',
    'Gol en mini, 6 pases del equipo recuperador, o tiempo',
    '["6 segundos máximo de pressing tras pérdida", "Si no recuperan en 6s, repliegue", "Gol en mini portería vale si roban en pressing"]',
    'transicion_ataque_defensa', 'Gegenpressing', 'Recuperación inmediata', 'Robar en 6 segundos o replegar',
    'Muy alta intensidad', 43.8, 'alta', 175, 195,
    2,
    '["Transición inmediata al robar", "Verticalidad hacia mini portería", "Apoyo cercano"]',
    '["Pressing inmediato coordinado", "Cercar al poseedor", "Si no recuperan, replegar juntos"]',
    '["Pressing individual", "No replegar tras 6s", "Transición lenta al recuperar"]',
    '[{"nombre": "5v5", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "8 segundos", "descripcion": "Más tiempo pressing", "dificultad": "-1"}]',
    '["4v4 → 5v5 → 6v6 → 7v7 → En partido"]',
    '["Mini porterías x2", "Conos x8", "Petos 2 colores", "Balones x8", "Cronómetro visible"]',
    '["MD-4", "MD-3"]',
    'Capacidad de sprints repetidos, recuperación',
    'Agresividad, mentalidad de pressing',
    true, true,
    '["gegenpressing", "pressing", "transición", "recuperación", "intensidad", "Klopp"]'
);

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 2 tareas adicionales
-- ============================================================================

-- PCO 3: Partido con Comodines Móviles
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
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido 7v7+3 Comodines Interiores', 'PCO-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    25, 2, 10, 2.5,
    65, 50, 'campo_reducido',
    19, 19, 2, '7v7+2POR+3 comodines',
    'Partido 7v7 con 3 comodines móviles que juegan siempre con el equipo en posesión. Comodines pueden moverse por todo el campo. Superioridad constante en posesión (10v7).',
    'Saque de portero',
    'Tiempo de serie',
    '["Comodines máximo 2 toques", "Comodines no pueden tirar a puerta directamente", "Asistencia de comodín vale gol x2"]',
    'ataque_organizado', 'Superioridad numérica', 'Dominar posesión con ventaja numérica',
    'Alta intensidad', 'alta', 160, 180,
    2,
    '["Buscar al comodín para superioridad", "Circular rápido", "Comodines como pivotes"]',
    '["Pressing inteligente", "No perseguir comodín", "Cortar líneas de pase"]',
    '["No usar comodines", "Comodines estáticos", "Pressing desorganizado"]',
    '[{"nombre": "7v7+2", "descripcion": "Menos superioridad", "dificultad": "+1"}, {"nombre": "6v6+4", "descripcion": "Mayor superioridad", "dificultad": "-1"}]',
    '["Porterías reducidas x2", "Conos x8", "Petos 3 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia intermitente',
    true, true,
    '["partido", "comodines", "superioridad", "posesión", "circulación"]'
);

-- PCO 4: Partido con Transiciones Marcadas
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
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Partido 8v8 Goles de Transición x2', 'PCO-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    26, 2, 11, 2,
    70, 55, 'campo_reducido',
    18, 18, 2, '8v8+2POR',
    'Partido 8v8 donde los goles anotados en los primeros 8 segundos tras recuperación valen el doble. Enfatiza transiciones rápidas tanto ofensivas como defensivas.',
    'Saque de centro',
    'Tiempo de serie',
    '["Gol en primeros 8 segundos tras robo = 2 puntos", "Gol normal = 1 punto", "Fuera de juego activo"]',
    'transicion_defensa_ataque', 'Transiciones', 'Marcar en transición rápida',
    'Muy alta intensidad', 'alta', 165, 185,
    2,
    '["Transición inmediata", "Verticalidad tras robo", "No especular", "Finalizar rápido"]',
    '["Pressing tras pérdida", "Evitar contraataque", "Repliegue rápido"]',
    '["Transición lenta", "Exceso de pases tras robo", "No pressing tras pérdida"]',
    '[{"nombre": "6 segundos", "descripcion": "Menos tiempo para bonus", "dificultad": "+1"}, {"nombre": "10 segundos", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    '["Porterías reglamentarias x2", "Petos 2 colores", "Balones x10", "Cronómetro/silbato"]',
    '["MD-4", "MD-3"]',
    'Capacidad de repetir esfuerzos, RSA',
    'Mentalidad de transición, ambición',
    true, true,
    '["partido", "transiciones", "pressing", "contraataque", "intensidad", "competición"]'
);

-- ============================================================================
-- POSESIÓN (POS) - 2 tareas adicionales
-- ============================================================================

-- POS 4: Posesión por Sectores
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
    'Posesión 8v8 Sectores Verticales', 'POS-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1,
    50, 40, 'rectangular',
    16, 16, 0, '8v8',
    'Posesión 8v8 con campo dividido en 3 sectores verticales. Para puntuar: el balón debe pasar por los 3 sectores en secuencia (izq→centro→der o der→centro→izq). Trabaja amplitud y cambio juego.',
    'Entrenador pasa balón',
    'Tiempo de serie',
    '["Libre de toques"]',
    '["Obligatorio pasar por sector central", "No se puede saltar de izq a der directamente"]',
    'Secuencia completa por 3 sectores = 1 punto',
    'ataque_organizado', 'Cambio de orientación', 'Uso de amplitud', 'Pase largo cambio orientación', 'Circular para encontrar espacio',
    'Media intensidad', 31.3, 'media', 145, 165,
    2,
    '["Usar todo el ancho", "Atraer al rival a un lado y cambiar", "Paciencia", "Sector central como conexión"]',
    '["Basculación rápida", "Compactar en zona de balón", "Anticipar cambio"]',
    '["Solo jugar en un sector", "No usar amplitud", "Precipitarse en cambio"]',
    '[{"nombre": "6v6", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "8v8+2", "descripcion": "Con comodines", "dificultad": "-1"}]',
    '["Conos sectores x6", "Petos 2 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia aeróbica, desplazamientos',
    true, true,
    '["posesión", "sectores", "amplitud", "cambio orientación", "circulación", "táctico"]'
);

-- POS 5: Posesión Progresiva
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
    'Posesión 7v7 Líneas de Pase Progresivas', 'POS-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1,
    55, 40, 'rectangular',
    14, 14, 0, '7v7',
    'Posesión con jugadores objetivo en cada extremo. 7v7 con 1 jugador de cada equipo fijo en zona de gol contraria. Punto al conectar con jugador objetivo. Trabaja verticalidad en posesión.',
    'Entrenador pasa balón',
    'Tiempo de serie',
    '["2 toques en zona defensiva", "Libre en ataque"]',
    '["Jugador objetivo no puede salir de su zona", "Jugador objetivo 1 toque para devolver"]',
    'Conexión con jugador objetivo = 1 punto, Si devuelve y rematas = 2 puntos',
    'ataque_organizado', 'Progresión', 'Pase entre líneas', 'Pase filtrado', 'Conectar con referencia ofensiva',
    'Media-alta intensidad', 47.1, 'media', 150, 170,
    3,
    '["Buscar pase vertical", "Movimientos para liberar línea de pase", "Tercer hombre", "Apoyos escalonados"]',
    '["Cerrar línea al objetivo", "Pressing escalonado", "Interceptar pase vertical"]',
    '["Solo jugar horizontal", "No buscar al objetivo", "Objetivo mal posicionado"]',
    '[{"nombre": "Sin jugador objetivo", "descripcion": "Posesión libre", "dificultad": "-1"}, {"nombre": "2 jugadores objetivo", "descripcion": "Más opciones", "dificultad": "-1"}]',
    '["Conos zonas x4", "Petos 2 colores", "Balones x8"]',
    '["MD-4", "MD-3", "MD-2"]',
    'Resistencia con cambios de ritmo',
    'Visión de juego, paciencia con verticalidad',
    true, true,
    '["posesión", "progresión", "vertical", "entre líneas", "jugador objetivo"]'
);

-- ============================================================================
-- FIN DEL LOTE 2 - 10 TAREAS ADICIONALES (26-35)
-- ============================================================================
-- Resumen Lote 2:
-- - 3 Ataque vs Defensa adicionales (AVD-003, 004, 005) → Total AVD: 5
-- - 2 Evoluciones adicionales (EVO-004, 005) → Total EVO: 5
-- - 2 Partidos Condicionados adicionales (PCO-003, 004) → Total PCO: 4
-- - 2 Posesión adicionales (POS-004, 005) → Total POS: 5
-- ============================================================================
-- TOTAL ACUMULADO: 35 tareas
-- ============================================================================
