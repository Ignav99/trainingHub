# TrainingHub — Agent Memory

## Last updated: 2026-07-17

## Active: Sesiones rediseño (sin restricciones de rol)

Branch: `cursor/sesiones-redisenio-ae84`

### Decisiones
- Sin restricciones por rol: todos ven y editan todo (isEditable=true; sin gates de permiso en UI de fases).
- Flujo detalle: Contexto → Diseño → Convocatoria → Campo → Cierre.
- Create: Config → (IA) → Tareas → Convocatoria opcional; land en `/sesiones/{id}`.
- Migración **062** pendiente de aplicar manualmente en Supabase.

### Archivos clave
- `backend/database/migrations/062_sesiones_redisenio.sql`
- `frontend/src/components/sesiones/SesionPhaseNav.tsx`
- `frontend/src/components/sesiones/SesionCierrePanel.tsx`
- `frontend/src/app/(dashboard)/sesiones/[id]/page.tsx`
- `frontend/src/app/(dashboard)/sesiones/nueva/page.tsx`

### Next
- Usuario aplica 062 en Supabase SQL Editor.
- PR merge → Render via auto-merge.
