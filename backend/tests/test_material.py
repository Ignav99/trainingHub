from app.services.material import material_de_tareas, nombre_material


def test_union_ordenada_por_catalogo_y_sin_repetir():
    out = material_de_tareas([["conos", "balones"], ["Balones", "petos"], None, ["porterias_reducidas"]])
    assert out == ["Balones", "Petos", "Conos", "Porterías reducidas"]


def test_texto_libre_se_conserva_al_final():
    assert material_de_tareas([["aros", "conos"], "picas, aros"]) == ["Conos", "Picas", "Aros"]


def test_nombre_material():
    assert nombre_material("gps") == "GPS"
    assert nombre_material("Pulsómetros") == "Pulsómetros"
