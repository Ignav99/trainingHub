from app.services.microciclo_partido import (
    build_auto_link_patch,
    pick_week_partido,
    should_skip_auto_link,
)


def test_skip_pretemporada_and_manual_opt_out():
    assert should_skip_auto_link({"tipo_microciclo": "pretemporada"}) is True
    assert should_skip_auto_link({"fase_temporada": "pretemporada"}) is True
    assert should_skip_auto_link({"modo_partido": "none"}) is True
    assert should_skip_auto_link({"modo_partido": "amistoso_interno"}) is True
    assert should_skip_auto_link({"auto_link_partido": False}) is True
    assert should_skip_auto_link({"tipo_microciclo": "competicion", "modo_partido": "oficial"}) is False
    assert should_skip_auto_link({}) is False
    assert should_skip_auto_link(None) is False


def test_pick_week_partido_prefers_official_over_friendly():
    rows = [
        {"id": "amistoso", "fecha": "2026-09-21", "competicion": "amistoso", "rival_id": "r0"},
        {"id": "liga", "fecha": "2026-09-27", "competicion": "liga", "rival_id": "r1"},
    ]
    picked = pick_week_partido(rows)
    assert picked is not None
    assert picked["id"] == "liga"


def test_pick_week_partido_falls_back_to_friendly():
    rows = [
        {"id": "a", "fecha": "2026-09-24", "competicion": "amistoso", "rival_id": "r0"},
    ]
    assert pick_week_partido(rows)["id"] == "a"
    assert pick_week_partido([]) is None


def test_patch_assigns_partido_and_rival():
    patch = build_auto_link_patch(
        partido_id=None,
        rival_id=None,
        week_partido={"id": "p1", "rival_id": "r1"},
        linked_partido=None,
    )
    assert patch == {"partido_id": "p1", "rival_id": "r1"}


def test_patch_does_not_overwrite_existing_match():
    patch = build_auto_link_patch(
        partido_id="already",
        rival_id="r-keep",
        week_partido={"id": "other", "rival_id": "r-new"},
        linked_partido={"id": "already", "rival_id": "r-keep"},
    )
    assert patch == {}


def test_patch_fills_missing_rival_from_linked_match():
    patch = build_auto_link_patch(
        partido_id="p1",
        rival_id=None,
        week_partido=None,
        linked_partido={"id": "p1", "rival_id": "r9"},
    )
    assert patch == {"rival_id": "r9"}


def test_patch_empty_when_no_week_match():
    patch = build_auto_link_patch(
        partido_id=None,
        rival_id=None,
        week_partido=None,
        linked_partido=None,
    )
    assert patch == {}
