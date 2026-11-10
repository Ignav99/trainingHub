from app.services.microciclo_plan import dedupe_same_week, fill_missing_week_text, merge_plan_ct


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


def test_un_vacio_no_borra_el_olfato_ni_los_objetivos():
    current = {
        "olfato_ct": "Partido de muchos duelos.",
        "objetivos_semana": ["Trabajar concentración prolongada"],
    }
    merged = merge_plan_ct(current, {"olfato_ct": "  ", "objetivos_semana": []})
    assert merged["olfato_ct"] == "Partido de muchos duelos."
    assert merged["objetivos_semana"] == ["Trabajar concentración prolongada"]
    cleared = merge_plan_ct(current, {"olfato_ct": None, "objetivos_semana": None})
    assert cleared["olfato_ct"] == "Partido de muchos duelos."
    assert cleared["objetivos_semana"] == ["Trabajar concentración prolongada"]


def test_rellena_la_copia_vacia_con_el_texto_de_la_semana():
    filled = fill_missing_week_text(
        {},
        {
            "olfato_ct": "Campo rápido.",
            "objetivos_semana": ["Duelos"],
            "plan_partido": {"bloques": [1]},
        },
    )
    assert filled["olfato_ct"] == "Campo rápido."
    assert filled["objetivos_semana"] == ["Duelos"]
    assert "plan_partido" not in filled
    kept = fill_missing_week_text({"olfato_ct": "ya escrito"}, {"olfato_ct": "otro"})
    assert kept["olfato_ct"] == "ya escrito"


def test_la_lista_se_queda_con_la_copia_que_tiene_la_sesion():
    rows = [
        {"id": "texto", "equipo_id": "e", "fecha_inicio": "2026-11-09", "fecha_fin": "2026-11-15", "plan_ct": {"olfato_ct": "Campo rápido."}, "updated_at": "2"},
        {"id": "sesion", "equipo_id": "e", "fecha_inicio": "2026-11-09", "fecha_fin": "2026-11-15", "plan_ct": {"olfato_ct": "Campo rápido."}, "updated_at": "1"},
        {"id": "otra", "equipo_id": "e", "fecha_inicio": "2026-11-02", "fecha_fin": "2026-11-08", "plan_ct": {}, "updated_at": "0"},
    ]
    chosen = dedupe_same_week(rows, {"sesion": 1, "texto": 0})
    assert [row["id"] for row in chosen] == ["sesion", "otra"]
