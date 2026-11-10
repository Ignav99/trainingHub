-- El olfato y los objetivos de la semana no se pueden vaciar una vez escritos.
-- Una sesión sin microciclo se engancha a la copia de la semana que ya tiene ese texto.

CREATE OR REPLACE FUNCTION public.keep_microciclo_week_text()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_olfato text;
  new_olfato text;
  old_objs int;
  new_objs int;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  old_olfato := btrim(coalesce(OLD.plan_ct->>'olfato_ct', ''));
  new_olfato := btrim(coalesce(NEW.plan_ct->>'olfato_ct', ''));
  IF old_olfato <> '' AND new_olfato = '' THEN
    NEW.plan_ct := jsonb_set(
      coalesce(NEW.plan_ct, '{}'::jsonb),
      '{olfato_ct}',
      to_jsonb(OLD.plan_ct->>'olfato_ct'),
      true
    );
  END IF;

  old_objs := CASE
    WHEN jsonb_typeof(OLD.plan_ct->'objetivos_semana') = 'array'
    THEN jsonb_array_length(OLD.plan_ct->'objetivos_semana')
    ELSE 0
  END;
  new_objs := CASE
    WHEN jsonb_typeof(NEW.plan_ct->'objetivos_semana') = 'array'
    THEN jsonb_array_length(NEW.plan_ct->'objetivos_semana')
    ELSE 0
  END;
  IF old_objs > 0 AND new_objs = 0 THEN
    NEW.plan_ct := jsonb_set(
      coalesce(NEW.plan_ct, '{}'::jsonb),
      '{objetivos_semana}',
      OLD.plan_ct->'objetivos_semana',
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keep_microciclo_week_text ON public.microciclos;
CREATE TRIGGER keep_microciclo_week_text
  BEFORE UPDATE ON public.microciclos
  FOR EACH ROW
  EXECUTE FUNCTION public.keep_microciclo_week_text();

CREATE OR REPLACE FUNCTION public.auto_link_sesion_microciclo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.microciclo_id IS NULL THEN
    SELECT m.id INTO NEW.microciclo_id
    FROM microciclos m
    WHERE m.equipo_id = NEW.equipo_id
      AND NEW.fecha BETWEEN m.fecha_inicio AND m.fecha_fin
    ORDER BY
      (
        coalesce(length(btrim(m.plan_ct->>'olfato_ct')), 0)
        + CASE
            WHEN jsonb_typeof(m.plan_ct->'objetivos_semana') = 'array'
            THEN jsonb_array_length(m.plan_ct->'objetivos_semana')
            ELSE 0
          END
      ) DESC,
      (SELECT count(*) FROM sesiones s WHERE s.microciclo_id = m.id) DESC,
      m.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
