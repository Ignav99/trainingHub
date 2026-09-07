from datetime import date

from app.services.sesion_microciclo import (
    _contexto_desde_plan,
    _elegir_micro,
    competicion_sesion_default,
    match_day_desde_partido,
    rival_nombre_desde_micro,
)


def test_match_day_desde_partido():
    assert match_day_desde_partido("2026-08-21", "2026-08-24") == "MD-3"
    assert match_day_desde_partido("2026-08-24", "2026-08-24") == "MD"
    assert match_day_desde_partido("2026-08-25", "2026-08-24") == "MD+1"
    assert match_day_desde_partido("2026-08-10", "2026-08-24") is None


def test_contexto_pretemporada():
    ctx, pre, tipo = _contexto_desde_plan({"tipo_microciclo": "pretemporada"})
    assert ctx == "pretemporada" and pre is True and tipo == "pretemporada"


def test_contexto_carga_es_competicion():
    ctx, pre, tipo = _contexto_desde_plan({"tipo_microciclo": "carga", "fase_temporada": "competicion"})
    assert ctx == "competicion" and pre is False and tipo == "carga"


def test_elige_micro_que_cubre_fecha():
    rows = [
        {"id": "a", "fecha_inicio": "2026-08-11", "fecha_fin": "2026-08-17"},
        {"id": "b", "fecha_inicio": "2026-08-18", "fecha_fin": "2026-08-24"},
        {"id": "c", "fecha_inicio": "2026-08-25", "fecha_fin": "2026-08-31"},
    ]
    chosen = _elegir_micro(rows, date(2026, 8, 24))
    assert chosen and chosen["id"] == "b"
    assert _elegir_micro(rows, date(2026, 9, 1)) is None


def test_rival_nombre_desde_sala_lunes():
    assert rival_nombre_desde_micro({"rivales": {"nombre": "Écija Balompié"}}) == "Écija Balompié"
    assert (
        rival_nombre_desde_micro(
            {"partidos": {"rivales": {"nombre": "Utrera"}, "competicion": "liga"}}
        )
        == "Utrera"
    )
    assert rival_nombre_desde_micro({"rival_id": "abc"}) is None
    assert rival_nombre_desde_micro(None) is None


def test_competicion_sesion_es_liga():
    assert competicion_sesion_default(None) == "liga"
    assert competicion_sesion_default("") == "liga"
    assert competicion_sesion_default("copa") == "liga"
    assert competicion_sesion_default("liga") == "liga"
    assert competicion_sesion_default("amistoso") == "amistoso"

