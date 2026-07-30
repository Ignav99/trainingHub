"""
TrainingHub Pro - Username-based accounts
Superadmin, administrador_club and coordinador_club accounts log in with a
plain username + password — they are not tied to a real, deliverable email.
Supabase Auth requires an email-shaped identifier for password auth, so we
generate an internal synthetic one (never sent anywhere, never receives mail)
and store the human-facing username separately on `usuarios.username`.

Team staff (entrenador_principal, fisio, etc.) keep using real emails via the
existing invitation flow — this module is NOT used for them.
"""

from typing import Optional

from fastapi import HTTPException, status
from supabase import create_client

from app.config import get_settings
from app.database import get_supabase

INTERNAL_EMAIL_DOMAIN = "users.traininghub.internal"


def build_internal_email(username: str) -> str:
    return f"{username.strip().lower()}@{INTERNAL_EMAIL_DOMAIN}"


def is_internal_email(email: str) -> bool:
    return email.lower().endswith(f"@{INTERNAL_EMAIL_DOMAIN}")


def resolve_login_identifier(identifier: str) -> str:
    """Given whatever the login form submitted (a username or a real email),
    return the email string to use with Supabase Auth's sign_in_with_password.
    """
    if "@" in identifier:
        return identifier

    supabase = get_supabase()
    result = (
        supabase.table("usuarios")
        .select("email")
        .eq("username", identifier.strip().lower())
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        # Don't reveal whether the username exists — same 401 the caller
        # would get from Supabase Auth for a wrong password.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
    return result.data["email"]


def create_username_account(
    username: str,
    password: str,
    nombre: str,
    rol: str,
    organizacion_id: Optional[str] = None,
    apellidos: Optional[str] = None,
) -> dict:
    """Creates a Supabase Auth user + `usuarios` row for a username-only
    account (no real email). Returns the inserted `usuarios` row.
    """
    username = username.strip().lower()
    supabase = get_supabase()

    existing = (
        supabase.table("usuarios")
        .select("id")
        .eq("username", username)
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese usuario ya existe")

    settings = get_settings()
    auth_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    internal_email = build_internal_email(username)

    try:
        auth_response = auth_client.auth.sign_up({
            "email": internal_email,
            "password": password,
        })
        if not auth_response.user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear la cuenta")
    except HTTPException:
        raise
    except Exception as e:
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese usuario ya existe")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al crear la cuenta: {e}")

    user_id = auth_response.user.id

    usuario_db = supabase.table("usuarios").insert({
        "id": user_id,
        "email": internal_email,
        "username": username,
        "nombre": nombre,
        "apellidos": apellidos,
        "rol": rol,
        "organizacion_id": organizacion_id,
        "activo": True,
    }).execute()

    if not usuario_db.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al guardar el usuario")

    return usuario_db.data[0]


def update_username_account(
    user_id: str,
    username: Optional[str] = None,
    password: Optional[str] = None,
    nombre: Optional[str] = None,
) -> dict:
    """Updates a username-only account's login (username/password) and/or
    display name. Returns the updated `usuarios` row.
    """
    supabase = get_supabase()

    current = supabase.table("usuarios").select("*").eq("id", user_id).maybe_single().execute()
    if not current or not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    settings = get_settings()
    auth_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    updates_usuarios: dict = {}
    auth_updates: dict = {}

    if username:
        new_username = username.strip().lower()
        if new_username != current.data.get("username"):
            existing = (
                supabase.table("usuarios")
                .select("id")
                .eq("username", new_username)
                .neq("id", user_id)
                .maybe_single()
                .execute()
            )
            if existing and existing.data:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese usuario ya existe")
            new_email = build_internal_email(new_username)
            updates_usuarios["username"] = new_username
            updates_usuarios["email"] = new_email
            auth_updates["email"] = new_email

    if password:
        auth_updates["password"] = password

    if nombre:
        updates_usuarios["nombre"] = nombre

    if auth_updates:
        auth_client.auth.admin.update_user_by_id(user_id, auth_updates)

    if updates_usuarios:
        supabase.table("usuarios").update(updates_usuarios).eq("id", user_id).execute()

    result = supabase.table("usuarios").select("*").eq("id", user_id).single().execute()
    return result.data
