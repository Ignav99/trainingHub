# TrainingHub — agent memory

## Branch: `cursor/tareas-filtros-variantes-ae84` (2026-07-28)

### UX variantes (intuitivo)
Dónde crear / ver variantes:

1. **Biblioteca** (`/tareas`)
   - En cada card madre: botón «Tiene N variantes creadas» → ficha `?tab=variantes`
   - Botón «Crear variante» visible (no solo menú ⋯)
2. **Ficha** (`/tareas/[id]`)
   - Pestañas **Resumen | Variantes**
   - Header «Variantes (N)»
   - Teaser en resumen que lleva a la pestaña
3. **Sesión** (picker al añadir tarea)
   - «Crear variante de esta tarea» → abre `TareaCreatorFullscreen` prefilled (`initialFromMother`)
   - Editas desarrollo/reglas/tipo y se añade a la sesión

Helpers: `lib/tareaVariante.ts` (`madreToCreatorPrefill`)
