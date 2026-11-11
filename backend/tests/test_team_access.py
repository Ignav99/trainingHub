"""require_team_access: item-level team check for endpoints addressed by id."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.security import dependencies as deps
from app.security.dependencies import AuthContext, require_team_access
from app.security.permissions import Permission

TEAM_A = "11111111-1111-1111-1111-111111111111"
TEAM_B = "22222222-2222-2222-2222-222222222222"


def _auth(rol="entrenador_principal", org="org-1"):
    return AuthContext(
        user=SimpleNamespace(rol=rol),
        user_id="user-1",
        organizacion_id=org,
        equipo_id=TEAM_A,
    )


def _supabase(custom_rows=None, equipo_org=None):
    """Fake client: permisos_personalizados -> custom_rows, equipos -> equipo_org."""
    client = MagicMock()

    def table(name):
        q = MagicMock()
        q.select.return_value = q
        q.eq.return_value = q
        q.limit.return_value = q
        if name == "permisos_personalizados":
            q.execute.return_value = SimpleNamespace(data=custom_rows or [])
        elif name == "equipos":
            data = [{"organizacion_id": equipo_org}] if equipo_org else []
            q.execute.return_value = SimpleNamespace(data=data)
        else:
            q.execute.return_value = SimpleNamespace(data=[])
        return q

    client.table.side_effect = table
    return client


def _roles(mapping):
    """_team_role_rows stub: {equipo_id: rol_en_equipo}."""
    def fake(_sb, _user_id, equipo_id):
        rol = mapping.get(equipo_id)
        return SimpleNamespace(data=[{"rol_en_equipo": rol, "equipo_id": equipo_id}] if rol else [])
    return fake


def test_member_with_permission_passes():
    with patch.object(deps, "get_supabase", return_value=_supabase()), \
         patch.object(deps, "_team_role_rows", _roles({TEAM_A: "entrenador_principal"})):
        require_team_access(_auth(), TEAM_A, Permission.VIDEO_ANALISIS_DELETE)


def test_item_of_another_team_is_not_found():
    with patch.object(deps, "get_supabase", return_value=_supabase()), \
         patch.object(deps, "_team_role_rows", _roles({TEAM_A: "entrenador_principal"})):
        with pytest.raises(HTTPException) as exc:
            require_team_access(_auth(), TEAM_B, Permission.VIDEO_ANALISIS_READ, "Análisis no encontrado.")
    assert exc.value.status_code == 404
    assert exc.value.detail == "Análisis no encontrado."


def test_role_on_that_team_must_grant_the_permission():
    # Coach on team A, player on team B: may read B's board but not delete it.
    roles = _roles({TEAM_A: "entrenador_principal", TEAM_B: "jugador"})
    with patch.object(deps, "get_supabase", return_value=_supabase()), \
         patch.object(deps, "_team_role_rows", roles):
        require_team_access(_auth(), TEAM_B, Permission.TACTICAL_BOARD_READ)
        with pytest.raises(HTTPException) as exc:
            require_team_access(_auth(), TEAM_B, Permission.TACTICAL_BOARD_DELETE)
    assert exc.value.status_code == 403


def test_missing_equipo_id_is_not_found():
    with pytest.raises(HTTPException) as exc:
        require_team_access(_auth(), None, Permission.TACTICAL_BOARD_READ)
    assert exc.value.status_code == 404


def test_superadmin_bypasses():
    require_team_access(_auth(rol="superadmin_plataforma"), TEAM_B, Permission.TACTICAL_BOARD_DELETE)


def test_legacy_admin_limited_to_own_organization():
    with patch.object(deps, "get_supabase", return_value=_supabase(equipo_org="org-1")):
        require_team_access(_auth(rol="admin"), TEAM_B, Permission.TACTICAL_BOARD_DELETE)
    with patch.object(deps, "get_supabase", return_value=_supabase(equipo_org="org-2")):
        with pytest.raises(HTTPException) as exc:
            require_team_access(_auth(rol="admin"), TEAM_B, Permission.TACTICAL_BOARD_DELETE)
    assert exc.value.status_code == 404


def test_lookup_failure_is_503_not_403():
    with patch.object(deps, "get_supabase", return_value=_supabase()), \
         patch.object(deps, "_team_role_rows", lambda *_: None):
        with pytest.raises(HTTPException) as exc:
            require_team_access(_auth(), TEAM_A, Permission.TACTICAL_BOARD_READ)
    assert exc.value.status_code == 503
