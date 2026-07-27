-- ============================================================================
-- MIGRACIÓN 065: Objetivos tácticos/técnicos + orientación física
-- ============================================================================
-- Alinea el modelo de tarea con: tipo, metodología, objetivos tácticos,
-- objetivos técnicos y orientación física (activación/fuerza/resistencia/velocidad).
-- densididad y nivel_cognitivo se calculan en app (no columnas nuevas).
-- ============================================================================

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS objetivos_tacticos TEXT[] DEFAULT '{}';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS objetivos_tecnicos TEXT[] DEFAULT '{}';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS orientaciones_fisicas TEXT[] DEFAULT '{}';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS etiquetas_fisicas TEXT[] DEFAULT '{}';

COMMENT ON COLUMN tareas.objetivos_tacticos IS 'Objetivos tácticos (principios / intenciones de juego)';
COMMENT ON COLUMN tareas.objetivos_tecnicos IS 'Objetivos técnicos (gestos y acciones)';
COMMENT ON COLUMN tareas.orientaciones_fisicas IS 'activacion | fuerza | resistencia | velocidad';
COMMENT ON COLUMN tareas.etiquetas_fisicas IS 'Etiquetas libres del preparador físico';

-- Asegurar tipología canónica (sin inventar códigos fuera de la lista)
INSERT INTO categorias_tarea (codigo, nombre, nombre_corto, naturaleza, descripcion, color, icono, orden) VALUES
('LUD', 'Juegos lúdicos', 'Lúdicos', 'campo', 'Dinámicas lúdicas de activación y cohesión.', '#F59E0B', 'dice', 1),
('CIR', 'Circuitos físicos', 'Circuitos', 'campo', 'Secuencia de estaciones o postas condicionales.', '#EF4444', 'repeat', 2),
('RND', 'Rondos', 'Rondo', 'campo', 'Mantenimiento en espacio reducido vs presión.', '#3B82F6', 'circle', 3),
('RDP', 'Ruedas de pase', 'Ruedas', 'campo', 'Circuitos de pase y combinaciones técnicas.', '#6366F1', 'refresh', 4),
('POS', 'Posesiones', 'Posesión', 'campo', 'Mantenimiento: objetivo prioritario conservar el balón.', '#8B5CF6', 'users', 5),
('JDP', 'Juegos de posición', 'JdP', 'campo', 'Tareas posicionales con roles y ocupación del espacio.', '#10B981', 'grid', 6),
('FIN', 'Finalizaciones', 'Fin.', 'campo', 'Remate y definición en zona de finalización.', '#DC2626', 'target', 7),
('SSG', 'Partido reducido', 'SSG', 'campo', 'Juego reducido con oposición real.', '#0EA5E9', 'minimize', 8),
('PCO', 'Partido condicionado', 'P. Cond.', 'campo', 'Partido con reglas que orientan el comportamiento.', '#EC4899', 'flag', 9),
('PRT', 'Partido', 'Partido', 'campo', 'Partido o simulación competitiva.', '#0F766E', 'ball', 10),
('EST', 'Estiramientos', 'Estirar', 'complementario', 'Movilidad y vuelta a la calma.', '#14B8A6', 'stretch', 11),
('ACT', 'Activaciones', 'Activación', 'complementario', 'Activación neuromuscular previa.', '#22C55E', 'zap', 12)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  nombre_corto = EXCLUDED.nombre_corto,
  naturaleza = EXCLUDED.naturaleza,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden;
