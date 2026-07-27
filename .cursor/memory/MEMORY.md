# TrainingHub — agent memory

## Branch: `cursor/microciclos-tareas-ux-ae84` (2026-07-27)

### Latest (diseño tareas v2)
- **Una página + scroll** en creador y `/tareas/nueva` (no wizard por pasos).
- Tipología fija (12): LUD, CIR, RND, RDP, POS, JDP, FIN, SSG, PCO, PRT, EST, ACT.
- Metodología: analítica | global | competitiva | general (nombres de literatura).
- Objetivos tácticos / técnicos separados; orientación física: activación, fuerza, resistencia, velocidad + etiquetas PF.
- **Densidad + nivel cognitivo automáticos** vía `computeTaskLoadMetrics` / `apply_auto_load` (mismas bandas m²/jugador FE+BE). No editables en UI.
- Migraciones: **064** (modalidad+tipos), **065** (objetivos_* + orientaciones_fisicas).

### Key files
- `frontend/src/lib/catalogos/canonico.ts`
- `frontend/src/lib/tacticalMetrics.ts` (`computeTaskLoadMetrics`, `applyAutoLoadToTarea`)
- `frontend/src/components/tareas/TareaCreatorFullscreen.tsx`
- `frontend/src/app/(dashboard)/tareas/nueva/page.tsx`
- `backend/app/services/task_load_metrics.py`
- `backend/database/migrations/065_tareas_objetivos_orientacion.sql`
