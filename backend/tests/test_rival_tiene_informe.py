"""El listado de rivales marca `tiene_informe` si hay algo escrito."""

from app.api.v1.rivales import _marcar_tiene_informe, _tiene_contenido


class _Res:
    def __init__(self, data):
        self.data = data


class _Q:
    def __init__(self, data):
        self._data = data

    def select(self, *_a, **_k):
        return self

    def in_(self, *_a, **_k):
        return self

    def execute(self):
        return _Res(self._data)


class _Sb:
    def __init__(self, informes):
        self._informes = informes

    def table(self, _name):
        return _Q(self._informes)


def test_tiene_contenido_ignora_vacios():
    assert not _tiene_contenido({"sistema": " ", "fortalezas": [], "estrategia": {"notas": ""}})
    assert _tiene_contenido({"estrategia": {"notas": "presiona alto"}})
    assert _tiene_contenido({"fortalezas": ["ABP"]})


def test_marcar_tiene_informe():
    rows = [
        {"id": "a", "scout_manual": {"fortalezas": ["x"]}},
        {"id": "b", "scout_manual": {}},
        {"id": "c"},
        {"id": "d", "plan_partido_manual": {"tramos": {"ida": {"notas": "n"}}}},
    ]
    out = {r["id"]: r["tiene_informe"] for r in _marcar_tiene_informe(_Sb([{"rival_id": "c"}]), rows)}
    assert out == {"a": True, "b": False, "c": True, "d": True}
