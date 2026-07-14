-- Plan de partido manual por rival: fases, principios, clips, pizarras.
-- Fuente de verdad compartida entre /rivales/{id} (Plan de Partido) y microciclos (Sala del Lunes).
-- Consignas semanales y consignas clave globales quedan en plan_ct por microciclo.

ALTER TABLE rivales
  ADD COLUMN IF NOT EXISTS plan_partido_manual JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN rivales.plan_partido_manual IS
  'Plan de partido manual: fases, principios, clips, pizarras. Sync bidireccional con plan_ct.plan_partido (excepto consignas semanales).';
