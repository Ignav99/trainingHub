#!/usr/bin/env bash
# ============================================================================
# start_local_supabase.sh - Bring up local Supabase with the full schema.
# ----------------------------------------------------------------------------
# GOTCHA: `supabase start` runs the files in supabase/migrations/ against a
# fresh database. Those migrations are INCREMENTAL — they reference tables
# (sesiones, jugadores, ...) created by database/schema.sql, which the CLI does
# not apply. So a plain `supabase start` aborts with:
#     ERROR: relation "sesiones" does not exist
# To work around this we temporarily move supabase/migrations aside, start the
# stack with an empty migrations dir, restore the files, then apply the full
# schema (schema.sql + all migrations) via scripts/setup_local_db.sh, which
# runs everything in the correct dependency order.
#
# Requires: Docker daemon running + supabase CLI + psql installed.
# Most Docker/supabase commands need root here (dockerd runs as root), so this
# script uses sudo for the CLI. Run from anywhere:  bash scripts/start_local_supabase.sh
# ============================================================================
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BAK="$(mktemp -d)"
echo "Moving supabase/migrations aside so 'supabase start' does not choke..."
mv supabase/migrations/*.sql "$BAK"/ 2>/dev/null || true

echo "Starting Supabase (this pulls images on first run)..."
sudo supabase start
START_RC=$?

echo "Restoring supabase/migrations..."
mv "$BAK"/*.sql supabase/migrations/ 2>/dev/null || true
rmdir "$BAK" 2>/dev/null || true

if [ $START_RC -ne 0 ]; then
  echo "supabase start failed (rc=$START_RC)." >&2
  exit $START_RC
fi

echo "Applying full schema + role grants..."
bash "$ROOT/scripts/setup_local_db.sh"

echo ""
echo "Local Supabase is up. Fetch keys with:  sudo supabase status -o env"
