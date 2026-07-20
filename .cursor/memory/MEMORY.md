# TrainingHub — Agent Memory

## Last updated: 2026-07-20

## Active: Sesión abre en Convocatoria (antes de Diseño)

Orden fases: Contexto → Convocatoria → Diseño → Campo → Cierre.
Default phase = convocatoria.

## Prev: Fix API downtime (Render health check)

Root cause: Render `healthCheckPath=/health` ran a Supabase query; timeouts (~5s)
at ~12:00/20:00 UTC caused `server_failed` and took the API down.

Mitigations:
1. Live: healthCheckPath switched to `/` via Render API (immediate)
2. Code: `/health` = liveness only; deep checks moved to `/ready`
3. Auto-merge: only deploy when merge actually happens; serialize + poll health

Branch: `cursor/fix-api-healthcheck-ae84`
