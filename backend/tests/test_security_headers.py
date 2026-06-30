"""Test security headers middleware including Content-Security-Policy."""

import pytest
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.routing import Route
from starlette.responses import PlainTextResponse
from starlette.testclient import TestClient

from app.middleware import SecurityHeadersMiddleware


async def hello(request):
    return PlainTextResponse("ok")


@pytest.fixture
def sec_client():
    app = Starlette(
        routes=[Route("/test", hello)],
        middleware=[Middleware(SecurityHeadersMiddleware)],
    )
    return TestClient(app)


class TestSecurityHeadersMiddleware:
    """Verify all security headers are present including CSP."""

    def test_security_headers_present(self, sec_client):
        response = sec_client.get("/test")
        headers = response.headers

        assert headers.get("x-content-type-options") == "nosniff"
        assert headers.get("x-frame-options") == "DENY"
        assert headers.get("x-xss-protection") == "1; mode=block"
        assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert headers.get("strict-transport-security") == "max-age=31536000; includeSubDomains"

    def test_csp_header_present(self, sec_client):
        response = sec_client.get("/test")
        csp = response.headers.get("content-security-policy")
        assert csp is not None, "Content-Security-Policy header is missing"
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "base-uri 'self'" in csp
        assert "form-action 'self'" in csp
        assert "upgrade-insecure-requests" in csp

    def test_csp_allows_supabase_connections(self, sec_client):
        response = sec_client.get("/test")
        csp = response.headers.get("content-security-policy", "")
        assert "https://*.supabase.co" in csp
        assert "wss://*.supabase.co" in csp

    def test_permissions_policy_restrictive(self, sec_client):
        response = sec_client.get("/test")
        pp = response.headers.get("permissions-policy", "")
        assert "camera=()" in pp
        assert "microphone=()" in pp
        assert "geolocation=()" in pp
