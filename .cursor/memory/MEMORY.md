# TrainingHub — agent memory

## Branch: `cursor/microciclos-tareas-ux-ae84` (2026-07-27)

### Latest — subfases + margen + porteros
- **Subfases** al elegir ataque/defensa organizada (`FaseSubfasePicker`) en creador, nueva, editar. Persistencia: `principio_tactico` / `subprincipio_tactico`.
- **Convocatoria**: pestañas Asistencia | Trabajo al margen → `MargenPanel` con TaskPicker + TareaCreator (`variant=margen`, cat TAM).
- **Porteros**: `GKTrainingSection` usa TaskPickerDialog + creator POR (misma calidad biblioteca).
- Catálogo: TAM, POR, GYM, PRV, MOV, RCF + helpers `CATEGORIAS_CAMPO|MARGEN|PORTERO`.
- Migración **066** TAM/POR sync.

### Prev
- PR #189: desplegables, EVO, SIATE, carga pizarra
- PR #188: tipología, scroll, objetivos, auto-carga

### Key files
- `frontend/src/components/tareas/FaseSubfasePicker.tsx`
- `frontend/src/components/margen/MargenPanel.tsx`
- `frontend/src/components/portero/GKTrainingSection.tsx`
- `frontend/src/lib/catalogos/canonico.ts`
- `backend/database/migrations/066_tareas_margen_portero.sql`
