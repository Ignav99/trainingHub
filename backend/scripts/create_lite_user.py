#!/usr/bin/env python3
"""
TrainingHub Pro - Create a "lite" user (pizarra táctica + herramienta de vídeo).

Lite users log in with username + password (no real email) and never see a
team or club, but the data model and the permission system need one: boards,
videos and clips hang off `equipo_id`, and permissions come from
`usuarios_equipos`. So each lite user gets a hidden workspace:

    organizaciones (config.onboarding_complete=true)
      └─ equipos
      └─ suscripciones  (plan 'lite', estado 'active')
    usuarios (rol entrenador_principal, username, internal email)
      └─ usuarios_equipos (entrenador_principal)

Run (from backend/, with backend/.env pointing at the DEV project):
    python scripts/create_lite_user.py --username coach1 --password 'xxxxxx' --nombre "Coach 1"
    python scripts/create_lite_user.py --username coach1 --password 'xxxxxx' --dry-run

Requires the 'lite' plan row: supabase/dev_setup/04_seed_plan_lite.sql.
"""

import argparse
import os
import sys
from datetime import datetime, timezone

# Make `app.*` importable and load backend/.env
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from supabase import create_client  # noqa: E402

from app.services.username_auth_service import build_internal_email  # noqa: E402

PLAN_CODIGO = "lite"
ROL_USUARIO = "entrenador_principal"
ROL_EQUIPO = "entrenador_principal"


def fail(msg: str, code: int = 1):
    print(f"ERROR: {msg}")
    sys.exit(code)


def get_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        fail("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar en backend/.env")
    return create_client(url, key)


def rollback(supabase, created: dict, user_id: str | None):
    """Delete whatever was created, in reverse FK order."""
    print("Deshaciendo cambios parciales...")
    steps = [
        ("suscripciones", "organizacion_id", created.get("org_id")),
        ("historial_suscripciones", "organizacion_id", created.get("org_id")),
        ("usuarios_equipos", "usuario_id", user_id),
        ("equipos", "id", created.get("equipo_id")),
        ("usuarios", "id", user_id),
        ("organizaciones", "id", created.get("org_id")),
    ]
    for table, col, value in steps:
        if not value:
            continue
        try:
            supabase.table(table).delete().eq(col, value).execute()
        except Exception as exc:  # keep going, report at the end
            print(f"  no se pudo borrar {table} ({col}={value}): {exc}")
    if user_id:
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception as exc:
            print(f"  no se pudo borrar el usuario de Auth {user_id}: {exc}")


