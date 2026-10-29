"""Rutas y etiquetas de la biblioteca permanente de cortes."""

import importlib.util
from pathlib import Path

_path = Path(__file__).resolve().parents[1] / "app" / "services" / "biblioteca_cortes.py"
_spec = importlib.util.spec_from_file_location("biblioteca_cortes_pure", _path)
assert _spec and _spec.loader
mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mod)


def test_path_stays_inside_the_team_library():
    path = mod.make_biblioteca_storage_path(
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        "corte.mp4",
    )
    assert path == "biblioteca/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.mp4"
    assert mod.is_allowed_biblioteca_path(path, "11111111-1111-1111-1111-111111111111")
    assert not mod.is_allowed_biblioteca_path(path, "33333333-3333-3333-3333-333333333333")
    assert not mod.is_allowed_biblioteca_path("../biblioteca/x.mp4", "11111111-1111-1111-1111-111111111111")
    assert mod.corte_id_from_path(path) == "22222222-2222-2222-2222-222222222222"


def test_storage_label_uses_spanish_decimal():
    assert mod.format_storage_bytes(0) == "0 B"
    assert mod.format_storage_bytes(1536) == "1,5 KB"
    assert "MB" in mod.format_storage_bytes(5 * 1024 * 1024)


def test_search_drops_wildcard_characters():
    assert mod.clean_search("gol,  %pressing") == "gol   pressing"
    assert mod.minute_ok(0)
    assert mod.minute_ok(90)
    assert not mod.minute_ok(200)


def test_library_uses_the_cut_phase_before_the_folder():
    assert mod.resolve_clip_fase("defensa_organizada", ["ataque_organizado"]) == "defensa_organizada"
    assert mod.resolve_clip_fase("", ["creacion"]) == "creacion"
    assert mod.resolve_clip_fase(None, [None, "bloque_bajo"]) == "bloque_bajo"
    assert mod.resolve_clip_fase("  ", []) is None


def test_subfase_code_splits_from_parent_phase():
    assert mod.split_fase("creacion") == ("ataque_organizado", "creacion")
    assert mod.split_fase("bloque_mixto") == ("defensa_organizada", "bloque_mixto")
    assert mod.split_fase("ataque_organizado") == ("ataque_organizado", None)
    assert mod.split_fase(None) == (None, None)


def test_desk_codes_become_catalog_phases():
    assert mod.catalog_fase("abp_ofensiva") == "balon_parado_ofensivo"
    assert mod.catalog_fase("transicion_defensiva") == "transicion_ataque_defensa"
    assert mod.catalog_fase("ataque_organizado") == "ataque_organizado"
    assert mod.catalog_fase("  ") is None
    assert mod.split_fase("abp_defensiva") == ("balon_parado_defensivo", None)


def test_phase_filter_also_finds_cuts_saved_with_desk_codes():
    assert set(mod.fase_aliases("balon_parado_ofensivo")) == {"balon_parado_ofensivo", "abp_ofensiva"}
    assert set(mod.fase_aliases("abp_ofensiva")) == {"balon_parado_ofensivo", "abp_ofensiva"}
    assert mod.fase_aliases("ataque_organizado") == ["ataque_organizado"]
    assert mod.fase_aliases(None) == []


def test_download_name_is_readable_and_safe():
    assert mod.download_filename("Salida de balón", 12, "mp4") == "12' Salida de balón.mp4"
    assert mod.download_filename('a/b:c*"d', None, "webm") == "a_b_c_d.webm"
    assert mod.download_filename("", 3, "mp4") == "03' corte.mp4"
    assert len(mod.download_filename("x" * 300, None, "mp4")) <= 84
