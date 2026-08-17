"""Tests for rival escudo helpers and season cleanup."""
from unittest.mock import MagicMock, patch

from app.services.competition_linker_service import cleanup_outdated_rivals
from app.services.rival_escudo_service import build_escudo_lookup, normalize_rfaf_escudo_url


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
