-- ============================================================================
-- TRAININGHUB PRO - SEED: TAREAS PROFESIONALES DE FÚTBOL
-- ============================================================================
-- Ejecutar DESPUÉS de la migración 002_tareas_campos_adicionales.sql
-- ============================================================================

-- Primero obtenemos los IDs de las categorías
-- Nota: Este seed usa una organización de demo. Ajustar organization_id según necesidad.

-- ============================================================================
-- VARIABLE: Crear organización de demo si no existe
-- ============================================================================
INSERT INTO organizaciones (id, nombre, color_primario)
VALUES ('00000000-0000-0000-0000-000000000001', 'Club Demo - Tareas Públicas', '#1a365d')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RONDOS (RND) - 3 tareas
-- ============================================================================

-- Rondo 1: 4v2 Básico
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
    variantes, progresiones, regresiones, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Rondo 4v2 con Transiciones', 'RND-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    12, 4, 2, 1,
    10, 10, 'cuadrado',
    6, 6, 0, '4v2',
    'Rondo clásico de posesión con transiciones rápidas. Los 4 jugadores exteriores mantienen la posesión mientras los 2 centrales intentan recuperar. Al robo, el jugador que perdió el balón entra a presionar.',
    'Entrenador pasa balón al equipo poseedor',
    'Robo de balón o balón fuera del cuadrado',
    '["Máximo 2 toques", "Pase a ras de suelo"]',
    '["Apoyos en diagonal", "No repetir pase al mismo compañero"]',
    '["Equipo que pierde hace 5 flexiones", "Competición por puntos"]',
    '10 pases seguidos = 1 punto, robo = -1 punto para equipo poseedor',
    'ataque_organizado', 'Conservación del balón', 'Movilidad constante', 'Pase corto y control orientado', 'Encontrar el hombre libre',
    'Intermitente alta intensidad', 16.7, '1:1', 'alta', 150, 175,
    2,
    '["Orientar el cuerpo antes de recibir", "Balón al pie más alejado del defensor", "Comunicación constante"]',
    '["Presión en parejas coordinada", "Cerrar líneas de pase centrales", "No ir los dos al balón"]',
    '["Quedarse estático tras el pase", "Pase telegráfico", "Recibir de espaldas"]',
    '[{"nombre": "1 toque obligatorio", "descripcion": "Solo se permite 1 toque", "dificultad": "+1"}, {"nombre": "5v2", "descripcion": "Añadir un jugador más en posesión", "dificultad": "-1"}, {"nombre": "Comodín central", "descripcion": "Un jugador libre en el centro", "dificultad": "-1"}]',
    '["4v2 libre → 4v2 2 toques → 4v2 1 toque → 4v2+1 → Rondo posicional"]',
    '["Aumentar espacio a 12x12", "Permitir 3 toques", "Quitar limitación de pases"]',
    '["Petos 2 colores (4+2)", "Conos delimitadores x4", "Balones x6"]',
    '["MD-1", "MD+2", "MD-4"]',
    'Capacidad aeróbica, velocidad de reacción',
    'Concentración, toma de decisiones bajo presión',
    true, true,
    '["posesión", "pressing", "transiciones", "activación", "técnica", "velocidad mental"]'
);

-- Rondo 2: Rondo Posicional 4v4+3
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
    'Rondo Posicional 4v4+3 Comodines', 'RND-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    16, 4, 3, 1,
    20, 20, 'cuadrado',
    11, 11, 0, '4v4+3',
    'Rondo posicional con 3 comodines fijos (2 en lados opuestos + 1 central). El equipo en posesión busca completar secuencias de pase mientras el rival presiona para recuperar.',
    'Entrenador pasa a equipo con comodines',
    'Robo y 3 pases del equipo recuperador',
    '["Máximo 2 toques para jugadores de campo", "Comodines 1 toque"]',
    '["Comodines no pueden pasar entre ellos", "Obligatorio pasar por comodín central cada 5 pases"]',
    '["Equipo que completa secuencia celebra"]',
    'Secuencia completa (pase por los 3 comodines) = 3 puntos',
    'ataque_organizado', 'Juego posicional', 'Superioridad numérica', 'Pase y desmarque', 'Fijar y soltar',
    'Intermitente media-alta', 36.4, '2:1', 'media', 140, 165,
    3,
    '["Amplitud máxima", "Tercer hombre", "Cambios de orientación", "Atacar espacio libre"]',
    '["Pressing coordinado", "Cerrar comodín central", "Coberturas"]',
    '["Abusar del comodín", "Falta de movilidad", "No usar el ancho"]',
    '[{"nombre": "Comodines 2 toques", "descripcion": "Facilitar la tarea", "dificultad": "-1"}, {"nombre": "Zona prohibida", "descripcion": "No se puede pasar por ciertas zonas", "dificultad": "+1"}]',
    '["4v4+2 → 4v4+3 → 5v5+3 → Juego posicional real"]',
    '["Petos 3 colores", "Conos x8", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Resistencia intermitente',
    'Visión periférica, paciencia en posesión',
    true, true,
    '["posesión", "juego posicional", "comodines", "superioridad", "mediocampo"]'
);

