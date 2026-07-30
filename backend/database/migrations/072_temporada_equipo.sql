-- Migration 072: linaje de temporadas entre equipos.
-- Un "equipo" nuevo se crea cada temporada (no se reutiliza el mismo equipo_id);
-- temporada_anterior_id conecta la nueva fila con la temporada previa del
-- mismo equipo logico, para poder navegar el historico.

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS temporada_anterior_id UUID REFERENCES equipos(id);
CREATE INDEX IF NOT EXISTS idx_equipos_temporada_anterior ON equipos(temporada_anterior_id);
