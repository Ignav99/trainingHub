"""Reglas del plan individualizado del futbolista."""

import importlib.util
from pathlib import Path

_path = Path(__file__).resolve().parents[1] / "app" / "services" / "plan_individual.py"
_spec = importlib.util.spec_from_file_location("plan_individual_pure", _path)
assert _spec and _spec.loader
mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mod)


def test_marcas_sin_repetir_ni_vacias():
    assert mod.clean_marcas(["  Pliometría ", "pliometría", "", "Fuerza   tren inferior"]) == [
        "Pliometría",
        "Fuerza tren inferior",
    ]
    assert len(mod.clean_marcas([f"m{i}" for i in range(40)])) == mod.MAX_MARCAS


def test_plan_guarda_solo_lo_que_vale():
    plan = mod.clean_plan({
        "objetivo": " Mejorar salto ",
        "sesiones_semana": "3",
        "semanas": 99,
        "ejercicios": [{"nombre": "Drop jump", "series": 4, "repeticiones": "6"}, {"nombre": " "}, "x"],
        "otra_cosa": 1,
    })
    assert plan == {
        "objetivo": "Mejorar salto",
        "sesiones_semana": 3,
        "ejercicios": [{
            "nombre": "Drop jump", "series": "4", "repeticiones": "6",
            "carga": None, "descanso": None, "notas": None,
        }],
    }
    assert mod.clean_plan(None) == {}


def test_resolucion_cierra_y_reabrir_la_quita():
    assert mod.estado_tras_cambio("en_trabajo", None, "2027-02-01") == "resuelta"
    assert mod.estado_tras_cambio("resuelta", "en_trabajo", "2027-02-01") == "resuelta"
    assert mod.estado_tras_cambio("resuelta", "en_trabajo", None) == "en_trabajo"
    assert mod.estado_tras_cambio("resuelta", None, None) == "en_trabajo"
    assert mod.estado_tras_cambio("abierta", None, None) == "abierta"
    assert mod.estado_tras_cambio("abierta", "resuelta", None) == "en_trabajo"
