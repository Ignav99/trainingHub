# AGENTS.md

## Cursor Cloud specific instructions

This repo is **Kabin-e** (aka "TrainingHub Pro"), a football training-management app:

| Service | Path | Dev command | Port |
|---------|------|-------------|------|
| Backend API | `backend/` | `uvicorn app.main:app --reload` (in venv) | 8000 |
| Frontend | `frontend/` | `npm run dev` | 3000 |
| Database/Auth/Storage | local Supabase (Docker) | see below | 54321 (API), 54322 (Postgres), 54323 (Studio) |

Standard setup/run steps are in `README.md`, `SETUP.md`, and `OPERATIONS.md`. The
notes below only capture the **non-obvious** things needed to run this in Cursor Cloud.

### Dependencies / versions
- Python: the repo pins `3.11.9`, but the VM ships **Python 3.12** and all deps
  install and tests pass on it. The backend venv lives at `backend/venv`.
- The update script installs deps: `backend/venv` (pip) + `frontend/node_modules` (npm).
  It does NOT start services — do that per the steps below.
- System tooling already present in the VM image (installed during setup, not by the
  update script): Docker, the Supabase CLI at `/opt/supabase`, and `psql`.

### Running the app end-to-end (each session)
1. Start the Docker daemon (needs root, uses fuse-overlayfs + iptables-legacy):
   `sudo dockerd > /tmp/dockerd.log 2>&1 &`  (skip if `sudo docker info` already works).
2. Bring up Supabase **with the full schema**: `bash scripts/start_local_supabase.sh`.
   - GOTCHA: a plain `sudo supabase start` **fails** — the files in
     `supabase/migrations/` are incremental and reference tables created by
     `database/schema.sql` (error: `relation "sesiones" does not exist`). The wrapper
     script moves those migrations aside during start, then applies the full schema.
   - The schema is NOT managed by Supabase migrations. `scripts/setup_local_db.sh`
     applies `database/schema.sql` + `database/migrations/*` + `backend/database/migrations/*`
     + `supabase/migrations/*` + `database/PENDING_MIGRATIONS.sql` in order. It prints
     **~38 ERROR lines that are expected/harmless** (duplicate objects, ordering of a few
     unrelated tables like `entrenamientos_margen`/`registros_medicos`, and test-data seeding).
   - The script also `GRANT`s privileges to `anon`/`authenticated`/`service_role`. This is
     required: tables created directly via `psql` do NOT get Supabase's automatic grants, and
     without it the API returns `permission denied for table organizaciones`.
3. Get keys: `sudo supabase status -o env`. Use the **legacy JWT** `ANON_KEY` /
   `SERVICE_ROLE_KEY` (long `eyJ...` values) — NOT the `sb_publishable_*` / `sb_secret_*`
   keys, which the Python/JS Supabase clients here don't use. These JWTs are stable across
   restarts (derived from the fixed local `JWT_SECRET`).
4. Env files (gitignored, already created during setup): `backend/.env` and
   `frontend/.env.local` point at `http://127.0.0.1:54321` with those legacy keys and
   `NEXT_PUBLIC_API_URL=http://localhost:8000/v1`.
5. Start backend then frontend (see table). The browser calls Supabase Auth directly at
   `127.0.0.1:54321` and the backend for registration/data.

### Testing / lint / build
- Backend tests: `cd backend && pytest tests/` — 208 tests, **no DB required** (Supabase is
  mocked; `tests/conftest.py` sets the required env vars). This is the backend CI gate.
- Frontend type-check: `cd frontend && npx tsc --noEmit` (passes). This is part of the CI gate.
- Frontend `npm run lint` / `npx next lint` currently **fails**: ESLint (`eslint` /
  `eslint-config-next`) is not declared in `frontend/package.json`, so it isn't installed by
  `npm install`/`npm ci`. Rely on `tsc --noEmit` unless those deps get added.
- Frontend prod build: `npm run build` works (needs `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_ANON_KEY` env; placeholders are fine for build).
- `black`/`isort` are installed but the existing code isn't fully formatted to them and CI
  does not gate on them.

### Known pre-existing app quirks (NOT environment issues)
- After register/login the app redirects to `/onboarding`, which errors with
  "Failed to fetch": the frontend calls `POST /onboarding/completar` and
  `/onboarding/paso/{paso}` but the backend exposes `/onboarding/completar-paso/{paso}`
  (route mismatch). Core features work — navigate directly (e.g. `/tareas`) to use the app.
- `email-validator` rejects reserved TLDs like `.local`; use e.g. `@example.com` for test users.
- A convenience test account is created during setup: `coach@example.com` / `DemoPass123`
  (recreate it via `POST /v1/auth/register` after a DB reset, since `supabase stop --no-backup`
  wipes data).
