# TrainingHub — agent memory

## Current focus
Rediseño completo Sesiones (Definir → Diseño → Cierre) en branch `cursor/sesiones-redisenio-completo-ae84`.

## Done this session
- Migration **063** (`backend/database/migrations/063_sesiones_taxonomia_completa.sql`) — taxonomía, keywords, carga, share_token
- Backend: keywords/carga/taxonomy services; filtros listado; recalc carga on task mutations; `cerrar-planificacion`, `completar-vencidas`, share token, PDF `variant=reducido|extendido`
- FE: wizard 3 pasos en `[id]/page.tsx`; `SesionDefinirForm`, `SesionMaterialPanel`, `SesionCierrePanel` v2; filtros biblioteca; share page `/share/sesiones/[token]`; `nueva` alineada a Definir

## User action required
Aplicar SQL **063** en Supabase SQL Editor (manual).

## Next
- E2E manual tras migración
- Soft-polish: lista libre de tareas sin fases activacion/desarrollo rígidas (v1 aún usa fases internas DB-compat)
- Cron Render opcional llamando `POST /sesiones/completar-vencidas`
