# TrainingHub — Memory

## Last updated
2026-08-19 — Layout medio de ficha de tarea + variantes visibles en sesión

## Recent work
- Branch `cursor/sesion-tarea-layout-variantes-ae84`:
  - Ficha de sesión: pizarra **media** a la izquierda (anima si hay frames; si no, estática). A la derecha: desarrollo, variantes/reglas y resumen de equipos. El diálogo de hacer equipos no cambia.
  - Bug de variantes: el creador guarda `reglas` (texto) y a veces solo existía `variantes` JSONB. El editor leía solo `tarea.reglas`. Ahora se hidrata al leer y se dual-escribe `reglas` ↔ `variantes` al crear/editar (`tarea_narrative.py` / `tareaNarrative.ts`).
- Branch `cursor/partido-condicionado-sesion-ae84` (merged):
  - Partido 11 vs 11 (PCO) es un **bloque de sesión**, no una tarea. SSG/reducidos siguen siendo tareas.
  - Editor de sesión: ficha de tarea compacta (luego se suavizó el tamaño de pizarra en el branch de layout).

## Deploy chain
cursor/* PR → CI → auto-merge main → Deploy → Render
