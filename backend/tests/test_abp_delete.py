from app.services.abp_delete import strip_jugada_refs


def test_strip_removes_only_the_deleted_play():
    phase = {
        "comentario_general": "Salida",
        "jugadas_abp": [
            {"jugada_id": "keep", "comentario": "Corta", "orden": 0},
            {"jugada_id": "gone", "comentario": "Larga", "orden": 1},
        ],
        "subfases": {
            "salida": {"jugadas_abp": [{"jugada_id": "gone", "orden": 0}]},
        },
    }
    nxt, changed = strip_jugada_refs(phase, "gone")
    assert changed is True
    assert nxt["comentario_general"] == "Salida"
    assert nxt["jugadas_abp"] == [{"jugada_id": "keep", "comentario": "Corta", "orden": 0}]
    assert nxt["subfases"]["salida"]["jugadas_abp"] == []


def test_strip_leaves_unrelated_plans_alone():
    phase = {"jugadas_abp": [{"jugada_id": "other", "orden": 0}]}
    nxt, changed = strip_jugada_refs(phase, "gone")
    assert changed is False
    assert nxt == phase
