#!/usr/bin/env bash
# ============================================================================
# setup_local_db.sh - Apply the full Kabin-e schema to a LOCAL Supabase DB.
# ----------------------------------------------------------------------------
# The canonical production DB is built by running database/schema.sql followed
# by the incremental migrations in the Supabase SQL editor. There is no single
# consolidated migration, and the files in supabase/migrations/ are incremental
# (they depend on tables created by database/schema.sql), so `supabase start`
# cannot build the schema on its own.
#
# This script reproduces the full schema against the local Supabase Postgres by
# applying, in dependency order and tolerating "already exists"/ordering errors:
#   1. database/schema.sql               (core tables + seed catalogs)
#   2. database/migrations/*.sql         (public app migrations)
#   3. backend/database/migrations/*.sql (licensing, medical, RLS, etc.)
#   4. supabase/migrations/*.sql         (incremental CLI migrations)
#   5. database/PENDING_MIGRATIONS.sql   (consolidated superset)
# It then grants privileges to the anon/authenticated/service_role roles, which
# Supabase normally does automatically for tables created via its own tooling
# but does NOT do for tables created directly through psql.
#
# Prerequisites: `supabase start` is running and `psql` is installed.
# Usage: bash scripts/setup_local_db.sh
# ============================================================================
set -u

DB="${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${LOG:-/tmp/kabine_schema_apply.log}"
: > "$LOG"

apply() {
  local f="$1"
  [ -f "$f" ] || return 0
  echo "===== APPLYING: ${f#$ROOT/} =====" | tee -a "$LOG"
  psql "$DB" -v ON_ERROR_STOP=0 -f "$f" >>"$LOG" 2>&1
}

cd "$ROOT"

apply database/schema.sql
for f in $(ls database/migrations/*.sql 2>/dev/null | sort); do apply "$f"; done
for f in $(ls backend/database/migrations/*.sql 2>/dev/null | sort); do apply "$f"; done
for f in $(ls supabase/migrations/*.sql 2>/dev/null | sort); do apply "$f"; done
apply database/PENDING_MIGRATIONS.sql

echo "===== GRANTING ROLE PRIVILEGES =====" | tee -a "$LOG"
psql "$DB" -v ON_ERROR_STOP=0 >>"$LOG" 2>&1 <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
SQL

echo "===== DONE (full log: $LOG) ====="
echo "Remaining ERROR lines (ordering/duplicate errors are expected & harmless):"
grep -c 'ERROR:' "$LOG" || true
