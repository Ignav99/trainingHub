-- 075: etiquetas técnicas de sesión (TEXT[] + espejo JSONB legacy)
-- Producción puede haber aplicado 055 (JSONB) y no 063 (TEXT[]).
-- Dual-write en app + estas columnas idempotentes evitan que Añadir no persista.

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS contenidos_tecnicos_of TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contenidos_tecnicos_def TEXT[] DEFAULT '{}';

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS contenidos_ofensivos JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS contenidos_defensivos JSONB DEFAULT '[]'::JSONB;

NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN sesiones.contenidos_tecnicos_of IS 'Etiquetas técnicas ofensivas (catálogo + libres)';
COMMENT ON COLUMN sesiones.contenidos_tecnicos_def IS 'Etiquetas técnicas defensivas (catálogo + libres)';
