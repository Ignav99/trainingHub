# TrainingHub — agent memory

## Branch: `cursor/pdf-objetivo-pizarra-ae84` (2026-07-28)

### Bug objetivo PDF
- Causa: `onChange` llamaba `updateField` por cada clave → el autosave de
  `keywords` **pisaba** el pending de `objetivo_principal` (debounce 800ms).
- Fix: `useAutoSave` hace merge de pending + `flush()` antes de generar PDF;
  `updateFields(patch)` guarda todo junto.

### Pizarra PDF
- Usar coords ABP (`render_diagram_for_pdf`): half = portería abajo;
  full = rotado horizontal como el editor.
- Snapshot desde frame 0 si top-level vacío.
- Template 2×2 con SVG a ancho de celda.
