"""El calendario de liga entero llega a `partidos`, aunque la RFAF corte o no publique fechas."""

import asyncio
from datetime import date, timedelta

from app.services import competition_linker_service as linker
from app.services.competition_linker_service import estimar_fechas_jornadas, link_competition
from app.services.rfef_scheduler_service import (
    jornadas_calendario_faltantes,
    ordenar_jornadas_a_refrescar,
    refrescar_jornadas,
)
from app.services.rfef_scraper_service import completar_calendario, total_jornadas_liga
from tests.fake_supabase import FakeSupabase

MI = "CLUB ATLÉTICO CENTRAL"
COMP = "comp-1"
J1 = date(2026, 9, 13)


def _fecha(n: int) -> str:
    return (J1 + timedelta(days=7 * (n - 1))).strftime("%d-%m-%Y")


def _jornada(n: int, con_fecha: bool = True) -> dict:
    rival = f"RIVAL {n:02d}"
    local, visitante = (MI, rival) if n % 2 else (rival, MI)
    return {
        "competicion_id": COMP,
        "numero": n,
        "partidos": [
            {"local": local, "visitante": visitante, "fecha": _fecha(n) if con_fecha else "", "hora": ""},
            {"local": f"OTRO A{n}", "visitante": f"OTRO B{n}", "fecha": _fecha(n) if con_fecha else ""},
        ],
    }


def _db_produccion() -> FakeSupabase:
    """J1-13 con fecha, J14 guardada en agosto sin fecha, J15-22 sin guardar, J23-34 con fecha."""
    jornadas = [_jornada(n) for n in range(1, 14)] + [_jornada(14, con_fecha=False)]
    jornadas += [_jornada(n) for n in range(23, 35)]
    return FakeSupabase({
        "rfef_jornadas": jornadas,
        "rivales": [],
        "rfef_actas": [],
        "partidos": [],
        "equipos": [{"id": "eq-1", "organizacion_id": "org-1"}],
    })


def _comp() -> dict:
    return {
        "id": COMP,
        "equipo_id": "eq-1",
        "organizacion_id": "org-1",
        "mi_equipo_nombre": MI,
        "clasificacion": [{"equipo": f"E{i}"} for i in range(18)],
    }


def test_total_jornadas_liga():
    assert total_jornadas_liga(18) == 34
    assert total_jornadas_liga(17) == 34
    assert total_jornadas_liga(14) == 26
    assert total_jornadas_liga(0) == 0


def test_completar_calendario_rellena_hasta_la_ultima_jornada():
    corto = [{"numero": n, "texto": f"Jornada {n}"} for n in range(1, 14)]
    nums = [j["numero"] for j in completar_calendario(corto, 18)]
    assert nums == list(range(1, 35))
    sin_clasif = [j["numero"] for j in completar_calendario([], 0)]
    assert sin_clasif == list(range(1, 31))
    assert [j["numero"] for j in completar_calendario(corto * 1, 0)] == list(range(1, 31))


def test_estimar_fechas_jornadas_interpola_una_semana_por_jornada():
    jornadas = [_jornada(13), _jornada(14, con_fecha=False), _jornada(23)]
    fechas = estimar_fechas_jornadas(jornadas)
    assert fechas[13] == date(2026, 12, 6)
    assert fechas[14] == date(2026, 12, 13)
    assert fechas[23] == date(2027, 2, 14)


def test_estimar_fechas_usa_otros_partidos_de_la_jornada():
    j = _jornada(14, con_fecha=False)
    j["partidos"][1]["fecha"] = "12-12-2026"
    assert estimar_fechas_jornadas([j])[14] == date(2026, 12, 12)


def test_linker_crea_partidos_mas_alla_de_la_jornada_sin_fecha():
    sb = _db_produccion()
    link_competition(sb, _comp())
    jornadas = sorted(p["jornada"] for p in sb.tables["partidos"])
    assert jornadas == list(range(1, 15)) + list(range(23, 35))
    j14 = next(p for p in sb.tables["partidos"] if p["jornada"] == 14)
    assert j14["fecha"] == "2026-12-13"
    assert all(p["fecha"] for p in sb.tables["partidos"])


