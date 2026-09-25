-- Ropa de portero del club: dos equipaciones (local y visitante), aparte de la de campo.
-- El cartel guarda qué equipación de portero se usa en el partido.

ALTER TABLE equipaciones DROP CONSTRAINT IF EXISTS equipaciones_tipo_check;
ALTER TABLE equipaciones
  ADD CONSTRAINT equipaciones_tipo_check
  CHECK (tipo IN ('local', 'visitante', 'portero_local', 'portero_visitante'));

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS kit_portero TEXT;

ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_kit_portero_check;
ALTER TABLE partidos
  ADD CONSTRAINT partidos_kit_portero_check
  CHECK (kit_portero IS NULL OR kit_portero IN ('local', 'visitante'));
