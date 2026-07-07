# TrainingHub Pro - Rediseño Total - Estado de sesión

## Rama activa
`cursor/redisenio-traininghub-ae84` (creada y empujada a origin).

## PR abierto
https://github.com/ignav99/traininghub/pull/113 (draft, FASES 1-3).

## FASE 1: Fundación — Microciclo como centro (100%)

- Tipos y API de microciclo actualizados con `rival_id` y `game_model_id`.
- Creación de microciclos desde `/microciclos`.
- Edición en detalle con rival y modelo de juego.
- Recomendador AI conectado en `/sesiones/nueva?mode=assisted`.

## FASE 2: Inteligencia del rival (100%)

- Editor de informe enriquecido integrado en `/rivales/[id]`.
- Bug comparativa corregido.
- Rutas desambiguadas a `/informes-enriquecidos`.
- PUT/DELETE consolidados.

## FASE 3: Plan de partido (100%)

- Cliente API `planPartido.ts`.
- Editor `PlanPartidoEditor` en War Room.
- 11 inicial, fases, momentos, escenarios.

## FASE 4: Diseñador de sesiones (en progreso)

### Pendiente
- Mejorar recomendador para recibir `plan_partido_id` y contextualizar desde el plan.
- Vinculación automática sesión ↔ fase del plan (campo en `sesiones` o `sesion_tareas`).
- Wizard de diseño desde el microciclo/plan.

## FASE 5: Alertas + dashboard (pendiente)

- Dashboard global de alertas.
- Endpoint `/alertas/detectar` conectado en frontend.
- Acciones de resolución.

## FASE 6: Colaboración + video (pendiente)

- Cliente WebSocket en frontend.
- Edición simultánea del plan de partido.
- Player con clips vinculados a fases.
