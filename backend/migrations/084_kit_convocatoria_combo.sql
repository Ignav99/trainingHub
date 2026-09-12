-- Equipación de convocatoria: camiseta/calzonas/medias pueden mezclar local y visitante.
-- Valores: 'local' | 'visitante' | 'local:visitante:local' (camiseta:pantalon:medias).

ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_kit_convocatoria_check;
ALTER TABLE partidos
  ADD CONSTRAINT partidos_kit_convocatoria_check
  CHECK (
    kit_convocatoria IS NULL
    OR kit_convocatoria ~ '^(local|visitante)(:(local|visitante)){0,2}$'
  );
