from app.services.microciclo_plan import merge_plan_ct


def test_un_enlace_de_partido_no_borra_olfato_ni_objetivos():
    current = {
        "olfato_ct": "El grupo llega justo.",
        "objetivos_semana": ["Presionar la salida"],
        "auto_link_partido": True,
    }
    merged = merge_plan_ct(current, {"auto_link_partido": False})
    assert merged["olfato_ct"] == "El grupo llega justo."
    assert merged["objetivos_semana"] == ["Presionar la salida"]
    assert merged["auto_link_partido"] is False


def test_una_respuesta_vieja_sin_olfato_no_lo_borra():
    current = {"olfato_ct": "Ojo con el 9", "objetivos_semana": ["Bloque medio"]}
    stale = {"tipo_microciclo": "competicion"}
    merged = merge_plan_ct(current, stale)
    assert merged["olfato_ct"] == "Ojo con el 9"
    assert merged["objetivos_semana"] == ["Bloque medio"]
    assert merged["tipo_microciclo"] == "competicion"


def test_el_texto_nuevo_sustituye_y_null_borra():
    current = {"olfato_ct": "antes", "notas_ct": "vieja"}
    merged = merge_plan_ct(current, {"olfato_ct": "ahora", "notas_ct": None})
    assert merged["olfato_ct"] == "ahora"
    assert "notas_ct" not in merged


def test_sin_plan_previo_guarda_lo_que_llega():
    assert merge_plan_ct(None, {"olfato_ct": "primero"}) == {"olfato_ct": "primero"}
