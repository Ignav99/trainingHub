-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTE 1 DE TAREAS (16-25)
-- ============================================================================
-- 10 tareas adicionales diversificadas
-- ============================================================================

-- ============================================================================
-- RONDOS (RND) - 2 tareas adicionales
-- ============================================================================

-- Rondo 4: 5v3 Alta Intensidad con Transiciones
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas, reglas_psicologicas,
    forma_puntuar,
    fase_juego, principio_tactico, subprincipio_tactico, accion_tecnica, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, ratio_trabajo_descanso, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, progresiones, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo 5v3 Pressing Coordinado', 'RND-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    14, 4, 2.5, 1,
    14, 14, 'cuadrado',
    8, 8, 0, '5v3',
    'Rondo de mayor dificultad con 3 defensores que deben coordinar el pressing. Los 5 poseedores trabajan la circulación bajo presión intensa. Transición inmediata al robo.',
    'Entrenador pasa al equipo de 5',
    'Robo o 15 pases consecutivos',
    '["Máximo 2 toques", "Pase solo a ras de suelo"]',
    '["Defensores presionan en triángulo", "Rotar posición tras 30 segundos"]',
    '["Perdedor del balón hace 10 burpees"]',
    '15 pases = 1 punto, robo = 1 punto para defensores',
    'ataque_organizado', 'Conservación bajo presión', 'Pressing coordinado', 'Pase corto preciso', 'Mantener posesión con superioridad mínima',
    'Alta intensidad intermitente', 24.5, '1:1', 'alta', 160, 180,
    3,
    '["Movilidad constante", "Anticipar siguiente pase", "Cuerpo orientado", "Comunicación"]',
    '["Pressing en triángulo cerrado", "Cerrar línea de pase central", "Coordinación entre los 3"]',
    '["Pase predecible", "Estático tras pasar", "No ofrecer línea de pase"]',
    '[{"nombre": "5v2", "descripcion": "Menos presión", "dificultad": "-1"}, {"nombre": "6v3", "descripcion": "Mayor superioridad", "dificultad": "-1"}, {"nombre": "5v4", "descripcion": "Alta presión", "dificultad": "+2"}]',
    '["4v2 → 5v2 → 5v3 → 6v3 → 6v4"]',
    '["Petos 2 colores", "Conos x4", "Balones x6"]',
    '["MD-3", "MD-2", "MD-4"]',
    'Capacidad aeróbica, agilidad',
    'Concentración bajo fatiga, presión grupal',
    true, true,
    '["rondo", "pressing", "coordinación", "intensidad", "técnica", "posesión"]'
);

-- Rondo 5: Rondo con Cambio de Campo
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
    'Rondo Doble Campo 4v2+4v2', 'RND-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    16, 4, 3, 1,
    24, 12, 'rectangular',
    12, 12, 0, '4v2+4v2',
    'Dos rondos 4v2 paralelos con cambio de campo. Tras 5 pases en un cuadrado, obligatorio pasar al otro. Los defensores del cuadrado receptor se activan. Trabaja visión periférica y cambio de orientación.',
    'Entrenador pasa a cuadrado izquierdo',
    'Robo o tiempo',
    '["2 toques máximo", "Pase de cambio debe ser aéreo"]',
    '["5 pases antes de cambiar obligatorio", "Defensores pueden interceptar pase de cambio"]',
    'Cambio de campo exitoso = 1 punto',
    'ataque_organizado', 'Cambio de orientación', 'Visión periférica', 'Pase largo aéreo', 'Atraer y cambiar',
    'Media-alta intensidad', 24, 'media', 145, 170,
    3,
    '["Mirar al otro campo mientras juegas", "Engañar antes del cambio", "Pase tenso al cambiar"]',
    '["Anticipar cambio", "Posición intermedia para interceptar", "Sprint al balón"]',
    '["Cambio predecible", "Pase flojo", "No mirar al otro campo"]',
    '[{"nombre": "Sin pases mínimos", "descripcion": "Cambio libre", "dificultad": "-1"}, {"nombre": "3 pases mínimo", "descripcion": "Cambio más frecuente", "dificultad": "+1"}]',
    '["Petos 2 colores", "Conos x8", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Visión periférica, cambios de ritmo',
    true, true,
    '["rondo", "cambio orientación", "visión", "pase largo", "táctica"]'
);

-- ============================================================================
-- JUEGO DE POSICIÓN (JDP) - 1 tarea adicional
-- ============================================================================

