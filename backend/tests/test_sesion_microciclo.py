from datetime import date

from app.services.sesion_microciclo import (
    _contexto_desde_plan,
    _elegir_micro,
    match_day_desde_partido,
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