-- Rondo 3: Rondo Direccional 3v3+2
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
    'Rondo Direccional 3v3+2 Porterías', 'RND-003',
    (SELECT id FROM categorias_tarea WHERE codigo = 'RND'),
    '00000000-0000-0000-0000-000000000001',
    15, 5, 2, 1,
    25, 15, 'rectangular',
    8, 8, 0, '3v3+2',
    'Rondo con direccionalidad. Dos equipos de 3 + 2 comodines en los lados largos. Se puntúa pasando el balón entre las mini porterías del fondo contrario.',
    'Saque de banda del equipo poseedor',
    'Gol o balón fuera',
    '["Libre de toques"]',
    '["Comodines con el equipo que tiene balón", "Gol solo vale si todos pasaron medio campo"]',
    'Pase entre conos de portería = 1 punto',
    'ataque_organizado', 'Progresión', 'Amplitud y profundidad', 'Conducción y pase filtrado', 'Llegar a zona de finalización',
    'Alta intensidad intermitente', 46.9, 'alta', 155, 180,
    2,
    '["Buscar profundidad", "Usar comodines para cambiar juego", "Ataques rápidos"]',
    '["Pressing alto", "Vigilar comodines", "Cerrar portería"]',
    '["Solo jugar en corto", "No usar amplitud", "Precipitarse"]',
    '[{"nombre": "2 toques máximo", "descripcion": "Aumentar velocidad", "dificultad": "+1"}, {"nombre": "Portería central", "descripcion": "Añadir portería en medio", "dificultad": "+1"}]',
    '["Petos 3 colores", "Conos mini portería x4", "Conos delimitadores x8", "Balones x6"]',
    '["MD-4", "MD-3", "MD-2"]',
    'Potencia aeróbica, cambios de ritmo',
    true, true,
    '["posesión", "progresión", "transiciones", "intensidad", "finalización"]'
);

-- ============================================================================
-- JUEGO DE POSICIÓN (JDP) - 2 tareas
-- ============================================================================

-- JdP 1: Salida de Balón 4+POR v 3
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
    'Salida de Balón 4+POR vs 3 Presión', 'JDP-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    18, 6, 2, 1,
    40, 50, 'rectangular',
    8, 8, 1, '4+POR v 3',
    'Trabajo de salida de balón desde portero con línea de 4 defensores contra 3 delanteros que presionan. El objetivo es superar la línea de pressing y llegar a zona segura.',
    'Portero con balón en mano',
    'Balón supera línea de pressing o robo y contraataque',
    '["Portero máximo 3 toques", "Defensas 2 toques"]',
    '["Obligatorio salir jugando (no balón largo)", "Si hay pressing alto, lateral libre puede recibir atrás"]',
    'Superar línea de pressing = 1 punto, Robo y gol contraataque = 3 puntos',
    'ataque_organizado', 'Salida de balón', 'Construcción desde atrás', 'Pase entre líneas', 'Superar primera presión',
    'Baja-media intensidad', 62.5, 'baja', 120, 145,
    3,
    '["Portero leer presión", "Centrales abiertos", "Laterales alta para dar línea de pase", "Pivote ofrecerse"]',
    '["Presión coordinada en 3", "Cerrar pase interior", "Orientar hacia banda"]',
    '["Portero precipitado", "Centrales muy juntos", "No ofrecer soluciones"]',
    '[{"nombre": "4v4", "descripcion": "Añadir un presionador más", "dificultad": "+1"}, {"nombre": "Comodín MCD", "descripcion": "Añadir pivote comodín", "dificultad": "-1"}]',
    '["4+POR v 2 → 4+POR v 3 → 4+POR v 4 → Con mediocampistas"]',
    '["Portería reglamentaria", "Conos zona segura", "Petos", "Balones x8"]',
    '["MD-3", "MD-2"]',
    'Baja carga física, técnica en calma',
    'Calma bajo presión, toma de decisiones',
    true, true,
    '["salida balón", "construcción", "portero", "pressing", "posicional"]'
);

