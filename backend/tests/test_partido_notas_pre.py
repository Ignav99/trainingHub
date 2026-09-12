from datetime import date, datetime
from uuid import uuid4

from app.models.partido import PartidoResponse, PartidoUpdate, coerce_notas_pre


def test_coerce_notas_pre_keeps_json_string():
    raw = '{"formacion":"4-3-3"}'
    assert coerce_notas_pre(raw) == raw
    assert coerce_notas_pre(None) is None


def test_partido_response_accepts_jsonb_object_notas_pre():
    payload = {
        "id": uuid4(),
        "equipo_id": uuid4(),
        "rival_id": uuid4(),
        "fecha": date.today(),
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "notas_pre": {
            "formacion": "4-3-3",
            "formacion_slots": {"POR": "c-por", "DC": "c-dc"},
            "anotador": {"events": [], "slots": {}},
        },
    }
    partido = PartidoResponse(**payload)
    assert isinstance(partido.notas_pre, str)
    assert '"formacion": "4-3-3"' in partido.notas_pre or '"formacion":"4-3-3"' in partido.notas_pre
    assert "c-por" in partido.notas_pre


def test_partido_update_accepts_jsonb_object_notas_pre():
    update = PartidoUpdate(notas_pre={"formacion": "4-4-2", "formacion_slots": {"POR": "c1"}})
    assert isinstance(update.notas_pre, str)
    assert "4-4-2" in update.notas_pre
