-- Add sync_status JSONB column to rfef_competiciones for tracking sync completeness
ALTER TABLE rfef_competiciones
ADD COLUMN IF NOT EXISTS sync_status JSONB DEFAULT NULL;

COMMENT ON COLUMN rfef_competiciones.sync_status IS 'Tracks acta sync completeness: total, complete, incomplete, failed counts and timestamps';
