-- 090: quién del margen o de fisio entra en cada tarea, y minutos efectivos del trabajo al margen.

ALTER TABLE sesion_tareas
  ADD COLUMN IF NOT EXISTS jugadores_margen UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN sesion_tareas.jugadores_margen IS
  'Jugadores al margen o con fisio que participan en esta tarea. Su carga solo suma estas tareas, más su trabajo al margen.';

ALTER TABLE entrenamientos_margen_tareas
  ADD COLUMN IF NOT EXISTS minutos_efectivos INTEGER;

COMMENT ON COLUMN entrenamientos_margen_tareas.minutos_efectivos IS
  'Minutos que entran en la carga del jugador. NULL = duracion del ejercicio.';
