from datetime import date

from app.services.microciclo_estado import aplicar_filtro_estado, estado_desde_fechas


HOY = date(2026, 8, 24)


def test_en_curso_incluye_hoy():
    assert estado_desde_fechas("2026-08-18", "2026-08-24", HOY) == "en_curso"
    assert estado_desde_fechas("2026-08-24", "2026-08-30", HOY) == "en_curso"


def test_completado_si_ya_paso():
    assert estado_desde_fechas("2026-08-11", "2026-08-17", HOY) == "completado"


def test_planificado_si_es_futuro():
    assert estado_desde_fechas("2026-08-25", "2026-08-31", HOY) == "planificado"


def test_borrador_sin_fechas():
    assert estado_desde_fechas(None, None, HOY) == "borrador"
    assert estado_desde_fechas("no-fecha", "2026-08-24", HOY) == "borrador"


class _Q:
    def __init__(self):
        self.ops = []

    def lte(self, k, v):
        self.ops.append(("lte", k, v))
        return self

    def gte(self, k, v):
        self.ops.append(("gte", k, v))
        return self

    def lt(self, k, v):
        self.ops.append(("lt", k, v))
        return self

    def gt(self, k, v):
        self.ops.append(("gt", k, v))
        return self


def test_filtro_en_curso_por_fechas():
    q = aplicar_filtro_estado(_Q(), "en_curso", HOY)
    assert ("lte", "fecha_inicio", "2026-08-24") in q.ops
    assert ("gte", "fecha_fin", "2026-08-24") in q.ops


def test_filtro_completado_por_fechas():
    q = aplicar_filtro_estado(_Q(), "completado", HOY)
    assert q.ops == [("lt", "fecha_fin", "2026-08-24")]
