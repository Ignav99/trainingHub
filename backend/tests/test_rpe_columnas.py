"""RPE column summary: last load and weekday means."""

from datetime import date

from app.services.rpe_columnas import carga_ua, summarize_rpe_columns


def test_carga_is_rpe_times_effective_minutes():
    assert carga_ua(7, 80) == 560
    assert carga_ua(None, 80) is None
    assert carga_ua(6, 0) is None


def test_last_event_and_weekday_means():
    summary = summarize_rpe_columns([
        {"fecha": date(2026, 9, 22), "rpe": 6, "minutos": 70, "kind": "sesion"},  # tue
        {"fecha": date(2026, 9, 24), "rpe": 8, "minutos": 75, "kind": "sesion"},  # thu
        {"fecha": date(2026, 9, 25), "rpe": 5, "minutos": 60, "kind": "sesion"},  # fri
        {"fecha": date(2026, 9, 15), "rpe": 4, "minutos": 70, "kind": "sesion"},  # tue
        {"fecha": date(2026, 9, 27), "rpe": 9, "minutos": 90, "kind": "partido"},
    ])
    assert summary["rpe_ultimo"] == 9
    assert summary["rpe_ultimo_tipo"] == "partido"
    assert summary["carga_ua_ultimo"] == 810
    assert summary["rpe_media_martes"] == 5
    assert summary["rpe_media_jueves"] == 8
    assert summary["rpe_media_viernes"] == 5
    assert summary["rpe_media_partido"] == 9