def test_linker_sigue_aunque_falle_un_partido():
    sb = _db_produccion()

    def falla_j5(body):
        if body.get("jornada") == 5:
            raise RuntimeError("violates not-null constraint")

    sb.insert_hooks["partidos"] = falla_j5
    link_competition(sb, _comp())
    jornadas = {p["jornada"] for p in sb.tables["partidos"]}
    assert 5 not in jornadas
    assert {4, 6, 14, 34} <= jornadas


def test_fecha_estimada_no_pisa_la_existente():
    sb = _db_produccion()
    link_competition(sb, _comp())
    j14 = next(p for p in sb.tables["partidos"] if p["jornada"] == 14)
    j14["fecha"] = "2026-12-14"
    link_competition(sb, _comp())
    assert next(p for p in sb.tables["partidos"] if p["jornada"] == 14)["fecha"] == "2026-12-14"


def test_ordenar_prioriza_faltantes_y_sin_fecha():
    guardadas = {n: _jornada(n)["partidos"] for n in range(1, 14)}
    guardadas[14] = _jornada(14, con_fecha=False)["partidos"]
    orden = ordenar_jornadas_a_refrescar(list(range(1, 18)), guardadas)
    assert orden[:3] == [15, 16, 17]
    assert orden[3] == 14
    assert sorted(orden) == list(range(1, 18))


def test_jornadas_calendario_faltantes():
    sb = _db_produccion()
    cal = [{"numero": n} for n in range(1, 35)]
    assert jornadas_calendario_faltantes(sb, COMP, cal) == [14] + list(range(15, 23))


class _ScraperConCorte:
    """Devuelve vacío/errores en una ventana de peticiones, como el corte de la RFAF."""

    def __init__(self, fallos_hasta: int):
        self.llamadas = 0
        self.fallos_hasta = fallos_hasta
        self.pedidas: list[int] = []

    async def scrape_jornada_combined(self, _c, _g, num, _t):
        self.llamadas += 1
        self.pedidas.append(int(num))
        if self.llamadas <= self.fallos_hasta and int(num) in range(15, 23):
            raise RuntimeError("RFAF no devolvió datos tras 5 intentos")
        return {"numero": int(num), "partidos": _jornada(int(num))["partidos"]}


def _no_sleep(_s):
    async def _n():
        return None
    return _n()


def test_refrescar_jornadas_reintenta_las_fallidas():
    sb = _db_produccion()
    scraper = _ScraperConCorte(fallos_hasta=10)
    comp = {**_comp(), "rfef_codcompeticion": "1", "rfef_codgrupo": "2"}
    pendientes = asyncio.run(refrescar_jornadas(
        sb, scraper, comp, list(range(1, 35)), sleep=_no_sleep,
    ))
    assert pendientes == []
    guardadas = sorted(j["numero"] for j in sb.tables["rfef_jornadas"])
    assert guardadas == list(range(1, 35))
    assert scraper.pedidas[:9] == [15, 16, 17, 18, 19, 20, 21, 22, 14]


def test_refrescar_jornadas_devuelve_las_que_no_entran():
    sb = _db_produccion()
    scraper = _ScraperConCorte(fallos_hasta=10_000)
    comp = {**_comp(), "rfef_codcompeticion": "1", "rfef_codgrupo": "2"}
    pendientes = asyncio.run(refrescar_jornadas(
        sb, scraper, comp, list(range(1, 35)), sleep=_no_sleep,
    ))
    assert pendientes == list(range(15, 23))


def test_linker_no_importa_backfill_real(monkeypatch):
    llamadas = []
    monkeypatch.setattr(linker, "backfill_rival_escudos", lambda *_a, **_k: llamadas.append(1))
    link_competition(_db_produccion(), _comp())
    assert llamadas == [1]
