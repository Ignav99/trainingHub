# TrainingHub — agent memory

## Branch: `cursor/fix-tareas-solo-madres-ae84` (2026-07-27)

### Root cause (prod 500 en `/tareas?solo_madres=true`)
- La mig **067 no está aplicada** (o PostgREST no la ve) en la DB de `traininghub-api-eu`.
- Los `tarea_origen_id: null` del JSON eran **defaults Pydantic**, no prueba de columna.
- Prueba: `?busqueda=fut` también 500 (usa `desarrollo`/`reglas` en el `or_`).
- `tipo_variante` sigue `null` en todas las tareas → el backfill de 067 no corrió.

### Fix en este PR
- **Nunca** usar PostgREST `.is_(tarea_origen_id)` en listado; filtrar madres en Python.
- Búsqueda solo sobre `titulo`/`descripcion` (legacy) para no 500 sin mig.
- Soft-skip filas inválidas; create reintenta sin cols 067; variantes → 503 claro.
- TS: quitar `soloMadres` roto en `TaskPickerDialog`.
- FE default `soloMadres=false`.
- CORS en 500 incluye orígenes Render conocidos.

### SQL verificación (Supabase SQL editor del proyecto correcto)
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tareas'
  AND column_name IN ('desarrollo','reglas','anotaciones','tarea_origen_id','tipo_variante');
NOTIFY pgrst, 'reload schema';
```

### Prod URLs
- API: https://traininghub-api-eu.onrender.com
- FE: https://traininghub-frontend-eu.onrender.com
