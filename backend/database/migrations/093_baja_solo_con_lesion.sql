-- Una baja suelta (sin lesión en fuera, margen o grupo) vuelve a disponible.
-- Si hay lesión abierta en uno de esos tres grados, el estado sigue a esa fase.

CREATE OR REPLACE FUNCTION public.keep_baja_only_with_injury()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  fase text;
BEGIN
  IF NEW.estado IS DISTINCT FROM 'baja' THEN
    RETURN NEW;
  END IF;

  SELECT r.fase_tratamiento INTO fase
  FROM registros_medicos r
  WHERE r.jugador_id = NEW.id
    AND r.estado IN ('activo', 'en_recuperacion', 'cronico')
    AND COALESCE(r.es_historico, false) = false
    AND r.tipo IS DISTINCT FROM 'molestias'
    AND r.fase_tratamiento IN ('reposo', 'margen', 'inicio_grupo')
  ORDER BY CASE r.fase_tratamiento
    WHEN 'reposo' THEN 0
    WHEN 'margen' THEN 1
    ELSE 2
  END
  LIMIT 1;

  IF fase IS NULL THEN
    NEW.estado := 'activo';
    NEW.disponibilidad := 'pleno';
    NEW.motivo_baja := NULL;
    NEW.fecha_lesion := NULL;
    NEW.fecha_vuelta_estimada := NULL;
  ELSIF fase = 'reposo' THEN
    NEW.estado := 'lesionado';
    NEW.disponibilidad := 'fuera';
  ELSIF fase = 'margen' THEN
    NEW.estado := 'en_recuperacion';
    NEW.disponibilidad := 'individual';
  ELSE
    NEW.estado := 'en_recuperacion';
    NEW.disponibilidad := 'grupo_adaptado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jugadores_baja_requiere_lesion ON jugadores;
CREATE TRIGGER jugadores_baja_requiere_lesion
  BEFORE INSERT OR UPDATE OF estado ON jugadores
  FOR EACH ROW
  EXECUTE FUNCTION public.keep_baja_only_with_injury();

UPDATE jugadores
SET estado = 'activo',
    disponibilidad = 'pleno',
    motivo_baja = NULL,
    fecha_lesion = NULL,
    fecha_vuelta_estimada = NULL
WHERE estado = 'baja'
  AND NOT EXISTS (
    SELECT 1
    FROM registros_medicos r
    WHERE r.jugador_id = jugadores.id
      AND r.estado IN ('activo', 'en_recuperacion', 'cronico')
      AND COALESCE(r.es_historico, false) = false
      AND r.tipo IS DISTINCT FROM 'molestias'
      AND r.fase_tratamiento IN ('reposo', 'margen', 'inicio_grupo')
  );
