-- Perfil manual del rival: análisis por fases, clips, anotaciones tácticas.
-- Fuente de verdad compartida entre /rivales/{id} (Informe Rival) y microciclos (Sala del Lunes).
-- Contexto semanal (comentarios + dimensiones) y once probable RFEF quedan en plan_ct por microciclo.

ALTER TABLE rivales
  ADD COLUMN IF NOT EXISTS scout_manual JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN rivales.scout_manual IS
  'Informe rival manual: fases, clips, pizarras, anotaciones. Sync bidireccional con plan_ct.rival_scout (excepto contexto semanal y XI RFEF).';
