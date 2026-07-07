# TrainingHub Pro - Rediseño Total - Estado de sesión

## Rama activa
`cursor/redisenio-traininghub-ae84` (creada y empujada a origin).

## PR abierto
https://github.com/Ignav99/trainingHub/pull/113 (draft, FASE 1).

## FASE 1: Fundación — Microciclo como centro (completada al 100%)

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
- `frontend/src/app/(dashboard)/sesiones/nueva/page.tsx`:
  - Modo `?mode=assisted` ahora tiene un paso de recomendación AI intermedio.
  - Llama a `recomendadorApi.getAIRecomendaciones` y muestra sugerencias por fase.
  - Permite añadir tareas recomendadas (existentes o nuevas) a la sesión.
- `frontend/src/lib/api/sesiones.ts`: añadido `duracion_total` a `SesionCreateData`.

### Validación
- `npx tsc --noEmit` en frontend pasa sin errores.

## FASE 2: Inteligencia del rival (siguiente)

### Pendiente
- Editor UI para informe de rival enriquecido (`InformeRivalEnriquecido`).
- Corregir bug en pestaña Comparativa de `/rivales/[id]` (endpoint incorrecto `/modelo-juego/equipo/` → `/game-models?equipo_id=`).
- Desambiguar rutas `/rivales/{id}/informes` (AI vs enriquecido) o fusionar en un solo recurso.
- Registrar PUT/DELETE del informe enriquecido en el router.

## Fases posteriores (pendientes)
- FASE 3: Plan de partido (cliente API, editor completo).
- FASE 4: Diseñador de sesiones (vinculación automática sesión ↔ fase del plan).
- FASE 5: Alertas + dashboard.
- FASE 6: Colaboración + video.
