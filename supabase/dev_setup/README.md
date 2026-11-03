# Dev database setup (NOT migrations)

These files rebuild the production schema on an empty DEV Supabase project.
They are not part of `supabase/migrations/` and must never be applied to production.

Source: `supabase db dump --schema public` of production on 2026-10-02 (schema only, no rows).

Run in the DEV project's SQL editor, in order:

1. `00_extensions.sql`
2. `01_schema.sql`  (production schema minus the unrelated `propval_listings` table;
   split into `01_schema_part1..4.sql` for the SQL editor)
3. `02_rls_fixes.sql`
4. `03_seed_planes.sql`  (plan catalogue; registration needs `free_trial`)
5. `04_seed_plan_lite.sql`  (plan for the lite edition; needed by `backend/scripts/create_lite_user.py`)
6. `05_fix_videos_partido_tipo.sql`  (allow `tipo='local_session'`, used by the video tool)

Not covered by these files (do by hand in the dashboard):

- Storage buckets: `player-photos`, `revision-clips`
- Auth settings (email confirmation, redirect URLs, templates)
- Seed data: lookup tables are empty (`planes`, `categorias_tarea`, `posiciones`)
- `background_tasks` and `posiciones` exist in the migrations but not in the production
  dump; `hybrid_search_tareas` is also absent from production.
