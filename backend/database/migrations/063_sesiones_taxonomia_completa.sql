-- 063_sesiones_taxonomia_completa.sql
-- Rediseño sesiones: taxonomía fases/subfases/ABP, keywords, rival, carga, share
-- Aplicar manualmente en Supabase SQL Editor.

-- Taxonomía de juego (multi)
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS fases_juego TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subfases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS abp_config JSONB,
  ADD COLUMN IF NOT EXISTS contenidos_tecnicos_of TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contenidos_tecnicos_def TEXT[] DEFAULT '{}';

-- Objetivos + keywords filtrables
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objetivo_fisico TEXT,
  ADD COLUMN IF NOT EXISTS objetivo_psicologico TEXT;

-- Contexto periodo / rival correlacionado
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS contexto_periodo TEXT DEFAULT 'competicion',
  ADD COLUMN IF NOT EXISTS dia_carga TEXT,
  ADD COLUMN IF NOT EXISTS partido_id UUID,
  ADD COLUMN IF NOT EXISTS es_pretemporada BOOLEAN DEFAULT false;

-- Carga agregada (calculada desde tareas)
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS carga_sesion NUMERIC,
  ADD COLUMN IF NOT EXISTS intensidad_calculada TEXT;

-- Share link
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS share_token TEXT;

-- Carga por tarea en sesión
ALTER TABLE sesion_tareas
  ADD COLUMN IF NOT EXISTS carga_calculada NUMERIC;

-- Índices para filtros
CREATE INDEX IF NOT EXISTS idx_sesiones_keywords_gin ON sesiones USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_sesiones_fases_juego_gin ON sesiones USING GIN (fases_juego);
CREATE INDEX IF NOT EXISTS idx_sesiones_materiales_gin ON sesiones USING GIN (materiales);
CREATE INDEX IF NOT EXISTS idx_sesiones_share_token ON sesiones (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sesiones_partido_id ON sesiones (partido_id) WHERE partido_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sesiones_estado_fecha ON sesiones (estado, fecha);

-- FK suave a partidos (si existe la tabla)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partidos') THEN
    BEGIN
      ALTER TABLE sesiones
        ADD CONSTRAINT sesiones_partido_id_fkey
        FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

COMMENT ON COLUMN sesiones.fases_juego IS 'Fases de juego multi (ataque_organizado, …)';
COMMENT ON COLUMN sesiones.subfases IS 'Lista {fase, subfase, opcion?}';
COMMENT ON COLUMN sesiones.abp_config IS '{activo, lado, tipos[]} o null';
COMMENT ON COLUMN sesiones.keywords IS 'Keywords derivadas del objetivo + edición manual';
COMMENT ON COLUMN sesiones.share_token IS 'Token para vista compartible de solo lectura';
COMMENT ON COLUMN sesiones.carga_sesion IS 'Carga agregada calculada desde tareas';
COMMENT ON COLUMN sesiones.intensidad_calculada IS 'alta|media|baja|muy_baja derivada';
