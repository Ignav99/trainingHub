-- ============================================================================
-- MIGRACIÓN 066: Categoría TAM (Trabajo al margen) + sincronizar POR
-- ============================================================================
-- Asegura categorías de biblioteca para margen y porteros.
-- ============================================================================

INSERT INTO categorias_tarea (codigo, nombre, nombre_corto, naturaleza, descripcion, color, icono, orden) VALUES
('TAM', 'Trabajo al margen', 'Margen', 'complementario',
 'Trabajo individual al margen de la sesión: RTP, readaptación y PF personalizada.',
 '#F59E0B', '🩹', 16),
('POR', 'Porteros', 'POR', 'campo',
 'Ejercicios específicos de portero: técnica, táctica y juego.',
 '#22C55E', '🧤', 17)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  nombre_corto = EXCLUDED.nombre_corto,
  naturaleza = EXCLUDED.naturaleza,
  descripcion = EXCLUDED.descripcion,
  color = EXCLUDED.color,
  icono = EXCLUDED.icono,
  orden = EXCLUDED.orden;

-- Asegura categorías gym ya existentes (idempotente)
INSERT INTO categorias_tarea (codigo, nombre, nombre_corto, naturaleza, descripcion, color, icono, orden) VALUES
('GYM', 'Fuerza / Gimnasio', 'Gym', 'complementario',
 'Ejercicios de fuerza y potencia en gimnasio.',
 '#8B5CF6', '🏋️', 10),
('PRV', 'Prevención de Lesiones', 'Prevención', 'complementario',
 'Protocolos de prevención de lesiones.',
 '#F43F5E', '🩹', 11),
('MOV', 'Movilidad / Flexibilidad', 'Movilidad', 'complementario',
 'Trabajo de movilidad articular y flexibilidad.',
 '#06B6D4', '🧘', 12),
('RCF', 'Recuperación Física', 'Recuperación', 'complementario',
 'Protocolos de recuperación física.',
 '#22C55E', '♻️', 13)
ON CONFLICT (codigo) DO NOTHING;
