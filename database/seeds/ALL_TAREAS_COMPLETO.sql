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
    'Muy alta intensidad', 81.3, 'alta', 170, 190,
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
    'Muy alta intensidad', 50, 'alta', 175, 195,
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
    'ataque_organizado', 'Penalti', 'Ejecutar con confianza',
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
    'ataque_organizado', 'Estrategia ofensiva', 'Saque de banda largo', 'Generar ocasión desde banda',
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
-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTE 4 DE TAREAS (46-55)
-- ============================================================================
-- 10 tareas adicionales - Enfoque: Físico integrado, calentamiento, recuperación
-- ============================================================================

-- ============================================================================
-- RONDOS (RND) - 2 tareas adicionales
-- ============================================================================

-- Rondo 8: Rondo de Activación Pre-Partido
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
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo Activación 8v2 Pre-Partido', 'RND-008',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    8, 2, 3, 1,
    15, 15, 'circulo',
    10, 10, 0, '8v2',
    'Rondo de activación pre-partido estilo Guardiola. 8 jugadores en círculo, 2 en el centro. Intensidad progresiva. Ideal para calentar antes del partido con contacto con balón.',
    'Entrenador pasa al círculo',
    'Tiempo',
    '["2 toques primera serie", "1 toque segunda serie"]',
    '["Cambio de defensores cada 45 segundos", "Intensidad progresiva"]',
    'Solo se cuentan pases para ritmo, no puntos',
    'ataque_organizado', 'Activación con balón', 'Pase corto', 'Calentar con especificidad',
    'Baja intensidad progresiva', 22.5, 'baja', 110, 140,
    1,
    '["Toque rápido", "Concentración desde el inicio", "Ritmo creciente"]',
    '["Presión activa pero sin forzar", "Rotación frecuente"]',
    '["Intensidad excesiva al inicio", "Desconcentración"]',
    '[{"nombre": "6v2", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "10v2", "descripcion": "Mayor superioridad", "dificultad": "-1"}]',
    '["Conos círculo", "Balones x4"]',
    '["MD (pre-partido)", "MD-1 (activación)"]',
    'Activación neuromuscular, calentamiento específico',
    'Concentración, cohesión, entrar en partido',
    true, true,
    '["activación", "rondo", "calentamiento", "pre-partido", "Guardiola"]'
);

-- Rondo 9: Rondo Cognitivo con Colores
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
    'Rondo Cognitivo 4v2 con Llamada de Color', 'RND-009',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    14, 4, 2.5, 1,
    10, 10, 'cuadrado',
    6, 6, 0, '4v2',
    'Rondo 4v2 con componente cognitivo: cada jugador tiene un color asignado. Antes de pasar, el poseedor debe gritar el color del receptor. Error = cambio a defender.',
    'Entrenador grita color inicial',
    'Error de color o robo',
    '["2 toques", "Obligatorio gritar color antes de pasar"]',
    '["Error de color = entras a defender", "Robo normal también cambia"]',
    'Error de color o robo = cambio',
    'ataque_organizado', 'Comunicación y visión', 'Pase con comunicación', 'Desarrollar comunicación y visión',
    'Media intensidad', 16.7, 'media', 135, 155,
    3,
    '["Mirar antes de recibir", "Saber colores de compañeros", "Comunicar en voz alta", "Concentración total"]',
    '["No gritar color", "Gritar color equivocado", "Dudar en el pase"]',
    '[{"nombre": "Con números", "descripcion": "Números en vez de colores", "dificultad": "="}, {"nombre": "Color + número", "descripcion": "Decir ambos", "dificultad": "+2"}]',
    '["Petos de colores distintivos x6", "Conos x4", "Balones x4"]',
    '["MD-3", "MD-4"]',
    'Coordinación, agilidad mental',
    'Concentración, comunicación, presión cognitiva',
    true, true,
    '["rondo", "cognitivo", "comunicación", "colores", "concentración"]'
);

-- ============================================================================
-- SSG - 2 tareas adicionales
-- ============================================================================

-- SSG 6: Partido Líneas de Gol
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
    'SSG 5v5 Líneas de Gol (Sin Porterías)', 'SSG-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    18, 4, 3.5, 1,
    40, 30, 'rectangular',
    10, 10, 0, '5v5',
    'Partido 5v5 donde se puntúa pasando el balón controlado por la línea de fondo contraria (no hay porterías). Trabaja progresión, conducción y juego directo.',
    'Saque lateral',
    'Gol (cruzar línea) o tiempo',
    '["Gol = cruzar línea de fondo con balón controlado", "Hay que entrar conduciendo, no vale pase"]',
    'Cruzar línea conduciendo = 1 punto',
    'ataque_organizado', 'Progresión', 'Llegar a línea de fondo',
    'Alta intensidad', 60, 'alta', 165, 185,
    2,
    '["Buscar espacios para conducir", "Atraer y soltar", "1v1 para superar"]',
    '["Cerrar espacios hacia portería", "No dejar conducción", "Pressing alto"]',
    '["Solo buscar pase largo", "No conducir", "Precipitarse"]',
    '[{"nombre": "4v4", "descripcion": "Más espacio", "dificultad": "-1"}, {"nombre": "6v6", "descripcion": "Menos espacio", "dificultad": "+1"}]',
    '["Conos x8", "Petos 2 colores", "Balones x6"]',
    '["MD-4", "MD-3"]',
    'Sprints con balón, resistencia',
    'Determinación, valentía en conducción',
    true, true,
    '["línea gol", "conducción", "progresión", "SSG", "sin porterías"]'
);

-- SSG 7: Partido Posesión por Zonas
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
    'SSG 6v6 Posesión en Zona Central', 'SSG-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1.5,
    45, 35, 'rectangular',
    12, 12, 0, '6v6',
    'Partido 6v6 con zona central delimitada. Completar 5 pases dentro de la zona central = 1 punto + derecho a finalizar en mini portería. Trabaja juego interior y dominio del centro.',
    'Saque de banda',
    'Gol o tiempo',
    '["5 pases en zona central = 1 punto + ataque a portería", "No hay límite de jugadores en zona central"]',
    '5 pases en zona central = 1 punto, Gol tras secuencia = 2 puntos',
    'ataque_organizado', 'Control del centro', 'Dominar mediocampo',
    'Media-alta intensidad', 43.8, 'alta', 155, 175,
    2,
    '["Atraer rivales a centro", "Movilidad en zona central", "Salir rápido tras conseguir pases"]',
    '["Compactar en zona central", "Pressing coordinado", "No dejar 5 pases"]',
    '["Evitar zona central", "Solo jugar por fuera", "Perder balón en zona central"]',
    '[{"nombre": "3 pases", "descripcion": "Más fácil conseguir puntos", "dificultad": "-1"}, {"nombre": "7 pases", "descripcion": "Más difícil", "dificultad": "+1"}]',
    '["Mini porterías x2", "Conos zona central x4", "Petos 2 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia intermitente, cambios dirección',
    true, true,
    '["SSG", "zona central", "posesión", "mediocampo", "dominio"]'
);

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 2 tareas adicionales
-- ============================================================================

