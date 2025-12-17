-- ============================================================================
-- TRAININGHUB PRO - MIGRACIÓN: CAMPOS ADICIONALES PARA TAREAS
-- ============================================================================
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Añadir campos adicionales a la tabla tareas
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS variantes JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS progresiones JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS regresiones JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS material JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS match_days_recomendados JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS objetivo_fisico VARCHAR(100);
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS objetivo_psicologico VARCHAR(100);
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Actualizar el CHECK de fase_juego para incluir ABP
ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_fase_juego_check;
ALTER TABLE tareas ADD CONSTRAINT tareas_fase_juego_check CHECK (fase_juego IN (
    'ataque_organizado',
    'defensa_organizada',
    'transicion_ataque_defensa',
    'transicion_defensa_ataque',
    'balon_parado_ofensivo',
    'balon_parado_defensivo'
));

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