def main():
    parser = argparse.ArgumentParser(description="Crea un usuario lite con su workspace oculto")
    parser.add_argument("--username", required=True, help="nombre de usuario para el login (sin espacios)")
    parser.add_argument("--password", required=True, help="contraseña (mínimo 6 caracteres)")
    parser.add_argument("--nombre", help="nombre visible (por defecto, el username)")
    parser.add_argument("--dry-run", action="store_true", help="comprueba y muestra lo que se crearía, sin escribir")
    args = parser.parse_args()

    username = args.username.strip().lower()
    if not username or " " in username or "@" in username:
        fail("--username no puede estar vacío ni contener espacios o '@'")
    if len(args.password) < 6:
        fail("--password debe tener al menos 6 caracteres")
    nombre = (args.nombre or username).strip()
    internal_email = build_internal_email(username)

    supabase = get_client()

    # 1. plan
    plan = supabase.table("planes").select("id, codigo").eq("codigo", PLAN_CODIGO).maybe_single().execute()
    if not plan or not plan.data:
        fail(f"no existe el plan '{PLAN_CODIGO}'. Ejecuta supabase/dev_setup/04_seed_plan_lite.sql primero.")
    plan_id = plan.data["id"]

    # 2. idempotency
    existing = supabase.table("usuarios").select("id").eq("username", username).maybe_single().execute()
    if existing and existing.data:
        fail(f"el usuario '{username}' ya existe (id {existing.data['id']}). No se ha creado nada.")

    now = datetime.now(timezone.utc)
    org_nombre = f"Lite · {username}"
    equipo_nombre = f"Equipo {username}"

    if args.dry_run:
        print("DRY RUN - se crearía:")
        print(f"  auth.users        email={internal_email} (confirmado)")
        print(f"  organizaciones    nombre='{org_nombre}' config.onboarding_complete=true")
        print(f"  usuarios          username={username} nombre='{nombre}' rol={ROL_USUARIO}")
        print(f"  equipos           nombre='{equipo_nombre}'")
        print(f"  usuarios_equipos  rol_en_equipo={ROL_EQUIPO}")
        print(f"  suscripciones     plan={PLAN_CODIGO} estado=active")
        return

    # 3. auth user
    try:
        auth_res = supabase.auth.admin.create_user({
            "email": internal_email,
            "password": args.password,
            "email_confirm": True,
        })
    except Exception as exc:
        if "already" in str(exc).lower():
            fail(
                f"ya existe un usuario de Auth con el email {internal_email} pero sin fila en 'usuarios' "
                "(probablemente una ejecución anterior fallida). Bórralo en Authentication → Users y repite."
            )
        fail(f"no se pudo crear el usuario de Auth: {exc}")
    user_id = auth_res.user.id if auth_res and auth_res.user else None
    if not user_id:
        fail("Supabase no devolvió el usuario creado")

    created: dict = {}
    try:
        # 4. organización (workspace oculto)
        org = supabase.table("organizaciones").insert({
            "nombre": org_nombre,
            "tipo_licencia": "equipo",
            "owner_id": user_id,
            "config": {"onboarding_complete": True, "lite": True},
        }).execute()
        created["org_id"] = org.data[0]["id"]

        # 5. usuarios (misma forma que auth.py /register y username_auth_service)
        supabase.table("usuarios").insert({
            "id": user_id,
            "email": internal_email,
            "username": username,
            "nombre": nombre,
            "rol": ROL_USUARIO,
            "organizacion_id": created["org_id"],
            "activo": True,
            "gdpr_consentimiento": True,
            "gdpr_consentimiento_fecha": now.isoformat(),
            "ultimo_acceso": now.isoformat(),
        }).execute()

        # 6. equipo
        equipo = supabase.table("equipos").insert({
            "nombre": equipo_nombre,
            "organizacion_id": created["org_id"],
        }).execute()
        created["equipo_id"] = equipo.data[0]["id"]

        # 7. membresía (de aquí salen los permisos)
        supabase.table("usuarios_equipos").insert({
            "usuario_id": user_id,
            "equipo_id": created["equipo_id"],
            "rol_en_equipo": ROL_EQUIPO,
        }).execute()

        # 8. suscripción activa al plan lite. No usamos create_trial_subscription:
        # con dias_prueba=0 el trial caducaría al instante y acabaría 'cancelled'.
        supabase.table("suscripciones").insert({
            "organizacion_id": created["org_id"],
            "plan_id": plan_id,
            "estado": "active",
            "ciclo": "mensual",
            "fecha_inicio": now.isoformat(),
            "uso_equipos": 1,
            "uso_ai_calls_reset_at": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat(),
        }).execute()
        supabase.table("historial_suscripciones").insert({
            "organizacion_id": created["org_id"],
            "plan_nuevo_id": plan_id,
            "accion": "created",
            "motivo": "Usuario lite (create_lite_user.py)",
        }).execute()
    except Exception as exc:
        print(f"ERROR creando el workspace: {exc}")
        rollback(supabase, created, user_id)
        sys.exit(1)

    print("Usuario lite creado")
    print(f"  username   : {username}")
    print(f"  email int. : {internal_email}")
    print(f"  user_id    : {user_id}")
    print(f"  org_id     : {created['org_id']}")
    print(f"  equipo_id  : {created['equipo_id']}")


if __name__ == "__main__":
    main()