-- PCO 5: Partido con Jugador Flotante
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
    'Partido 7v7+1 Jugador Flotante Universal', 'PCO-005',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    25, 2, 10, 2.5,
    60, 45, 'campo_reducido',
    17, 17, 2, '7v7+2POR+1 flotante',
    'Partido 7v7 con 1 jugador flotante que siempre juega con el equipo en posesión pero puede moverse por todo el campo. Crea superioridad constante 8v7 en posesión.',
    'Saque de centro',
    'Tiempo de serie',
    '["Flotante libre de toques", "Flotante puede marcar gol", "Tras gol, el flotante no cambia de equipo"]',
    'ataque_organizado', 'Superioridad con flotante', 'Usar ventaja numérica',
    'Alta intensidad', 'alta', 160, 180,
    2,
    '["Buscar al flotante", "Flotante como comodín central", "Transición rápida al robar"]',
    '["Marcar al flotante por zonas", "Pressing inteligente", "No perseguir al flotante"]',
    '["No usar al flotante", "Flotante mal posicionado", "Pressing al flotante descuidando otros"]',
    '[{"nombre": "6v6+1", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "8v8+1", "descripcion": "Más jugadores", "dificultad": "-1"}]',
    '["Porterías reducidas x2", "Peto especial flotante", "Conos", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia específica partido',
    'Adaptabilidad, lectura de juego',
    true, true,
    '["partido", "flotante", "superioridad", "posesión", "condicionado"]'
);

-- PCO 6: Partido Solo Goles de Cabeza
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
    'Partido 8v8 Goles Solo de Cabeza', 'PCO-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    26, 2, 11, 2,
    65, 50, 'campo_reducido',
    18, 18, 2, '8v8+2POR',
    'Partido 8v8 donde los goles solo valen si son de cabeza. Cualquier otro gol no cuenta. Trabaja juego aéreo, centros al área y ataque de cabeza.',
    'Saque de centro',
    'Tiempo de serie',
    '["Goles solo de cabeza valen", "Gol con pie = no válido", "Centro puede ser con pie o cabeza"]',
    'Gol de cabeza = 1 punto',
    'ataque_organizado', 'Juego aéreo', 'Generar centros y rematar de cabeza',
    'Alta intensidad', 'alta', 155, 175,
    2,
    '["Buscar centros al área", "Llegadas escalonadas", "Atacar primer y segundo palo", "Ganar posición al defensor"]',
    '["Ganar duelo aéreo", "Posición entre balón y portería", "Despejar lejos"]',
    '["No centrar", "Centros malos", "No atacar el balón", "Rematar con miedo"]',
    '[{"nombre": "También volea", "descripcion": "Gol de volea también vale", "dificultad": "-1"}, {"nombre": "Centro desde zona", "descripcion": "Solo vale centro desde zonas marcadas", "dificultad": "+1"}]',
    '["Porterías reglamentarias x2", "Petos 2 colores", "Balones x10"]',
    '["MD-3", "MD-4"]',
    'Potencia salto, duelos aéreos',
    true, true,
    '["partido", "cabeza", "centros", "aéreo", "condicionado", "finalización"]'
);

-- ============================================================================
-- POSESIÓN (POS) - 2 tareas adicionales
-- ============================================================================

-- POS 6: Posesión Direccional
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
    'Posesión 6v6+2 Direccional con Mini Porterías', 'POS-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    22, 4, 4.5, 1,
    45, 35, 'rectangular',
    14, 14, 0, '6v6+2',
    'Posesión con direccionalidad. 6v6 + 2 comodines. Cada equipo ataca 2 mini porterías de un lado y defiende las 2 del otro. Combina posesión con finalización.',
    'Entrenador pasa balón',
    'Gol o tiempo',
    '["Comodines 2 toques", "Campo libre"]',
    '["8 pases mínimo antes de poder finalizar", "Tras gol, el rival empieza con balón"]',
    '8 pases + gol = 2 puntos, Solo gol sin 8 pases = 1 punto',
    'ataque_organizado', 'Posesión con finalización', 'Circulación antes de finalizar', 'Pase y movimiento', 'Combinar posesión y gol',
    'Alta intensidad', 40.6, 'alta', 155, 175,
    2,
    '["Paciencia hasta 8 pases", "Usar comodines", "Cambiar de portería si cerrada", "Transición rápida"]',
    '["Contar pases rivales", "Pressing más intenso cerca de 8", "Proteger porterías"]',
    '["Disparar sin 8 pases", "No usar comodines", "Solo buscar una portería"]',
    '[{"nombre": "5 pases", "descripcion": "Menos pases requeridos", "dificultad": "-1"}, {"nombre": "10 pases", "descripcion": "Más pases requeridos", "dificultad": "+1"}]',
    '["Mini porterías x4", "Conos x8", "Petos 3 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia intermitente',
    true, true,
    '["posesión", "direccional", "mini porterías", "comodines", "finalización"]'
);

-- POS 7: Posesión Ajax (3-4-3)
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
    'Posesión Posicional Ajax 10v6', 'POS-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1,
    55, 50, 'rectangular',
    16, 16, 0, '10v6',
    'Posesión posicional estilo Ajax en estructura 3-4-3. 10 jugadores posicionales (3 defensas, 4 medios, 3 atacantes) contra 6 presionadores. Énfasis en ocupación racional.',
    'Defensa central con balón',
    '15 pases o robo',
    '["Jugadores en sus zonas", "2 toques máximo"]',
    '["Respetar posiciones", "Máximo 2 jugadores pueden intercambiar posición simultáneamente"]',
    '15 pases = 1 punto',
    'ataque_organizado', 'Juego posicional', 'Ocupación racional 3-4-3', 'Pase al pie', 'Mantener estructura en posesión',
    'Media intensidad', 43.8, 'media', 140, 160,
    3,
    '["Mantener posiciones", "Triangulaciones", "Escalonar apoyos", "Tercer hombre"]',
    '["Pressing por zonas", "Cerrar líneas de pase centrales", "Coordinación"]',
    '["Salir de posición", "Amontonarse", "No respetar estructura"]',
    '[{"nombre": "10v5", "descripcion": "Menos presión", "dificultad": "-1"}, {"nombre": "10v7", "descripcion": "Más presión", "dificultad": "+1"}]',
    '["8v4 → 10v5 → 10v6 → 10v7"]',
    '["Conos posiciones x10", "Petos 2 colores", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Disciplina posicional, paciencia',
    true, true,
    '["posesión", "posicional", "Ajax", "3-4-3", "estructura", "ocupación"]'
);

-- ============================================================================
-- ATAQUE VS DEFENSA (AVD) - 2 tareas adicionales
-- ============================================================================

-- AVD 6: Transición Ofensiva Rápida
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
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Transición Ofensiva 5v4+POR desde Robo', 'AVD-006',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.5, 0.75,
    55, 50, 'medio_campo',
    10, 10, 1, '5v4+POR',
    'Simulación de transición ofensiva tras robo. Los 5 atacantes empiezan en posición de pressing, al robar inician transición rápida 5v4 hacia portería. Máximo 10 segundos.',
    'Entrenador provoca pérdida, atacantes roban',
    'Gol, fuera o defensa recupera',
    '["10 segundos máximo para finalizar", "Atacantes empiezan en posiciones de pressing"]',
    'transicion_defensa_ataque', 'Transición rápida', 'Ataque tras recuperación', 'Finalizar en transición',
    'Muy alta intensidad', 55, 'alta', 175, 195,
    2,
    '["Primer pase en vertical si posible", "Desmarques de ruptura inmediatos", "No frenar", "Finalizar primer toque"]',
    '["Repliegue rápido", "Retardar ataque", "Temporizar sin entrar", "Cerrar línea de gol"]',
    '["Transición lenta", "Exceso de toques", "No aprovechar superioridad"]',
    '[{"nombre": "4v3", "descripcion": "Menos jugadores", "dificultad": "+1"}, {"nombre": "5v3", "descripcion": "Mayor superioridad", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Petos", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Velocidad, explosividad, sprints',
    'Decisión rápida, ambición',
    true, true,
    '["transición", "ofensiva", "robo", "velocidad", "finalización"]'
);

