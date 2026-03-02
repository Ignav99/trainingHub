-- Migration 017: RFAF Scraping
-- Adds scraping fields to rfef_competiciones for automated RFAF data sync

ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS rfef_codcompeticion TEXT;
ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS rfef_codgrupo TEXT;
ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS rfef_codtemporada TEXT DEFAULT '21';
ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS ultima_sincronizacion TIMESTAMPTZ;
ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS sync_habilitado BOOLEAN DEFAULT true;
ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS goleadores JSONB DEFAULT '[]';

COMMENT ON COLUMN rfef_competiciones.rfef_codcompeticion IS 'RFAF competition ID for scraping';
COMMENT ON COLUMN rfef_competiciones.rfef_codgrupo IS 'RFAF group ID for scraping';
COMMENT ON COLUMN rfef_competiciones.rfef_codtemporada IS 'RFAF season code (e.g. 21)';
COMMENT ON COLUMN rfef_competiciones.ultima_sincronizacion IS 'Last successful sync timestamp';
COMMENT ON COLUMN rfef_competiciones.sync_habilitado IS 'Whether automatic sync is enabled';
COMMENT ON COLUMN rfef_competiciones.goleadores IS 'Top scorers ranking from RFAF';
