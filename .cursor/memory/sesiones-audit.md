# SESIONES Backend Audit (2026-07-17)

Thorough audit of TrainingHub SESIONES module and cross-links.

## Key files
- API: `/workspace/backend/app/api/v1/sesiones.py` (~2000 lines)
- Models: `/workspace/backend/app/models/sesion.py`, `asistencia.py`
- FE client: `/workspace/frontend/src/lib/api/sesiones.ts`
- FE detail: `/workspace/frontend/src/app/(dashboard)/sesiones/[id]/page.tsx`
- Load: `/workspace/backend/app/services/load_calculation_service.py`
- PDF: `/workspace/backend/app/services/pdf_service.py` + templates `sesion_pdf.html`, `sesion_pdf_v2.html`

## Critical gaps found
1. `SesionCreate` omits `microciclo_id` — FE sends it but Pydantic strips it; relies on DB trigger date-range auto-link
2. Nested `tareas` on create ignored/breaks INSERT (seed comment confirms)
3. No migration for `sesiones.hora` / `lugar` in repo (models + FE + seed use them)
4. Base schema `fase_sesion` CHECK only has 4 phases; enum/FE have desarrollo_3–6 — no migration expanding CHECK
5. `remove_tarea` does not recalculate `duracion_total`
6. No org-scope check on get/update/delete sesion by ID
7. Collaborative editing: WS `collab_edit` exists but only wired to PlanPartido, not sessions
8. Nutrición: no `sesion_id` link
9. `grupo_adaptado` disponibilidad maps to full `sesion` attendance (no adapted type)
10. CSV export omits microciclo_id, asistencia, carga, ABP

## Cross-module links that work
- Microciclos: FK + trigger + `/completo` + reordenar + link-sesiones
- ABP: `abp_sesion_jugadas` via `/abp/sesion/{id}`
- RPE/carga: via asistencias `tipo_participacion` → load_calculation_service
- Enfermería/margen: `entrenamientos_margen.sesion_id` + medico registros in FE
- Plantilla: jugadores + disponibilidad on asistencia join
- Portero: mounted under `/sesiones/{id}/portero-tareas`