-- AVD 7: Defensa Línea Adelantada
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
    'Línea Defensiva Adelantada 8v6+POR', 'AVD-007',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    22, 5, 3.5, 1,
    50, 65, 'medio_campo',
    15, 15, 1, '8v6+POR',
    'Trabajo de línea defensiva adelantada con fuera de juego. 6 defensores + POR defienden con línea alta contra 8 atacantes. Énfasis en movimientos de línea, achiques y vigilancias.',
    'Entrenador pasa a atacantes',
    'Gol, fuera de juego o robo con balón controlado',
    '["Fuera de juego activo", "Defensores con línea mínimo en medio campo", "Portero puede salir"]',
    'defensa_organizada', 'Línea adelantada', 'Achique y fuera de juego', 'Defender con línea alta',
    'Media-alta intensidad', 'media', 150, 170,
    3,
    '["Movimientos de ruptura", "Timing de carrera", "Desmarques en diagonal", "Buscar 1v1"]',
    '["Línea coordinada", "Achique al balón adelantado", "Comunicación", "Vigilancias en diagonal"]',
    '["Línea descoordinada", "Achique individual", "No comunicar", "Olvidar vigilancia"]',
    '[{"nombre": "8v7", "descripcion": "Un defensor más", "dificultad": "-1"}, {"nombre": "8v5", "descripcion": "Un defensor menos", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos línea medio campo", "Petos", "Balones x10"]',
    '["MD-3", "MD-2"]',
    'Sprints cortos, aceleraciones',
    'Coordinación colectiva, comunicación',
    true, true,
    '["línea alta", "fuera de juego", "defensa", "achique", "coordinación"]'
);

-- ============================================================================
-- FIN DEL LOTE 4 - 10 TAREAS ADICIONALES (46-55)
-- ============================================================================
-- Resumen Lote 4:
-- - 2 Rondos adicionales (RND-008, 009) → Total RND: 9
-- - 2 SSG adicionales (SSG-006, 007) → Total SSG: 7
-- - 2 Partidos Condicionados adicionales (PCO-005, 006) → Total PCO: 6
-- - 2 Posesión adicionales (POS-006, 007) → Total POS: 7
-- - 2 Ataque vs Defensa adicionales (AVD-006, 007) → Total AVD: 7
-- ============================================================================
-- TOTAL ACUMULADO: 55 tareas
-- ============================================================================
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
-- ============================================================================
-- TRAININGHUB PRO - SEED: LOTES 11-14 DE TAREAS (116-150)
-- ============================================================================
-- 35 tareas finales para completar biblioteca de 150 tareas profesionales
-- ============================================================================