-- JdP 2: Juego Posicional 6v4+POR
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
    'Juego Posicional 6v4+POR Zonas', 'JDP-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'),
    '00000000-0000-0000-0000-000000000001',
    20, 4, 4, 1,
    45, 40, 'rectangular',
    11, 11, 1, '6v4+POR',
    'Juego posicional en medio campo dividido en 6 zonas. 6 atacantes (4-2 o 3-3) intentan progresar y finalizar contra 4 defensores + portero. Máximo 2 jugadores por zona.',
    'Entrenador pasa a equipo atacante',
    'Gol, fuera o robo con salida a zona segura',
    '["Máximo 3 toques en zonas defensivas", "2 toques en zona de finalización"]',
    '["Máximo 2 jugadores por zona", "Obligatorio pasar por zona central antes de finalizar"]',
    'Gol = 3 puntos, Llegada a zona finalización = 1 punto',
    'ataque_organizado', 'Juego posicional', 'Ocupación racional del espacio', 'Pase, control y desmarque', 'Crear y ocupar espacios',
    'Media intensidad', 38.2, 'media', 140, 160,
    3,
    '["Ocupar zonas vacías", "Movimientos de ruptura", "Tercer hombre", "Paciencia"]',
    '["Basculación", "Cerrar zona central", "Coberturas", "Repliegue"]',
    '["Amontonarse en zona", "Precipitarse", "No usar amplitud"]',
    '[{"nombre": "7v4", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "6v5", "descripcion": "Menos superioridad", "dificultad": "+1"}, {"nombre": "Sin zonas", "descripcion": "Juego libre", "dificultad": "-1"}]',
    '["Petos 2 colores", "Conos zonas x12", "Portería", "Balones x8"]',
    '["MD-4", "MD-3"]',
    true, true,
    '["posicional", "superioridad", "zonas", "finalización", "mediocampo", "ataque"]'
);

-- ============================================================================
-- POSESIÓN (POS) - 2 tareas
-- ============================================================================

-- Posesión 1: Posesión 5v5+5 Tres Zonas
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
    'Posesión 5v5+5 Cambios de Zona', 'POS-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    24, 4, 5, 1,
    60, 40, 'rectangular',
    15, 15, 0, '5v5+5',
    'Campo dividido en 3 zonas horizontales. 5v5 en zona central + 5 comodines (2 en cada zona exterior + 1 flotante). Objetivo: mantener posesión y cambiar de zona.',
    'Entrenador pasa al equipo que defiende',
    'Tiempo de serie',
    '["Libre de toques en zona central", "Comodines máximo 2 toques"]',
    '["Para puntuar hay que cambiar balón de zona exterior a zona exterior", "Comodines no pueden pasar entre ellos directamente"]',
    'Cambio de zona completado = 1 punto, 10 pases seguidos = 1 punto',
    'ataque_organizado', 'Conservación', 'Amplitud y cambio de orientación', 'Pase largo y control', 'Atraer y soltar',
    'Media-alta intensidad', 26.7, 'media', 145, 170,
    2,
    '["Usar todo el ancho", "Atraer rivales a zona y cambiar", "Paciencia", "Movimiento constante"]',
    '["Compactar en zona del balón", "Pressing cuando balón va a comodín", "Anticipación"]',
    '["Jugar siempre en corto", "No cambiar orientación", "Comodines estáticos"]',
    '[{"nombre": "4v4+5", "descripcion": "Menos jugadores zona central", "dificultad": "+1"}, {"nombre": "Sin comodín flotante", "descripcion": "Solo comodines en zonas", "dificultad": "+1"}]',
    '["Petos 3 colores", "Conos zonas x8", "Balones x10"]',
    '["MD-3", "MD-4"]',
    'Resistencia aeróbica, cambios de ritmo',
    true, true,
    '["posesión", "cambio orientación", "amplitud", "comodines", "resistencia"]'
);

