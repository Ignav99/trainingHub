-- Add documentos_urls column to registros_medicos (JSONB array of URLs)
ALTER TABLE registros_medicos ADD COLUMN IF NOT EXISTS documentos_urls JSONB DEFAULT '[]'::jsonb;