-- JdP 3: Salida de Balón Completa
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
    'Salida de Balón 6+POR vs 4 con Pivote', 'JDP-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    20, 5, 3, 1,
    45, 60, 'rectangular',
    11, 11, 1, '6+POR vs 4',
    'Salida de balón completa: portero, línea de 4 y doble pivote contra 4 presionadores (2 delanteros + 2 mediapuntas). Objetivo: superar las dos líneas de pressing y llegar a zona segura.',
    'Portero con balón controlado',
    'Balón en zona segura o robo con contraataque',
    '["Portero 3 segundos máximo con balón", "Pivotes libre de toques"]',
    '["No balón largo directo", "Pivote debe recibir al menos 1 vez antes de superar pressing"]',
    'Superar pressing = 1 punto, Por pivote = 2 puntos',
    'ataque_organizado', 'Salida de balón', 'Construcción con pivote', 'Control orientado y giro', 'Superar pressing con pivote',
    'Baja intensidad', 54.5, 'baja', 115, 140,
    3,
    '["Pivote ofrecerse en diagonal", "Centrales abiertos", "Laterales altura", "Tercer hombre"]',
    '["Presión coordinada 2+2", "Cerrar pivote", "Forzar balón largo"]',
    '["Pivote de espaldas", "Laterales bajos", "Portero precipitado"]',
    '[{"nombre": "6+POR vs 5", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "6+POR vs 3", "descripcion": "Menos presión", "dificultad": "-1"}]',
    '["4+POR vs 2 → 4+POR vs 3 → 6+POR vs 4 → 8+POR vs 6"]',
    '["Portería reglamentaria", "Conos zonas", "Petos 2 colores", "Balones x8"]',
    '["MD-3", "MD-2"]',
    'Técnica en calma, movilidad postural',
    'Paciencia, lectura del juego',
    true, true,
    '["salida balón", "pivote", "construcción", "pressing", "posicional", "táctico"]'
);

-- ============================================================================
-- POSESIÓN (POS) - 1 tarea adicional
-- ============================================================================

-- Posesión 3: Tres Equipos Rotación
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
    'Posesión 6v6v6 Tres Equipos', 'POS-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    20, 1, 18, 2,
    35, 35, 'cuadrado',
    18, 18, 0, '6v6v6',
    'Tres equipos de 6 jugadores. Dos equipos mantienen posesión (12v6) mientras uno defiende. Al robar, el equipo que perdió el balón pasa a defender. Sistema de puntos por pases consecutivos.',
    'Entrenador pasa a un equipo',
    'Tiempo de serie',
    '["Máximo 3 toques"]',
    '["No repetir pase inmediatamente al mismo compañero", "Equipo que roba se une al otro en posesión"]',
    '10 pases = 1 punto (para ambos equipos en posesión)',
    'ataque_organizado', 'Conservación', 'Superioridad numérica', 'Pase y apoyo', 'Mantener balón con superioridad 2:1',
    'Media intensidad', 34, 'media', 140, 165,
    2,
    '["Amplitud", "Siempre 2 opciones de pase mínimo", "Cambiar de equipo en posesión frecuentemente"]',
    '["Pressing inteligente", "No todos al balón", "Cortar líneas de pase"]',
    '["Solo jugar con un equipo", "Pases al equipo de tu color siempre", "Desconcentración"]',
    '[{"nombre": "5v5v5", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "2 toques", "descripcion": "Mayor velocidad", "dificultad": "+1"}]',
    '["Petos 3 colores", "Conos x4", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia aeróbica intermitente',
    'Adaptabilidad, concentración',
    true, true,
    '["posesión", "tres equipos", "rotación", "pressing", "superioridad"]'
);

-- ============================================================================
-- EVOLUCIONES (EVO) - 1 tarea adicional
-- ============================================================================

-- Evolución 3: Contraataque
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
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Contraataque 4v3+POR desde Recuperación', 'EVO-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.5, 0.75,
    65, 50, 'medio_campo',
    12, 14, 2, '4v3+POR',
    'Simulación de contraataque tras recuperación. Portero saca largo al mediocampista que inicia 4v3 hacia portería contraria. Máximo 10 segundos para finalizar.',
    'Portero saca de puerta largo',
    'Gol, fuera o 10 segundos',
    '["Máximo 5 toques por jugador", "Finalizar antes de 10 segundos"]',
    '["Primer pase obligatorio hacia adelante", "No está permitido volver atrás"]',
    'Gol = 3 puntos, Disparo = 1 punto, >10 segundos = 0 puntos',
    'transicion_defensa_ataque', 'Contraataque', 'Velocidad en transición', 'Conducción a máxima velocidad', 'Finalizar en transición rápida',
    'Muy alta intensidad', 81.3, 'muy alta', 170, 190,
    2,
    '["Verticalidad máxima", "Desmarques de ruptura", "No frenar el juego", "Finalizar primer toque"]',
    '["Repliegue rápido", "Retrasar ataque", "No entrar a la desesperada"]',
    '["Frenar el contraataque", "Exceso de toques", "No finalizar rápido"]',
    '[{"nombre": "3v2", "descripcion": "Mayor superioridad", "dificultad": "-1"}, {"nombre": "4v4", "descripcion": "Igualdad", "dificultad": "+1"}]',
    '["2v1 → 3v2 → 4v3 → 5v4"]',
    '["Porterías reglamentarias x2", "Conos", "Petos", "Balones x12", "Cronómetro"]',
    '["MD-4", "MD-3"]',
    'Velocidad máxima, potencia, RSA',
    true, true,
    '["contraataque", "transición", "velocidad", "finalización", "intensidad"]'
);

