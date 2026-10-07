"""Editar ejercicios o apuntar el RPE después recalcula minutos y carga."""

import importlib.util
from pathlib import Path


def _load():
    path = Path(__file__).resolve().parents[1] / "app" / "services" / "sesion_recalculo.py"
    spec = importlib.util.spec_from_file_location("sesion_recalculo_under_test", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


m = _load()


def test_editar_ejercicios_recalcula_el_rpe_aunque_la_sesion_ya_paso():
    """Martes: 25′ efectivos y RPE 6 (carga 150). Miércoles: 72′ reales."""
    rows = [
        {
            "jugador_id": "p1",
            "tipo": "sesion",
            "rpe": 6,
            "duracion_percibida": 25,
            "carga_sesion": 150,
        },
        {
            "jugador_id": "p2",
            "tipo": "partido",
            "rpe": 8,
            "duracion_percibida": 90,
            "carga_sesion": 720,
        },
    ]
    updated = m.apply_minutes_to_rpe_rows(
        rows,
        {"p1": 72},
        "completada",
    )
    assert updated[0]["duracion_percibida"] == 72
    assert updated[0]["carga_sesion"] == 432
    assert updated[1]["duracion_percibida"] == 90
    assert updated[1]["carga_sesion"] == 720


def test_recalcula_tambien_si_aun_no_esta_marcada_completada():
    updated = m.apply_minutes_to_rpe_rows(
        [{"jugador_id": "p1", "tipo": "sesion", "rpe": 5, "duracion_percibida": 25, "carga_sesion": 125}],
        {"p1": 64},
        "planificada",
    )
    assert updated[0]["duracion_percibida"] == 64
    assert updated[0]["carga_sesion"] == 320


def test_sesion_cancelada_no_reescribe_el_rpe():
    original = [{"jugador_id": "p1", "tipo": "sesion", "rpe": 5, "duracion_percibida": 25, "carga_sesion": 125}]
    updated = m.apply_minutes_to_rpe_rows(original, {"p1": 80}, "cancelada")
    assert updated[0]["duracion_percibida"] == 25
    assert updated[0]["carga_sesion"] == 125


def test_rpe_posterior_usa_los_minutos_actuales():
    assert m.resolve_rpe_minutes(72, 25) == 72
    assert m.rpe_fields_for_minutes(7, 72)["carga_sesion"] == 504


def test_sin_ejercicios_conserva_el_minutaje_provisional():
    assert m.resolve_rpe_minutes(0, 25) == 25
    assert m.resolve_rpe_minutes(None, None) == 0
    updated = m.apply_minutes_to_rpe_rows(
        [{"jugador_id": "p1", "tipo": "sesion", "rpe": 6, "duracion_percibida": 25, "carga_sesion": 150}],
        {"p1": 0},
        "completada",
    )
    assert updated[0]["duracion_percibida"] == 25
    assert updated[0]["carga_sesion"] == 150