-- Posesión 2: Posesión 4v4+2 Transiciones
INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tecnicas, reglas_tacticas,
    forma_puntuar,
    fase_juego, principio_tactico, accion_tecnica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'Posesión 4v4+2 con Transiciones', 'POS-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'POS'),
    '00000000-0000-0000-0000-000000000001',
    16, 4, 3, 1,
    30, 25, 'rectangular',
    10, 10, 0, '4v4+2',
    'Posesión con transiciones rápidas. 4v4 con 2 comodines. Al robar, el equipo que recupera tiene 6 segundos para hacer 5 pases o pierde la posesión.',
    'Entrenador pasa al equipo defensor',
    'Tiempo o pérdida del equipo en transición',
    '["Máximo 2 toques"]',
    '["6 segundos para consolidar posesión tras robo", "5 pases para validar recuperación"]',
    'Consolidar posesión tras robo = 1 punto, Robar durante transición rival = 2 puntos',
    'transicion_defensa_ataque', 'Transición rápida', 'Pase corto rápido',
    'Alta intensidad', 37.5, 'alta', 160, 180,
    2,
    '["Transición inmediata al robar", "Apoyos cercanos", "Verticalidad inicial"]',
    '["Pressing inmediato tras pérdida", "6 segundos de presión máxima", "Recuperar o replegar"]',
    '["Lentitud en transición", "No pressing tras pérdida", "Pases largos innecesarios"]',
    '[{"nombre": "8 segundos", "descripcion": "Más tiempo para consolidar", "dificultad": "-1"}, {"nombre": "4 segundos", "descripcion": "Menos tiempo", "dificultad": "+1"}]',
    '["Petos 3 colores", "Conos x8", "Balones x8", "Cronómetro visible"]',
    '["MD-4", "MD-3"]',
    'Capacidad de repetir sprints, recuperación',
    'Concentración, reacción rápida',
    true, true,
    '["transiciones", "pressing", "intensidad", "recuperación", "gegenpressing"]'
);

-- ============================================================================
-- EVOLUCIONES (EVO) - 2 tareas
-- ============================================================================

-- Evolución 1: Oleadas de Finalización
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
    variantes, progresiones, material, match_days_recomendados,
    objetivo_fisico,
    es_plantilla, es_publica, tags
) VALUES (
    'Oleadas 3v2+POR Finalización', 'EVO-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    20, 10, 1.5, 0.5,
    50, 40, 'medio_campo',
    12, 15, 2, '3v2+POR en oleadas',
    'Oleadas continuas de 3v2 hacia portería. 3 atacantes salen desde medio campo contra 2 defensores + portero. Al finalizar (gol o pérdida), inmediatamente sale siguiente oleada.',
    'Entrenador pasa a trío atacante',
    'Gol, fuera, atrapada portero o robo defensivo',
    '["Máximo 4 toques por jugador"]',
    '["Finalizar en máximo 8 segundos", "Centro obligatorio si se llega a línea de fondo"]',
    'Gol = 2 puntos, Disparo a puerta = 1 punto',
    'ataque_organizado', 'Finalización', 'Ataque rápido', 'Pase, centro y remate', 'Finalizar con superioridad',
    'Alta intensidad', 66.7, 'alta', 165, 185,
    2,
    '["Verticalidad máxima", "Desmarques de ruptura", "Atacar el espacio", "Rematar a portería"]',
    '["Exceso de pases", "No atacar primer palo", "Finalizar desde lejos pudiendo progresar"]',
    '[{"nombre": "3v3", "descripcion": "Igualdad numérica", "dificultad": "+1"}, {"nombre": "4v2", "descripcion": "Mayor superioridad", "dificultad": "-1"}]',
    '["2v1 → 3v1 → 3v2 → 4v3 → Con mediocampistas"]',
    '["Portería reglamentaria", "Conos salida", "Petos", "Balones x15"]',
    '["MD-4", "MD-2"]',
    'Potencia, velocidad máxima, repetición sprints',
    true, true,
    '["finalización", "oleadas", "superioridad", "velocidad", "ataque", "gol"]'
);

