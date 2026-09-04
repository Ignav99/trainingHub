# TrainingHub — estado actual

## En curso
Fix volcado anotador → informe (`cursor/anotador-volcado-4e77`).
Causa: upsert de `estadisticas_partido` fallaba por `stats_periodos` (PGRST204) y abortaba minutos/tarjetas; el informe leía convocatorias vacías y mostraba una 2ª tabla desde `notas_pre`.

## Hecho (código, pendiente merge/deploy)
- Persistencia vuelca siempre minutos, tarjetas, faltas y stats (también en autosave).
- Cerrar/cambiar parte persiste el snapshot sellado (45′ si el reloj no corrió).
- Informe: una sola tabla; hidrata desde `notas_pre.anotador`.
- Backend reintenta upsert sin columnas opcionales (PGRST204/42703).

SQL opcional: `backend/database/migrations/079_stats_periodos.sql` (no crea tablas nuevas).