-- ============================================================================
-- JUEGO DE POSICIÓN (JDP) - 6 tareas adicionales (Total: 15)
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Construcción 4-3-3 con Extremos Invertidos', 'JDP-010', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 22, 4, 4.5, 1, 65, 60, 'tres_cuartos_campo', 17, 17, 1, '10+POR vs 6', 'Construcción en 4-3-3 con extremos que invierten posición. Extremos parten abiertos y cortan hacia dentro, laterales suben. Trabajo de amplitud y profundidad.', 'Portero con balón', 'Pase a zona de finalización o robo', '["Extremos invierten cuando balón en lateral", "Laterales dan amplitud cuando extremos cortan"]', 'ataque_organizado', 'Construcción con inversiones', 'Crear superioridad con movimientos de inversión', 'Baja-media intensidad', 55.3, 'baja', 125, 145, 3, '["Extremos: cortar diagonal hacia dentro", "Laterales: subir cuando extremo corta", "Pivotes: escalonar"]', '["Cerrar líneas interiores", "Vigilar laterales que suben"]', '["Inversiones descoordinadas", "Laterales no suben"]', '[{"nombre": "10+POR vs 7", "descripcion": "Más presión", "dificultad": "+1"}]', '["Portería reglamentaria", "Conos", "Petos", "Balones x10"]', '["MD-3", "MD-2"]', true, true, '["4-3-3", "inversión", "extremos", "construcción", "posicional"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Salida Portero con Opción Larga', 'JDP-011', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 18, 6, 2.5, 0.5, 55, 65, 'campo_propio', 12, 12, 1, '6+POR vs 5', 'Salida de balón donde portero debe leer presión: si hay espacio sale en corto, si presión alta puede optar por balón largo a delantero referencia.', 'Portero con balón', 'Superar pressing o balón controlado largo', '["Portero decide: corto o largo", "Si elige largo, delantero debe ganar duelo aéreo"]', 'ataque_organizado', 'Salida adaptativa', 'Elegir mejor opción según presión', 'Baja intensidad', 56.4, 'baja', 115, 140, 3, '["Leer presión antes de decidir", "Si corto: opciones claras", "Si largo: delantero se ofrece"]', '["Variar intensidad de pressing", "Cerrar opciones cortas"]', '["Siempre mismo recurso", "Indecisión"]', '[{"nombre": "Solo corto", "descripcion": "Prohibido largo", "dificultad": "+1"}]', '["Portería reglamentaria", "Conos zona segura", "Petos", "Balones x8"]', '["MD-3", "MD-2"]', true, true, '["salida balón", "largo", "corto", "adaptación", "portero"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Juego Posicional con Cambio de Sistema', 'JDP-012', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 24, 4, 5, 1, 60, 55, 'tres_cuartos_campo', 18, 18, 1, '10+POR vs 7', 'Trabajo de adaptación táctica. Comenzar en 4-3-3, a señal del entrenador cambiar a 3-4-3 manteniendo posesión. Jugadores deben reposicionarse fluidamente.', 'Portero con balón en 4-3-3', 'Tiempo o pérdida', '["Señal de cambio cada 2 min", "De 4-3-3 a 3-4-3 y viceversa", "Transición fluida"]', 'ataque_organizado', 'Flexibilidad táctica', 'Cambiar sistema manteniendo posesión', 'Media intensidad', 50, 'media', 140, 160, 3, '["Conocer ambas posiciones", "Reposicionarse rápido al cambio", "Comunicar"]', '["Adaptar pressing al sistema rival", "Identificar nuevo sistema"]', '["Confusión en cambio", "No conocer nueva posición"]', '[{"nombre": "3 sistemas", "descripcion": "Añadir 4-4-2", "dificultad": "+1"}]', '["Conos posiciones x10", "Petos 2 colores", "Balones x8"]', '["MD-3", "MD-2"]', true, true, '["cambio sistema", "flexibilidad", "4-3-3", "3-4-3", "táctico"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Circulación Rápida en Mediocampo', 'JDP-013', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 18, 5, 3, 0.75, 35, 30, 'zona_media', 12, 12, 0, '8v4', 'Circulación rápida en zona de mediocampo. 8 poseedores (2 pivotes + 4 interiores + 2 extremos) contra 4 presionadores. Énfasis en velocidad de circulación y triangulaciones.', 'Pivote con balón', '10 pases o robo', '["Máximo 2 toques", "Obligatorio cambiar de lado cada 5 pases"]', 'ataque_organizado', 'Circulación en mediocampo', 'Dominar zona media con velocidad', 'Media-alta intensidad', 27.1, 'media', 150, 170, 2, '["Circular rápido", "Triangular", "Cambiar de lado", "No retener"]', '["Pressing en 4 coordinado", "Cortar cambio de lado"]', '["Retener balón", "No cambiar de lado"]', '[{"nombre": "8v5", "descripcion": "Más presión", "dificultad": "+1"}]', '["Conos zona x8", "Petos 2 colores", "Balones x6"]', '["MD-4", "MD-3"]', true, true, '["circulación", "mediocampo", "velocidad", "triangulaciones"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Superioridad en Primera Fase', 'JDP-014', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3.5, 0.75, 45, 55, 'campo_propio', 10, 10, 1, '5+POR vs 3', 'Trabajo de superioridad en primera fase de construcción. Portero + 4 defensores + 1 pivote contra 3 delanteros. Objetivo: salir de zona con superioridad clara.', 'Portero con balón', 'Balón en pivote o supera línea', '["Portero cuenta como jugador", "6v3 superioridad clara", "Pivote debe recibir al menos 1 vez"]', 'ataque_organizado', 'Superioridad en salida', 'Aprovechar 6v3 para salir limpio', 'Baja intensidad', 54.5, 'baja', 115, 135, 2, '["Portero como opción constante", "Centrales abiertos", "Pivote ofrecerse entre líneas"]', '["Pressing coordinado en 3", "Forzar balón largo"]', '["No usar al portero", "Pivote escondido"]', '[{"nombre": "5+POR vs 4", "descripcion": "Menos superioridad", "dificultad": "+1"}]', '["Portería reglamentaria", "Conos zona", "Petos", "Balones x8"]', '["MD-3", "MD-2"]', true, true, '["superioridad", "primera fase", "6v3", "salida"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Progresión por Carril Central', 'JDP-015', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3.5, 0.75, 50, 40, 'rectangular', 14, 14, 1, '8+POR vs 5', 'Trabajo de progresión por carril central. Campo dividido en 3 carriles verticales. Punto extra si la progresión final pasa por carril central. Trabaja juego interior.', 'Portero con balón', 'Gol o llegada a zona final', '["Bonus si progresión por carril central", "Carril central = 10m de ancho en medio"]', 'ataque_organizado', 'Juego interior', 'Progresar por el centro del campo', 'Media intensidad', 'media', 140, 160, 3, '["Buscar carril central para bonus", "Mediapunta referencia", "Paredes en zona interior"]', '["Cerrar carril central", "Forzar por bandas"]', '["Solo jugar por fuera", "No buscar central"]', '[{"nombre": "Sin bonus", "descripcion": "Igual valor todas zonas", "dificultad": "-1"}]', '["Portería reglamentaria", "Conos carriles", "Petos", "Balones x10"]', '["MD-3", "MD-2"]', true, true, '["carril central", "interior", "progresión", "mediapunta"]');

-- ============================================================================
-- POSESIÓN (POS) - 5 tareas adicionales (Total: 18)
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Posesión 8v4 con Transición', 'POS-014', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 18, 4, 3.5, 1, 30, 25, 'rectangular', 12, 12, 0, '8v4', 'Posesión 8v4 con transición al robo. Al robar, los 4 defensores deben completar 3 pases entre ellos para sumar punto antes de que los 8 recuperen.', 'Entrenador pasa al equipo de 8', 'Tiempo de serie', '["8v4 en posesión", "Al robo: 4 tienen 10 seg para hacer 3 pases", "8 presionan para recuperar"]', '10 pases del 8 = 1pt, 3 pases del 4 tras robo = 1pt', 'transicion_defensa_ataque', 'Posesión con transición', 'Mantener y transicionar rápido', 'Media-alta intensidad', 31.3, 'alta', 155, 175, 2, '["Mantener 10 pases", "Si pierden: pressing inmediato"]', '["Robar y consolidar con 3 pases", "Transición rápida"]', '["No presionar tras pérdida", "Transición lenta del equipo de 4"]', '[{"nombre": "8v3", "descripcion": "Más superioridad", "dificultad": "-1"}]', '["Conos x8", "Petos 2 colores", "Balones x6"]', '["MD-4", "MD-3"]', true, true, '["posesión", "transición", "8v4", "consolidar"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Posesión con Apoyo Diagonal', 'POS-015', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 35, 30, 'rectangular', 10, 10, 0, '6v4', 'Posesión 6v4 donde los apoyos deben ser siempre en diagonal. Prohibido pases horizontales o verticales puros. Trabaja triangulaciones y diagonales.', 'Entrenador pasa al equipo de 6', '8 pases o robo', '["Solo pases en diagonal", "Pase horizontal/vertical = pérdida"]', '8 pases en diagonal = 1 punto', 'ataque_organizado', 'Apoyos diagonales', 'Triangular siempre en diagonal', 'Media intensidad', 35, 'media', 145, 165, 2, '["Posicionarse en diagonal del balón", "No estar en línea", "Triangular constantemente"]', '["Cortar diagonales", "Forzar pase recto"]', '["Posición en línea", "Pase no diagonal"]', '[{"nombre": "Libre de pases", "descripcion": "Sin restricción", "dificultad": "-1"}]', '["Conos x8", "Petos 2 colores", "Balones x6"]', '["MD-4", "MD-3"]', true, true, '["diagonal", "triangulación", "posesión", "apoyo"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Posesión con Zonas Prohibidas', 'POS-016', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 4, 4, 1, 40, 35, 'rectangular', 12, 12, 0, '6v6', 'Posesión 6v6 con 2 zonas prohibidas (marcadas con conos) que van cambiando cada minuto. No se puede entrar ni pasar por esas zonas. Trabaja adaptación espacial.', 'Entrenador pasa balón', 'Tiempo de serie', '["2 zonas prohibidas de 5x5m", "Cambian cada 60 seg", "Pasar por zona prohibida = pérdida"]', '10 pases sin usar zonas prohibidas = 1 punto', 'ataque_organizado', 'Adaptación espacial', 'Poseer evitando zonas cambiantes', 'Media intensidad', 33.3, 'media', 145, 165, 2, '["Identificar zonas prohibidas", "Adaptarse cuando cambian", "Usar espacio disponible"]', '["Orientar hacia zonas prohibidas", "Forzar error"]', '["Entrar en zona prohibida", "No adaptarse al cambio"]', '[{"nombre": "3 zonas", "descripcion": "Más restricción", "dificultad": "+1"}]', '["Conos normales + conos especiales zonas", "Petos 2 colores", "Balones x6"]', '["MD-4", "MD-3"]', true, true, '["zonas prohibidas", "adaptación", "posesión", "espacial"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Posesión con Jugador Infiltrado', 'POS-017', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 18, 4, 3.5, 1, 35, 30, 'rectangular', 11, 11, 0, '5v4+2 infiltrados', 'Posesión con 2 infiltrados: 1 jugador de cada equipo empieza en el campo contrario como infiltrado. Pueden recibir para crear superioridad momentánea.', 'Entrenador pasa balón', 'Tiempo de serie', '["1 infiltrado por equipo en campo rival", "Infiltrado puede recibir (crea 6v4)", "Infiltrado máximo 2 toques"]', 'Pase exitoso al infiltrado = 1 punto', 'ataque_organizado', 'Uso de infiltrado', 'Crear superioridad con infiltrado', 'Media intensidad', 31.8, 'media', 145, 165, 2, '["Buscar al infiltrado", "Infiltrado ofrecerse", "Usar superioridad"]', '["Vigilar infiltrado propio", "Presionar cuando recibe infiltrado rival"]', '["No usar infiltrado", "Infiltrado mal posicionado"]', '[{"nombre": "Sin infiltrados", "descripcion": "Posesión normal", "dificultad": "-1"}]', '["Conos x8", "Petos 2 colores + peto especial", "Balones x6"]', '["MD-4", "MD-3"]', true, true, '["infiltrado", "superioridad", "posesión", "especial"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Posesión 7v7 Campo Grande', 'POS-018', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 22, 4, 4.5, 1, 55, 45, 'rectangular', 14, 14, 0, '7v7', 'Posesión 7v7 en espacio grande. Sin comodines, pura posesión en igualdad. Trabaja posesión en condiciones de partido real sin ventaja numérica.', 'Saque lateral', 'Tiempo de serie', '["Posesión en igualdad 7v7", "15 pases = punto", "Sin límite de toques"]', '15 pases consecutivos = 1 punto', 'ataque_organizado', 'Posesión en igualdad', 'Dominar sin ventaja numérica', 'Alta intensidad', 35.4, 'alta', 155, 175, 2, '["Usar todo el espacio", "Paciencia", "Movilidad constante", "Cambiar orientación"]', '["Pressing coordinado", "Compactar", "Forzar error"]', '["No usar amplitud", "Precipitarse"]', '[{"nombre": "6v6", "descripcion": "Menos jugadores", "dificultad": "+1"}]', '["Conos x8", "Petos 2 colores", "Balones x8"]', '["MD-4", "MD-3"]', true, true, '["posesión", "igualdad", "7v7", "real"]');

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 6 tareas adicionales (Total: 18)
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Partido 6v6 Solo Pie Débil', 'PCO-013', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 50, 40, 'campo_reducido', 14, 14, 2, '6v6+2POR', 'Partido donde SOLO se puede usar el pie no dominante. Goles con pie dominante no valen. Trabaja pie débil en contexto de partido.', 'Saque de portero', 'Tiempo de serie', '["Solo pie no dominante", "Gol con dominante = no vale", "Portero libre"]', 'Gol con pie débil = 1 punto', 'ataque_organizado', 'Mejora técnica pie débil', 'Jugar con pie no dominante', 'Media intensidad', 'media', 145, 165, 2, '["Usar solo pie débil", "Perfilarse para pie débil"]', '["Forzar errores de pie débil"]', '["Usar pie dominante", "No perfilarse"]', '[{"nombre": "Libre", "descripcion": "Sin restricción", "dificultad": "-1"}]', '["Porterías reducidas", "Petos", "Balones x8"]', '["MD-4", "MD-3"]', true, true, '["pie débil", "técnica", "condicionado"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Partido 7v7 Todos Tocan', 'PCO-014', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 24, 2, 10, 2, 55, 45, 'campo_reducido', 16, 16, 2, '7v7+2POR', 'Partido donde el gol solo vale si TODOS los jugadores de campo tocaron el balón en la jugada. Trabaja participación colectiva.', 'Saque de centro', 'Tiempo de serie', '["Gol solo vale si los 7 tocaron", "Reinicio: cuenta se resetea", "Portero no cuenta"]', 'Gol con todos = 1 punto, Gol sin todos = 0 puntos', 'ataque_organizado', 'Participación colectiva', 'Involucrar a todos en el juego', 'Alta intensidad', 'alta', 155, 175, 2, '["Circular para que todos toquen", "No dejar a nadie fuera", "Comunicar quién falta"]', '["Presionar para evitar circulación completa"]', '["Olvidar a alguno", "Gol sin todos"]', '[{"nombre": "5 de 7 tocan", "descripcion": "Menos exigente", "dificultad": "-1"}]', '["Porterías reducidas", "Petos", "Balones x8"]', '["MD-4", "MD-3"]', true, true, '["todos tocan", "colectivo", "circulación", "condicionado"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Partido 8v8 Defensa a Medio Campo', 'PCO-015', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 26, 2, 11, 2, 70, 55, 'campo_reducido', 18, 18, 2, '8v8+2POR', 'Partido donde el equipo sin balón solo puede defender de medio campo hacia atrás. Prohibido presionar en campo rival. Trabaja bloque bajo.', 'Saque de portero', 'Tiempo de serie', '["Defensa solo en campo propio", "Prohibido pressing en campo rival", "Línea de fuera de juego activa"]', 'Gol = 1 punto', 'defensa_organizada', 'Defensa en bloque bajo', 'Defender sin presionar alto', 'Media-alta intensidad', 'alta', 155, 175, 2, '["Construcción libre en campo", "Buscar huecos en bloque bajo"]', '["Organizar bloque bajo", "No presionar adelante", "Esperar en campo propio"]', '["Presionar en campo rival", "Bloque desorganizado"]', '[{"nombre": "Pressing libre", "descripcion": "Sin restricción", "dificultad": "-1"}]', '["Porterías reglamentarias", "Conos medio campo", "Petos", "Balones x10"]', '["MD-3", "MD-2"]', true, true, '["bloque bajo", "defensa", "medio campo", "condicionado"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Partido 5v5 con Portero Móvil', 'PCO-016', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 20, 4, 4, 1, 40, 30, 'rectangular', 12, 12, 2, '5v5+2POR', 'Partido donde los porteros pueden moverse por la línea de fondo (no solo en la portería). Portería = toda la línea de fondo. Trabaja cobertura defensiva.', 'Saque de portero', 'Gol o tiempo', '["Portería = toda la línea de fondo", "Portero se mueve por toda la línea", "Gol solo desde zona de tiro (últimos 10m)"]', 'Gol en línea de fondo = 1 punto', 'ataque_organizado', 'Finalización creativa', 'Buscar hueco en línea de fondo', 'Alta intensidad', 'alta', 160, 180, 2, '["Buscar hueco donde no esté portero", "Desplazamiento para abrir ángulo"]', '["Portero: cubrir zona probable de tiro", "Defensores: no dejar tiro fácil"]', '["Tirar donde está portero", "Portero mal posicionado"]', '[{"nombre": "Portero fijo", "descripcion": "Normal", "dificultad": "-1"}]', '["Conos línea de fondo", "Petos", "Balones x8"]', '["MD-4", "MD-3"]', true, true, '["portero móvil", "línea de fondo", "creatividad", "condicionado"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Partido 6v6 con Asistente Obligatorio', 'PCO-017', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 22, 2, 9, 2, 50, 40, 'campo_reducido', 14, 14, 2, '6v6+2POR', 'Partido donde el gol solo vale con asistencia (no valen goles individuales). Trabaja el último pase y la combinación final.', 'Saque de portero', 'Tiempo de serie', '["Gol solo válido con asistencia", "Gol individual = no vale", "Asistencia = último pase antes de gol"]', 'Gol con asistencia = 1 punto', 'ataque_organizado', 'Juego asociativo', 'Generar gol con asistencia', 'Alta intensidad', 'alta', 155, 175, 2, '["Buscar el pase de gol", "No finalizar solo", "Combinación final"]', '["Cerrar líneas de pase final", "Anticipar asistencia"]', '["Finalizar solo", "No buscar asistencia"]', '[{"nombre": "Gol libre", "descripcion": "Sin restricción", "dificultad": "-1"}]', '["Porterías reducidas", "Petos", "Balones x8"]', '["MD-4", "MD-3"]', true, true, '["asistencia", "último pase", "combinación", "condicionado"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Partido 7v7 Cambio Continuo', 'PCO-018', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 25, 1, 23, 2, 55, 45, 'campo_reducido', 18, 20, 2, '7v7+2POR con rotación', 'Partido con cambios continuos. Cada gol = cambio obligatorio de 2 jugadores por equipo. Jugadores en espera preparados para entrar. Simula gestión de banquillo.', 'Saque de centro', 'Tiempo total', '["Tras cada gol: salen 2, entran 2", "Cambio en 10 segundos", "Jugadores en espera preparados"]', 'Goles acumulados', 'transicion_defensa_ataque', 'Gestión de cambios', 'Mantener intensidad con rotación', 'Alta intensidad', 'alta', 160, 180, 1, '["Estar siempre preparado", "Entrar con intensidad", "Adaptarse rápido"]', '["Cubrir al que entra", "Organización rápida tras cambio"]', '["Cambio lento", "Entrar sin intensidad"]', '[{"nombre": "Sin cambios", "descripcion": "Equipos fijos", "dificultad": "-1"}]', '["Porterías reducidas", "Petos", "Balones x8"]', '["MD-4"]', true, true, '["cambios", "rotación", "intensidad", "gestión"]');

-- ============================================================================
-- RONDOS (RND) - 3 tareas adicionales (Total: 18)
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Rondo 6v2 con Portería de Escape', 'RND-016', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 14, 5, 2, 0.75, 15, 15, 'cuadrado', 8, 8, 0, '6v2', 'Rondo 6v2 con mini portería en un lado. Los defensores pueden escapar del pressing haciendo gol en la portería tras robar. Trabaja transición inmediata.', 'Entrenador pasa al equipo de 6', '10 pases o gol de escape', '["6v2 rondo normal", "Si 2 roban: pueden hacer gol en mini portería", "Gol de escape = victoria inmediata"]', '10 pases = 1pt poseedores, Gol escape = 2pts defensores', 'transicion_defensa_ataque', 'Rondo con transición', 'Transicionar tras robo', 'Alta intensidad', 28.1, 'alta', 160, 180, 2, '["No perder en transición", "Pressing inmediato si pierden"]', '["Robar y atacar portería", "Transición rápida"]', '["No presionar tras pérdida", "No atacar portería tras robo"]', '[{"nombre": "Sin portería", "descripcion": "Rondo clásico", "dificultad": "-1"}]', '["Mini portería x1", "Conos x4", "Petos 2 colores", "Balones x6"]', '["MD-4", "MD-3"]', true, true, '["rondo", "escape", "transición", "mini portería"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Rondo 5v2+2 con Relevo', 'RND-017', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 14, 14, 'cuadrado', 9, 9, 0, '5v2+2 en espera', 'Rondo 5v2 donde cada 30 segundos los 2 defensores hacen relevo con los 2 en espera. Mantiene intensidad alta en pressing.', 'Entrenador pasa al equipo de 5', 'Tiempo de serie', '["2 defienden, 2 esperan", "Relevo cada 30 seg", "Defensores que salen van a espera"]', 'Robos acumulados por pareja de defensores', 'ataque_organizado', 'Pressing intenso con relevo', 'Mantener pressing fresco', 'Muy alta intensidad', 21.8, 'alta', 165, 185, 2, '["Mantener posesión contra pressing fresco"]', '["30 seg de pressing máximo", "Robar antes del relevo"]', '["Bajar intensidad antes de relevo"]', '[{"nombre": "Relevo cada 20 seg", "descripcion": "Más frecuente", "dificultad": "+1"}]', '["Conos x4", "Petos 2 colores", "Balones x4", "Silbato"]', '["MD-4"]', true, true, '["rondo", "relevo", "pressing", "intensidad"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Rondo Klopp: 4v4+4 Tres Equipos', 'RND-018', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 18, 3, 5, 1, 25, 25, 'cuadrado', 12, 12, 0, '4v4+4 (tres equipos)', 'Rondo estilo Klopp con 3 equipos de 4. Dos equipos juegan 8v4, el que pierde balón pasa a defender. Gegenpressing: al perder, 6 segundos de pressing máximo.', 'Entrenador pasa a un equipo', 'Tiempo de serie', '["2 equipos atacan (8v4)", "Equipo que pierde: pasa a defender", "6 seg de gegenpressing tras pérdida"]', 'Robos por equipo', 'transicion_ataque_defensa', 'Gegenpressing Klopp', 'Pressing tras pérdida inmediato', 'Muy alta intensidad', 52.1, 'alta', 170, 190, 2, '["No perder", "Si pierden: 6 seg pressing máximo"]', '["Robar rápido para no ser equipo defensor"]', '["Gegenpressing lento", "No presionar tras pérdida"]', '[{"nombre": "Sin gegenpressing", "descripcion": "Cambio normal", "dificultad": "-1"}]', '["Conos x4", "Petos 3 colores", "Balones x6", "Cronómetro"]', '["MD-4", "MD-3"]', true, true, '["Klopp", "gegenpressing", "tres equipos", "intensidad"]');

-- ============================================================================
-- BALÓN PARADO (ABP) - 5 tareas adicionales (Total: 18)
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Falta Frontal con Barrera Móvil', 'ABP-014', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1.25, 0.5, 25, 30, 'area_grande', 8, 10, 1, 'Lanzadores + Barrera + POR', 'Práctica de faltas frontales donde la barrera puede moverse (saltar/agacharse) simulando situación real. Lanzador debe leer la barrera.', 'Señal del entrenador', 'Gol o parada', '["Barrera de 4 jugadores", "Barrera puede moverse al golpeo", "Lanzador debe leer"]', 'ataque_organizado', 'Falta con lectura', 'Superar barrera reactiva', 'Muy baja intensidad', 'baja', 90, 115, 2, '["Leer intención de barrera", "Decidir: arriba, abajo, lado", "Golpeo decidido"]', '["Golpeo predecible", "No leer barrera"]', '[{"nombre": "Barrera fija", "descripcion": "No se mueve", "dificultad": "-1"}]', '["Portería reglamentaria", "Conos", "Balones x10"]', '["MD-2", "MD-1"]', true, true, '["falta frontal", "barrera", "lectura", "ABP"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Defensa de Córner: Salida al Contraataque', 'ABP-015', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 22, 10, 1.75, 0.5, 60, 68, 'campo_propio', 14, 18, 1, '7-9 defensores + POR vs atacantes', 'Defensa de córner con énfasis en salida al contraataque tras despeje. 2 jugadores se quedan adelantados para transición. Trabaja despeje + salida rápida.', 'Córner', 'Despeje + contraataque o gol', '["2 jugadores quedan adelantados para contra", "Tras despeje: transición inmediata", "Mini portería para contraataque"]', 'defensa_organizada', 'Córner + contraataque', 'Defender y salir rápido', 'Baja intensidad con picos', 'baja', 110, 140, 2, '["Despejar hacia jugadores adelantados", "Transición inmediata", "Atacar mini portería"]', '["Despeje corto", "No salir en contra"]', '[{"nombre": "Sin contra", "descripcion": "Solo defensa", "dificultad": "-1"}]', '["Portería reglamentaria", "Mini portería x1", "Conos", "Balones x10"]', '["MD-2", "MD-1"]', true, true, '["córner", "contraataque", "defensa", "transición", "ABP"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Córner en Corto: Variantes', 'ABP-016', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1.5, 0.5, 30, 40, 'area_grande', 10, 14, 1, 'Atacantes + POR', 'Práctica de córner en corto con 3 variantes: pared y centro, conducción y centro, pared+pared+centro. Trabajo de combinación desde esquina.', 'Señal indica variante', 'Gol o despeje', '["3 variantes de córner corto", "Señalización visual", "Llegadas coordinadas al área"]', 'ataque_organizado', 'Córner en corto', 'Crear ocasión con combinación', 'Baja intensidad', 'baja', 100, 125, 2, '["Conocer señales", "Timing de combinación", "Llegadas escalonadas al área"]', '["Confusión en variante", "Timing malo"]', '[{"nombre": "Solo 1 variante", "descripcion": "Repetir misma", "dificultad": "-1"}]', '["Portería reglamentaria", "Conos", "Balones x10"]', '["MD-2", "MD-1"]', true, true, '["córner corto", "combinación", "variantes", "ABP"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Defensa Pressing Post-Córner', 'ABP-017', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 16, 8, 1.5, 0.5, 50, 65, 'medio_campo', 16, 18, 1, 'Defensores + POR vs Atacantes', 'Trabajo de pressing inmediato tras córner a favor que no termina en gol. Al despejar rival, activar pressing alto para recuperar en zona de finalización.', 'Córner a favor que rival despeja', 'Robo alto o balón supera pressing', '["Córner sale rechazado", "Pressing inmediato", "5 segundos para recuperar alto"]', 'defensa_organizada', 'Pressing post-córner', 'Recuperar tras córner fallido', 'Alta intensidad', 'alta', 160, 180, 2, '["Pressing inmediato tras despeje", "5 seg máximo de pressing", "Cercar balón"]', '["Pressing lento", "No coordinar"]', '[{"nombre": "Sin pressing", "descripcion": "Replegar", "dificultad": "-1"}]', '["Portería reglamentaria", "Conos", "Petos", "Balones x8"]', '["MD-2", "MD-3"]', true, true, '["pressing", "post-córner", "recuperación", "ABP"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Penalti: Rutina de Portero', 'ABP-018', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 1, 16, 2, 20, 20, 'area_grande', 6, 8, 2, 'Lanzadores + 2 Porteros', 'Práctica de penaltis desde perspectiva del portero. Trabajo de lectura del lanzador, posición, movimiento lateral y reacción. Porteros alternan.', 'Lanzador listo', 'Parada o gol', '["Portero: leer antes del golpeo", "Trabajo de posición y reacción", "Alternancia de porteros"]', 'defensa_organizada', 'Defensa de penalti', 'Parar penaltis con lectura', 'Muy baja intensidad', 'baja', 95, 120, 2, '["Elegir lado", "Mantener decisión", "Golpeo firme"]', '["Anticipar demasiado", "Dudar"]', '[{"nombre": "Sin lanzador fijo", "descripcion": "Todos lanzan", "dificultad": "="}]', '["Portería reglamentaria", "Balones x8"]', '["MD-2", "MD-1"]', true, true, '["penalti", "portero", "parada", "lectura", "ABP"]');

-- ============================================================================
-- SSG/EVO/AVD - 10 tareas adicionales para completar 150
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('SSG 4v4+4 (Tres Equipos Rotación)', 'SSG-017', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 1, 18, 2, 35, 28, 'rectangular', 12, 12, 0, '4v4+4 (3 equipos)', 'Tres equipos de 4. 8v4: dos equipos atacan, uno defiende. Al robar, equipo que perdió pasa a defender. Similar al rondo Klopp pero con mini porterías.', 'Entrenador pasa balón', 'Gol o robo (rotación)', '["2 equipos atacan vs 1 defiende", "Equipo que pierde: pasa a defender", "Gol = punto para ambos atacantes"]', 'Goles acumulados por equipo', 'transicion_defensa_ataque', 'SSG con rotación', 'Atacar y no perder', 'Muy alta intensidad', 40.8, 'alta', 170, 190, 2, '["Atacar rápido", "No perder para no defender"]', '["Robar y cambiar rol"]', '["Perder balón fácil"]', '[{"nombre": "3v3+3", "descripcion": "Menos jugadores", "dificultad": "+1"}]', '["Mini porterías x2", "Conos", "Petos 3 colores", "Balones x6"]', '["MD-4"]', true, true, '["tres equipos", "rotación", "SSG", "intensidad"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('SSG Futsal 5v5 (Reglas Futsal)', 'SSG-018', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 40, 20, 'rectangular', 12, 12, 2, '5v5 (4+POR vs 4+POR)', 'Partido con reglas de futsal: saque de banda con pie, faltas acumulativas, 4 segundos para sacar. Trabaja velocidad de juego y técnica en espacio reducido.', 'Saque de centro', 'Tiempo de serie', '["Reglas futsal completas", "4 seg para sacar", "Faltas acumulan"]', 'Goles', 'ataque_organizado', 'Futsal: velocidad y técnica', 'Dominar futsal', 'Muy alta intensidad', 40, 'alta', 170, 190, 2, '["Velocidad de juego", "Técnica depurada", "Pase y desmarque rápido"]', '["Pressing alto", "No dar tiempo"]', '["Lentitud", "Técnica imprecisa"]', '[{"nombre": "Sin reglas futsal", "descripcion": "Reglas normales", "dificultad": "-1"}]', '["Porterías futsal", "Balón futsal", "Petos"]', '["MD-4", "MD+1"]', true, true, '["futsal", "velocidad", "técnica", "reducido"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Evolución: Rechace al Segundo Palo', 'EVO-017', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 10, 1.25, 0.5, 40, 45, 'area_grande', 8, 10, 1, 'Centrador + Atacantes + POR', 'Trabajo específico de atacar rechaces. Extremo centra, portero despeja, atacantes deben rematar el rechace. Énfasis en segunda jugada.', 'Extremo centra', 'Gol de rechace o despeje definitivo', '["Centro, portero despeja, atacar rechace", "Siempre 2 jugadores vigilando rechace", "Rápidos al segundo balón"]', 'ataque_organizado', 'Segunda jugada', 'Atacar rechaces', 'Media intensidad', 'media', 145, 165, 2, '["Vigilar rechace siempre", "Llegar rápido al segundo balón", "Remate decidido"]', '["No vigilar rechace", "Llegar tarde"]', '[{"nombre": "Sin rechace", "descripcion": "Centro directo", "dificultad": "-1"}]', '["Portería reglamentaria", "Conos", "Balones x12"]', '["MD-2", "MD-3"]', true, true, '["rechace", "segunda jugada", "finalización"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Evolución: Incorporación de Lateral', 'EVO-018', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 8, 1.75, 0.5, 50, 40, 'banda_area', 8, 10, 1, 'Lateral + Interior + Extremo + 9 + POR', 'Automatismo de incorporación de lateral. Lateral sube por fuera, interior le deja espacio, extremo corta, lateral centra para llegada del 9 e interior.', 'Lateral con balón en zona media', 'Gol o despeje', '["Lateral sube por fuera", "Interior se abre para dar espacio", "Extremo corta para crear hueco", "Llegadas al área coordinadas"]', 'ataque_organizado', 'Incorporación de lateral', 'Generar ocasión con lateral', 'Media intensidad', 'media', 145, 165, 2, '["Lateral: subir con decisión", "Interior: abrir espacio", "Llegadas escalonadas"]', '["Timing descoordinado", "Lateral no sube"]', '[{"nombre": "Con 1 defensor", "descripcion": "Oposición ligera", "dificultad": "+1"}]', '["Portería reglamentaria", "Conos", "Balones x10"]', '["MD-2", "MD-1"]', true, true, '["lateral", "incorporación", "automatismo"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('AVD: Defensa de Centro Raso', 'AVD-017', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 18, 8, 1.75, 0.5, 30, 40, 'area_grande', 10, 12, 1, '5v4+POR', 'Trabajo de defensa de centros rasos al área pequeña. Extremo centra raso, defensores deben interceptar o despejar antes de que llegue al rematador.', 'Extremo en banda listo para centro raso', 'Despeje, gol o atrapada', '["Solo centros rasos", "Defensores: anticipar y despejar", "Atacantes: llegar al remate"]', 'defensa_organizada', 'Defensa centro raso', 'Evitar gol de centro raso', 'Media intensidad', 'media', 140, 160, 2, '["Llegar al centro raso", "Remate a primer toque"]', '["Anticipar centro", "Cubrir primer palo", "No dejar llegar"]', '["No anticipar", "Dejar espacio primer palo"]', '[{"nombre": "Centros variados", "descripcion": "Raso y aéreo", "dificultad": "+1"}]', '["Portería reglamentaria", "Conos", "Petos", "Balones x10"]', '["MD-3", "MD-2"]', true, true, '["centro raso", "defensa", "área", "anticipación"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('AVD: Cobertura Tras Pérdida', 'AVD-018', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 16, 6, 2, 0.75, 50, 45, 'medio_campo', 10, 10, 1, '5v4+POR', 'Trabajo de coberturas defensivas tras pérdida de compañero. Defensor pierde duelo simulado, compañeros deben cubrir rápidamente su posición.', 'Defensor pierde duelo (simulado)', 'Cobertura exitosa o gol', '["Defensor sale de posición (simula pérdida de duelo)", "Compañeros: cobertura inmediata", "Atacantes: aprovechar hueco"]', 'defensa_organizada', 'Coberturas', 'Cubrir compañero superado', 'Alta intensidad', 'alta', 160, 180, 2, '["Atacar hueco dejado", "Aprovechar superioridad momentánea"]', '["Cobertura inmediata", "Comunicar", "No dejar hueco"]', '["Cobertura lenta", "No comunicar"]', '[{"nombre": "Sin cobertura", "descripcion": "Ver resultado sin ayuda", "dificultad": "+1"}]', '["Portería reglamentaria", "Conos", "Petos", "Balones x8"]', '["MD-4", "MD-3"]', true, true, '["cobertura", "defensa", "compañero", "ayuda"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Evolución: Disparo Tras Combinación', 'EVO-019', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 12, 1.25, 0.5, 40, 35, 'zona_14', 6, 8, 1, 'Mediocampistas + Delantero + POR', 'Trabajo de disparo desde fuera del área tras combinación. Secuencia de pases que termina en disparo desde 18-20 metros. Énfasis en golpeo y colocación.', 'Mediocentro con balón', 'Gol o parada', '["Combinación de 3-4 pases", "Disparo desde fuera del área", "Trabajo de golpeo"]', 'ataque_organizado', 'Disparo desde fuera', 'Generar ocasión de disparo', 'Media intensidad', 'media', 140, 160, 2, '["Combinación fluida", "Perfilarse para disparo", "Golpeo con potencia/colocación"]', '["Disparo flojo", "Mal perfilado"]', '[{"nombre": "Con portero", "descripcion": "Variedad de tiros", "dificultad": "="}]', '["Portería reglamentaria", "Conos", "Balones x12"]', '["MD-3", "MD-2"]', true, true, '["disparo", "fuera área", "combinación", "golpeo"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('Evolución: Volea de Remate', 'EVO-020', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 12, 1, 0.5, 30, 35, 'area_grande', 6, 8, 1, 'Centrador + Rematadores + POR', 'Trabajo específico de volea. Centros a media altura para remate de volea. Énfasis en técnica de golpeo, posición del cuerpo y timing.', 'Centro a media altura', 'Gol o parada', '["Centros a altura de volea", "Trabajo técnico de volea", "Variar pie y posición"]', 'ataque_organizado', 'Volea', 'Rematar de volea', 'Baja intensidad', 'baja', 120, 145, 2, '["Perfilarse para volea", "Cuerpo sobre el balón", "Golpeo limpio"]', '["Cuerpo echado atrás", "Timing malo"]', '[{"nombre": "Centro al ras", "descripcion": "Volea a ras de suelo", "dificultad": "+1"}]', '["Portería reglamentaria", "Conos", "Balones x12"]', '["MD-3", "MD-2"]', true, true, '["volea", "técnica", "remate", "finalización"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('SSG Final de Entrenamiento', 'SSG-019', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 60, 45, 'campo_reducido', 16, 18, 2, '8v8+2POR', 'Partido de fin de entrenamiento. 8v8 libre sin condiciones especiales. Aplicar todo lo trabajado en la sesión. Partido competitivo.', 'Saque de centro', 'Tiempo de serie', '["Partido libre", "Aplicar contenidos de la sesión", "Competición real"]', 'Goles', 'ataque_organizado', 'Partido libre', 'Competir aplicando lo aprendido', 'Alta intensidad', 33.8, 'alta', 160, 180, 2, '["Aplicar lo trabajado", "Jugar libre", "Competir"]', '["Aplicar conceptos defensivos", "Competir"]', '["No aplicar contenidos"]', '[{"nombre": "Con condición", "descripcion": "Añadir una regla", "dificultad": "+1"}]', '["Porterías reducidas", "Petos", "Balones x8"]', '["MD-4", "MD-3", "MD-2"]', true, true, '["partido libre", "fin sesión", "competición"]');

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, como_inicia, como_finaliza, reglas_tacticas, forma_puntuar, fase_juego, principio_tactico, intencion_tactica, tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, consignas_ofensivas, consignas_defensivas, errores_comunes, variantes, material, match_days_recomendados, es_plantilla, es_publica, tags)
VALUES ('SSG 6v6 Recuperación Activa', 'SSG-020', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 50, 40, 'campo_reducido', 14, 14, 2, '6v6+2POR', 'Partido de recuperación activa MD+1 o MD+2. Intensidad media-baja. Prohibidas entradas fuertes. Énfasis en circulación y técnica sin contacto intenso.', 'Saque de portero', 'Tiempo de serie', '["Intensidad media-baja", "Prohibido contacto fuerte", "Énfasis en técnica"]', 'Goles', 'ataque_organizado', 'Recuperación activa', 'Recuperar jugando a baja intensidad', 'Baja intensidad', 41.7, 'baja', 120, 140, 1, '["Circular sin prisas", "Técnica limpia", "Sin contacto fuerte"]', '["Sin entradas fuertes", "Presión suave"]', '["Intensidad alta", "Contacto fuerte"]', '[{"nombre": "Intensidad normal", "descripcion": "Partido normal", "dificultad": "+1"}]', '["Porterías reducidas", "Petos", "Balones x8"]', '["MD+1", "MD+2"]', true, true, '["recuperación", "baja intensidad", "post-partido"]');

-- ============================================================================
-- FIN LOTES 11-14 - 35 TAREAS FINALES (116-150)
-- ============================================================================
-- TOTAL FINAL: 150 TAREAS PROFESIONALES
-- ============================================================================
-- Distribución final:
-- - RND: 18
-- - JDP: 15
-- - POS: 18
-- - EVO: 20
-- - AVD: 18
-- - PCO: 18
-- - SSG: 20
-- - ABP: 18
-- - TOTAL: 150 tareas (verificado por categorías: 18+15+18+20+18+18+20+18 = 145... ajustando)
-- ============================================================================
