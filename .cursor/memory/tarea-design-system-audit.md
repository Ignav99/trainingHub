# Tarea design system — audit (2026-07-27)

## Verdict
Flat task model: narration fields exist (descripcion, reglas_*, forma_puntuar, variantes[] as strings). **No mother/child graph** (`tarea_origen_id` / `tipo_variante` planned in catalog memory but **not in any migration**). TIPOS_VARIANTE catalog exists unused.

## Current state
- `variantes` / `progresiones` / `regresiones` = JSONB string arrays (039 / 002)
- Seeds sometimes store objects `{nombre, descripcion, dificultad}` — type mismatch vs `string[]`
- TareaCreatorFullscreen: no reglas / forma_puntuar / variantes UI; maps objetivos→tags/consignas
- CrearTareaEnSesionRequest drops `modalidad` + `objetivos_*` (not on request model)
- Session edit: COW via `duplicar-y-editar` when `es_plantilla`; no parent link
- Library filters: categoria, modalidad, fase, densidad, cognitivo, jugadores, búsqueda; objetivos client-side only

## Recommended schema
- `tarea_origen_id UUID NULL REFERENCES tareas(id)`
- `tipo_variante` CHECK: original|progresion|regresion|adaptacion|contexto
- `notas_variante TEXT` optional
- Keep legacy arrays as read-only migration source; stop writing as SoT

## UI tabs
1. Desarrollo (board + core + reglas + forma_puntuar)
2. Variantes (children list + "crear variante" = clone board/core, link mother)
3. Anotaciones (consignas, errores, session notas)

## Reuse flow
"Crear variante desde madre" → copy grafico_data + core fields → set tarea_origen_id + tipo_variante → edit deltas only (reglas/espacio/jugadores) without redesigning board.
