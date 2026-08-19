# TrainingHub — estado actual

## En curso
Rama `cursor/sesion-resumen-variante-ae84`: sesión como resumen visual + variantes desde sesión.

## Decisiones
- En la sesión solo van fijos: pizarra, desarrollo y variantes/reglas. El resto de la ficha es desplegable.
- Insertar desde biblioteca = tarea madre. Modificar desde la sesión crea una variante (`tarea_origen_id` = madre, `tipo_variante` = adaptacion, `es_plantilla` = false) y la sesión apunta a esa variante. La madre no se muta.
- Equipos (`formacion_equipos`) son de la sesión, no de la ficha.
- Biblioteca lista solo madres (`solo_madres`). Las variantes se ven dentro de la madre.
- Crear tarea desde sesión (manual o IA) = nueva madre en biblioteca (`es_plantilla` true).
- Duración de cabecera / responsable / notas = override de sesión, no forkean.

## Siguiente
CI → auto-merge → Deploy Render.
