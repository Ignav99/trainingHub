from app.services.material import (
    CATALOGO,
    codigos_de_tareas,
    material_de_tareas,
    nombre_material,
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
