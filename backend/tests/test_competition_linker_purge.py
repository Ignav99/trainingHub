from app.services.competition_linker_service import auto_creado_ids_to_purge


def _liga(n: int):
    return [{"id": f"p{i}", "auto_creado": True, "jornada": i} for i in range(1, n + 1)]


def test_empty_scrape_purges_nothing():
    existing = _liga(34) + [
        {"id": "amistoso", "auto_creado": False, "jornada": None},
        {"id": "manual-liga", "auto_creado": False, "jornada": 3},
    ]
    assert auto_creado_ids_to_purge(existing, set()) == []


def test_thin_scrape_purges_nothing():
    existing = _liga(34)
    assert auto_creado_ids_to_purge(existing, {1}) == []
    assert auto_creado_ids_to_purge(existing, {1, 2, 3}) == []


def test_complete_calendar_purges_only_stale_auto_creado():
    existing = [
        {"id": "keep", "auto_creado": True, "jornada": 1},
        {"id": "stale", "auto_creado": True, "jornada": 2},
        {"id": "manual", "auto_creado": False, "jornada": 99},
        {"id": "amistoso", "auto_creado": False, "jornada": None},
    ]
    assert auto_creado_ids_to_purge(existing, {1}) == ["stale"]


def test_full_rfef_calendar_can_drop_obsolete_jornada():
    existing = _liga(34) + [{"id": "old", "auto_creado": True, "jornada": 99}]
    my = set(range(1, 35))
    assert auto_creado_ids_to_purge(existing, my) == ["old"]
