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
    'Muy alta intensidad', 55, 'muy alta', 175, 195,
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
