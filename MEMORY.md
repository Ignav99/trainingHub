# TrainingHub Pro - Rediseño Total - Estado de sesión

## Rama activa
`cursor/redisenio-traininghub-ae84` (creada y empujada a origin).

## PR abierto
https://github.com/ignav99/traininghub/pull/113 (draft, FASES 1-2).

## FASE 1: Fundación — Microciclo como centro (100%)

- Tipos y API de microciclo actualizados con `rival_id` y `game_model_id`.
- Creación de microciclos desde `/microciclos`.
- Edición en detalle con rival y modelo de juego.
- Recomendador AI conectado en `/sesiones/nueva?mode=assisted`.

## FASE 2: Inteligencia del rival (100%)

- Componente `InformeRivalEnriquecidoEditor` creado e integrado en `/rivales/[id]` (tab Informes → sub-tab "Informe enriquecido").
- Bug de comparativa corregido (endpoint `/game-models?equipo_id=`).
- Rutas de informes enriquecidos movidas a `/rivales/{id}/informes-enriquecidos` para evitar conflicto con informes AI.
- PUT/DELETE consolidados en `backend/app/api/v1/rival_informes.py`; archivo duplicado eliminado.

## FASE 3: Plan de partido (en progreso)

### Pendiente
- Crear cliente API dedicado (`frontend/src/lib/api/planPartido.ts`).
- Construir editor completo de plan de partido (11 inicial, fases, emparejamientos, momentos, escenarios).
- Integrar editor en `/microciclos/[id]` (tab Plan de Partido) y/o `/partidos/[id]/plan`.
- Vincular clips de video a fases del plan.

### Archivos clave a modificar/crear
- `backend/app/api/v1/plan_partido.py` (ya existe, robusto).
- `frontend/src/lib/api/planPartido.ts` (nuevo).
- `frontend/src/components/plan-partido/PlanPartidoEditor.tsx` (nuevo).
- `frontend/src/app/(dashboard)/microciclos/[id]/page.tsx` (tab Plan de Partido).

## Fases posteriores (pendientes)
- FASE 4: Diseñador de sesiones (vinculación automática sesión ↔ fase del plan).
- FASE 5: Alertas + dashboard.
- FASE 6: Colaboración + video.
