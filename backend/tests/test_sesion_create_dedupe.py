from datetime import datetime, timezone
from uuid import uuid4

from app.services.sesion_create import (
    ensure_sesion_write_id,
    find_recent_duplicate_sesion,
    is_unique_violation,
    unique_by_id,
)
from app.services.sesion_taxonomy import retry_sesion_write


class _FakeQuery:
    def __init__(self, row):
        self._row = row

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        return type("R", (), {"data": [self._row] if self._row else []})()


class _FakeSupabase:
    def __init__(self, row):
        self._row = row

    def table(self, _name):
        return _FakeQuery(self._row)


def test_unique_by_id_keeps_first():
    a = {"id": "1", "titulo": "A"}
    b = {"id": "1", "titulo": "dup"}
    c = {"id": "2", "titulo": "B"}
    assert unique_by_id([a, b, c]) == [a, c]


def test_is_unique_violation():
    assert is_unique_violation(Exception("{'code': '23505'}"))
    assert is_unique_violation(Exception("duplicate key value violates unique constraint"))
    assert not is_unique_violation(Exception("PGRST204"))


def test_ensure_sesion_write_id_keeps_client_id():
    sid = str(uuid4())
    payload = {"titulo": "MD-3", "id": sid}
    assert ensure_sesion_write_id(payload) == sid
    assert payload["id"] == sid


def test_ensure_sesion_write_id_generates_when_missing():
    payload = {"titulo": "MD-3"}
    sid = ensure_sesion_write_id(payload)
    assert payload["id"] == sid
    assert len(sid) == 36


def test_retry_keeps_same_id_across_attempts():
    calls = []
    sid = str(uuid4())

    def execute(data):
        calls.append(dict(data))
        if "estructura_fases" in data:
            raise Exception(
                "{'code': 'PGRST204', \"message\": "
                "\"Could not find the 'estructura_fases' column of 'sesiones' in the schema cache\"}"
            )
        return {"ok": True, "data": [data]}

    payload = {
        "id": sid,
        "titulo": "Sesion",
        "fecha": "2026-09-07",
        "equipo_id": "e1",
        "estructura_fases": [{"id": "1"}],
    }
    result = retry_sesion_write(execute, payload, op="insert")
    assert result["ok"] is True
    assert calls[0]["id"] == sid
    assert calls[1]["id"] == sid


def test_find_recent_duplicate_sesion():
    row = {
        "id": "abc",
        "titulo": "MD-3 presion",
        "fecha": "2026-09-07",
        "equipo_id": "eq1",
        "creado_por": "u1",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    found = find_recent_duplicate_sesion(
        _FakeSupabase(row),
        equipo_id="eq1",
        titulo="MD-3 presion",
        fecha="2026-09-07",
        creado_por="u1",
    )
    assert found and found["id"] == "abc"
