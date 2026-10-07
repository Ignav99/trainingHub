"""Un día de sesión no puede quedar sin carga si el jugador entrenó."""

from datetime import date

from app.services.load_calculation_service import (
    build_session_load_context,
    imputed_session_load,
    load_window_start,
    player_session_loads,
    real_rpe_load,
)


def test_real_rpe_load_ignores_rows_without_rpe():
    assert real_rpe_load({"carga_sesion": 400}) == 0
    assert real_rpe_load({"rpe": 6, "duracion_percibida": 80, "carga_sesion": 480}) == 480
    assert real_rpe_load({"rpe": 5, "duracion_percibida": 70}) == 350


def test_imputed_uses_the_session_peer_mean():
    assert imputed_session_load(
        peer_mean=460.0,
        structural=80,
        minutes=60,
        mean_foster=400,
        mean_structural=100,
        mean_minutes=80,
    ) == 460.0


def test_imputed_scales_the_average_session_by_structural_load():
    # Sesión al 80% de la carga media de tareas → 80% de la carga Foster media.
    assert imputed_session_load(
        peer_mean=None,
        structural=80,
        minutes=60,
        mean_foster=500,
        mean_structural=100,
        mean_minutes=90,
    ) == 400.0


def test_imputed_scales_by_minutes_when_the_session_has_no_structural_load():
    assert imputed_session_load(
        peer_mean=None,
        structural=0,
        minutes=45,
        mean_foster=400,
        mean_structural=0,
        mean_minutes=90,
    ) == 200.0


def test_imputed_never_returns_zero_without_a_team_reference():
    load = imputed_session_load(
        peer_mean=None,
        structural=0,
        minutes=0,
        mean_foster=0,
        mean_structural=0,
        mean_minutes=0,
    )
    assert load == 412.5


def test_present_player_without_rpe_gets_the_session_mean_and_real_rpe_is_kept():
    ctx = build_session_load_context(
        sessions=[{
            "id": "s1",
            "fecha": "2026-09-22",
            "duracion_total": 84,
            "carga_sesion": 120,
        }],
        attendance=[
            {"sesion_id": "s1", "jugador_id": "p1", "presente": True},
            {"sesion_id": "s1", "jugador_id": "p2", "presente": True},
            {"sesion_id": "s1", "jugador_id": "p3", "presente": False},
        ],
        rpe_rows=[{
            "sesion_id": "s1",
            "jugador_id": "p1",
            "rpe": 8,
            "duracion_percibida": 80,
            "carga_sesion": 640,
            "tipo": "sesion",
        }],
    )
    assert player_session_loads(ctx, "p1")[date(2026, 9, 22)] == 640
    assert player_session_loads(ctx, "p2")[date(2026, 9, 22)] == 640.0
    assert date(2026, 9, 22) not in player_session_loads(ctx, "p3")
    # 21 de 84 minutos: no hereda los 640 de quien hizo la sesión entera.
    ctx.sessions[0]["player_minutes"] = {"p2": 21, "p3": 0}
    assert player_session_loads(ctx, "p1")[date(2026, 9, 22)] == 640
    assert player_session_loads(ctx, "p2")[date(2026, 9, 22)] == 160.0
    assert date(2026, 9, 22) not in player_session_loads(ctx, "p3")


def test_historical_session_without_any_rpe_uses_relative_average():
    ctx = build_session_load_context(
        sessions=[
            {"id": "old", "fecha": "2026-08-17", "duracion_total": 70, "carga_sesion": 50},
            {"id": "new", "fecha": "2026-09-22", "duracion_total": 80, "carga_sesion": 100},
        ],
        attendance=[
            {"sesion_id": "old", "jugador_id": "p1", "presente": True},
            {"sesion_id": "new", "jugador_id": "p1", "presente": True},
            {"sesion_id": "new", "jugador_id": "p2", "presente": True},
        ],
        rpe_rows=[{
            "sesion_id": "new",
            "jugador_id": "p2",
            "rpe": 5,
            "duracion_percibida": 80,
            "carga_sesion": 400,
            "tipo": "sesion",
        }],
    )
    # Media Foster de sesiones con RPE = 400. Estructural media = 75.
    # 400 * (50/75) = 266.7
    assert ctx.mean_foster == 400
    assert player_session_loads(ctx, "p1")[date(2026, 8, 17)] == 266.7
    assert player_session_loads(ctx, "p1")[date(2026, 9, 22)] == 400.0


def test_completed_session_without_attendance_still_loads_the_player():
    ctx = build_session_load_context(
        sessions=[{"id": "s", "fecha": "2026-08-18", "duracion_total": 80, "carga_sesion": 100}],
        attendance=[],
        rpe_rows=[],
    )
    assert session_day(ctx, "anyone", date(2026, 8, 18)) > 0


def test_season_window_starts_in_july():
    assert load_window_start(date(2026, 10, 1)) == date(2026, 7, 1)
    assert load_window_start(date(2026, 3, 1)) == date(2025, 7, 1)


def session_day(ctx, jugador_id, day):
    return player_session_loads(ctx, jugador_id).get(day, 0)
