# TrainingHub — agent memory

## Branch: `cursor/microciclos-tareas-ux-ae84` (2026-07-27)

### Latest — desarrollo / reglas / madre→variantes
- Contenido: **desarrollo** + **reglas** + **anotaciones** (opcional) en creador y `/tareas/nueva`
- Familia: `tarea_origen_id` + `tipo_variante`; API `POST/GET /tareas/{id}/variantes`
- Biblioteca: filtro «Solo tareas madre»; acción «Crear variante»
- Migración **067**

### Prev
- ABP picker grande (#191)
- Margen/porteros/subfases (#190)
- SIATE / desplegables (#189)

### Key files
- `backend/database/migrations/067_tareas_desarrollo_variantes.sql`
- `frontend/src/components/tareas/TareaCreatorFullscreen.tsx`
- `backend/app/api/v1/tareas.py` (crear_variante)
