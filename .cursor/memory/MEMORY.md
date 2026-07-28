# TrainingHub — agent memory

## 2026-07-28 — PDF “todo igual” root cause

**Deploy was real:** Render BE+FE live on `a1ce06c` (PR #201).

**Why user saw no change:** most UI entry points called `variant=extendido` (old multi-page PDF). Only Cierre → “PDF reducido” used the redesigned A4 landscape template.

Fixed on branch `cursor/pdf-listado-reducido-ae84`:
- Listado menu: PDF reducido + PDF extendido
- Session header / operativa buttons → reducido
- API client default → reducido; extendido filename gets `_extendido` suffix

### Caveat still true
- Board photo needs `grafico_data.preview` (open tarea once in library/editor). Without it PDF falls back to Python SVG.
