# TrainingHub — agent memory

## Branch: `cursor/microciclos-tareas-ux-ae84` (2026-07-27)

### Done this session
1. **Microciclos** — default filter `en_curso`; filters collapsed; “Buscar otro microciclo” / “Volver al actual”.
2. **Pretemporada día de carga** — Definir chips show `codigo — nombre`; session header shows PT-* select when pretemporada/transición.
3. **Task picker** — `TaskPickerDialog`: large modal, board+animation detail, dropdown filters (tipo, modalidad, fase, densidad, cognitivo, aspectos of/def).
4. **Biblioteca** — redesigned `/tareas`: top dropdown filters + `TaskLibraryCard` with large pizarra (no sidebar table).
5. **Taxonomía** — `CATEGORIAS_TAREA` + `MODALIDADES_TAREA` in canonico; migration **064**; backend `modalidad` filter; creator + nueva form.

### Migration for user (manual)
`backend/database/migrations/064_tareas_tipologia_modalidad.sql`
- INSERT LUD, CIR, RDP, FIN, PRT, EST, ACT
- UPDATE names RND/POS/JDP/SSG/PCO
- ADD COLUMN `tareas.modalidad` + check constraint

### Key files
- `frontend/src/app/(dashboard)/microciclos/page.tsx`
- `frontend/src/components/sesiones/SesionDefinirForm.tsx`
- `frontend/src/app/(dashboard)/sesiones/[id]/page.tsx`
- `frontend/src/components/tareas/TaskPickerDialog.tsx`
- `frontend/src/components/tareas/TaskLibraryCard.tsx`
- `frontend/src/app/(dashboard)/tareas/page.tsx`
- `frontend/src/lib/catalogos/canonico.ts`
- `backend/database/migrations/064_tareas_tipologia_modalidad.sql`
- `backend/app/models/tarea.py`, `backend/app/api/v1/tareas.py`
