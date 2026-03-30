"""
Integration tests for authentication endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4


class TestLoginEndpoint:
    """Tests for POST /v1/auth/login."""

    def test_login_endpoint_exists(self, test_client):
        """Login endpoint should exist and accept POST."""
        response = test_client.post("/v1/auth/login", json={
            "email": "test@example.com",
            "password": "wrong",
        })
        # Will fail auth but should not 404
        assert response.status_code != 404

    def test_login_failure_returns_401(self, test_client, mock_supabase):
        """Failed login should return 401."""
        mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")

        response = test_client.post("/v1/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401
        assert response.json()["detail"] == "Credenciales invalidas"

    @patch("app.api.v1.auth.log_login")
    def test_login_failure_audits_event(self, mock_log_login, test_client, mock_supabase):
        """Failed login should call log_login with success=False."""
        mock_supabase.auth.sign_in_with_password.side_effect = Exception("bad creds")

        test_client.post("/v1/auth/login", json={
            "email": "hacker@evil.com",
            "password": "wrong",
        })

        mock_log_login.assert_called()
        call_kwargs = mock_log_login.call_args
        assert call_kwargs.kwargs.get("success") is False or (
            len(call_kwargs.args) == 0 and call_kwargs[1].get("success") is False
        )

    def test_login_requires_email_and_password(self, test_client):
        """Login should require both email and password."""
        response = test_client.post("/v1/auth/login", json={"email": "test@example.com"})
        assert response.status_code == 422


class TestMeEndpoint:
    """Tests for GET /v1/auth/me."""

    def test_me_requires_auth(self, test_client):
        """GET /me without auth should fail."""
        response = test_client.get("/v1/auth/me")
        assert response.status_code in (401, 403)


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_returns_healthy(self, test_client):
        """Root endpoint should return healthy status."""
        response = test_client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_health_returns_check_details(self, test_client, mock_supabase):
        """Health endpoint should return check details."""
        # Mock successful DB check
        mock_supabase.table.return_value.select.return_value.limit.return_value.execute.return_value = MagicMock(data=[], count=0)

        response = test_client.get("/health")
        data = response.json()
        assert "checks" in data
        assert "version" in data
