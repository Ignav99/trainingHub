from datetime import date

from app.services.load_calculation_service import SessionLoadContext, player_session_loads
from app.services.sesion_carga import (
    aggregate_sesion_carga,
    carga_from_partido_bloque,
    carga_from_sesion_tarea,
    carga_partido_condicionado,
    carga_tarea,
)


class TestCargaTarea:
    def test_pco_higher_than_media_task(self):
        media = carga_tarea(duracion_min=20, densidad="media", categoria_codigo="POS")
        pco = carga_tarea(
            duracion_min=20, densidad="alta", categoria_codigo="PCO", num_jugadores=22
        )
        assert pco > media

    def test_ssg_stays_a_task_not_partido(self):
        ssg = carga_tarea(
            duracion_min=16, densidad="alta", categoria_codigo="SSG", num_jugadores=8
        )
        assert ssg > 0


class TestPartidoBloque:
    def test_empty_non_partido(self):
        carga, dur = carga_from_partido_bloque({"tipo": "desarrollo_1"})
        assert carga == 0.0
        assert dur == 0

    def test_partido_uses_duration_as_training_pco(self):
        bloque = {
            "tipo": "partido_condicionado",
            "duracion_objetivo": 20,
            "partido": {
                "duracion_min": 25,
                "equipo_peto": {"pos_0": "a", "pos_1": "b"},
                "equipo_sin_peto": {"pos_0": "c"},
            },
        }
        carga, dur = carga_from_partido_bloque(bloque)
        assert dur == 25
        assert carga == carga_partido_condicionado(25)
        # No recargo por nº de jugadores: 3 alineados = mismo que 22
        assert carga == carga_from_partido_bloque({
            "tipo": "partido_condicionado",
            "partido": {"duracion_min": 25},
        })[0]

    def test_20_min_is_about_30_not_competition_load(self):
        bloque = {
            "tipo": "partido_condicionado",
            "partido": {"duracion_min": 20},
        }
        carga, dur = carga_from_partido_bloque(bloque)
        assert dur == 20
        assert carga == 30.0
        old_competition_like = carga_tarea(
            duracion_min=20, densidad="alta", categoria_codigo="PCO", num_jugadores=22
        )
        assert carga < old_competition_like
        assert old_competition_like == 42.19


class TestAggregateWithPartido:
    def test_sums_tasks_and_partido(self):
        tareas = [
            {
                "duracion_override": 10,
                "tarea": {
                    "duracion_total": 10,
                    "densidad": "media",
                    "categoria": {"codigo": "JDP"},
                    "num_jugadores_min": 8,
                },
            }
        ]
        estructura = [
            {
                "tipo": "partido_condicionado",
                "partido": {"duracion_min": 20, "equipo_peto": {}, "equipo_sin_peto": {}},
            }
        ]
        carga, intensidad, dur = aggregate_sesion_carga(tareas, estructura)
        assert dur == 30
        assert carga > 0
        assert intensidad in ("alta", "media", "baja", "muy_baja")

    def test_without_estructura_matches_tasks_only(self):
        tareas = [
            {
                "duracion_override": 12,
                "tarea": {"duracion_total": 12, "densidad": "baja", "categoria": {"codigo": "RND"}},
            }
        ]
        a = aggregate_sesion_carga(tareas)
        b = aggregate_sesion_carga(tareas, [])
        assert a == b

    def test_compensatorio_carga_is_longest_group_not_both(self):
        media = {"densidad": "media", "categoria": {"codigo": "JDP"}, "num_jugadores_min": 8}
        tareas = [
            {"fase_sesion": "activacion", "duracion_override": 10, "tarea": {**media, "duracion_total": 10}},
            {"fase_sesion": "compensatorio_1", "duracion_override": 20, "tarea": {**media, "duracion_total": 20}},
            {"fase_sesion": "compensatorio_2", "duracion_override": 12, "tarea": {**media, "duracion_total": 12}},
        ]
        carga, _, dur = aggregate_sesion_carga(tareas, [])
        seq = carga_from_sesion_tarea(tareas[0])
        largo = carga_from_sesion_tarea(tareas[1])
        corto = carga_from_sesion_tarea(tareas[2])
        assert dur == 30
        assert carga == round(seq + largo, 2)
        assert carga < round(seq + largo + corto, 2)


class TestCargaPorGrupo:
    def test_short_group_does_not_inherit_both(self):
        day = date(2026, 11, 24)
        ctx = SessionLoadContext(
            sessions=[{
                "id": "s1",
                "fecha": day,
                "minutes": 30,
                "structural": 40,
                "peer_mean": 500,
                "presentes": {"a", "b"},
                "player_group": {
                    "a": {"minutes": 30, "carga": 40},
                    "b": {"minutes": 18, "carga": 12},
                },
            }],
            real={},
            mean_foster=100,
            mean_structural=40,
            mean_minutes=30,
        )
        assert player_session_loads(ctx, "a")[day] == 100
        assert player_session_loads(ctx, "b")[day] == 30
        with_rpe = SessionLoadContext(
            sessions=ctx.sessions,
            real={("b", "s1"): 90},
            mean_foster=100,
            mean_structural=40,
            mean_minutes=30,
        )
        assert player_session_loads(with_rpe, "b")[day] == 90