-- Evolución 2: Evolución Ataque Combinado
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
    es_plantilla, es_publica, tags
) VALUES (
    'Evolución Combinación Banda-Centro', 'EVO-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.5, 0.75,
    55, 50, 'medio_campo',
    10, 12, 2, 'Grupos de 5 en oleadas',
    'Automatismo de ataque: extremo + lateral + interior + delantero + mediapunta. Secuencia fija de pases que termina en centro y remate. Alternar banda derecha e izquierda.',
    'Lateral inicia con balón',
    'Gol o centro despejado',
    '["Secuencia: Lateral→Extremo→Interior→Pared→Centro→Remate", "Timing de desmarques específico"]',
    'ataque_organizado', 'Ataque combinativo', 'Juego por banda', 'Centro y remate', 'Automatizar llegada',
    'Media-alta intensidad', 'alta', 155, 175,
    2,
    '["Timing de aparición en área", "Atacar primer palo", "Segundo palo vigilante", "Rechace"]',
    '["Descoordinación en timing", "Centro malo", "No atacar rechace"]',
    '[{"nombre": "Con oposición", "descripcion": "Añadir 2-3 defensores pasivos", "dificultad": "+1"}, {"nombre": "Variante por dentro", "descripcion": "Finalización sin centro", "dificultad": "="}]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x12"]',
    '["MD-2", "MD-1"]',
    true, true,
    '["automatismos", "centro", "remate", "banda", "finalización", "coordinación"]'
);

-- ============================================================================
-- ATAQUE VS DEFENSA (AVD) - 2 tareas
-- ============================================================================

-- AvD 1: 7v7+POR Medio Campo
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
    'Ataque vs Defensa 7v7+POR Sectorial', 'AVD-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    24, 4, 5, 1,
    60, 65, 'medio_campo',
    15, 15, 1, '7v7+POR',
    'Trabajo sectorial de ataque organizado contra defensa organizada. 7 atacantes (4-3 o 3-4) intentan generar ocasión contra 7 defensores (4-3) + portero. Se trabaja el último tercio.',
    'Entrenador pasa a mediocampista atacante',
    'Gol, fuera, córner o robo con balón controlado',
    '["Atacantes: máximo 3 toques en zonas alejadas, libre en área", "Defensa: línea de fuera de juego activa"]',
    'ataque_organizado', 'Creación de ocasiones', 'Juego entre líneas', 'Generar y finalizar ocasión',
    'Media-alta intensidad', 'media', 150, 170,
    3,
    '["Movilidad en ataque", "Desmarques de ruptura", "Paredes en zona 14", "Centros al área"]',
    '["Línea defensiva coordinada", "Presión al balón", "Coberturas", "Vigilancias"]',
    '["Atacar sin superioridad", "Defensores muy pasivos", "No usar amplitud"]',
    '[{"nombre": "8v7", "descripcion": "Superioridad atacante", "dificultad": "-1"}, {"nombre": "7v8", "descripcion": "Inferioridad atacante", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos línea medio campo", "Petos 2 colores", "Balones x10"]',
    '["MD-4", "MD-3"]',
    'Resistencia específica, duelos',
    true, true,
    '["sectorial", "ataque", "defensa", "creación", "finalización", "táctico"]'
);

