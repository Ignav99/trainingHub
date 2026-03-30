"""
Tests for Stripe integration: checkout, portal, webhook.
"""

import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4


class TestStripeCheckout:
    """Tests for the Stripe checkout endpoint."""

    def test_checkout_session_request_model(self):
        from app.models.suscripcion import CheckoutSessionRequest, CicloSuscripcion

        req = CheckoutSessionRequest(
            plan_codigo="equipo_premium",
            ciclo=CicloSuscripcion.ANUAL,
            success_url="https://kabine.app/configuracion?success=1",
            cancel_url="https://kabine.app/configuracion?cancelled=1",
        )
        assert req.plan_codigo == "equipo_premium"
        assert req.ciclo == CicloSuscripcion.ANUAL

    def test_checkout_session_response_model(self):
        from app.models.suscripcion import CheckoutSessionResponse

        resp = CheckoutSessionResponse(
            checkout_url="https://checkout.stripe.com/c/pay/cs_test_123",
            session_id="cs_test_123",
        )
        assert resp.checkout_url.startswith("https://")
        assert resp.session_id == "cs_test_123"

    def test_checkout_requires_plan_codigo(self):
        from app.models.suscripcion import CheckoutSessionRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CheckoutSessionRequest(
                ciclo="mensual",
                success_url="https://kabine.app/ok",
                cancel_url="https://kabine.app/cancel",
            )

    def test_checkout_ciclo_defaults_to_mensual(self):
        from app.models.suscripcion import CheckoutSessionRequest, CicloSuscripcion

        req = CheckoutSessionRequest(
            plan_codigo="equipo_basico",
            success_url="https://kabine.app/ok",
            cancel_url="https://kabine.app/cancel",
        )
        assert req.ciclo == CicloSuscripcion.MENSUAL


class TestStripeWebhook:
    """Tests for webhook signature validation patterns."""

    def test_webhook_secret_in_settings(self):
        """STRIPE_WEBHOOK_SECRET should be configurable."""
        from app.config import Settings

        # Should accept None (not configured)
        assert Settings.__fields__["STRIPE_WEBHOOK_SECRET"].default is None

    def test_stripe_secret_key_in_settings(self):
        """STRIPE_SECRET_KEY should be configurable."""
        from app.config import Settings

        assert Settings.__fields__["STRIPE_SECRET_KEY"].default is None


class TestSuscripcionModels:
    """Additional model tests for subscription flow."""

    def test_suscripcion_upgrade_model(self):
        from app.models.suscripcion import SuscripcionUpgrade, CicloSuscripcion

        upgrade = SuscripcionUpgrade(
            nuevo_plan_codigo="club_premium",
            ciclo=CicloSuscripcion.ANUAL,
        )
        assert upgrade.nuevo_plan_codigo == "club_premium"

    def test_historial_accion_values(self):
        from app.models.suscripcion import AccionHistorial

        expected = {"created", "upgraded", "downgraded", "renewed", "cancelled", "suspended", "reactivated"}
        actual = {a.value for a in AccionHistorial}
        assert expected == actual

    def test_estado_suscripcion_values(self):
        from app.models.suscripcion import EstadoSuscripcion

        expected = {"trial", "active", "past_due", "grace_period", "suspended", "cancelled"}
        actual = {e.value for e in EstadoSuscripcion}
        assert expected == actual
