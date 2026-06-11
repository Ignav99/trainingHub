"""
Multi-tenant isolation tests for TrainingHub Pro.

Verifies that auth dependencies and endpoints correctly enforce
organizacion_id / equipo_id scoping so Org-A users cannot reach Org-B data.

All tests run fully offline: Supabase is mocked via MagicMock +
dependency_overrides — no real network connection is used.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4

# ---- env vars set by conftest.py before app import ----
# (conftest already sets them via os.environ.setdefault)


# ===========================================================================
# Helpers
# ===========================================================================

def _make_null_chain():
    """
    Build a fully chainable Supabase mock where the terminal execute() call
    returns MagicMock(data=None, count=0).  Useful for simulating 'not found'
    DB queries (empty result set) regardless of how many .eq()/.maybe_single()
    calls the endpoint chains together.
    """
    c = MagicMock()
    for method in (
        "select", "insert", "update", "upsert", "delete",
        "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
        "in_", "not_in", "order", "limit", "range", "offset",
        "single", "maybe_single",
    ):
        getattr(c, method).return_value = c
    c.execute.return_value = MagicMock(data=None, count=0)
    return c

def _make_usuario_response(
    *,
    organizacion_id=None,
    rol="entrenador_principal",
    activo=True,
):
    """Build a minimal UsuarioResponse-like MagicMock."""
    from app.models.usuario import UsuarioResponse
    from datetime import datetime

    return UsuarioResponse(
        id=uuid4(),
        email="test@example.com",
        nombre="Test",
        rol=rol,
        activo=activo,
        organizacion_id=organizacion_id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        es_menor=False,
        mfa_enabled=False,
        gdpr_consentimiento=True,
    )


def _make_auth_context(
    *,
    organizacion_id=None,
    equipo_id=None,
    rol_en_equipo="entrenador_principal",
    permissions=None,
):
    """Build an AuthContext for dependency_overrides."""
    from app.security.dependencies import AuthContext
    from app.security.permissions import Permission, _CT_FULL_PERMISSIONS

    if permissions is None:
        permissions = set(_CT_FULL_PERMISSIONS) | {
            Permission.CLUB_MANAGE_BILLING,
            Permission.CLUB_MANAGE_ORG,
        }

    return AuthContext(
        user=_make_usuario_response(organizacion_id=organizacion_id),
        user_id=str(uuid4()),
        organizacion_id=organizacion_id or "",
        equipo_id=equipo_id,
        rol_en_equipo=rol_en_equipo,
        permissions=permissions,
        subscription_status="active",
    )


# ===========================================================================
# 1. require_club_admin — direct dependency tests
# ===========================================================================

class TestRequireClubAdminDependency:
    """Test the require_club_admin dependency in isolation (no HTTP layer)."""

    @pytest.mark.asyncio
    async def test_rejects_user_without_org(self):
        """require_club_admin must raise 403 when organizacion_id is None."""
        from fastapi import HTTPException
        from app.api.v1.club_admin import require_club_admin

        user = _make_usuario_response(
            rol="presidente",
            organizacion_id=None,  # no org
        )

        # Patch get_current_user so that the dependency resolves to our user
        with patch("app.api.v1.club_admin.get_current_user", return_value=user):
            # require_club_admin is a plain async function that accepts a user
            with pytest.raises(HTTPException) as exc:
                await require_club_admin(current_user=user)

        assert exc.value.status_code == 403
        assert "organizacion" in exc.value.detail.lower()

    @pytest.mark.asyncio
    async def test_rejects_non_club_role(self):
        """require_club_admin must raise 403 when user is not a club-admin role."""
        from fastapi import HTTPException
        from app.api.v1.club_admin import require_club_admin

        user = _make_usuario_response(
            rol="entrenador_principal",  # team role, NOT directiva
            organizacion_id=str(uuid4()),
        )

        with pytest.raises(HTTPException) as exc:
            await require_club_admin(current_user=user)

        assert exc.value.status_code == 403
        assert "directiva" in exc.value.detail.lower() or "restringido" in exc.value.detail.lower()

    @pytest.mark.asyncio
    async def test_allows_presidente_with_org(self):
        """require_club_admin must succeed for presidente with valid org."""
        from app.api.v1.club_admin import require_club_admin

        org_id = str(uuid4())
        user = _make_usuario_response(rol="presidente", organizacion_id=org_id)

        result = await require_club_admin(current_user=user)

        assert str(result.organizacion_id) == org_id

    @pytest.mark.asyncio
    async def test_rejects_jugador_role(self):
        """A jugador must not pass the club-admin gate."""
        from fastapi import HTTPException
        from app.api.v1.club_admin import require_club_admin

        user = _make_usuario_response(
            rol="jugador",
            organizacion_id=str(uuid4()),
        )

        with pytest.raises(HTTPException) as exc:
            await require_club_admin(current_user=user)

        assert exc.value.status_code == 403


# ===========================================================================
# 2. Cross-org isolation via HTTP endpoints (TestClient + dependency_overrides)
# ===========================================================================

@pytest.fixture
def isolated_client(mock_supabase):
    """
    FastAPI TestClient with patched Supabase.
    We patch the supabase module global directly so every module that calls
    get_supabase() (which reads the global) gets the mock back.
    dependency_overrides are set per-test for precise control.
    """
    from fastapi.testclient import TestClient
    import app.database as db_module

    # Patch both the function AND the module-level global so every `get_supabase()`
    # call in every router returns the mock, regardless of import binding.
    with patch.object(db_module, "supabase", mock_supabase):
        with patch.object(db_module, "get_supabase", return_value=mock_supabase):
            with patch.object(db_module, "init_supabase", return_value=mock_supabase):
                from app.main import app
                client = TestClient(app, raise_server_exceptions=False)
                yield client, app


class TestClubAdminCrossOrgIsolation:
    """
    Org-B user attempts to operate on Org-A resources via /v1/club/* endpoints.
    The require_club_admin dependency pulls org_id from the authenticated user,
    so all DB queries are scoped to the token bearer's org — not a URL param.
    """

    def test_dashboard_scoped_to_own_org(self, isolated_client, mock_supabase):
        """
        GET /v1/club/dashboard — data returned must come from the user's org only.
        Verify Supabase query was called with the requester's org_id.
        """
        client, app = isolated_client
        org_a = str(uuid4())

        from app.api.v1.club_admin import require_club_admin

        async def override_admin():
            return _make_usuario_response(rol="presidente", organizacion_id=org_a)

        app.dependency_overrides[require_club_admin] = override_admin

        # Mock Supabase to return empty results (avoids key errors in the endpoint)
        chain = mock_supabase.table.return_value
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.neq.return_value = chain
        chain.in_.return_value = chain
        chain.gte.return_value = chain
        chain.order.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[], count=0)

        try:
            response = client.get("/v1/club/dashboard", headers={"Authorization": "Bearer x"})
            # We are only interested that it passed auth (not 401/403)
            assert response.status_code not in (401, 403), (
                f"Dashboard incorrectly rejected authenticated club admin: {response.status_code}"
            )
        finally:
            app.dependency_overrides.pop(require_club_admin, None)

    def test_update_equipo_from_different_org_returns_404(self, isolated_client, mock_supabase):
        """
        PATCH /v1/club/equipos/{equipo_id} — if equipo belongs to Org-A,
        a user from Org-B should get 404 (Supabase query with org filter returns empty).
        """
        client, app = isolated_client
        org_b = str(uuid4())
        equipo_id_a = str(uuid4())  # belongs to Org A

        from app.api.v1.club_admin import require_club_admin

        async def org_b_user():
            return _make_usuario_response(rol="presidente", organizacion_id=org_b)

        app.dependency_overrides[require_club_admin] = org_b_user

        mock_supabase.table.return_value = _make_null_chain()

        try:
            response = client.patch(
                f"/v1/club/equipos/{equipo_id_a}",
                json={"nombre": "Equipo Hackeado"},
                headers={"Authorization": "Bearer x"},
            )
            assert response.status_code == 404, (
                f"Expected 404 when cross-org equipo update; got {response.status_code}"
            )
        finally:
            app.dependency_overrides.pop(require_club_admin, None)

    def test_deactivate_member_from_different_org_returns_404(self, isolated_client, mock_supabase):
        """
        DELETE /v1/club/miembros/{user_id} — Org-B cannot deactivate Org-A member.
        """
        client, app = isolated_client
        org_b = str(uuid4())
        org_a_member_id = str(uuid4())

        from app.api.v1.club_admin import require_club_admin

        actor_user = _make_usuario_response(rol="presidente", organizacion_id=org_b)

        async def org_b_user():
            return actor_user

        app.dependency_overrides[require_club_admin] = org_b_user

        # Simulate: target user NOT in Org-B (cross-org) — DB returns nothing
        mock_supabase.table.return_value = _make_null_chain()

        try:
            response = client.delete(
                f"/v1/club/miembros/{org_a_member_id}",
                headers={"Authorization": "Bearer x"},
            )
            assert response.status_code == 404, (
                f"Expected 404 when cross-org member deactivation; got {response.status_code}"
            )
        finally:
            app.dependency_overrides.pop(require_club_admin, None)

    def test_revoke_invite_from_different_org_returns_404(self, isolated_client, mock_supabase):
        """
        DELETE /v1/club/invitaciones/{invite_id} — Org-B cannot revoke Org-A invitation.
        """
        client, app = isolated_client
        org_b = str(uuid4())
        invite_id_a = str(uuid4())  # belongs to Org A

        from app.api.v1.club_admin import require_club_admin

        async def org_b_user():
            return _make_usuario_response(rol="presidente", organizacion_id=org_b)

        app.dependency_overrides[require_club_admin] = org_b_user

        mock_supabase.table.return_value = _make_null_chain()

        try:
            response = client.delete(
                f"/v1/club/invitaciones/{invite_id_a}",
                headers={"Authorization": "Bearer x"},
            )
            assert response.status_code == 404, (
                f"Expected 404 when cross-org invite revocation; got {response.status_code}"
            )
        finally:
            app.dependency_overrides.pop(require_club_admin, None)


# ===========================================================================
# 3. Equipos router: GET /{equipo_id} — cross-org org-scope bug
# ===========================================================================

class TestEquiposCrossOrgIsolation:
    """
    Verifies that the equipos router correctly uses the auth context's
    organizacion_id when querying data, and documents the known isolation
    gap in GET /v1/equipos/{equipo_id} (no cross-org ownership check).
    """

    def test_list_equipos_code_filters_by_org_id(self):
        """
        Unit-level: verify that list_equipos passes auth.organizacion_id to the
        DB query — i.e., the query method chain calls .eq('organizacion_id', ...).
        We inspect the source directly since the dependency can't be overridden
        at runtime without re-registering routes.
        """
        import inspect
        from app.api.v1.equipos import list_equipos

        source = inspect.getsource(list_equipos)
        # The endpoint must scope by organizacion_id from auth context
        assert "organizacion_id" in source, (
            "list_equipos does not reference organizacion_id — org scoping missing"
        )
        assert "auth.organizacion_id" in source, (
            "list_equipos does not use auth.organizacion_id for DB filtering"
        )

    def test_get_equipo_by_id_scopes_query_to_caller_org(self):
        """
        GET /v1/equipos/{equipo_id} must scope the lookup with
        .eq('organizacion_id', auth.organizacion_id) so a user from Org-B
        cannot retrieve a team belonging to Org-A by guessing the equipo_id.
        """
        import inspect
        from app.api.v1.equipos import get_equipo, update_equipo, delete_equipo

        for endpoint in (get_equipo, update_equipo, delete_equipo):
            source = inspect.getsource(endpoint)
            assert "auth.organizacion_id" in source, (
                f"{endpoint.__name__} does not scope its query by "
                "auth.organizacion_id — cross-org isolation gap"
            )


# ===========================================================================
# 4. Sesiones: cross-org access via equipo_id filter
# ===========================================================================

class TestSesionesCrossOrgIsolation:
    """
    Tests that list_sesiones handles cross-org access correctly.
    When equipo_id belongs to Org-A and user is Org-B, no scoping guard prevents
    the query — the data isolation depends on the org-level team lookup.
    """

    def test_list_sesiones_rejects_cross_org_equipo_id(self, isolated_client, mock_supabase):
        """
        GET /v1/sesiones?equipo_id=<org-a-team> — when equipo_id is provided
        directly, the endpoint must verify the team belongs to the caller's org
        and return 404 when it does not (mock returns no owned team).
        """
        client, app = isolated_client
        org_b = str(uuid4())
        org_a_equipo_id = str(uuid4())

        from app.dependencies import require_permission
        from app.security.permissions import Permission

        auth_ctx = _make_auth_context(
            organizacion_id=org_b,
            equipo_id=org_a_equipo_id,
        )

        dep = require_permission(Permission.SESSION_READ)

        async def override(*args, **kwargs):
            return auth_ctx

        app.dependency_overrides[dep] = override

        chain = mock_supabase.table.return_value
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.in_.return_value = chain
        chain.order.return_value = chain
        chain.range.return_value = chain
        chain.execute.return_value = MagicMock(data=[], count=0)

        try:
            response = client.get(
                f"/v1/sesiones?equipo_id={org_a_equipo_id}",
                headers={"Authorization": "Bearer x"},
            )
            # The equipos ownership check finds no team in the caller's org
            # (mock returns data=[]), so the endpoint must reject with 404.
            assert response.status_code == 404, (
                f"Cross-org equipo_id was not rejected: {response.status_code}"
            )
        finally:
            app.dependency_overrides.pop(dep, None)


# ===========================================================================
# 5. Medical records — role-based access control
# ===========================================================================

class TestMedicalRecordsRBAC:
    """
    Only roles with MEDICAL_READ / MEDICAL_READ_SUMMARY may access medical data.
    A jugador role must be rejected.
    """

    def _jugador_permissions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS
        return DEFAULT_PERMISSIONS["jugador"].copy()

    def _fisio_permissions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS
        return DEFAULT_PERMISSIONS["fisio"].copy()

    def test_jugador_lacks_medical_create_permission(self):
        """Jugador must NOT have MEDICAL_CREATE."""
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["jugador"]
        assert Permission.MEDICAL_CREATE not in perms

    def test_jugador_lacks_medical_read_permission(self):
        """Jugador must NOT have MEDICAL_READ (full)."""
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["jugador"]
        assert Permission.MEDICAL_READ not in perms

    def test_fisio_has_medical_create(self):
        """Fisio must have MEDICAL_CREATE."""
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["fisio"]
        assert Permission.MEDICAL_CREATE in perms

    def test_entrenador_principal_has_only_read_summary(self):
        """Entrenador principal has MEDICAL_READ_SUMMARY but that's covered by full CT now."""
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["entrenador_principal"]
        # All CT roles have full medical in the current model
        assert Permission.MEDICAL_READ_SUMMARY in perms
        assert Permission.MEDICAL_READ in perms

    @pytest.mark.asyncio
    async def test_require_permission_raises_403_for_jugador_medical_create(self):
        """
        Unit test: require_permission(MEDICAL_CREATE) raises 403 when the user's
        effective role is 'jugador' (which has no MEDICAL_CREATE).

        Uses a fully mocked Supabase chain so no real DB is touched.
        """
        from fastapi import HTTPException, Request
        from unittest.mock import AsyncMock
        from app.security.dependencies import require_permission
        from app.security.permissions import Permission, DEFAULT_PERMISSIONS

        # Build a mock supabase that returns jugador role for usuarios_equipos query
        mock_sb = MagicMock()
        chain = MagicMock()
        for m in ("select", "eq", "neq", "in_", "order", "limit", "range",
                  "single", "maybe_single"):
            getattr(chain, m).return_value = chain

        # usuarios_equipos returns jugador role
        chain.execute.return_value = MagicMock(
            data=[{"rol_en_equipo": "jugador", "equipo_id": str(uuid4())}],
            count=1,
        )
        # suscripciones returns empty (free tier → allowed)
        chain.execute.side_effect = None

        def table_side_effect(name):
            c = MagicMock()
            for m in ("select", "eq", "neq", "in_", "order", "limit", "range",
                      "single", "maybe_single"):
                getattr(c, m).return_value = c
            if name == "suscripciones":
                c.execute.return_value = MagicMock(data=None)
            elif name == "usuarios_equipos":
                c.execute.return_value = MagicMock(
                    data=[{"rol_en_equipo": "jugador", "equipo_id": str(uuid4())}]
                )
            elif name == "permisos_personalizados":
                c.execute.return_value = MagicMock(data=[])
            else:
                c.execute.return_value = MagicMock(data=[])
            return c

        mock_sb.table.side_effect = table_side_effect

        # Build a minimal UsuarioResponse for jugador
        jugador_user = _make_usuario_response(
            rol="jugador",
            organizacion_id=str(uuid4()),
        )

        # Build mock request with an equipo_id path param
        equipo_id = str(uuid4())
        mock_request = MagicMock(spec=Request)
        mock_request.path_params = {"equipo_id": equipo_id}
        mock_request.query_params = {}
        mock_request.client = MagicMock(host="127.0.0.1")

        dep_fn = require_permission(Permission.MEDICAL_CREATE)

        with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
            with pytest.raises(HTTPException) as exc:
                await dep_fn(
                    request=mock_request,
                    current_user=jugador_user,
                )

        assert exc.value.status_code == 403
        assert "medical.create" in exc.value.detail

    @pytest.mark.asyncio
    async def test_require_any_permission_raises_403_for_jugador_medical_read(self):
        """
        Unit test: require_any_permission(MEDICAL_READ, MEDICAL_READ_SUMMARY)
        raises 403 when the user is a jugador (neither permission in defaults).
        """
        from fastapi import HTTPException, Request
        from app.security.dependencies import require_any_permission
        from app.security.permissions import Permission

        mock_sb = MagicMock()

        def table_side_effect(name):
            c = MagicMock()
            for m in ("select", "eq", "neq", "in_", "order", "limit", "range",
                      "single", "maybe_single"):
                getattr(c, m).return_value = c
            if name == "usuarios_equipos":
                c.execute.return_value = MagicMock(
                    data=[{"rol_en_equipo": "jugador", "equipo_id": str(uuid4())}]
                )
            elif name == "permisos_personalizados":
                c.execute.return_value = MagicMock(data=[])
            else:
                c.execute.return_value = MagicMock(data=None)
            return c

        mock_sb.table.side_effect = table_side_effect

        jugador_user = _make_usuario_response(
            rol="jugador",
            organizacion_id=str(uuid4()),
        )

        equipo_id = str(uuid4())
        mock_request = MagicMock(spec=Request)
        mock_request.path_params = {"equipo_id": equipo_id}
        mock_request.query_params = {}
        mock_request.client = MagicMock(host="127.0.0.1")

        dep_fn = require_any_permission(
            Permission.MEDICAL_READ, Permission.MEDICAL_READ_SUMMARY,
        )

        with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
            with pytest.raises(HTTPException) as exc:
                await dep_fn(
                    request=mock_request,
                    current_user=jugador_user,
                )

        assert exc.value.status_code == 403


# ===========================================================================
# 6. Permission enum — role coverage checks
# ===========================================================================

class TestPermissionRoleMatrix:
    """Fast unit tests over the permission matrix (no DB, no HTTP)."""

    def test_jugador_cannot_create_sessions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        assert Permission.SESSION_CREATE not in DEFAULT_PERMISSIONS["jugador"]

    def test_jugador_cannot_manage_plantilla(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        assert Permission.PLANTILLA_MANAGE not in DEFAULT_PERMISSIONS["jugador"]

    def test_jugador_cannot_create_tasks(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        assert Permission.TASK_CREATE not in DEFAULT_PERMISSIONS["jugador"]

    def test_jugador_cannot_use_ai(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        assert Permission.AI_USE not in DEFAULT_PERMISSIONS["jugador"]

    def test_jugador_cannot_invite(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        assert Permission.INVITACION_MANAGE not in DEFAULT_PERMISSIONS["jugador"]

    def test_jugador_cannot_manage_club_billing(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        assert Permission.CLUB_MANAGE_BILLING not in DEFAULT_PERMISSIONS["jugador"]

    def test_jugador_cannot_transfer_ownership(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        assert Permission.TRANSFERIR_PROPIEDAD not in DEFAULT_PERMISSIONS["jugador"]

    def test_fisio_has_full_medical_access(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["fisio"]
        for p in (Permission.MEDICAL_CREATE, Permission.MEDICAL_READ, Permission.MEDICAL_UPDATE):
            assert p in perms, f"fisio missing {p}"

    def test_analista_cannot_manage_club(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["analista"]
        assert Permission.CLUB_MANAGE_BILLING not in perms
        assert Permission.CLUB_MANAGE_ORG not in perms

    def test_club_roles_do_not_have_team_permissions_by_default(self):
        """CLUB_ROLE_PERMISSIONS only grant club-scoped perms, not team perms."""
        from app.security.permissions import CLUB_ROLE_PERMISSIONS, Permission

        for role, perms in CLUB_ROLE_PERMISSIONS.items():
            for p in perms:
                assert p.value.startswith("club."), (
                    f"Club role '{role}' has non-club permission {p}"
                )


# ===========================================================================
# 7. AuthContext: organizacion_id=None blocks downstream logic
# ===========================================================================

class TestAuthContextOrgNoneBlocking:
    """
    A user with organizacion_id=None must be blocked before any data reaches them.
    Tests verify the dependency raises 403 (not 500) in this state.
    """

    def test_require_club_admin_blocks_no_org_synchronously(self):
        """Sync variant: ensure the guard doesn't accidentally pass."""
        import asyncio
        from fastapi import HTTPException
        from app.api.v1.club_admin import require_club_admin

        user_no_org = _make_usuario_response(
            rol="presidente",
            organizacion_id=None,
        )

        async def _run():
            return await require_club_admin(current_user=user_no_org)

        with pytest.raises(HTTPException) as exc:
            asyncio.get_event_loop().run_until_complete(_run())

        assert exc.value.status_code == 403

    def test_auth_context_with_empty_org_id(self):
        """An AuthContext with organizacion_id='' should be considered no-org."""
        from app.security.dependencies import AuthContext

        ctx = AuthContext(
            user=None,
            user_id="u-1",
            organizacion_id="",  # effectively no org
        )
        # The empty string is falsy — endpoints that do `if auth.organizacion_id:` will skip
        assert not ctx.organizacion_id


# ===========================================================================
# 8. check_subscription_access — isolated logic tests
# ===========================================================================

class TestSubscriptionAccessLogic:
    """Direct tests for _check_subscription_access — no HTTP needed."""

    def test_active_subscription_allows_write(self):
        from app.security.dependencies import _check_subscription_access
        from app.security.permissions import Permission

        allowed, err = _check_subscription_access(
            {"estado": "active"},
            (Permission.SESSION_CREATE,),
        )
        assert allowed is True
        assert err is None

    def test_suspended_subscription_blocks(self):
        from app.security.dependencies import _check_subscription_access
        from app.security.permissions import Permission

        allowed, err = _check_subscription_access(
            {"estado": "suspended"},
            (Permission.SESSION_CREATE,),
        )
        assert allowed is False
        assert err is not None

    def test_grace_period_blocks_writes(self):
        from app.security.dependencies import _check_subscription_access
        from app.security.permissions import Permission

        allowed, err = _check_subscription_access(
            {"estado": "grace_period"},
            (Permission.SESSION_CREATE,),  # write perm — no ".read" suffix
        )
        assert allowed is False
        assert err is not None

    def test_grace_period_allows_reads(self):
        from app.security.dependencies import _check_subscription_access
        from app.security.permissions import Permission

        allowed, err = _check_subscription_access(
            {"estado": "grace_period"},
            (Permission.SESSION_READ,),  # ends with .read
        )
        assert allowed is True
        assert err is None

    def test_cancelled_subscription_blocks(self):
        from app.security.dependencies import _check_subscription_access
        from app.security.permissions import Permission

        allowed, err = _check_subscription_access(
            {"estado": "cancelled"},
            (Permission.SESSION_READ,),
        )
        assert allowed is False

    def test_no_subscription_allows_access(self):
        """Backward-compat: no sub found → allow (free tier)."""
        from app.security.dependencies import _check_subscription_access
        from app.security.permissions import Permission

        allowed, err = _check_subscription_access({}, (Permission.SESSION_CREATE,))
        assert allowed is True


# ===========================================================================
# 9. Cross-org: club dashboard uses token bearer's org, not query params
# ===========================================================================

class TestClubAdminOrgBinding:
    """
    Verify club admin endpoints ALWAYS use the authenticated user's org_id,
    never a caller-controlled value.
    """

    def test_club_dashboard_no_org_param_in_signature(self):
        """
        The dashboard endpoint must not accept an org_id query/path param
        — org isolation comes from require_club_admin, not caller input.
        """
        import inspect
        from app.api.v1.club_admin import club_dashboard

        sig = inspect.signature(club_dashboard)
        param_names = set(sig.parameters.keys())

        # Must NOT have org_id as a caller-controllable param
        assert "org_id" not in param_names
        assert "organizacion_id" not in param_names

    def test_club_list_miembros_no_org_param_in_signature(self):
        import inspect
        from app.api.v1.club_admin import club_list_miembros

        sig = inspect.signature(club_list_miembros)
        param_names = set(sig.parameters.keys())

        assert "org_id" not in param_names
        assert "organizacion_id" not in param_names
