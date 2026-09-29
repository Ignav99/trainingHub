"""Un PUT vacío no puede borrar el plan ni el informe que ya estaba guardado."""

from app.services.staff_text_guard import merge_staff_document, public_staff_document


def test_empty_phase_text_does_not_replace_saved_text():
    previous = {
        "tramos": {
            "ida": {
                "fases": [
                    {"fase": "ataque_organizado", "texto": "Salida en 3 por dentro."},
                    {"fase": "defensa_organizada", "texto": "Bloque medio."},
                ]
            }
        }
    }
    incoming = {
        "tramos": {
            "ida": {
                "fases": [
                    {"fase": "ataque_organizado", "texto": ""},
                    {"fase": "defensa_organizada", "texto": "Bloque medio, saltar al 16."},
                ]
            }
        }
    }
    merged = merge_staff_document(previous, incoming)
    fases = merged["tramos"]["ida"]["fases"]
    assert fases[0]["texto"] == "Salida en 3 por dentro."
    assert fases[1]["texto"] == "Bloque medio, saltar al 16."
    assert public_staff_document(merged).get("_historial") is None
    assert merged["_historial"][0]["texto"]["tramos"]["ida"]["fases"][0]["texto"] == "Salida en 3 por dentro."


def test_empty_list_does_not_wipe_phases():
    previous = {"fases": [{"fase": "transicion_ofensiva", "texto": "Tras robo, 10 segundos."}]}
    merged = merge_staff_document(previous, {"fases": []})
    assert merged["fases"][0]["texto"] == "Tras robo, 10 segundos."


def test_empty_scout_note_keeps_the_previous_comment():
    previous = {
        "estrategia": {
            "notas": "Ojo al 24.",
            "once_probable": {
                "jugadores": [{"nombre": "BORRUECO", "comentario": "Goleador."}]
            },
        }
    }
    incoming = {
        "estrategia": {
            "notas": "",
            "once_probable": {
                "jugadores": [{"nombre": "BORRUECO", "comentario": ""}]
            },
        }
    }
    merged = merge_staff_document(previous, incoming)
    assert merged["estrategia"]["notas"] == "Ojo al 24."
    assert merged["estrategia"]["once_probable"]["jugadores"][0]["comentario"] == "Goleador."


def test_real_edit_replaces_text_and_second_save_does_not_grow_without_change():
    first = merge_staff_document(
        {"fases": [{"fase": "abp_ofensiva", "texto": "Córner corto."}]},
        {"fases": [{"fase": "abp_ofensiva", "texto": "Córner al segundo palo."}]},
    )
    assert first["fases"][0]["texto"] == "Córner al segundo palo."
    assert len(first["_historial"]) == 1
    again = merge_staff_document(first, {"fases": [{"fase": "abp_ofensiva", "texto": "Córner al segundo palo."}]})
    assert len(again["_historial"]) == 1
