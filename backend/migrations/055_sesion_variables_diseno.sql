-- ============================================================
-- 055: Variables de diseño de sesión
--
-- El bloque "¿Qué necesitas trabajar?" del diseñador de sesiones
-- (ver docs/mejoras/variables_sesion.png) define las variables con las que
-- luego se filtran las sesiones y se recomiendan tareas.
--
-- `fase_juego_principal` ya existe y cubre "Fases de juego".
-- Los contenidos usan los mismos catalogos que las tareas
-- (frontend/src/lib/catalogos/canonico.ts), asi que sesion y tarea son filtrables
-- por el mismo vocabulario.
-- ============================================================

ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS espacio_disponible VARCHAR(30);
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS jugadores_campo SMALLINT;
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS numero_sesion INTEGER;
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS objetivos JSONB DEFAULT '[]'::JSONB;
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS contenidos_ofensivos JSONB DEFAULT '[]'::JSONB;
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS contenidos_defensivos JSONB DEFAULT '[]'::JSONB;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sesiones_espacio_disponible_valido'
    ) THEN
        ALTER TABLE sesiones
            ADD CONSTRAINT sesiones_espacio_disponible_valido
            CHECK (espacio_disponible IS NULL OR espacio_disponible IN (
                'campo_completo', 'medio_campo', 'area_doble', 'area_simple', 'gimnasio'
            ));
    END IF;
END $$;

-- Filtrado por variables de trabajo
CREATE INDEX IF NOT EXISTS idx_sesiones_espacio ON sesiones(equipo_id, espacio_disponible);
CREATE INDEX IF NOT EXISTS idx_sesiones_objetivos ON sesiones USING GIN (objetivos);
CREATE INDEX IF NOT EXISTS idx_sesiones_cont_of ON sesiones USING GIN (contenidos_ofensivos);
CREATE INDEX IF NOT EXISTS idx_sesiones_cont_def ON sesiones USING GIN (contenidos_defensivos);

COMMENT ON COLUMN sesiones.espacio_disponible IS 'Espacio del que se dispone para la sesion';
COMMENT ON COLUMN sesiones.jugadores_campo IS 'Jugadores de campo previstos (sin porteros)';
COMMENT ON COLUMN sesiones.numero_sesion IS 'Numero correlativo de sesion de la temporada';
COMMENT ON COLUMN sesiones.objetivos IS 'Codigos de OBJETIVOS_TAREA que se quieren trabajar';
COMMENT ON COLUMN sesiones.contenidos_ofensivos IS 'Codigos de CONTENIDOS_OFENSIVOS';
COMMENT ON COLUMN sesiones.contenidos_defensivos IS 'Codigos de CONTENIDOS_DEFENSIVOS';
