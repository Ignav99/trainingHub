"""Participación parcial: solo las tareas nombradas, más el trabajo al margen."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str, relative: str):
    path = ROOT / relative
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


duracion = _load("duracion_efectiva_margen", "app/services/duracion_efectiva.py")
recalculo = _load("sesion_recalculo_margen", "app/services/sesion_recalculo.py")


def _tarea(fase, minutos, named=None):
    return {
        "fase_sesion": fase,
        "minutos_efectivos": minutos,
        "duracion_override": minutos,
        "jugadores_margen": named or [],
        "tarea": {},
    }


ESTRUCTURA = [
    {
        "tipo": "compensatorio",
        "compensatorio": {
            "lanes": [
                {"id": "lane-1", "jugador_ids": ["x"]},
                {"id": "lane-2", "jugador_ids": ["y"]},
            ]
        },
    }
]


def test_full_session_still_counts_own_lane_only():
    tareas = [
        _tarea("activacion", 10),
        _tarea("compensatorio_1", 18),
        _tarea("compensatorio_2", 12),
    ]
    assert duracion.player_session_minutes(tareas, ESTRUCTURA, "x") == 28
    assert duracion.player_session_minutes(tareas, ESTRUCTURA, "y") == 22


def test_partial_player_only_counts_named_tasks_plus_margin():
    tareas = [
        _tarea("activacion", 10, ["x"]),
        _tarea("compensatorio_1", 18, ["x"]),
        _tarea("desarrollo_1", 20),
    ]
    # Aunque esté en el carril, sin marca no entra. La marca de compensatorio sí.
    assert duracion.player_session_minutes(
        tareas, ESTRUCTURA, "x", parcial=True, minutos_margen=15
    ) == 10 + 18 + 15
    assert duracion.player_session_minutes(
        tareas, ESTRUCTURA, "z", parcial=True, minutos_margen=12
    ) == 12


def test_full_player_is_not_limited_by_the_tick_list():
    tareas = [_tarea("activacion", 10, ["x"]), _tarea("desarrollo_1", 20)]
    assert duracion.player_session_minutes(tareas, [], "y") == 30
    assert duracion.player_session_minutes(
        tareas, [], "y", minutos_margen=8
    ) == 38


def test_partial_partido_counts_when_named_on_a_side():
    estructura = [
        {
            "tipo": "partido_condicionado",
            "duracion_objetivo": 12,
            "partido": {
                "duracion_min": 12,
                "equipo_peto": {"1": "x"},
                "equipo_sin_peto": {},
            },
        }
    ]
    assert duracion.player_session_minutes([], estructura, "x", parcial=True) == 12
    assert duracion.player_session_minutes([], estructura, "z", parcial=True) == 0


def test_margin_plan_minutes_prefer_effective_then_duration_then_estimate():
    assert duracion.minutos_plan_margen(
        [{"minutos_efectivos": 6, "duracion": 10}, {"duracion": 4}],
        40,
    ) == 10
    assert duracion.minutos_plan_margen([], 25) == 25
    assert duracion.minutos_plan_margen([{"duracion": 8}], 25) == 8


def test_partial_flag():
    assert duracion.is_partial_participation(["margen"]) is True
    assert duracion.is_partial_participation(["fisio"]) is True
    assert duracion.is_partial_participation(["sesion", "margen"]) is False
    assert duracion.is_partial_participation([]) is False
    assert duracion.is_partial_participation(["presente"]) is False
    assert duracion.margin_minutes_for_tipos(["margen"], 20) == 20
    assert duracion.margin_minutes_for_tipos(["sesion"], 20) == 0
    assert duracion.margin_minutes_for_tipos(["fisio"], 9) == 9


def test_named_players_can_live_inside_formacion():
    st = {
        "fase_sesion": "activacion",
        "minutos_efectivos": 9,
        "duracion_override": 9,
        "tarea": {},
        "formacion_equipos": {"espacios": [], "jugadores_margen": ["x"]},
    }
    assert duracion.player_named_on_task(st, "x") is True
    assert duracion.player_session_minutes([st], [], "x", parcial=True) == 9
    assert duracion.player_session_minutes([st], [], "y", parcial=True) == 0


def test_margin_effective_roundtrip_in_notes():
    stamped = duracion.stamp_margen_notas("bien", 7)
    clean, minutes = duracion.split_margen_efectivo(stamped, None)
    assert clean == "bien"
    assert minutes == 7
    assert duracion.minutos_plan_margen([{"notas": stamped, "duracion": 20, "minutos_efectivos": 7}]) == 7
    assert duracion.stamp_margen_notas("bien", None) == "bien"


def test_partial_rpe_keeps_zero_and_full_session_keeps_provisional():
    assert recalculo.resolve_player_rpe_minutes(0, 25, parcial=True) == 0
    assert recalculo.resolve_player_rpe_minutes(18, 25, parcial=True) == 18
    assert recalculo.resolve_player_rpe_minutes(0, 25, parcial=False) == 25
    assert recalculo.rpe_fields_for_minutes(6, 18)["carga_sesion"] == 108
