-- Stats 1ª / 2ª parte del anotador (JSON).
-- No es bloqueante: el anotador también guarda el desglose en partidos.notas_pre.
-- Si esta columna no existe, el API reintenta el upsert sin ella.

ALTER TABLE estadisticas_partido
  ADD COLUMN IF NOT EXISTS stats_periodos JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN estadisticas_partido.stats_periodos IS
  'Desglose anotador: {1: stats+carriles+faltas, 2: ..., total, closed}';
