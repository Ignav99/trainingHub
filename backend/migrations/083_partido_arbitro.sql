-- Árbitro separado de la ubicación/estadio del partido.

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS arbitro TEXT;
