# TrainingHub — Memory

## Last updated
2026-08-18 — Partido condicionado como bloque de sesión + fichas de tarea compactas

## Recent work
- Branch `cursor/partido-condicionado-sesion-ae84`:
  - Partido 11 vs 11 (PCO) es un **bloque de sesión**, no una tarea. SSG/reducidos siguen siendo tareas.
  - `Añadir bloque → Partido condicionado`: alineaciones con/sin peto, fuera, objetivo, normas, carga PCO, pizarra y ABP del partido.
  - Persistido en `estructura_fases[].partido` (sin columna nueva).
  - `aggregate_sesion_carga` suma minutos/carga de bloques PCO.
  - Editor de sesión: ficha de tarea compacta = creador (volumen + desarrollo | variantes/reglas). El resto en desplegable. Sin reglas técnicas/tácticas legacy en la vista principal.

## Deploy chain
cursor/* PR → CI → auto-merge main → Deploy → Render
