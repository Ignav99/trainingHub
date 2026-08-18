"""Tests for rival escudo helpers and season cleanup."""
from unittest.mock import MagicMock, patch

from app.services.competition_linker_service import cleanup_outdated_rivals
from app.services.rival_escudo_service import (
    _needs_escudo_refresh,
    backfill_rival_escudos,
    build_escudo_lookup,
    normalize_rfaf_escudo_url,
)


def test_normalize_rfaf_escudo_url_relative():
    assert (
        normalize_rfaf_escudo_url("/pnfg/pimg/Clubes/123.png")
        == "https://www.rfaf.es/pnfg/pimg/Clubes/123.png"
    )


def test_build_escudo_lookup_from_clasificacion_and_actas():
    comp = {
        "clasificacion": [
            {"equipo": "Equipo A", "escudo_url": "https://www.rfaf.es/pnfg/pimg/Clubes/a.png"},
        ],
    }
    actas = [
        {
            "local_nombre": "Equipo B",
            "visitante_nombre": "Equipo C",
            "local_escudo_url": "/pnfg/pimg/Clubes/b.png",
            "visitante_escudo_url": None,
        },
    ]
    lookup = build_escudo_lookup(comp, actas)
    assert lookup["equipo a"] == "https://www.rfaf.es/pnfg/pimg/Clubes/a.png"
    assert lookup["equipo b"] == "https://www.rfaf.es/pnfg/pimg/Clubes/b.png"


def test_cleanup_skips_current_opponents():
    supabase = MagicMock()
    rivales = MagicMock()
    rivales.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "r-keep",
                "nombre": "Rival Actual",
                "rfef_nombre": "Rival Actual",
                "scout_manual": None,
                "plan_partido_manual": None,
                "notas": "",
            },
        ]
    )
    supabase.table.return_value = rivales

    deleted = cleanup_outdated_rivals(
        supabase, "org-1", "eq-1", {"Rival Actual"}
    )
    assert deleted == 0
    rivales.delete.assert_not_called()


def test_needs_escudo_refresh_force():
    assert _needs_escudo_refresh({"escudo_url": "https://x.supabase.co/storage/escudo.png"}, True) is True


def test_needs_escudo_refresh_hotlink():
    assert _needs_escudo_refresh({"escudo_url": "https://www.rfaf.es/pnfg/pimg/x.png"}, False)


@patch("app.services.rival_escudo_service.apply_escudo_to_rival", return_value=True)
@patch("app.services.rival_escudo_service.persist_escudo_from_rfaf")
def test_backfill_returns_stats(mock_persist, mock_apply):
    supabase = MagicMock()
    comp_table = MagicMock()
    comp_table.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={
            "clasificacion": [
                {"equipo": "Rival A", "escudo_url": "/pnfg/pimg/a.png"},
            ],
            "mi_equipo_nombre": "Mi Equipo",
        }
    )
    actas_table = MagicMock()
    actas_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    rivales_table = MagicMock()
    rivales_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"id": "r1", "nombre": "Rival A", "rfef_nombre": "Rival A", "escudo_url": None}]
    )
    insert_table = MagicMock()

    def table_router(name):
        if name == "rfef_competiciones":
            return comp_table
        if name == "rfef_actas":
            return actas_table
        if name == "rivales":
            if insert_table.insert.called:
                return insert_table
            return rivales_table
        return MagicMock()

    supabase.table.side_effect = table_router

    stats = backfill_rival_escudos(
        supabase,
        {"id": "c1", "equipo_id": "e1", "organizacion_id": "o1", "clasificacion": []},
        force=True,
        create_missing=False,
    )
    assert stats["total_teams"] == 1
    assert stats["updated"] >= 1
