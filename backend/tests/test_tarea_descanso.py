from app.services.tarea_descanso import format_descanso, normalize_descanso_seconds


def test_legacy_minutes_become_seconds():
    assert normalize_descanso_seconds(1) == 60
    assert normalize_descanso_seconds(2) == 120
    assert normalize_descanso_seconds(0) == 0
    assert normalize_descanso_seconds(None) == 0


def test_already_seconds_stay():
    assert normalize_descanso_seconds(30) == 30
    assert normalize_descanso_seconds(90) == 90
    assert normalize_descanso_seconds(15) == 15


def test_format_descanso_labels():
    assert format_descanso(1) == "1 min"
    assert format_descanso(30) == "30 s"
    assert format_descanso(90) == "1 min 30 s"
    assert format_descanso(0) == ""
    assert format_descanso(120) == "2 min"
