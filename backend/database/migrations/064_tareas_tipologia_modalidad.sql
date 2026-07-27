-- ============================================================================
-- MIGRACIÓN 064: Tipología de tareas + modalidad
-- ============================================================================
-- Nuevos tipos: LUD, CIR, RDP, FIN, PRT, EST, ACT
-- Renombra etiquetas de SSG / RND / POS / JDP / PCO
-- Añade columna modalidad (analitica | global | competitiva | general)
-- ============================================================================

-- 1) Nuevas categorías
INSERT INTO categorias_tarea (codigo, nombre, nombre_corto, naturaleza, descripcion, color, icono, orden) VALUES
('LUD', 'Juegos lúdicos', 'Lúdicos', 'campo',
 'Juegos lúdicos y dinámicas de activación divertida.',
 '#F59E0B', '🎲', 1),
('CIR', 'Circuitos físicos', 'Circuitos', 'campo',
 'Circuitos de condición física, estaciones y trabajo intermitente.',
 '#EF4444', '🔁', 2),
('RDP', 'Ruedas de pase', 'Ruedas', 'campo',
 'Circuitos de pase, combinaciones y patrones técnicos.',
 '#3B82F6', '🔄', 5),
('FIN', 'Finalizaciones', 'Fin.', 'campo',
 'Ejercicios orientados a remate y finalización.',
 '#DC2626', '🎯', 8),
('PRT', 'Partido', 'Partido', 'campo',
 'Partido completo o simulación de competición.',
 '#0F766E', '⚽', 11),
('EST', 'Estiramientos', 'Estirar', 'complementario',
 'Estiramientos y vuelta a la calma.',
 '#14B8A6', '🧘', 14),
('ACT', 'Activaciones', 'Activación', 'complementario',
 'Activación neuromuscular y preparación previa.',
 '#22C55E', '⚡', 15)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  nombre_corto = EXCLUDED.nombre_corto,
  naturaleza = EXCLUDED.naturaleza,
  descripcion = EXCLUDED.descripcion,
  color = EXCLUDED.color,
  icono = EXCLUDED.icono,
  orden = EXCLUDED.orden;

-- 2) Actualizar nombres de categorías existentes (tipología acordada)
UPDATE categorias_tarea SET nombre = 'Rondos', nombre_corto = 'Rondo' WHERE codigo = 'RND';
UPDATE categorias_tarea SET nombre = 'Posesiones', nombre_corto = 'Posesión' WHERE codigo = 'POS';
UPDATE categorias_tarea SET nombre = 'Juegos de posición', nombre_corto = 'JdP' WHERE codigo = 'JDP';
UPDATE categorias_tarea SET nombre = 'Partido reducido', nombre_corto = 'SSG' WHERE codigo = 'SSG';
UPDATE categorias_tarea SET nombre = 'Partido condicionado', nombre_corto = 'P. Cond.' WHERE codigo = 'PCO';

-- 3) Modalidad metodológica
ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tareas_modalidad_check'
  ) THEN
    ALTER TABLE tareas
      ADD CONSTRAINT tareas_modalidad_check
      CHECK (modalidad IS NULL OR modalidad IN ('analitica', 'global', 'competitiva', 'general'));
  END IF;
END $$;

COMMENT ON COLUMN tareas.modalidad IS
  'Enfoque: analitica | global | competitiva | general (no fútbol)';

CREATE INDEX IF NOT EXISTS idx_tareas_modalidad ON tareas (modalidad) WHERE modalidad IS NOT NULL;
