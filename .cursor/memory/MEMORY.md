# TrainingHub — Memory

## Last updated
2026-08-18 — Sesión bloques manual + prior microciclo/tareas

## Recent work
- Branch `cursor/sesion-bloques-manual-ae84`:
  - Sesiones diseño: sin estructura por defecto; usuario añade bloques (activación, desarrollo, vuelta a la calma, videoanálisis).
  - Bloques editables (nombre, duración, notas) persistidos en `estructura_fases` JSONB.
  - `SesionBloquesPanel` component; migración 074.
  - TaskPickerDialog: CTA crear tarea cuando biblioteca vacía.
  - Wizard nueva sesión: sin 4 fases precargadas.
  - PDF respeta estructura guardada.

- Merged PR #236: microciclo en curso + pizarra manual en tareas.

## Deploy chain
cursor/* PR → CI → auto-merge main → Deploy → Render
