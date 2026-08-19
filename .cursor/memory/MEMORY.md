# TrainingHub — Memory

## Last updated
2026-08-19 — Ficha de tarea unificada: creador = biblioteca = sesión

## Recent work
- Branch `cursor/tarea-ficha-paridad-ae84`:
  - La ficha de «Crea tu ejercicio» (`TareaFichaBody` + `tareaToCreatorData`) es la fuente de verdad.
  - Biblioteca (ver/editar/nueva) y sesión muestran y rellenan los mismos campos: tipo, metodología, jugadores, porteros, fase/subfase, desarrollo, reglas, anotaciones, objetivos tácticos/técnicos, SIATE, orientación física, volumen y carga de pizarra.
  - Al guardar en sesión, `DuplicarYEditarTareaRequest` acepta toda la ficha (categoría, porteros, orientación, SIATE, FC, etc.) y resuelve el código de categoría a UUID.

## Deploy chain
cursor/* PR → CI → auto-merge main → Deploy → Render
