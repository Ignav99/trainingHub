# TrainingHub Pro — Memory

## Last updated: 2026-08-19

## Current: ficha de tarea unificada
Los puntos del creador («Crea tu ejercicio») son los que se ven y se editan en:
- sesión (`SesionTareaPanel` + `TareaFichaBody`)
- biblioteca (`TareaFichaView` / `TareaCreatorFullscreen` en ver, editar y nueva)

Mapeo: `frontend/src/lib/tareaFicha.ts` (`tareaToCreatorData`, `payloadFromCreatorForm`).

## Active: Pizarra táctica pro (tareas)

Referencia visual: `docs/mejoras/` (capturas de Alonbalon).

### Escala y métricas
`ABPPitch` trabaja a **10 unidades SVG = 1 metro**.
`frontend/src/lib/tacticalMetrics.ts` es la única fuente de verdad.

## Deploy
cursor/* PR → CI → auto-merge main → Deploy → Render
