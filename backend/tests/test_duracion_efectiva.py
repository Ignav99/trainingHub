from app.services.duracion_efectiva import (
    minutos_carga_sesion_tarea,
    minutos_efectivos_catalogo,
    normalize_descanso_seconds,
    player_session_minutes,
)
from app.services.sesion_carga import aggregate_sesion_carga


class TestDescanso:
    def test_legacy_minutes(self):
        assert normalize_descanso_seconds(2) == 120

    def test_seconds(self):
        assert normalize_descanso_seconds(90) == 90


class TestCatalogoEfectivos:
    def test_clock_minus_rest_series_one(self):
        # 20 min, 2 min rest (legacy), 1 serie → 18
        assert minutos_efectivos_catalogo(20, 2, 1) == 18

    def test_multi_series_rest_between(self):
        # 20 min clock, 60s rest, 3 series → 20 - 2 = 18
        assert minutos_efectivos_catalogo(20, 60, 3) == 18

    def test_never_negative(self):
        assert minutos_efectivos_catalogo(1, 600, 1) == 0


class TestSesionTareaCarga:
    def test_override_wins(self):
        st = {
            "duracion_override": 20,
            "minutos_efectivos": 12,
            "tarea": {"duracion_total": 20, "tiempo_descanso": 120, "num_series": 1},
        }
        assert minutos_carga_sesion_tarea(st) == 12

    def test_default_from_clock_and_rest(self):
        st = {
            "duracion_override": 20,
            "tarea": {"duracion_total": 20, "tiempo_descanso": 120, "num_series": 1},
        }
        assert minutos_carga_sesion_tarea(st) == 18


class TestCompensatorioParallel:
    def test_session_clock_is_max_of_lanes(self):
        tareas = [
            {
                "fase_sesion": "activacion",
                "duracion_override": 10,
                "tarea": {"duracion_total": 10, "densidad": "baja"},
            },
            {
                "fase_sesion": "compensatorio_1",
                "duracion_override": 20,
                "tarea": {"duracion_total": 20, "densidad": "alta"},
            },
            {
                "fase_sesion": "compensatorio_2",
                "duracion_override": 12,
                "tarea": {"duracion_total": 12, "densidad": "media"},
            },
            {
                "fase_sesion": "compensatorio_3",
                "duracion_override": 8,
                "tarea": {"duracion_total": 8, "densidad": "baja"},
            },
        ]
        _, _, dur = aggregate_sesion_carga(tareas, [])
        assert dur == 30  # 10 sequential + max(20,12,8)

    def test_player_only_counts_own_lane(self):
        estructura = [
            {
                "tipo": "compensatorio",
                "compensatorio": {
                    "lanes": [
                        {"id": "lane-1", "label": "A", "jugador_ids": ["p1"]},
                        {"id": "lane-2", "label": "B", "jugador_ids": ["p2"]},
                        {"id": "lane-3", "label": "C", "jugador_ids": []},
                    ]
                },
            }
        ]
        tareas = [
            {
                "fase_sesion": "activacion",
                "duracion_override": 10,
                "minutos_efectivos": 10,
                "tarea": {},
            },
            {
                "fase_sesion": "compensatorio_1",
                "duracion_override": 20,
                "minutos_efectivos": 18,
                "tarea": {},
            },
            {
                "fase_sesion": "compensatorio_2",
                "duracion_override": 12,
                "minutos_efectivos": 12,
                "tarea": {},
            },
        ]
        assert player_session_minutes(tareas, estructura, "p1") == 28
        assert player_session_minutes(tareas, estructura, "p2") == 22
        assert player_session_minutes(tareas, estructura, "p3") == 10
