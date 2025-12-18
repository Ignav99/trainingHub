-- ============================================================================
-- TRAININGHUB PRO - 135 TAREAS PROFESIONALES (FORMATO LIMPIO)
-- ============================================================================
-- Ejecutar DESPUÉS de la migración 002_tareas_campos_adicionales.sql
-- ============================================================================

-- Asegurar organización demo existe
INSERT INTO organizaciones (id, nombre, color_primario)
VALUES ('00000000-0000-0000-0000-000000000001', 'Club Demo - Tareas Públicas', '#1a365d')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RONDOS (RND) - 18 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('Rondo 5v3 Pressing Coordinado', 'RND-004', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 14, 4, 3, 1, 14, 14, 'cuadrado', 8, 8, 0, '5v3', 'Rondo con 3 defensores coordinando pressing. Poseedores trabajan circulación bajo presión intensa.', 'ataque_organizado', 'Conservación bajo presión', 'Alta intensidad intermitente', 'alta', 160, 180, 3, true, true, '["rondo", "pressing", "coordinación", "intensidad"]'),

('Rondo Doble Campo 4v2+4v2', 'RND-005', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 24, 12, 'rectangular', 12, 12, 0, '4v2+4v2', 'Dos rondos paralelos con cambio de campo obligatorio tras 5 pases.', 'ataque_organizado', 'Cambio de orientación', 'Media-alta intensidad', 'media', 145, 170, 3, true, true, '["rondo", "cambio orientación", "visión"]'),

('Rondo 6v2 Amplitud', 'RND-006', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 12, 4, 2, 1, 16, 16, 'cuadrado', 8, 8, 0, '6v2', 'Rondo con superioridad numérica amplia para trabajar amplitud y paciencia.', 'ataque_organizado', 'Amplitud en posesión', 'Media intensidad', 'media', 130, 155, 2, true, true, '["rondo", "amplitud", "posesión"]'),

