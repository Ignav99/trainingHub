# TrainingHub — estado actual

## En curso
Guardado rápido + persistencia SIATE (GO/PES). Rama `cursor/tarea-save-fast-ae84`.

El grado de oposición no se persistía: el formulario tenía `complejidad_go` pero el payload solo mandaba la etiqueta `complejidad`. Al recargar, el select volvía a Auto.

Fix: guardar GO/PES en `grafico_data.siate` (columna JSONB que ya existe) y en `complejidad_go` / `complejidad_pes` (opcionales). Si PostgREST no tiene esas columnas, el retry las omite y el stash en `grafico_data` sigue.

Velocidad: embeddings Gemini en BackgroundTasks (antes bloqueaban 1–14s). Create/update de tarea y partido no hacen GET extra si el INSERT/UPDATE ya devuelve la fila. El frontend no espera el revalidate amplio de SWR; el dashboard deja de cachear partidos 60s.

SQL opcional (idempotente) en `supabase/migrations/20260819140000_tareas_siate_go_pes.sql`.
