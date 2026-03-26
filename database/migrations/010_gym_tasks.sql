-- ============================================================================
-- MIGRACIÓN 010: TAREAS DE GIMNASIO / PREPARACIÓN FÍSICA
-- ============================================================================
-- Añade categorías complementarias (GYM, PRV, MOV, RCF) y campos específicos
-- para ejercicios de fuerza, prevención, movilidad y recuperación.
-- ============================================================================

-- ============================================================================
-- 1a. NUEVAS CATEGORÍAS DE TAREA
-- ============================================================================

INSERT INTO categorias_tarea (codigo, nombre, nombre_corto, naturaleza, descripcion, color, icono, orden) VALUES
('GYM', 'Fuerza / Gimnasio', 'Gym', 'complementario',
 'Ejercicios de fuerza y potencia en gimnasio: sentadillas, peso muerto, press, hip thrust.',
 '#8B5CF6', '🏋️', 10),
('PRV', 'Prevención de Lesiones', 'Prevención', 'complementario',
 'Protocolos de prevención: nórdicos, Copenhagen, FIFA 11+, propiocepción.',
 '#F43F5E', '🩹', 11),
('MOV', 'Movilidad / Flexibilidad', 'Movilidad', 'complementario',
 'Trabajo de movilidad articular, flexibilidad, foam rolling y yoga.',
 '#06B6D4', '🧘', 12),
('RCF', 'Recuperación Física', 'Recuperación', 'complementario',
 'Protocolos de recuperación: activa post-partido, contrastes, piscina.',
 '#22C55E', '♻️', 13)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 1b. NUEVAS COLUMNAS EN TAREAS
-- ============================================================================

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS es_complementaria BOOLEAN DEFAULT false;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS grupo_muscular TEXT[];
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS equipamiento TEXT[];
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS tipo_contraccion VARCHAR(20)
    CHECK (tipo_contraccion IN ('concentrica', 'excentrica', 'isometrica', 'pliometrica'));
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS zona_cuerpo VARCHAR(20)
    CHECK (zona_cuerpo IN ('tren_superior', 'tren_inferior', 'core', 'full_body'));
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS objetivo_gym VARCHAR(30)
    CHECK (objetivo_gym IN ('fuerza_maxima', 'hipertrofia', 'potencia', 'resistencia_muscular', 'movilidad', 'activacion', 'recuperacion'));
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS series_repeticiones JSONB;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS protocolo_progresion TEXT;

-- Índices para filtrado de tareas complementarias
CREATE INDEX IF NOT EXISTS idx_tareas_es_complementaria ON tareas(es_complementaria);
CREATE INDEX IF NOT EXISTS idx_tareas_zona_cuerpo ON tareas(zona_cuerpo);
CREATE INDEX IF NOT EXISTS idx_tareas_objetivo_gym ON tareas(objetivo_gym);

-- ============================================================================
-- 1c. ACTUALIZAR MATCH_DAY_CONFIG CON CATEGORÍAS GYM
-- ============================================================================

-- MD+1 (Recuperación): añadir RCF y MOV como preferidas
UPDATE match_day_config
SET categorias_preferidas = categorias_preferidas || '["RCF", "MOV"]'::jsonb
WHERE codigo = 'MD+1'
  AND NOT categorias_preferidas @> '["RCF"]'::jsonb;

-- MD-4 (Fuerza): añadir GYM como preferida
UPDATE match_day_config
SET categorias_preferidas = categorias_preferidas || '["GYM"]'::jsonb
WHERE codigo = 'MD-4'
  AND NOT categorias_preferidas @> '["GYM"]'::jsonb;

-- MD-3 (Resistencia): añadir GYM como preferida (carga moderada)
UPDATE match_day_config
SET categorias_preferidas = categorias_preferidas || '["GYM"]'::jsonb
WHERE codigo = 'MD-3'
  AND NOT categorias_preferidas @> '["GYM"]'::jsonb;

-- MD-2 (Velocidad): añadir MOV y PRV como preferidas
UPDATE match_day_config
SET categorias_preferidas = categorias_preferidas || '["MOV", "PRV"]'::jsonb
WHERE codigo = 'MD-2'
  AND NOT categorias_preferidas @> '["MOV"]'::jsonb;

-- MD-1 (Activación): añadir GYM a evitar
UPDATE match_day_config
SET categorias_evitar = categorias_evitar || '["GYM"]'::jsonb
WHERE codigo = 'MD-1'
  AND NOT categorias_evitar @> '["GYM"]'::jsonb;

-- MD (Partido): añadir GYM y PRV a evitar
UPDATE match_day_config
SET categorias_evitar = categorias_evitar || '["GYM", "PRV"]'::jsonb
WHERE codigo = 'MD'
  AND NOT categorias_evitar @> '["GYM"]'::jsonb;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