-- AvD 2: Pressing Alto 6v5+POR
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
    'Pressing Alto 6v5+POR Salida Balón', 'AVD-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'),
    '00000000-0000-0000-0000-000000000001',
    20, 5, 3, 1,
    50, 65, 'campo_propio',
    12, 12, 1, '6v5+POR',
    'Trabajo de pressing alto. 6 jugadores presionan la salida de balón de 5 defensores + portero rival. Objetivo: recuperar en zona alta y finalizar en mini portería.',
    'Portero con balón en mano',
    'Robo y gol en mini portería, o balón supera línea de pressing',
    '["Pressing activado cuando portero tiene balón", "5 segundos máximo de pressing antes de replegar"]',
    'defensa_organizada', 'Pressing alto', 'Recuperación en campo rival', 'Robar y transicionar',
    'Alta intensidad', 'alta', 165, 185,
    3,
    '["Presión coordinada", "Cerrar opciones de pase", "Anticipar", "Transición inmediata al robo"]',
    '["Calma", "Buscar hombre libre", "Portero como opción", "Balón largo si necesario"]',
    '["Pressing descoordinado", "Ir todos al balón", "No cerrar líneas de pase"]',
    '[{"nombre": "7v5", "descripcion": "Más presionadores", "dificultad": "-1"}, {"nombre": "6v6", "descripcion": "Igualdad", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Mini portería x1", "Conos zona pressing", "Petos", "Balones x8"]',
    '["MD-4", "MD-3"]',
    'Capacidad de sprint repetido, recuperación',
    'Agresividad, coordinación colectiva',
    true, true,
    '["pressing", "recuperación", "transición", "intensidad", "colectivo", "defensa"]'
);

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 1 tarea
-- ============================================================================

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
    'Partido Condicionado 8v8 Zonas de Finalización', 'PCO-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'),
    '00000000-0000-0000-0000-000000000001',
    30, 2, 12, 3,
    70, 55, 'campo_reducido',
    18, 18, 2, '8v8+2POR',
    'Partido 8v8 con porterías reglamentarias. Condición: gol solo vale si el último pase viene de zona de finalización (bandas en último tercio). Trabaja llegada por banda y centros.',
    'Saque de centro',
    'Tiempo de serie',
    '["Gol válido solo con último pase desde zonas laterales del área", "Fuera de juego activo"]',
    'ataque_organizado', 'Ataque por bandas', 'Generar ocasiones desde banda',
    'Alta intensidad intermitente', 'alta', 160, 180,
    2,
    '["Buscar amplitud", "Desbordes por banda", "Llegadas al área", "Ataques primer y segundo palo"]',
    '["Cerrar banda", "Vigilar centro del área", "Anticipar centro"]',
    '["Jugar siempre por dentro", "No llegar al área", "Centros precipitados"]',
    '[{"nombre": "Cualquier zona", "descripcion": "Sin restricción de zona", "dificultad": "-1"}, {"nombre": "Pase atrás obligatorio", "descripcion": "Tiene que haber pase atrás antes de centro", "dificultad": "+1"}]',
    '["Porterías reglamentarias x2", "Conos zonas finalización x8", "Petos", "Balones x10"]',
    '["MD-3"]',
    'Resistencia específica de partido',
    true, true,
    '["partido", "condicionado", "bandas", "centros", "finalización", "táctico"]'
);

-- ============================================================================
-- FÚTBOL REDUCIDO (SSG) - 1 tarea
-- ============================================================================

INSERT INTO tareas (
    titulo, codigo, categoria_id, organizacion_id,
    duracion_total, num_series, duracion_serie, tiempo_descanso,
    espacio_largo, espacio_ancho, espacio_forma,
    num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos,
    descripcion, como_inicia, como_finaliza,
    reglas_tacticas,
    fase_juego, principio_tactico, intencion_tactica,
    tipo_esfuerzo, m2_por_jugador, densidad, fc_esperada_min, fc_esperada_max,
    nivel_cognitivo,
    consignas_ofensivas, consignas_defensivas, errores_comunes,
    variantes, material, match_days_recomendados,
    objetivo_fisico, objetivo_psicologico,
    es_plantilla, es_publica, tags
) VALUES (
    'SSG 4v4 Alta Intensidad', 'SSG-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'),
    '00000000-0000-0000-0000-000000000001',
    16, 4, 3, 1,
    30, 20, 'rectangular',
    8, 8, 0, '4v4',
    'Fútbol reducido de alta intensidad. 4v4 sin porteros con mini porterías. Énfasis en duelos, transiciones rápidas y trabajo físico de fuerza resistencia.',
    'Entrenador pasa balón',
    'Gol o fuera (reinicio inmediato)',
    '["Sin porteros", "Reinicio inmediato tras gol", "Máximo 5 toques por jugador"]',
    'transicion_defensa_ataque', 'Transiciones', 'Ganar duelos y transicionar',
    'Muy alta intensidad', 75, 'alta', 175, 195,
    1,
    '["Duelos 1v1", "Transición inmediata", "Finalización rápida"]',
    '["Presión inmediata", "Ganar duelos", "Repliegue intenso"]',
    '["Evitar duelos", "Lentitud en transición", "Exceso de pases"]',
    '[{"nombre": "3v3", "descripcion": "Menos jugadores, más espacio", "dificultad": "="}, {"nombre": "Con porteros", "descripcion": "Añadir porteros", "dificultad": "-1"}]',
    '["Mini porterías x4", "Conos x8", "Petos", "Balones x6"]',
    '["MD-4"]',
    'Fuerza resistencia, potencia, RSA',
    'Competitividad, agresividad controlada',
    true, true,
    '["intensidad", "duelos", "transiciones", "físico", "competición", "SSG"]'
);

