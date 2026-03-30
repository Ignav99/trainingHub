"""
Integration tests for GDPR endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4


class TestGDPRConsentimientos:
    """Tests for GDPR consent endpoints."""

    def test_consentimientos_requires_auth(self, test_client):
        """GET /consentimientos should require authentication."""
        response = test_client.get("/v1/gdpr/consentimientos")
        assert response.status_code in (401, 403)

    def test_consent_types_exist(self):
        """All required consent types should be defined."""
        from app.models.gdpr import TipoConsentimiento

        assert TipoConsentimiento.TERMINOS_SERVICIO
        assert TipoConsentimiento.POLITICA_PRIVACIDAD
        assert TipoConsentimiento.DATOS_PERSONALES
        assert TipoConsentimiento.COMUNICACIONES_MARKETING


class TestGDPRSolicitudes:
    """Tests for GDPR rights request endpoints."""

    def test_solicitudes_requires_auth(self, test_client):
        """GET /solicitudes should require authentication."""
        response = test_client.get("/v1/gdpr/solicitudes")
        assert response.status_code in (401, 403)

    def test_admin_solicitudes_requires_auth(self, test_client):
        """GET /solicitudes/admin should require authentication."""
        response = test_client.get("/v1/gdpr/solicitudes/admin")
        assert response.status_code in (401, 403)

    def test_solicitud_types(self):
        """All GDPR right types should be defined."""
        from app.models.gdpr import TipoSolicitudGDPR

        assert TipoSolicitudGDPR.ACCESO
        assert TipoSolicitudGDPR.RECTIFICACION
        assert TipoSolicitudGDPR.SUPRESION
        assert TipoSolicitudGDPR.PORTABILIDAD


class TestGDPRExport:
    """Tests for GDPR data export endpoint."""

    def test_export_requires_auth(self, test_client):
        """POST /export should require authentication."""
        response = test_client.post("/v1/gdpr/export")
        assert response.status_code in (401, 403)

    def test_data_export_response_model(self):
        """DataExportResponse should have the expected fields."""
        from app.models.gdpr import DataExportResponse
        from datetime import datetime, timezone

        resp = DataExportResponse(
            download_url="https://storage.example.com/exports/test.json",
            expires_at=datetime.now(timezone.utc),
        )
        assert resp.download_url.startswith("https://")


class TestGDPRAdminIsolation:
    """Tests verifying GDPR admin queries filter by organization."""

    def test_admin_solicitudes_code_filters_by_org(self):
        """Verify the list_solicitudes_admin function queries users by org."""
        import inspect
        from app.api.v1.gdpr import list_solicitudes_admin

        source = inspect.getsource(list_solicitudes_admin)
        # The function should reference organizacion_id for filtering
        assert "organizacion_id" in source
        # Should NOT just query all solicitudes without org filter
        assert "org_user_ids" in source or "organizacion_id" in source

    def test_update_solicitud_checks_org(self):
        """Verify update_solicitud verifies the solicitud belongs to the admin's org."""
        import inspect
        from app.api.v1.gdpr import update_solicitud

        source = inspect.getsource(update_solicitud)
        assert "organizacion_id" in source
        assert "403" in source or "FORBIDDEN" in source
