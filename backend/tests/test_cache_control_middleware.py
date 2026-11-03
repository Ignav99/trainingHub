"""Tests for CacheControlMiddleware (browser HTTP cache rules)."""

from fastapi import FastAPI, Response
from fastapi.testclient import TestClient

from app.middleware import CacheControlMiddleware


def _make_client() -> TestClient:
    app = FastAPI()

    @app.get("/v1/equipos")
    async def equipos():
        return {"data": []}

    @app.get("/v1/equipos/denied")
    async def equipos_denied():
        return Response(status_code=401, content="{}", media_type="application/json")

    @app.get("/v1/tactical-boards")
    async def boards():
        return {"data": []}

    @app.get("/v1/catalogos/x")
    async def catalogo():
        return {"data": []}

    @app.post("/v1/equipos")
    async def create():
        return {"ok": True}

    app.add_middleware(CacheControlMiddleware)
    return TestClient(app)


def test_successful_get_is_cacheable_per_token():
    client = _make_client()
    r = client.get("/v1/equipos")
    assert r.status_code == 200
    assert r.headers["cache-control"].startswith("private, max-age=60")
    assert "Authorization" in r.headers.get("vary", "")


def test_error_responses_are_never_cached():
    client = _make_client()
    r = client.get("/v1/equipos/denied")
    assert r.status_code == 401
    assert r.headers["cache-control"] == "no-store"


def test_mutations_are_never_cached():
    client = _make_client()
    r = client.post("/v1/equipos")
    assert r.headers["cache-control"] == "no-store"


def test_tactical_boards_list_is_not_cached():
    client = _make_client()
    r = client.get("/v1/tactical-boards")
    assert r.headers["cache-control"] == "no-store"


def test_catalogs_keep_long_cache():
    client = _make_client()
    r = client.get("/v1/catalogos/x")
    assert r.headers["cache-control"].startswith("private, max-age=300")