('Rondo 3v1 Velocidad Mental', 'RND-007', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 10, 6, 1, 0.5, 8, 8, 'cuadrado', 4, 4, 0, '3v1', 'Rondo reducido de máxima velocidad. 1 toque obligatorio.', 'ataque_organizado', 'Velocidad de decisión', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["rondo", "velocidad", "1 toque"]'),

('Rondo 4v4+2 Transiciones', 'RND-008', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 18, 4, 4, 1, 20, 20, 'cuadrado', 10, 10, 0, '4v4+2', 'Rondo con comodines y transiciones al robo.', 'transicion_defensa_ataque', 'Transición rápida', 'Alta intensidad', 'alta', 160, 180, 3, true, true, '["rondo", "transiciones", "comodines"]'),

('Rondo 5v2 Rotación Continua', 'RND-009', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 14, 5, 2, 1, 12, 12, 'cuadrado', 7, 7, 0, '5v2', 'Rotación continua de defensores cada robo.', 'ataque_organizado', 'Conservación', 'Media intensidad', 'media', 140, 165, 2, true, true, '["rondo", "rotación", "posesión"]'),

('Rondo Direccional 4v2+1', 'RND-010', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 14, 4, 3, 1, 18, 12, 'rectangular', 7, 7, 0, '4v2+1', 'Rondo con dirección: objetivo pasar al comodín del lado opuesto.', 'ataque_organizado', 'Progresión', 'Media-alta intensidad', 'alta', 150, 175, 3, true, true, '["rondo", "direccional", "progresión"]'),

('Rondo 6v3 Competitivo', 'RND-011', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 18, 18, 'cuadrado', 9, 9, 0, '6v3', 'Rondo competitivo con sistema de puntos.', 'ataque_organizado', 'Pressing coordinado', 'Alta intensidad', 'alta', 160, 180, 3, true, true, '["rondo", "competitivo", "pressing"]'),

('Rondo 4v2 Cambio Color', 'RND-012', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 12, 4, 2, 1, 10, 10, 'cuadrado', 6, 6, 0, '4v2', 'Al robar, el equipo cambia de rol inmediatamente.', 'transicion_defensa_ataque', 'Transición al robo', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["rondo", "transiciones", "cambio rol"]'),

('Rondo Triángulos 3v3+3', 'RND-013', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 20, 20, 'cuadrado', 9, 9, 0, '3v3+3', 'Tres equipos: dos en posesión vs uno defendiendo.', 'ataque_organizado', 'Superioridad numérica', 'Media intensidad', 'media', 145, 165, 2, true, true, '["rondo", "tres equipos", "superioridad"]'),

('Rondo 5v2 con Relevo', 'RND-014', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 14, 14, 'cuadrado', 9, 9, 0, '5v2+2', 'Defensores hacen relevo cada 30 segundos.', 'ataque_organizado', 'Pressing intenso', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["rondo", "relevo", "pressing"]'),

('Rondo 4v1+1 Dos Cuadrados', 'RND-015', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 14, 4, 3, 1, 16, 8, 'rectangular', 6, 6, 0, '4v1+1', 'Dos cuadrados 4v1 conectados por pase.', 'ataque_organizado', 'Cambio orientación', 'Media intensidad', 'media', 140, 160, 3, true, true, '["rondo", "dos cuadrados", "orientación"]'),

('Rondo 8v4 Gran Grupo', 'RND-016', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 18, 3, 5, 1, 25, 25, 'cuadrado', 12, 12, 0, '8v4', 'Rondo para grupos grandes con alta densidad.', 'ataque_organizado', 'Circulación', 'Media intensidad', 'media', 140, 165, 2, true, true, '["rondo", "grupo grande", "circulación"]'),

('Rondo 4v2 Espaldas', 'RND-017', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 12, 4, 2, 1, 12, 12, 'cuadrado', 6, 6, 0, '4v2', 'Defensores empiezan de espaldas, reaccionan al primer pase.', 'ataque_organizado', 'Velocidad reacción', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["rondo", "reacción", "velocidad"]'),

('Rondo Hexagonal 6v2', 'RND-018', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 14, 4, 3, 1, 15, 15, 'hexagonal', 8, 8, 0, '6v2', 'Rondo en forma hexagonal con 6 posiciones fijas.', 'ataque_organizado', 'Posiciones fijas', 'Media intensidad', 'media', 140, 160, 2, true, true, '["rondo", "hexagonal", "posicional"]'),

('Rondo 5v3 Zonas', 'RND-019', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 20, 15, 'rectangular', 8, 8, 0, '5v3', 'Dividido en 3 zonas, mínimo 2 pases por zona.', 'ataque_organizado', 'Progresión por zonas', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["rondo", "zonas", "progresión"]'),

('Rondo 4v2+2 Relevos Externos', 'RND-020', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 14, 14, 'cuadrado', 8, 8, 0, '4v2+2', 'Dos defensores activos, dos en espera para relevo.', 'ataque_organizado', 'Pressing con relevo', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["rondo", "relevos", "pressing"]'),

('Rondo 3v3+2 Comodines Banda', 'RND-021', (SELECT id FROM categorias_tarea WHERE codigo = 'RND'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 20, 15, 'rectangular', 8, 8, 0, '3v3+2', 'Comodines en las bandas, siempre con el equipo en posesión.', 'ataque_organizado', 'Amplitud', 'Media-alta intensidad', 'alta', 150, 175, 2, true, true, '["rondo", "comodines", "amplitud"]');

-- ============================================================================
-- JUEGO DE POSICIÓN (JDP) - 15 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('Salida Balón 6+POR vs 4', 'JDP-003', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 1, 45, 60, 'rectangular', 11, 11, 1, '6+POR vs 4', 'Salida de balón completa con pivote contra pressing.', 'ataque_organizado', 'Salida de balón', 'Baja intensidad', 'baja', 115, 140, 3, true, true, '["salida balón", "pivote", "construcción"]'),

('JdP 4-3-3 Primera Fase', 'JDP-004', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 1, 50, 65, 'rectangular', 14, 14, 2, '7+POR vs 6', 'Construcción primera fase con sistema 4-3-3.', 'ataque_organizado', 'Construcción', 'Baja-media intensidad', 'baja', 120, 145, 3, true, true, '["JdP", "4-3-3", "construcción"]'),

('JdP Salida Presionada', 'JDP-005', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 1, 45, 55, 'rectangular', 12, 12, 1, '6+POR vs 5', 'Salida bajo pressing alto del rival.', 'ataque_organizado', 'Superar pressing', 'Media intensidad', 'media', 130, 155, 3, true, true, '["JdP", "pressing", "salida"]'),

('JdP 3-4-3 Superioridad', 'JDP-006', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 24, 4, 5, 1, 55, 65, 'rectangular', 16, 16, 2, '8+POR vs 7', 'Creación de superioridades en zona media.', 'ataque_organizado', 'Superioridad posicional', 'Media intensidad', 'media', 135, 155, 3, true, true, '["JdP", "superioridad", "zona media"]'),

('JdP Pivote Doble', 'JDP-007', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 1, 45, 55, 'rectangular', 12, 12, 1, '6+POR vs 5', 'Trabajo con doble pivote para superar pressing.', 'ataque_organizado', 'Doble pivote', 'Baja intensidad', 'baja', 120, 145, 3, true, true, '["JdP", "doble pivote", "construcción"]'),

('JdP Tercer Hombre', 'JDP-008', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 18, 5, 3, 1, 40, 50, 'rectangular', 10, 10, 1, '5+POR vs 4', 'Concepto de tercer hombre en construcción.', 'ataque_organizado', 'Tercer hombre', 'Baja intensidad', 'baja', 115, 140, 3, true, true, '["JdP", "tercer hombre", "combinación"]'),

('JdP Laterales en Altura', 'JDP-009', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 1, 55, 65, 'rectangular', 14, 14, 2, '7+POR vs 6', 'Laterales proyectados creando superioridad en banda.', 'ataque_organizado', 'Proyección laterales', 'Media intensidad', 'media', 130, 155, 3, true, true, '["JdP", "laterales", "amplitud"]'),

('JdP Interior Entre Líneas', 'JDP-010', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 1, 45, 55, 'rectangular', 12, 12, 1, '6+POR vs 5', 'Interior recibiendo entre líneas.', 'ataque_organizado', 'Recepción entre líneas', 'Media intensidad', 'media', 125, 150, 3, true, true, '["JdP", "interior", "entre líneas"]'),

('JdP Central Incorporado', 'JDP-011', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 1, 50, 60, 'rectangular', 12, 12, 1, '6+POR vs 5', 'Central se incorpora con balón a zona media.', 'ataque_organizado', 'Central conductor', 'Media intensidad', 'media', 130, 155, 3, true, true, '["JdP", "central", "conducción"]'),

('JdP Portero en Juego', 'JDP-012', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 18, 5, 3, 1, 45, 55, 'rectangular', 11, 11, 1, '5+POR vs 4', 'Portero como jugador de campo en construcción.', 'ataque_organizado', 'Portero jugador', 'Baja intensidad', 'baja', 115, 140, 3, true, true, '["JdP", "portero", "construcción"]'),

('JdP Extremo Interior', 'JDP-013', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 1, 55, 65, 'rectangular', 14, 14, 2, '7+POR vs 6', 'Extremo entrando a zona interior.', 'ataque_organizado', 'Movimiento extremo', 'Media intensidad', 'media', 135, 155, 3, true, true, '["JdP", "extremo", "interior"]'),

('JdP Cambio Orientación', 'JDP-014', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 1, 60, 65, 'rectangular', 16, 16, 2, '8+POR vs 7', 'Cambio de orientación rápido para atacar lado débil.', 'ataque_organizado', 'Cambio orientación', 'Media intensidad', 'media', 130, 155, 3, true, true, '["JdP", "cambio", "orientación"]'),

('JdP Falso 9', 'JDP-015', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 1, 55, 65, 'rectangular', 14, 14, 2, '7+POR vs 6', 'Delantero bajando a zona media para generar espacio.', 'ataque_organizado', 'Falso 9', 'Media intensidad', 'media', 130, 155, 3, true, true, '["JdP", "falso 9", "espacios"]'),

('JdP Media Cancha', 'JDP-016', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 24, 4, 5, 1, 60, 68, 'rectangular', 18, 18, 2, '9+POR vs 8', 'Trabajo posicional en media cancha completa.', 'ataque_organizado', 'Posicional completo', 'Media intensidad', 'media', 135, 155, 3, true, true, '["JdP", "media cancha", "completo"]'),

('JdP Pressing Superado', 'JDP-017', (SELECT id FROM categorias_tarea WHERE codigo = 'JDP'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 1, 50, 60, 'rectangular', 12, 12, 1, '6+POR vs 5', 'Qué hacer una vez superado el pressing rival.', 'ataque_organizado', 'Post-pressing', 'Media intensidad', 'media', 130, 155, 3, true, true, '["JdP", "pressing", "progresión"]');

-- ============================================================================
-- POSESIÓN (POS) - 18 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('Posesión 6v6v6 Tres Equipos', 'POS-003', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 1, 18, 2, 35, 35, 'cuadrado', 18, 18, 0, '6v6v6', 'Tres equipos: dos mantienen posesión 12v6.', 'ataque_organizado', 'Superioridad numérica', 'Media intensidad', 'media', 140, 165, 2, true, true, '["posesión", "tres equipos", "superioridad"]'),

('Posesión 5v5+5 Transiciones', 'POS-004', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 35, 30, 'rectangular', 15, 15, 0, '5v5+5', 'Comodines cambian según posesión.', 'transicion_defensa_ataque', 'Transición posesión', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["posesión", "transiciones", "comodines"]'),

('Posesión 4v4+4 Zonas', 'POS-005', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 18, 2, 7, 2, 40, 30, 'rectangular', 12, 12, 0, '4v4+4', 'Campo dividido en zonas con comodines.', 'ataque_organizado', 'Posesión zonal', 'Media intensidad', 'media', 145, 165, 2, true, true, '["posesión", "zonas", "comodines"]'),

('Posesión 6v4 Superioridad', 'POS-006', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 16, 3, 4, 1, 30, 25, 'rectangular', 10, 10, 0, '6v4', 'Posesión con clara superioridad numérica.', 'ataque_organizado', 'Conservación', 'Media intensidad', 'media', 135, 155, 2, true, true, '["posesión", "superioridad", "conservación"]'),

('Posesión 8v8 Medio Campo', 'POS-007', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 22, 2, 9, 2, 50, 40, 'rectangular', 16, 16, 0, '8v8', 'Posesión en espacio amplio tipo medio campo.', 'ataque_organizado', 'Circulación', 'Media intensidad', 'media', 140, 160, 2, true, true, '["posesión", "medio campo", "circulación"]'),

('Posesión 5v5+1 Comodín Central', 'POS-008', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 18, 2, 7, 2, 35, 30, 'rectangular', 11, 11, 0, '5v5+1', 'Comodín fijo en zona central.', 'ataque_organizado', 'Pivote central', 'Media-alta intensidad', 'alta', 150, 170, 2, true, true, '["posesión", "comodín", "pivote"]'),

('Posesión 4v4+2 Bandas', 'POS-009', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 18, 2, 7, 2, 40, 30, 'rectangular', 10, 10, 0, '4v4+2', 'Comodines en las bandas para amplitud.', 'ataque_organizado', 'Amplitud', 'Media intensidad', 'media', 145, 165, 2, true, true, '["posesión", "amplitud", "bandas"]'),

('Posesión 7v7 Porterías', 'POS-010', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 45, 35, 'rectangular', 14, 14, 0, '7v7', 'Posesión con objetivo de pasar por mini porterías.', 'ataque_organizado', 'Posesión con objetivo', 'Alta intensidad', 'alta', 150, 175, 2, true, true, '["posesión", "porterías", "objetivo"]'),

('Posesión 6v6+2 Libre', 'POS-011', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 40, 35, 'rectangular', 14, 14, 0, '6v6+2', 'Posesión libre con 2 comodines móviles.', 'ataque_organizado', 'Posesión fluida', 'Media intensidad', 'media', 140, 165, 2, true, true, '["posesión", "comodines", "fluida"]'),

('Posesión 5v5 Competitiva', 'POS-012', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 18, 3, 5, 1, 30, 25, 'rectangular', 10, 10, 0, '5v5', 'Posesión competitiva: 10 pases = punto.', 'ataque_organizado', 'Posesión competitiva', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["posesión", "competitiva", "pases"]'),

('Posesión 8v4 Oleada', 'POS-013', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 35, 30, 'rectangular', 12, 12, 0, '8v4', 'Alta superioridad con rotación de defensores.', 'ataque_organizado', 'Dominio posesión', 'Media intensidad', 'media', 130, 155, 2, true, true, '["posesión", "superioridad", "oleada"]'),

('Posesión 4v4 Reducido', 'POS-014', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 16, 4, 3, 1, 20, 20, 'cuadrado', 8, 8, 0, '4v4', 'Posesión en espacio muy reducido.', 'ataque_organizado', 'Posesión presión', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["posesión", "reducido", "presión"]'),

('Posesión 6v6 Direccional', 'POS-015', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 45, 30, 'rectangular', 12, 12, 0, '6v6', 'Posesión con dirección: llegar a zona objetivo.', 'ataque_organizado', 'Posesión direccional', 'Media-alta intensidad', 'alta', 150, 170, 2, true, true, '["posesión", "direccional", "progresión"]'),

('Posesión 5v5+3 Triple Comodín', 'POS-016', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 40, 35, 'rectangular', 13, 13, 0, '5v5+3', 'Tres comodines distribuidos en el campo.', 'ataque_organizado', 'Superioridad múltiple', 'Media intensidad', 'media', 140, 160, 2, true, true, '["posesión", "comodines", "superioridad"]'),

('Posesión 7v5 Presión', 'POS-017', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 18, 2, 7, 2, 40, 35, 'rectangular', 12, 12, 0, '7v5', 'Equipo en inferioridad presiona intensamente.', 'ataque_organizado', 'Conservación presión', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["posesión", "presión", "conservación"]'),

('Posesión 6v6+4 Esquinas', 'POS-018', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 20, 2, 8, 2, 45, 40, 'rectangular', 16, 16, 0, '6v6+4', 'Cuatro comodines en las esquinas.', 'ataque_organizado', 'Amplitud máxima', 'Media intensidad', 'media', 140, 160, 2, true, true, '["posesión", "esquinas", "amplitud"]'),

('Posesión 5v5 Toques Limitados', 'POS-019', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 16, 3, 4, 1, 30, 25, 'rectangular', 10, 10, 0, '5v5', 'Máximo 2 toques por jugador.', 'ataque_organizado', 'Velocidad decisión', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["posesión", "2 toques", "velocidad"]'),

('Posesión 8v8+2 Transición', 'POS-020', (SELECT id FROM categorias_tarea WHERE codigo = 'POS'), '00000000-0000-0000-0000-000000000001', 22, 2, 9, 2, 50, 40, 'rectangular', 18, 18, 0, '8v8+2', 'Posesión con énfasis en transición al robo.', 'transicion_defensa_ataque', 'Transición posesión', 'Alta intensidad', 'alta', 150, 175, 2, true, true, '["posesión", "transición", "robo"]');

-- ============================================================================
-- EVOLUCIONES (EVO) - 20 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('Contraataque 4v3+POR', 'EVO-003', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 8, 2, 1, 65, 50, 'medio_campo', 12, 14, 2, '4v3+POR', 'Contraataque tras recuperación. Máximo 10 segundos.', 'transicion_defensa_ataque', 'Contraataque', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["contraataque", "transición", "velocidad"]'),

('Oleada Centro 3v2+POR', 'EVO-004', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 10, 1, 1, 45, 40, 'medio_campo', 10, 12, 2, '3v2+POR', 'Oleadas de ataque central con superioridad.', 'ataque_organizado', 'Finalización central', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["oleada", "central", "finalización"]'),

('Oleada Banda 2v1+Centro', 'EVO-005', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 50, 35, 'medio_campo', 8, 10, 1, '2v1+POR', 'Oleada por banda con centro al área.', 'ataque_organizado', 'Ataque por banda', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["oleada", "banda", "centro"]'),

('Evolución 5v4+POR Completa', 'EVO-006', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 20, 8, 2, 1, 55, 50, 'medio_campo', 14, 16, 2, '5v4+POR', 'Evolución completa con combinación y finalización.', 'ataque_organizado', 'Ataque combinado', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["evolución", "combinación", "finalización"]'),

('Transición 3v3+POR', 'EVO-007', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 8, 2, 1, 45, 40, 'medio_campo', 10, 12, 2, '3v3+POR', 'Igualdad numérica en transición.', 'transicion_defensa_ataque', 'Transición igualdad', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["transición", "igualdad", "velocidad"]'),

('Oleada Diagonal 4v3', 'EVO-008', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 50, 45, 'medio_campo', 12, 14, 2, '4v3+POR', 'Ataque en diagonal desde banda a área.', 'ataque_organizado', 'Ataque diagonal', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["oleada", "diagonal", "finalización"]'),

('Evolución 2v1 Repetida', 'EVO-009', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 14, 12, 1, 0.5, 30, 25, 'rectangular', 6, 8, 1, '2v1+POR', 'Repetición de 2v1 para automatizar.', 'ataque_organizado', 'Superioridad 2v1', 'Alta intensidad', 'alta', 160, 180, 1, true, true, '["2v1", "repetición", "automatismo"]'),

('Contraataque Largo 5v4', 'EVO-010', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 20, 8, 2, 1, 70, 55, 'campo_completo', 14, 16, 2, '5v4+POR', 'Contraataque desde campo propio.', 'transicion_defensa_ataque', 'Contraataque largo', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["contraataque", "largo", "velocidad"]'),

('Oleada 3v2 con Rechace', 'EVO-011', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 45, 40, 'medio_campo', 10, 12, 2, '3v2+POR', 'Oleada con segunda jugada en rechace.', 'ataque_organizado', 'Segundas jugadas', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["oleada", "rechace", "segunda jugada"]'),

('Evolución Pared y Disparo', 'EVO-012', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 12, 1, 0.5, 35, 30, 'rectangular', 6, 8, 1, '2v0+POR', 'Combinación en pared y finalización.', 'ataque_organizado', 'Pared finalización', 'Media-alta intensidad', 'alta', 155, 175, 1, true, true, '["pared", "disparo", "combinación"]'),

('Transición 4v4+POR', 'EVO-013', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 6, 2, 1, 50, 45, 'medio_campo', 12, 14, 2, '4v4+POR', 'Transición en igualdad bidireccional.', 'transicion_defensa_ataque', 'Transición igualdad', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["transición", "igualdad", "bidireccional"]'),

('Oleada 1v1+POR', 'EVO-014', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 14, 15, 0.5, 0.5, 25, 20, 'rectangular', 4, 6, 1, '1v1+POR', 'Duelo 1v1 con finalización.', 'ataque_organizado', 'Duelo ofensivo', 'Alta intensidad', 'alta', 165, 185, 1, true, true, '["1v1", "duelo", "finalización"]'),

('Evolución Centro Lateral', 'EVO-015', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 50, 45, 'medio_campo', 10, 12, 2, '4v3+POR', 'Centro desde banda y remate.', 'ataque_organizado', 'Centro y remate', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["centro", "lateral", "remate"]'),

('Contraataque 3v2 Rápido', 'EVO-016', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 10, 1, 1, 50, 45, 'medio_campo', 10, 12, 2, '3v2+POR', 'Contraataque en inferioridad temporal.', 'transicion_defensa_ataque', 'Contraataque rápido', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["contraataque", "rápido", "3v2"]'),

('Oleada Combinación Interior', 'EVO-017', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 45, 40, 'medio_campo', 10, 12, 2, '4v3+POR', 'Combinación interior entre líneas.', 'ataque_organizado', 'Juego interior', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["oleada", "interior", "entre líneas"]'),

('Evolución Desmarque Ruptura', 'EVO-018', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 10, 1, 1, 45, 40, 'medio_campo', 8, 10, 1, '3v2+POR', 'Desmarque de ruptura y pase filtrado.', 'ataque_organizado', 'Ruptura', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["desmarque", "ruptura", "filtrado"]'),

('Transición Portero Saque', 'EVO-019', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 18, 8, 2, 1, 60, 50, 'medio_campo', 12, 14, 2, '5v4+POR', 'Contraataque desde saque de portero.', 'transicion_defensa_ataque', 'Saque rápido', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["transición", "portero", "saque"]'),

('Oleada Circulación Final', 'EVO-020', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 20, 8, 2, 1, 55, 50, 'medio_campo', 14, 16, 2, '6v5+POR', 'Circulación en zona final antes de finalizar.', 'ataque_organizado', 'Circulación final', 'Media-alta intensidad', 'alta', 155, 175, 2, true, true, '["oleada", "circulación", "zona final"]'),

('Evolución Apoyo Espaldas', 'EVO-021', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 16, 10, 1, 1, 40, 35, 'medio_campo', 8, 10, 1, '3v2+POR', 'Delantero de espaldas apoya y gira.', 'ataque_organizado', 'Apoyo espaldas', 'Media-alta intensidad', 'alta', 155, 175, 2, true, true, '["apoyo", "espaldas", "pivote"]'),

('Contraataque 6v5+POR', 'EVO-022', (SELECT id FROM categorias_tarea WHERE codigo = 'EVO'), '00000000-0000-0000-0000-000000000001', 20, 6, 2, 1, 65, 55, 'campo_completo', 16, 18, 2, '6v5+POR', 'Contraataque en superioridad mínima.', 'transicion_defensa_ataque', 'Contraataque superioridad', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["contraataque", "superioridad", "6v5"]');

-- ============================================================================
-- ATAQUE VS DEFENSA (AVD) - 18 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('AvD 7v6+POR Zona 3', 'AVD-003', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 2, 55, 50, 'medio_campo', 14, 16, 1, '7v6+POR', 'Ataque organizado en zona 3 con superioridad.', 'ataque_organizado', 'Finalización zona 3', 'Alta intensidad', 'alta', 160, 180, 3, true, true, '["AvD", "zona 3", "finalización"]'),

('AvD 6v6+POR Igualdad', 'AVD-004', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 24, 3, 6, 2, 55, 50, 'medio_campo', 14, 16, 2, '6v6+2POR', 'Ataque vs defensa en igualdad numérica.', 'ataque_organizado', 'Ataque igualdad', 'Alta intensidad', 'alta', 160, 180, 3, true, true, '["AvD", "igualdad", "táctico"]'),

('AvD 8v7+POR Presión Alta', 'AVD-005', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 24, 4, 5, 2, 60, 55, 'medio_campo', 18, 20, 2, '8v7+POR', 'Superar bloque alto rival.', 'ataque_organizado', 'Superar presión alta', 'Alta intensidad', 'alta', 155, 175, 3, true, true, '["AvD", "presión alta", "superación"]'),

('AvD 6v5+POR Banda', 'AVD-006', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 2, 50, 45, 'medio_campo', 12, 14, 1, '6v5+POR', 'Ataque por banda con centro.', 'ataque_organizado', 'Ataque banda', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["AvD", "banda", "centro"]'),

('AvD 5v5+POR Reducido', 'AVD-007', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 18, 5, 3, 1, 40, 35, 'medio_campo', 12, 14, 2, '5v5+POR', 'Situación reducida de ataque vs defensa.', 'ataque_organizado', 'AvD reducido', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["AvD", "reducido", "intensidad"]'),

('AvD 9v8+POR Completo', 'AVD-008', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 26, 3, 7, 2, 65, 60, 'campo_completo', 20, 22, 2, '9v8+POR', 'Situación casi real de ataque organizado.', 'ataque_organizado', 'Ataque completo', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["AvD", "completo", "real"]'),

('AvD 6v4+POR Superioridad', 'AVD-009', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 18, 6, 2, 1, 45, 40, 'medio_campo', 12, 14, 1, '6v4+POR', 'Clara superioridad atacante.', 'ataque_organizado', 'Superioridad clara', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["AvD", "superioridad", "finalización"]'),

('AvD 7v7+POR Transición', 'AVD-010', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 24, 3, 6, 2, 55, 50, 'medio_campo', 16, 18, 2, '7v7+2POR', 'AvD con transición tras robo.', 'transicion_defensa_ataque', 'AvD transición', 'Alta intensidad', 'alta', 165, 185, 3, true, true, '["AvD", "transición", "robo"]'),

('AvD 5v4+POR Último Tercio', 'AVD-011', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 18, 6, 2, 1, 40, 40, 'area_grande', 10, 12, 1, '5v4+POR', 'Finalización en último tercio.', 'ataque_organizado', 'Último tercio', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["AvD", "último tercio", "finalización"]'),

('AvD 8v6+POR Construcción', 'AVD-012', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 24, 4, 5, 2, 60, 55, 'medio_campo', 16, 18, 1, '8v6+POR', 'Construcción desde zona 1 a finalización.', 'ataque_organizado', 'Construcción completa', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["AvD", "construcción", "completa"]'),

('AvD 4v4+POR Duelos', 'AVD-013', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 16, 6, 2, 1, 35, 30, 'medio_campo', 10, 12, 2, '4v4+POR', 'Énfasis en ganar duelos individuales.', 'ataque_organizado', 'Duelos', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["AvD", "duelos", "1v1"]'),

('AvD 6v6+POR Defensa Baja', 'AVD-014', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 2, 50, 45, 'medio_campo', 14, 16, 1, '6v6+POR', 'Atacar defensa replegada.', 'ataque_organizado', 'Contra bloque bajo', 'Media intensidad', 'media', 145, 165, 3, true, true, '["AvD", "bloque bajo", "paciencia"]'),

('AvD 7v5+POR Lado Fuerte', 'AVD-015', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 2, 50, 45, 'medio_campo', 14, 16, 1, '7v5+POR', 'Crear superioridad en lado fuerte.', 'ataque_organizado', 'Lado fuerte', 'Alta intensidad', 'alta', 155, 175, 3, true, true, '["AvD", "lado fuerte", "superioridad"]'),

('AvD 5v5+POR Pressing Alto', 'AVD-016', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 18, 5, 3, 1, 45, 40, 'medio_campo', 12, 14, 2, '5v5+POR', 'Defensa practica pressing alto.', 'defensa_organizada', 'Pressing alto', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["AvD", "pressing", "defensa"]'),

('AvD 8v8+POR Sector', 'AVD-017', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 26, 3, 7, 2, 60, 55, 'medio_campo', 18, 20, 2, '8v8+2POR', 'Trabajo sectorial completo.', 'ataque_organizado', 'Sectorial', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["AvD", "sectorial", "completo"]'),

('AvD 6v5+POR Interior', 'AVD-018', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 2, 45, 40, 'medio_campo', 12, 14, 1, '6v5+POR', 'Juego interior entre líneas.', 'ataque_organizado', 'Juego interior', 'Alta intensidad', 'alta', 155, 175, 3, true, true, '["AvD", "interior", "entre líneas"]'),

('AvD 7v6+POR Cambio Juego', 'AVD-019', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 22, 4, 4, 2, 55, 50, 'medio_campo', 14, 16, 1, '7v6+POR', 'Énfasis en cambios de orientación.', 'ataque_organizado', 'Cambio juego', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["AvD", "cambio", "orientación"]'),

('AvD 5v4+POR Repliegue', 'AVD-020', (SELECT id FROM categorias_tarea WHERE codigo = 'AVD'), '00000000-0000-0000-0000-000000000001', 18, 6, 2, 1, 45, 40, 'medio_campo', 10, 12, 1, '5v4+POR', 'Defensa practica repliegue rápido.', 'defensa_organizada', 'Repliegue', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["AvD", "repliegue", "defensa"]');

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 18 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('PCO 9v9 Zonas Progresión', 'PCO-002', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 28, 2, 12, 2, 75, 55, 'campo_reducido', 20, 20, 2, '9v9+2POR', 'Gol válido solo si pasó por las 3 zonas.', 'ataque_organizado', 'Progresión ordenada', 'Alta intensidad', 'alta', 155, 175, 3, true, true, '["PCO", "zonas", "progresión"]'),

('PCO 8v8 Toques Limitados', 'PCO-003', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 26, 2, 11, 2, 70, 50, 'campo_reducido', 18, 18, 2, '8v8+2POR', 'Máximo 3 toques por jugador.', 'ataque_organizado', 'Velocidad decisión', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["PCO", "toques", "velocidad"]'),

('PCO 7v7 Pressing', 'PCO-004', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 24, 2, 10, 2, 60, 45, 'campo_reducido', 16, 16, 2, '7v7+2POR', 'Punto extra si robo en campo rival.', 'ataque_organizado', 'Pressing alto', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["PCO", "pressing", "robo"]'),

('PCO 10v10 Real', 'PCO-005', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 30, 2, 13, 2, 80, 60, 'campo_reducido', 22, 22, 2, '10v10+2POR', 'Partido casi real con mínimas condiciones.', 'ataque_organizado', 'Juego real', 'Alta intensidad', 'alta', 155, 175, 3, true, true, '["PCO", "real", "competición"]'),

('PCO 8v8 Banda Obligatoria', 'PCO-006', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 26, 2, 11, 2, 70, 55, 'campo_reducido', 18, 18, 2, '8v8+2POR', 'Obligatorio tocar banda antes de finalizar.', 'ataque_organizado', 'Juego bandas', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["PCO", "bandas", "amplitud"]'),

('PCO 6v6 Transiciones', 'PCO-007', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 22, 3, 6, 2, 55, 40, 'campo_reducido', 14, 14, 2, '6v6+2POR', 'Gol en primeros 6 seg tras robo vale doble.', 'transicion_defensa_ataque', 'Transición rápida', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["PCO", "transición", "velocidad"]'),

('PCO 9v9 Posicional', 'PCO-008', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 28, 2, 12, 2, 75, 55, 'campo_reducido', 20, 20, 2, '9v9+2POR', 'Sistema táctico fijo, posiciones definidas.', 'ataque_organizado', 'Juego posicional', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["PCO", "posicional", "táctico"]'),

('PCO 7v7 Comodín', 'PCO-009', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 24, 2, 10, 2, 60, 45, 'campo_reducido', 15, 15, 2, '7v7+1+2POR', 'Comodín juega con equipo en posesión.', 'ataque_organizado', 'Superioridad', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["PCO", "comodín", "superioridad"]'),

('PCO 8v8 Fuera Juego', 'PCO-010', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 26, 2, 11, 2, 70, 50, 'campo_reducido', 18, 18, 2, '8v8+2POR', 'Fuera de juego activo, trabajar línea.', 'ataque_organizado', 'Línea defensiva', 'Alta intensidad', 'alta', 155, 175, 3, true, true, '["PCO", "fuera juego", "línea"]'),

('PCO 6v6 Vertical', 'PCO-011', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 22, 3, 6, 2, 60, 35, 'campo_reducido', 14, 14, 2, '6v6+2POR', 'Campo estrecho para fomentar verticalidad.', 'ataque_organizado', 'Juego vertical', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["PCO", "vertical", "directo"]'),

('PCO 9v9 Gol Combinación', 'PCO-012', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 28, 2, 12, 2, 75, 55, 'campo_reducido', 20, 20, 2, '9v9+2POR', 'Gol válido tras mínimo 5 pases.', 'ataque_organizado', 'Juego combinativo', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["PCO", "combinación", "pases"]'),

('PCO 7v7 Libre', 'PCO-013', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 24, 2, 10, 2, 60, 45, 'campo_reducido', 16, 16, 2, '7v7+2POR', 'Partido libre sin condiciones especiales.', 'ataque_organizado', 'Juego libre', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["PCO", "libre", "competición"]'),

('PCO 8v8 Portería Pequeña', 'PCO-014', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 26, 2, 11, 2, 65, 50, 'campo_reducido', 18, 18, 2, '8v8+2POR', 'Porterías reducidas para mejor finalización.', 'ataque_organizado', 'Precisión', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["PCO", "portería pequeña", "precisión"]'),

('PCO 10v10 Modelo Juego', 'PCO-015', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 30, 2, 13, 2, 80, 60, 'campo_reducido', 22, 22, 2, '10v10+2POR', 'Aplicación del modelo de juego del equipo.', 'ataque_organizado', 'Modelo de juego', 'Media-alta intensidad', 'alta', 150, 170, 3, true, true, '["PCO", "modelo", "táctico"]'),

('PCO 6v6 Gol Cabeza', 'PCO-016', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 22, 3, 6, 2, 55, 40, 'campo_reducido', 14, 14, 2, '6v6+2POR', 'Gol de cabeza vale doble.', 'ataque_organizado', 'Juego aéreo', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["PCO", "cabeza", "centros"]'),

('PCO 8v8 Porteros Jugadores', 'PCO-017', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 26, 2, 11, 2, 70, 50, 'campo_reducido', 18, 18, 2, '8v8+2POR', 'Porteros participan activamente en juego.', 'ataque_organizado', 'Portero jugador', 'Alta intensidad', 'alta', 155, 175, 3, true, true, '["PCO", "portero", "construcción"]'),

('PCO 7v7 Repliegue', 'PCO-018', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 24, 2, 10, 2, 60, 45, 'campo_reducido', 16, 16, 2, '7v7+2POR', 'Énfasis en repliegue tras pérdida.', 'defensa_organizada', 'Repliegue', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["PCO", "repliegue", "defensa"]'),

('PCO 9v9 Contraataque', 'PCO-019', (SELECT id FROM categorias_tarea WHERE codigo = 'PCO'), '00000000-0000-0000-0000-000000000001', 28, 2, 12, 2, 75, 55, 'campo_reducido', 20, 20, 2, '9v9+2POR', 'Gol en contraataque vale triple.', 'transicion_defensa_ataque', 'Contraataque', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["PCO", "contraataque", "transición"]');

-- ============================================================================
-- SMALL SIDED GAMES (SSG) - 20 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('SSG 5v5+2 Comodines Banda', 'SSG-002', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 4, 4, 1, 40, 30, 'rectangular', 12, 12, 0, '5v5+2', 'Comodines en bandas, mini porterías.', 'ataque_organizado', 'Amplitud', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["SSG", "comodines", "amplitud"]'),

('SSG 3v3 Torneo Intensivo', 'SSG-003', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 24, 6, 3, 1, 20, 15, 'rectangular', 6, 12, 0, '3v3', 'Torneo 3v3 de alta intensidad.', 'transicion_defensa_ataque', 'Duelos', 'Alta intensidad', 'alta', 175, 195, 1, true, true, '["SSG", "torneo", "3v3"]'),

('SSG 4v4 Mini Porterías', 'SSG-004', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 18, 4, 4, 1, 30, 25, 'rectangular', 8, 8, 0, '4v4', 'Juego rápido con mini porterías.', 'ataque_organizado', 'Finalización rápida', 'Alta intensidad', 'alta', 165, 185, 1, true, true, '["SSG", "4v4", "intensidad"]'),

('SSG 5v5 Con Porteros', 'SSG-005', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 3, 5, 2, 40, 30, 'rectangular', 12, 12, 2, '5v5+2POR', 'Fútbol reducido con porteros.', 'ataque_organizado', 'Juego real', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["SSG", "porteros", "real"]'),

('SSG 3v3+1 Comodín', 'SSG-006', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 16, 5, 3, 1, 25, 20, 'rectangular', 7, 7, 0, '3v3+1', 'Comodín crea superioridad.', 'ataque_organizado', 'Superioridad', 'Alta intensidad', 'alta', 170, 190, 2, true, true, '["SSG", "comodín", "3v3"]'),

('SSG 6v6 Intensivo', 'SSG-007', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 22, 3, 6, 2, 45, 35, 'rectangular', 12, 12, 0, '6v6', 'Fútbol reducido de alta intensidad.', 'ataque_organizado', 'Intensidad', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["SSG", "6v6", "intensivo"]'),

('SSG 4v4+2 Transiciones', 'SSG-008', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 18, 4, 4, 1, 35, 28, 'rectangular', 10, 10, 0, '4v4+2', 'Énfasis en transiciones rápidas.', 'transicion_defensa_ataque', 'Transición', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["SSG", "transiciones", "4v4"]'),

('SSG 5v5+1 Superioridad', 'SSG-009', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 4, 4, 1, 40, 30, 'rectangular', 11, 11, 0, '5v5+1', 'Comodín crea superioridad temporal.', 'ataque_organizado', 'Superioridad', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["SSG", "superioridad", "comodín"]'),

('SSG 3v3 King of Court', 'SSG-010', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 1, 18, 2, 25, 18, 'rectangular', 9, 12, 0, '3v3', 'El que marca se queda, el que recibe sale.', 'transicion_defensa_ataque', 'Competición', 'Alta intensidad', 'alta', 175, 195, 1, true, true, '["SSG", "king of court", "competición"]'),

('SSG 4v4 Cuatro Porterías', 'SSG-011', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 18, 4, 4, 1, 35, 35, 'cuadrado', 8, 8, 0, '4v4', 'Cuatro mini porterías, cambio dirección.', 'ataque_organizado', 'Cambio orientación', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["SSG", "4 porterías", "orientación"]'),

('SSG 5v5 Líneas', 'SSG-012', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 18, 4, 4, 1, 40, 25, 'rectangular', 10, 10, 0, '5v5', 'Gol válido al pasar línea conduciendo.', 'ataque_organizado', 'Conducción', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["SSG", "líneas", "conducción"]'),

('SSG 6v6+2 Amplitud', 'SSG-013', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 22, 3, 6, 2, 50, 35, 'rectangular', 14, 14, 0, '6v6+2', 'Comodines en bandas para amplitud.', 'ataque_organizado', 'Amplitud', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["SSG", "amplitud", "bandas"]'),

('SSG 4v4 Relevos', 'SSG-014', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 5, 3, 1, 30, 25, 'rectangular', 12, 16, 0, '4v4 relevos', 'Equipos hacen relevo cada 90 segundos.', 'ataque_organizado', 'Intensidad máxima', 'Alta intensidad', 'alta', 175, 195, 1, true, true, '["SSG", "relevos", "intensidad"]'),

('SSG 3v3 Fuerza', 'SSG-015', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 16, 6, 2, 1, 20, 15, 'rectangular', 6, 6, 0, '3v3', 'Énfasis en duelos y fuerza.', 'ataque_organizado', 'Duelos fuerza', 'Alta intensidad', 'alta', 175, 195, 1, true, true, '["SSG", "fuerza", "duelos"]'),

('SSG 5v5 Pressing', 'SSG-016', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 20, 4, 4, 1, 35, 30, 'rectangular', 10, 10, 0, '5v5', 'Punto extra por robo en zona alta.', 'defensa_organizada', 'Pressing', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["SSG", "pressing", "robo"]'),

('SSG 4v4+4 Tres Equipos', 'SSG-017', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 22, 3, 6, 2, 40, 30, 'rectangular', 12, 12, 0, '4v4+4', 'Tres equipos, el que recibe gol defiende.', 'ataque_organizado', 'Competición rotativa', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["SSG", "tres equipos", "rotación"]'),

('SSG 6v6 Competición', 'SSG-018', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 24, 2, 10, 2, 50, 40, 'rectangular', 12, 12, 0, '6v6', 'Partido competitivo, sistema puntos.', 'ataque_organizado', 'Competición', 'Alta intensidad', 'alta', 160, 180, 2, true, true, '["SSG", "competición", "6v6"]'),

('SSG 3v3+2 Apoyos', 'SSG-019', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 16, 5, 3, 1, 25, 20, 'rectangular', 8, 8, 0, '3v3+2', 'Dos apoyos fijos fuera del campo.', 'ataque_organizado', 'Apoyos exteriores', 'Alta intensidad', 'alta', 165, 185, 2, true, true, '["SSG", "apoyos", "3v3"]'),

('SSG 5v5 Dos Tiempos', 'SSG-020', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 22, 2, 8, 4, 40, 30, 'rectangular', 10, 10, 0, '5v5', 'Dos tiempos como partido real.', 'ataque_organizado', 'Formato partido', 'Alta intensidad', 'alta', 155, 175, 2, true, true, '["SSG", "partido", "competición"]'),

('SSG 4v4 RSA', 'SSG-021', (SELECT id FROM categorias_tarea WHERE codigo = 'SSG'), '00000000-0000-0000-0000-000000000001', 18, 6, 2, 1, 30, 25, 'rectangular', 8, 8, 0, '4v4', 'Series cortas para RSA (repeated sprint).', 'ataque_organizado', 'RSA', 'Alta intensidad', 'alta', 175, 195, 1, true, true, '["SSG", "RSA", "sprints"]');

-- ============================================================================
-- BALÓN PARADO (ABP) - 18 tareas
-- ============================================================================

INSERT INTO tareas (titulo, codigo, categoria_id, organizacion_id, duracion_total, num_series, duracion_serie, tiempo_descanso, espacio_largo, espacio_ancho, espacio_forma, num_jugadores_min, num_jugadores_max, num_porteros, estructura_equipos, descripcion, fase_juego, principio_tactico, tipo_esfuerzo, densidad, fc_esperada_min, fc_esperada_max, nivel_cognitivo, es_plantilla, es_publica, tags)
VALUES
('ABP Penaltis Rutina', 'ABP-003', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 15, 1, 14, 1, 20, 20, 'area_grande', 4, 8, 2, 'Lanzadores + POR', 'Práctica de penaltis con rutina completa.', 'balon_parado_ofensivo', 'Penalti', 'Baja intensidad', 'baja', 90, 110, 1, true, true, '["ABP", "penalti", "rutina"]'),

('ABP Saque Banda Largo', 'ABP-004', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 8, 2, 1, 25, 35, 'area_grande', 10, 14, 1, 'Atacantes vs Defensores', 'Saque de banda largo al área.', 'balon_parado_ofensivo', 'Saque banda', 'Baja intensidad', 'baja', 105, 130, 2, true, true, '["ABP", "saque banda", "área"]'),

('ABP Falta Directa', 'ABP-005', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 30, 25, 'area_grande', 8, 12, 1, 'Lanzadores vs Barrera', 'Práctica de lanzamiento de falta directa.', 'balon_parado_ofensivo', 'Falta directa', 'Baja intensidad', 'baja', 100, 125, 2, true, true, '["ABP", "falta", "lanzamiento"]'),

('ABP Defensa Córner', 'ABP-006', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 20, 10, 1, 1, 25, 40, 'area_grande', 12, 16, 1, 'Defensores vs Atacantes', 'Sistema defensivo de córner mixto.', 'balon_parado_defensivo', 'Defensa córner', 'Baja intensidad', 'baja', 110, 135, 2, true, true, '["ABP", "córner", "defensa"]'),

('ABP Córner Ofensivo Variantes', 'ABP-007', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 20, 10, 1, 1, 25, 40, 'area_grande', 12, 16, 1, 'Atacantes vs Defensores', 'Tres variantes de córner ofensivo.', 'balon_parado_ofensivo', 'Córner ofensivo', 'Baja intensidad', 'baja', 105, 130, 2, true, true, '["ABP", "córner", "variantes"]'),

('ABP Falta Lateral Indirecta', 'ABP-008', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 30, 35, 'area_grande', 10, 14, 1, 'Atacantes vs Defensores', 'Jugadas ensayadas de falta indirecta.', 'balon_parado_ofensivo', 'Falta indirecta', 'Baja intensidad', 'baja', 105, 130, 2, true, true, '["ABP", "falta", "indirecta"]'),

('ABP Saque Puerta Construido', 'ABP-009', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 20, 8, 2, 1, 45, 55, 'medio_campo', 12, 14, 1, '6+POR vs 4', 'Salida construida desde saque de puerta.', 'balon_parado_ofensivo', 'Saque puerta', 'Baja intensidad', 'baja', 115, 140, 3, true, true, '["ABP", "saque puerta", "construcción"]'),

('ABP Penalti Bajo Presión', 'ABP-010', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 16, 1, 15, 1, 20, 20, 'area_grande', 6, 10, 2, 'Lanzadores + POR', 'Penaltis con presión simulada.', 'balon_parado_ofensivo', 'Penalti presión', 'Baja intensidad', 'baja', 95, 115, 1, true, true, '["ABP", "penalti", "presión"]'),

('ABP Defensa Saque Banda', 'ABP-011', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 8, 2, 1, 25, 35, 'area_grande', 10, 14, 1, 'Defensores vs Atacantes', 'Defensa de saque de banda peligroso.', 'balon_parado_defensivo', 'Defensa saque banda', 'Baja intensidad', 'baja', 110, 135, 2, true, true, '["ABP", "saque banda", "defensa"]'),

('ABP Córner Corto', 'ABP-012', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 30, 40, 'area_grande', 10, 14, 1, 'Atacantes vs Defensores', 'Variante de córner corto y centro.', 'balon_parado_ofensivo', 'Córner corto', 'Baja intensidad', 'baja', 110, 135, 2, true, true, '["ABP", "córner corto", "variante"]'),

('ABP Falta Frontal', 'ABP-013', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 25, 30, 'area_grande', 10, 14, 1, 'Atacantes vs Barrera+POR', 'Falta frontal al área, múltiples opciones.', 'balon_parado_ofensivo', 'Falta frontal', 'Baja intensidad', 'baja', 100, 125, 2, true, true, '["ABP", "falta frontal", "área"]'),

('ABP Defensa Falta Lateral', 'ABP-014', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 30, 40, 'area_grande', 12, 16, 1, 'Defensores vs Atacantes', 'Organización defensiva en falta lateral.', 'balon_parado_defensivo', 'Defensa falta', 'Baja intensidad', 'baja', 110, 135, 2, true, true, '["ABP", "falta", "defensa"]'),

('ABP Saque Centro Tras Gol', 'ABP-015', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 14, 8, 1, 1, 50, 50, 'medio_campo', 10, 14, 0, '5v5', 'Jugada ensayada desde saque de centro.', 'balon_parado_ofensivo', 'Saque centro', 'Baja intensidad', 'baja', 100, 125, 2, true, true, '["ABP", "saque centro", "jugada"]'),

('ABP Segundo Palo Córner', 'ABP-016', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 25, 40, 'area_grande', 10, 14, 1, 'Atacantes vs Defensores', 'Ataque al segundo palo en córner.', 'balon_parado_ofensivo', 'Córner segundo palo', 'Baja intensidad', 'baja', 105, 130, 2, true, true, '["ABP", "córner", "segundo palo"]'),

('ABP Defensa Pressing Saque', 'ABP-017', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 8, 2, 1, 45, 55, 'medio_campo', 10, 14, 1, '4 vs 6+POR', 'Pressing al saque de puerta rival.', 'balon_parado_defensivo', 'Pressing saque', 'Media intensidad', 'media', 130, 155, 2, true, true, '["ABP", "pressing", "saque puerta"]'),

('ABP Córner Rechace', 'ABP-018', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 35, 45, 'area_grande', 12, 16, 1, 'Atacantes vs Defensores', 'Vigilancia de rechace en córner.', 'balon_parado_ofensivo', 'Córner rechace', 'Baja intensidad', 'baja', 110, 135, 2, true, true, '["ABP", "córner", "rechace"]'),

('ABP Falta Zona 3', 'ABP-019', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 18, 10, 1, 1, 30, 35, 'area_grande', 10, 14, 1, 'Atacantes vs Defensores', 'Falta en zona peligrosa, varias opciones.', 'balon_parado_ofensivo', 'Falta zona 3', 'Baja intensidad', 'baja', 105, 130, 2, true, true, '["ABP", "falta", "zona peligrosa"]'),

('ABP Transición Defensa ABP', 'ABP-020', (SELECT id FROM categorias_tarea WHERE codigo = 'ABP'), '00000000-0000-0000-0000-000000000001', 20, 8, 2, 1, 50, 55, 'medio_campo', 14, 18, 2, '7v7+POR', 'Transición rápida tras defender ABP.', 'balon_parado_defensivo', 'Transición ABP', 'Media intensidad', 'media', 135, 160, 2, true, true, '["ABP", "transición", "contraataque"]');

-- ============================================================================
-- FIN - 135 TAREAS PROFESIONALES
-- ============================================================================
