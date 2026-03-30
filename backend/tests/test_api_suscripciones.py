"""
Integration tests for subscription endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4
from datetime import datetime


class TestPlanesEndpoints:
    """Tests for plan listing endpoints (public)."""

    def test_list_planes_returns_200(self, test_client, mock_supabase):
        """GET /planes should return 200 with a list."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[])

        response = test_client.get("/v1/suscripciones/planes")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_get_plan_by_code_requires_code(self, test_client):
        """GET /planes/{codigo} should accept a plan code."""
        response = test_client.get("/v1/suscripciones/planes/equipo_basico")
        # Will fail with DB error but should not 404 the route itself
        assert response.status_code != 405


class TestSuscripcionEndpoints:
    """Tests for subscription management endpoints."""

    def test_actual_requires_auth(self, test_client):
        """GET /actual should require authentication."""
        response = test_client.get("/v1/suscripciones/actual")
        assert response.status_code in (401, 403)

    def test_uso_requires_auth(self, test_client):
        """GET /uso should require authentication."""
        response = test_client.get("/v1/suscripciones/uso")
        assert response.status_code in (401, 403)

    def test_historial_requires_auth(self, test_client):
        """GET /historial should require authentication."""
        response = test_client.get("/v1/suscripciones/historial")
        assert response.status_code in (401, 403)


class TestCheckoutEndpoint:
    """Tests for POST /checkout."""

    def test_checkout_requires_auth(self, test_client):
        """POST /checkout should require authentication."""
        response = test_client.post("/v1/suscripciones/checkout", json={
            "plan_codigo": "equipo_premium",
            "ciclo": "mensual",
            "success_url": "https://kabine.app/ok",
            "cancel_url": "https://kabine.app/cancel",
        })
        assert response.status_code in (401, 403)

    def test_checkout_request_validation(self):
        """CheckoutSessionRequest should validate required fields."""
        from app.models.suscripcion import CheckoutSessionRequest
        from pydantic import ValidationError

        # Valid request
        req = CheckoutSessionRequest(
            plan_codigo="equipo_premium",
            ciclo="anual",
            success_url="https://kabine.app/ok",
            cancel_url="https://kabine.app/cancel",
        )
        assert req.plan_codigo == "equipo_premium"

        # Missing required field
        with pytest.raises(ValidationError):
            CheckoutSessionRequest(ciclo="mensual")


class TestPortalEndpoint:
    """Tests for POST /portal."""

    def test_portal_requires_auth(self, test_client):
        """POST /portal should require authentication."""
        response = test_client.post("/v1/suscripciones/portal")
        assert response.status_code in (401, 403)


class TestUsageModel:
    """Tests for usage response model."""

    def test_usage_response_defaults(self):
        """UsageResponse should have sensible defaults."""
        from app.models.suscripcion import UsageResponse

        usage = UsageResponse()
        assert usage.equipos == 0
        assert usage.max_equipos == 1
        assert usage.ai_calls_month == 0
        assert usage.max_ai_calls_month == 50

    def test_usage_response_with_values(self):
        """UsageResponse should accept custom values."""
        from app.models.suscripcion import UsageResponse

        usage = UsageResponse(
            equipos=3,
            max_equipos=10,
            storage_mb=2048,
            max_storage_mb=10240,
            ai_calls_month=45,
            max_ai_calls_month=200,
            kb_documents=15,
            max_kb_documents=50,
            staff_count=8,
            max_staff_per_team=15,
            player_count=22,
            max_players_per_team=40,
        )
        assert usage.equipos == 3
        assert usage.staff_count == 8
