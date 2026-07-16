-- Migration 059: Tipología de futbolistas + soporte pretemporada
-- tipo_jugador: plantilla | juvenil | prueba | invitado
-- ficha_estado: completa | pre_ficha | minima

ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS tipo_jugador TEXT NOT NULL DEFAULT 'plantilla';

ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS ficha_estado TEXT NOT NULL DEFAULT 'completa';

ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS fecha_fin_prueba DATE;

COMMENT ON COLUMN jugadores.tipo_jugador IS
  'plantilla=ficha oficial; juvenil=cantera/seguimiento; prueba=trial con pre-ficha; invitado=sin seguimiento';

COMMENT ON COLUMN jugadores.ficha_estado IS
  'completa=perfil full; pre_ficha=tracking cargas; minima=solo identidad para sesiones';

-- Backfill desde es_invitado
UPDATE jugadores
SET
  tipo_jugador = 'invitado',
  ficha_estado = 'minima'
WHERE es_invitado = true
  AND (tipo_jugador IS NULL OR tipo_jugador = 'plantilla');

-- Mantener es_invitado coherente (derivado)
UPDATE jugadores
SET es_invitado = (tipo_jugador IS DISTINCT FROM 'plantilla')
WHERE es_invitado IS DISTINCT FROM (tipo_jugador IS DISTINCT FROM 'plantilla');

-- Constraint blanda (CHECK) — solo valores conocidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jugadores_tipo_jugador_check'
  ) THEN
    ALTER TABLE jugadores
      ADD CONSTRAINT jugadores_tipo_jugador_check
      CHECK (tipo_jugador IN ('plantilla', 'juvenil', 'prueba', 'invitado'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jugadores_ficha_estado_check'
  ) THEN
    ALTER TABLE jugadores
      ADD CONSTRAINT jugadores_ficha_estado_check
      CHECK (ficha_estado IN ('completa', 'pre_ficha', 'minima'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jugadores_tipo ON jugadores(equipo_id, tipo_jugador);
