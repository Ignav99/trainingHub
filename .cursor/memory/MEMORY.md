# TrainingHub — agent memory

## 2026-07-28 — Equipos modal + PDF reducido

Branch: `cursor/sesion-equipos-modal-ae84`

### Done
- `FormacionEquiposDialog`: modal grande con pool convocatoria (izquierda) + cuadrantes de equipos (derecha), drag&drop, orden por posición, auto-generar / draft vacío, sync persistente `formacion_equipos`
- Botón Users en tarea abre el modal (ya no panel inline)
- PDF reducido: al lado de cada pizarra muestra equipos con color, título y dorsales/nombres

### Notes
- Datos siguen en `sesion_tareas.formacion_equipos` (sin posiciones XY; orden por `posicion_principal`)
- Disponibles = asistencia presente con tipo `sesion`
