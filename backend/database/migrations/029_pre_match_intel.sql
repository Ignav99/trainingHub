-- 029: Pre-match intelligence cache
-- Stores auto-generated rival intel as JSONB, separate from manual notas_pre

ALTER TABLE partidos ADD COLUMN IF NOT EXISTS pre_match_intel JSONB DEFAULT NULL;

COMMENT ON COLUMN partidos.pre_match_intel IS 'Auto-generated pre-match intelligence from RFEF data (clasificacion, goleadores, once probable, tarjetas, sanciones, resultados, h2h)';