-- ============================================================================
-- BALÓN PARADO (ABP) - 2 tareas
-- ============================================================================

-- ABP Ofensivo: Córner
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
    'Córner Ofensivo - Variantes Tácticas', 'ABP-001',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    20, 10, 1.5, 0.5,
    30, 40, 'area_grande',
    10, 14, 1, '8-10 atacantes + POR',
    'Entrenamiento de córners ofensivos con múltiples variantes: córner al primer palo con bloqueo, al segundo palo, córner en corto, córner con llegada desde atrás.',
    'Señal del entrenador para variante',
    'Gol, despeje o atrapada',
    '["4 variantes diferentes a practicar", "Señalización con número de dedos", "Todos conocen todas las variantes"]',
    'balon_parado_ofensivo', 'Estrategia ofensiva', 'Córner', 'Generar remate franco',
    'Baja intensidad con picos', 'baja', 110, 140,
    2,
    '["Timing de carrera", "Ataque al balón", "Bloqueos legales", "Rechace siempre vigilado"]',
    '["Anticipar carrera", "No atacar balón", "Bloqueo ilegal"]',
    '[{"nombre": "Con oposición real", "descripcion": "Defensores activos", "dificultad": "+1"}, {"nombre": "Solo una variante", "descripcion": "Repetir misma jugada", "dificultad": "-1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x10"]',
    '["MD-1", "MD-2"]',
    true, true,
    '["ABP", "córner", "estrategia", "cabeza", "finalización", "set piece"]'
);

-- ABP Defensivo: Defensa de Falta Lateral
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
    'Defensa Falta Lateral - Zona y Marcaje', 'ABP-002',
    (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'),
    '00000000-0000-0000-0000-000000000001',
    18, 8, 1.5, 0.75,
    30, 40, 'area_grande',
    12, 16, 1, '6-8 defensores + POR vs 5-7 atacantes',
    'Defensa de faltas laterales con sistema mixto: zona en zona de gol + marcaje individual en zona de remate. Práctica de despeje y salida de contraataque.',
    'Silbato del entrenador',
    'Despeje, atrapada o gol',
    '["Barrera de 2-3 jugadores", "Zona de gol (3 jugadores)", "Marcaje individual resto", "Primer despeje a banda"]',
    'balon_parado_defensivo', 'Estrategia defensiva', 'Falta lateral', 'Evitar gol y salir rápido',
    'Baja intensidad con picos', 'baja', 100, 130,
    2,
    '["Comunicación portero-defensa", "Zona siempre ocupada", "Ataque al balón", "Despeje a zona segura"]',
    '["Dejar zona libre", "Perder marca", "Despeje al centro"]',
    '[{"nombre": "Todo zonal", "descripcion": "Sin marcaje individual", "dificultad": "-1"}, {"nombre": "Todo individual", "descripcion": "Sin zona", "dificultad": "+1"}]',
    '["Portería reglamentaria", "Conos posiciones", "Balones x10", "Barrera dummy"]',
    '["MD-1", "MD-2"]',
    'Concentración, comunicación',
    true, true,
    '["ABP", "falta", "defensa", "estrategia", "zonal", "marcaje"]'
);

-- ============================================================================
-- FIN DEL SEED - 15 TAREAS PROFESIONALES
-- ============================================================================
-- Resumen:
-- - 3 Rondos (RND)
-- - 2 Juegos de Posición (JDP)
-- - 2 Posesión (POS)
-- - 2 Evoluciones (EVO)
-- - 2 Ataque vs Defensa (AVD)
-- - 1 Partido Condicionado (PCO)
-- - 1 Fútbol Reducido (SSG)
-- - 2 Balón Parado (ABP)
-- ============================================================================
