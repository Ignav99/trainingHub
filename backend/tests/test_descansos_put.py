"""PUT /descansos: upsert por equipo+fecha y validación del cuerpo."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.api.v1.descansos import _fijar_descanso
from app.models.descanso import DescansoUpsert


class _Res:
    def __init__(self, data):
        self.data = data


class _Tabla:
    def __init__(self, filas):
        self.filas = filas
        self._op = None
        self._payload = None
        self._filtros = {}

    def select(self, *_a, **_k):
        self._op = "select"
        return self

    def update(self, payload):
        self._op, self._payload = "update", payload
        return self

    def insert(self, payload):
        self._op, self._payload = "insert", payload
        return self

    def eq(self, campo, valor):
        self._filtros[campo] = valor
        return self

    def execute(self):
        f, self._filtros = self._filtros, {}
        sel = [r for r in self.filas if all(r.get(k) == v for k, v in f.items())]
        if self._op == "select":
            return _Res(sel)
        if self._op == "update":
            for r in sel:
                r.update(self._payload)
            return _Res(sel)
        fila = {"id": f"n{len(self.filas)}", **self._payload}
        self.filas.append(fila)
        return _Res([fila])


class _Sb:
    def __init__(self, filas):
        self.t = _Tabla(filas)

    def table(self, _nombre):
        return self.t


def _cuerpo(**k):
    base = {"equipo_id": str(uuid4()), "fecha": "2026-11-20"}
    base.update(k)
    return DescansoUpsert(**base)


def test_crea_si_no_existe():
    sb = _Sb([])
    d = _cuerpo(tipo="festivo", notas='{"texto":"Vacaciones","color":"teal"}')
    out = _fijar_descanso(sb, d, None)
    assert out["tipo"] == "festivo" and "Vacaciones" in out["notas"]
    assert len(sb.t.filas) == 1


def test_reemplaza_sin_borrar():
    eq = str(uuid4())
    sb = _Sb([{"id": "a", "equipo_id": eq, "fecha": "2026-11-20", "tipo": "descanso", "notas": None}])
    out = _fijar_descanso(sb, _cuerpo(equipo_id=eq, tipo="festivo", notas="x"), "u")
    assert out["id"] == "a" and out["tipo"] == "festivo" and out["notas"] == "x"
    assert len(sb.t.filas) == 1


def test_valida_tipo_y_longitud():
    with pytest.raises(ValidationError):
        _cuerpo(tipo="vacaciones")
    with pytest.raises(ValidationError):
        _cuerpo(notas="x" * 201)
    assert _cuerpo(notas="x" * 200).notas