-- ============================================================================
-- FÚTBOL REDUCIDO (SSG) - 2 tareas adicionales
-- ============================================================================

-- SSG 2: 5v5 con Comodines
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'SSG 5v5+2 Comodines Laterales', 'SSG-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1,
    40, 30, 'rectangular',
    12, 12, 0, '5v5+2',
    'Partido 5v5 con 2 comodines en las bandas que siempre juegan con el equipo en posesión. Sin porteros, mini porterías. Trabaja amplitud y juego por banda.',
    'Saque lateral',
    'Gol o fuera',
    '["Comodines máximo 2 toques", "Campo jugadores libre"]',
    '["Comodines solo en banda (no pueden entrar al campo)", "Gol tras pase de comodín vale doble"]',
    'Gol = 1 punto, Gol tras asistencia comodín = 2 puntos',
    'ataque_organizado', 'Amplitud', 'Usar superioridad en banda',
    'Media-alta intensidad', 50, 'alta', 155, 175,
    2,
    '["Buscar al comodín", "Llegadas desde segunda línea", "Centros al área"]',
    '["Cerrar comodín", "No dejar centro", "Anticipar"]',
    '["No usar comodines", "Solo jugar por dentro", "Precipitarse"]',
    '[{"nombre": "4v4+2", "descripcion": "Menos jugadores", "dificultad": "="}, {"nombre": "5v5+4", "descripcion": "Comodines en las 4 bandas", "dificultad": "-1"}]',
    '["Mini porterías x4", "Conos x8", "Petos 3 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia intermitente, sprints',
    'Visión de juego, decisión rápida',
    true, true,
    '["SSG", "comodines", "amplitud", "banda", "posesión", "finalización"]'
);

-- SSG 3: Torneo 3v3
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
    'Torneo 3v3 Mini Porterías Intensivo', 'SSG-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    24, 6, 3, 1,
    20, 15, 'rectangular',
    6, 12, 0, '3v3 (varios campos)',
    'Torneo de 3v3 de alta intensidad. Partidos cortos de 3 minutos. Sistema de puntos: gana 3, empata 1, pierde 0. Rotación de rivales. Ideal para competitividad y duelos.',
    'Balón al aire',
    'Gol o tiempo (3 min)',
    '["Sin porteros", "Gol desde cualquier distancia vale", "Reinicio inmediato tras gol"]',
    'Victoria = 3 puntos, Empate = 1 punto',
    'transicion_defensa_ataque', 'Duelos 1v1', 'Ganar duelos y marcar',
    'Muy alta intensidad', 50, 'muy alta', 175, 195,
    1,
    '["Duelos 1v1", "Desmarques cortos", "Finalización rápida"]',
    '["Pressing inmediato", "Ganar duelos", "No dejar tiempo"]',
    '["Evitar duelos", "Exceso de pases", "No finalizar"]',
    '[{"nombre": "4v4", "descripcion": "Un jugador más", "dificultad": "="}, {"nombre": "2v2", "descripcion": "Máxima intensidad", "dificultad": "+1"}]',
    '["Mini porterías x4 por campo", "Conos x8", "Petos varios colores", "Balones x6", "Pizarra puntuación"]',
    '["MD-4"]',
    'RSA, potencia, fuerza resistencia',
    'Competitividad, mentalidad ganadora',
    true, true,
    '["torneo", "3v3", "intensidad", "duelos", "competición", "SSG"]'
);

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 1 tarea adicional
-- ============================================================================

