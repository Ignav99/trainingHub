import importlib.util
import json
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "backfill", Path(__file__).resolve().parents[1] / "scripts" / "backfill_material_tareas.py"
)
bf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bf)

TAREAS = [
    {"id": "a", "titulo": "Rondo 6v2", "descripcion": "rondo 6 contra 2", "num_jugadores_min": 8,
     "material": [], "categorias_tarea": {"codigo": "RND"}},
    {"id": "b", "titulo": "Ya tiene", "material": ["petos"], "categorias_tarea": {"codigo": "POS"}},
    {"id": "c", "titulo": "Fuerza", "descripcion": "sentadilla", "material": None,
     "categorias_tarea": {"codigo": "GYM"}},
]


def test_propuesta_ignora_con_material_y_sin_sugerencia():
    prop = bf.construir_propuesta(TAREAS)
    assert [p["id"] for p in prop] == ["a"]
    assert prop[0]["material_sugerido"] == ["balones", "petos:2"]


class _Q:
    def __init__(self, db):
        self.db, self.payload, self.id = db, None, None

    def update(self, payload):
        self.payload = payload
        return self

    def select(self, *_):
        return self

    def eq(self, k, v):
        self.id = v
        return self

    def execute(self):
        if self.payload is not None:
            self.db.writes.append((self.id, self.payload))
        return type("R", (), {"data": []})()


class _DB:
    def __init__(self):
        self.writes = []

    def table(self, _):
        return _Q(self)


def test_apply_escribe_backup_antes_y_restore_revierte(tmp_path):
    db = _DB()
    prop = bf.construir_propuesta(TAREAS)
    assert bf.aplicar(db, prop, tmp_path, "t") == 1
    backup = tmp_path / "backup_material_tareas_t.json"
    assert json.loads(backup.read_text()) == {"a": []}
    assert ("a", {"material": ["balones", "petos:2"]}) in db.writes
    db.writes.clear()
    assert bf.restaurar(db, backup) == 1
    assert ("a", {"material": []}) in db.writes


def test_propuesta_csv_y_json(tmp_path):
    prop = bf.construir_propuesta(TAREAS)
    j, c = bf.escribir_propuesta(prop, tmp_path, "t")
    assert "Balones; Petos (~2)" in c.read_text()
    assert json.loads(j.read_text())[0]["id"] == "a"
