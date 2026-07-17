# TrainingHub — Session Audit Memory

## Audit completed (2026-07-17)
Structured audit of SESSION create/edit workflows. No code changes.

Key findings:
- Two create paths: `/sesiones/nueva` (manual + optional `?mode=assisted` AI recommender) and `/sesiones/nueva-ai` (chat design).
- Detail page uses 5 phases: contexto | diseno | convocatoria | campo | cierre.
- Permissions: CT staff get full SESSION_*; jugador/tutor get SESSION_READ only.
- Mode=assisted exists in code but no UI link found from list page (only Manual + Nueva con IA).
