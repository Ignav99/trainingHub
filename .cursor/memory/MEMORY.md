# TrainingHub — agent memory

## Branch: `cursor/tareas-filtros-variantes-ae84` (2026-07-27)

### Pulido filtros + familia madre→variantes
Filtros de biblioteca/picker **solo** variables del creador canónico:
- Familia (madres / todas / variantes + tipo)
- Tipo de tarea, metodología, fase, **subfase**
- Objetivo táctico / técnico, orientación condicional
- Jugadores min/max
- **Eliminados** densidad y cognitivo (derivados de pizarra)

Componentes nuevos:
- `TareaFiltersBar.tsx` — barra compartida biblioteca + picker
- `CrearVarianteDialog.tsx` — elige tipo (progresión/regresión/…)
- `TareaFamiliaPanel.tsx` — detalle: madre, hijas, crear variante

Gestión familia:
1. Biblioteca por defecto: **solo madres** (reutilizables)
2. «Crear variante» → diálogo de tipo → copia pizarra/tipología → editar
3. Ficha detalle muestra panel familia (enlace madre / lista variantes)
4. API enriquece `num_variantes`; badge «Madre · N» en cards

Backend list: `objetivo_tactico|tecnico`, `orientacion_fisica`, `solo_variantes`, `tipo_variante` + conteo hijas.
