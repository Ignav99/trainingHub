# TrainingHub Pro — Memory

## Last updated: 2026-07-23

## Active: Pizarra táctica pro (tareas)

Referencia visual: `docs/mejoras/` (capturas de Alonbalon). De ahí salen 3 patrones
que estamos replicando: tarjetas de biblioteca con la pizarra como hero + badge ▶
cuando la tarea tiene animación, modal de tarea con imagen + vídeo, y "Espacio de
juego 35x20m" impreso por tarea en el PDF de sesión.

### Escala y métricas
`ABPPitch` trabaja a **10 unidades SVG = 1 metro** (verificable: área grande = 403 u = 40,32 m).
`frontend/src/lib/tacticalMetrics.ts` es la única fuente de verdad: `zoneGeometry()`
(lados, m², forma) y `classifySpace()` (5 bandas de m²/jugador → densidad, tipo de
esfuerzo, categorías sugeridas, FC). `summaryToTareaPatch()` vuelca eso sobre la tarea.

### Una sola pizarra
`tactical-board/` es la buena y ahora se usa también dentro de las tareas vía
`TareaPizarraEditor` (modo `embedded`). `tarea-editor/TareaGraphicEditor` queda como
legacy sin uso en las rutas de tarea.

### Formato en `tareas.grafico_data` (sin migración)
`{ elements, arrows, zones, pitchType, tipo: 'static'|'animated', frames? }`.
Retrocompatible: los diagramas antiguos solo traen los tres primeros. `GET /tareas`
hace `select("*")`, así que la biblioteca ya recibe `frames` y anima en bucle.

### Piezas compartidas (no duplicar render)
`BoardSymbols.tsx` (símbolos), `BoardArrow.tsx` + `arrowPaths.ts` (8 movimientos),
`interpolate.ts` (interpolación de keyframes, la usan `AnimationPlayer` y
`TacticalBoardMini`).

### Pendiente / siguiente
- Validación visual la hace el usuario en Render tras el deploy.
- Siguiente bloque de la página de sesiones: estructura de tareas (más allá de la pizarra).

## Catálogo variables sesiones/tareas

Ver `.cursor/memory/catalogo-variables-canonico.md`. Botón Nueva sesión con IA eliminado.