-- PCO 2: Zonas Prohibidas
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
    'Partido 9v9 Zonas de Progresión Obligatoria', 'PCO-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    28, 2, 12, 2,
    75, 55, 'campo_reducido',
    20, 20, 2, '9v9+2POR',
    'Partido 9v9 con campo dividido en 3 zonas horizontales. Para que el gol sea válido, el balón debe haber pasado por las 3 zonas en la jugada (defensa → medio → ataque). Trabaja progresión ordenada.',
    'Saque de portero',
    'Tiempo de serie',
    '["Gol válido solo si balón pasó por 3 zonas", "No se puede saltar zona con pase largo", "Fuera de juego activo"]',
    'ataque_organizado', 'Progresión', 'Juego asociativo', 'Superar líneas con el balón',
    'Alta intensidad', 'alta', 155, 175,
    3,
    '["Paciencia en construcción", "Buscar pivote en zona media", "Progresión escalonada"]',
    '["Pressing por zonas", "Cerrar progresión directa", "Repliegue ordenado"]',
    '["Balón largo saltando zonas", "Prisas por finalizar", "No usar zona media"]',
    '[{"nombre": "2 zonas", "descripcion": "Menos restricción", "dificultad": "-1"}, {"nombre": "4 zonas", "descripcion": "Mayor complejidad", "dificultad": "+1"}]',
    '["Porterías reglamentarias x2", "Conos zonas x8", "Petos 2 colores", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Resistencia específica',
    true, true,
    '["partido", "condicionado", "zonas", "progresión", "construcción", "táctico"]'
);

-- ============================================================================
-- BALÓN PARADO (ABP) - 2 tareas adicionales
-- ============================================================================

-- ABP 3: Penalti
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
    consignas_ofensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Penaltis - Rutina de Lanzamiento', 'ABP-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    15, 1, 14, 1,
    20, 20, 'area_grande',
    4, 8, 2, 'Lanzadores + Porteros',
    'Práctica de penaltis con rutina completa: visualización, carrera de aproximación, punto de golpeo definido. Cada jugador tiene 3-5 lanzamientos. Simular presión de partido.',
    'Silbato del entrenador',
    'Gol, parada o fuera',
    '["Esperar silbato", "No cambiar decisión tras iniciar carrera", "Rutina personal respetada"]',
    'balon_parado_ofensivo', 'Penalti', 'Ejecutar con confianza',
    'Muy baja intensidad', 'baja', 90, 110,
    1,
    '["Elegir lado antes de carrera", "Golpeo firme", "No mirar al portero en el golpeo", "Rutina consistente"]',
    '["Cambiar decisión", "Golpeo flojo", "Carrera irregular"]',
    '[{"nombre": "Con público", "descripcion": "Añadir presión simulada con gritos", "dificultad": "+1"}, {"nombre": "Después de sprint", "descripcion": "Simular fatiga de partido", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Balones x6", "Conos punto penalti"]',
    '["MD-2", "MD-1"]',
    'Control de nervios, rutina mental, confianza',
    true, true,
    '["ABP", "penalti", "estrategia", "concentración", "técnica", "finalización"]'
);

-- ABP 4: Saque de Banda Largo
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
    'Saque de Banda Largo - Zona de Finalización', 'ABP-004',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.5, 0.75,
    25, 35, 'area_grande',
    10, 14, 1, '6-8 atacantes + POR vs 4-5 defensores',
    'Práctica de saque de banda largo al área. Jugador especialista lanza, movimientos coordinados de atacantes en área para remate. Similar a córner pero desde banda.',
    'Señal del entrenador',
    'Gol, despeje o atrapada',
    '["3 variantes de movimiento en área", "Señalización visual", "Siempre vigilar rechace"]',
    'balon_parado_ofensivo', 'Estrategia ofensiva', 'Saque de banda largo', 'Generar ocasión desde banda',
    'Baja intensidad con picos', 'baja', 105, 130,
    2,
    '["Timing de carrera al área", "Ataque al primer palo", "Bloqueos en zona", "Rechace vigilado"]',
    '["Saque ilegal", "Timing descoordinado", "Todos al mismo punto"]',
    '[{"nombre": "Con oposición activa", "descripcion": "Defensores marcan", "dificultad": "+1"}, {"nombre": "Sin oposición", "descripcion": "Solo automatismo", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x8"]',
    '["MD-1", "MD-2"]',
    true, true,
    '["ABP", "saque banda", "estrategia", "finalización", "área", "set piece"]'
);

-- ============================================================================
-- FIN DEL LOTE 1 - 10 TAREAS ADICIONALES (16-25)
-- ============================================================================
-- Resumen Lote 1:
-- - 2 Rondos adicionales (RND-004, RND-005) → Total RND: 5
-- - 1 Juego de Posición adicional (JDP-003) → Total JDP: 3
-- - 1 Posesión adicional (POS-003) → Total POS: 3
-- - 1 Evolución adicional (EVO-003) → Total EVO: 3
-- - 2 SSG adicionales (SSG-002, SSG-003) → Total SSG: 3
-- - 1 Partido Condicionado adicional (PCO-002) → Total PCO: 2
-- - 2 ABP adicionales (ABP-003, ABP-004) → Total ABP: 4
-- ============================================================================
-- TOTAL ACUMULADO: 25 tareas
-- ============================================================================
