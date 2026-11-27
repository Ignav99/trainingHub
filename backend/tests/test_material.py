from app.services.material import (
    CATALOGO,
    codigos_de_tareas,
    material_de_tareas,
    entrada_material,
    nombre_material,
    parse_entrada,
    sincronizar_materiales_sesion,
    sincronizar_materiales_sesiones_de_tarea,
)


def test_union_ordenada_por_catalogo_y_sin_repetir():
    out = material_de_tareas([["conos", "balones"], ["Balones", "petos"], None, ["porterias_reducidas"]])
    assert out == ["Balones", "Petos", "Conos", "Porterías reducidas"]


def test_texto_libre_se_conserva_al_final():
    assert material_de_tareas([["aros", "conos"], "picas, aros"]) == ["Conos", "Picas", "Aros"]


def test_nombre_material():
    assert nombre_material("gps") == "GPS"
    assert nombre_material("Pulsómetros") == "Pulsómetros"


def test_codigos_de_tareas_canonicos_y_ordenados():
    assert codigos_de_tareas([["Conos", "balones"], "Porterías reducidas, aros", None]) == [
        "balones", "conos", "porterias_reducidas", "aros",
    ]
    assert codigos_de_tareas([]) == []


class _Q:
    def __init__(self, db, name):
        self.db, self.name, self.op, self.payload, self.filters = db, name, "select", None, {}

    def select(self, *_a):
        self.op = "select"
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def eq(self, k, v):
        self.filters[k] = v
        return self

    def execute(self):
        if self.op == "update":
            self.db.updates.append((self.name, self.payload, dict(self.filters)))
            return type("R", (), {"data": []})()
        if self.db.boom:
            raise RuntimeError("db down")
        rows = [r for r in self.db.tables[self.name]
                if all(r.get(k) == v for k, v in self.filters.items())]
        return type("R", (), {"data": rows})()


class _DB:
    def __init__(self, tables, boom=False):
        self.tables, self.boom, self.updates = tables, boom, []

    def table(self, name):
        return _Q(self, name)


def test_sincronizar_guarda_union_en_sesion():
    db = _DB({"sesion_tareas": [
        {"sesion_id": "s1", "tareas": {"material": ["conos", "balones"]}},
        {"sesion_id": "s1", "tareas": {"material": []}},
        {"sesion_id": "s1", "tareas": None},
        {"sesion_id": "s2", "tareas": {"material": ["gps"]}},
    ]})
    assert sincronizar_materiales_sesion(db, "s1") == ["balones", "conos"]
    assert db.updates == [("sesiones", {"materiales": ["balones", "conos"]}, {"id": "s1"})]


def test_sincronizar_sesion_sin_tareas_vacia_materiales():
    db = _DB({"sesion_tareas": []})
    assert sincronizar_materiales_sesion(db, "s1") == []
    assert db.updates[0][1] == {"materiales": []}


def test_sincronizar_no_bloquea_si_falla():
    assert sincronizar_materiales_sesion(_DB({}, boom=True), "s1") is None


def test_sincronizar_sesiones_de_tarea():
    db = _DB({"sesion_tareas": [
        {"sesion_id": "s1", "tarea_id": "t1", "tareas": {"material": ["petos"]}},
        {"sesion_id": "s2", "tarea_id": "t1", "tareas": {"material": ["petos"]}},
    ]})
    sincronizar_materiales_sesiones_de_tarea(db, "t1")
    assert {u[2]["id"] for u in db.updates} == {"s1", "s2"}


def test_catalogo_espejo_del_frontend():
    import re
    from pathlib import Path
    src = (Path(__file__).resolve().parents[2] / "frontend/src/lib/catalogos/canonico.ts").read_text()
    bloque = src.split("export const MATERIALES = [", 1)[1].split("] as const", 1)[0]
    pares = re.findall(r"codigo: '([^']+)', nombre: '([^']+)'", bloque)
    assert dict(pares) == CATALOGO
    assert [c for c, _ in pares] == list(CATALOGO)


def test_parse_entrada_con_cantidad_y_legado():
    assert parse_entrada("petos:12") == ("petos", 12)
    assert parse_entrada("Petos: 8") == ("petos", 8)
    assert parse_entrada("petos") == ("petos", None)
    assert parse_entrada("petos:0") == ("petos", None)
    assert parse_entrada("petos:abc") == ("petos", None)
    # solo los petos llevan cantidad
    assert parse_entrada("conos:5") == ("conos:5", None)
    assert parse_entrada("aros: 4") == ("aros: 4", None)


def test_entrada_material_roundtrip():
    assert entrada_material("petos", 12) == "petos:12"
    assert entrada_material("petos", None) == "petos"
    assert entrada_material("conos", 5) == "conos"


def test_nombre_material_petos_aproximados():
    assert nombre_material("petos:12") == "Petos (~12)"
    assert nombre_material("petos") == "Petos"
    assert nombre_material("balones") == "Balones"


def test_material_de_tareas_agrega_petos_por_maximo_no_suma():
    out = material_de_tareas([["balones", "petos:8"], ["petos:12", "conos"], ["petos"], None])
    assert out == ["Balones", "Petos (~12)", "Conos"]


def test_petos_sin_cantidad_en_ninguna_tarea():
    assert material_de_tareas([["petos"], ["petos"]]) == ["Petos"]


def test_codigos_de_tareas_sin_cantidades_para_el_filtro():
    assert codigos_de_tareas([["petos:12", "balones"], ["petos:8"]]) == ["balones", "petos"]


def test_sincronizar_guarda_codigos_planos():
    db = _DB({"sesion_tareas": [{"sesion_id": "s1", "tareas": {"material": ["petos:10", "conos"]}}]})
    assert sincronizar_materiales_sesion(db, "s1") == ["petos", "conos"]
