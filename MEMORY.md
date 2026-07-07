# TrainingHub Pro - Rediseño Total - Estado de sesión

## Rama activa
`cursor/redisenio-traininghub-ae84` (creada y empujada a origin).

## FASE 1: Fundación — Microciclo como centro (en progreso)

### Cambios realizados
- `frontend/src/types/index.ts`: añadidos `rival_id`, `game_model_id`, `rivales` y `game_models` a la interfaz `Microciclo`.
- `frontend/src/lib/api/microciclos.ts`: `CreateMicrocicloData` ahora acepta `rival_id` y `game_model_id`.
- `frontend/src/app/(dashboard)/microciclos/page.tsx`: 
  - Botón cambiado a "Nuevo microciclo" con diálogo de creación.
  - Formulario incluye fechas, partido, rival, modelo de juego y objetivo principal.
  - Auto-link de sesiones y partido tras crear.
- `frontend/src/app/(dashboard)/microciclos/[id]/page.tsx`:
  - Diálogo de edición ahora incluye selectores de rival y modelo de juego.
  - Header muestra chips de rival y modelo de juego cuando están vinculados.

### Pendiente en FASE 1
- Conectar `recomendadorApi` en el wizard de `/sesiones/nueva?mode=assisted`.
- Revisar/crear migración SQL para `sesiones.dia_numero` y `sesiones.orden` si no existe.
- Validar que el DnD persista correctamente la fecha al cambiar de día.

### Siguientes fases (pendientes)
- FASE 2: Inteligencia del rival (editor informe enriquecido, bug comparativa, rutas /informes).
- FASE 3: Plan de partido (cliente API, editor completo).
- FASE 4: Diseñador de sesiones.
- FASE 5: Alertas + dashboard.
- FASE 6: Colaboración + video.
