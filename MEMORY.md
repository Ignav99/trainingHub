# TrainingHub — estado actual

## En curso / hecho
Fix editar tarea: producción no tiene columnas mig 067 (`desarrollo`, `tarea_origen_id`). Create tenía fallback; update 500 («Revisa los logs»). Ahora create/update/duplicar/variante reintentan omitiendo columnas PGRST204. Etiquetas PF se guardan. Desarrollo sigue en `descripcion`.

Rama `cursor/tarea-edit-schema-fallback-ae84`.
