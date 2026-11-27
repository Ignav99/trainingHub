from app.services.material_sugerido import sugerir_material


def _t(titulo, cat, desc="", nj=12, elems=(), **kw):
    t = {
        "titulo": titulo,
        "categoria": {"codigo": cat},
        "descripcion": desc,
        "num_jugadores_min": nj,
        "grafico_data": {"elements": [{"type": e} for e in elems]} if elems else None,
    }
    t.update(kw)
    return t


def test_no_sobrescribe_material_existente():
    assert sugerir_material(_t("Rondo", "RND", material=["Petos", "aros"])) == ["petos", "aros"]


def test_rondo_con_oposicion():
    out = sugerir_material(_t("Rondo 6v2 dos toques", "RND", "Rondo 6 contra 2 en espacio reducido", nj=8))
    assert out == ["balones", "petos", "conos"]


def test_pizarra_manda():
    out = sugerir_material(
        _t("Circuito", "CIR", elems=["player", "ball", "cone", "marker_disc", "hurdle", "pole", "ladder", "mannequin", "mini_goal"])
    )
    assert out == ["balones", "conos", "picas", "vallas", "escaleras", "porterias_reducidas", "maniquies"]


def test_rival_o_comodin_implica_petos():
    assert "petos" in sugerir_material(_t("X", "POS", elems=["player", "opponent"]))
    assert "petos" in sugerir_material(_t("X", "POS", elems=["player", "player_joker"]))


def test_texto_equipos_necesita_6_jugadores():
    assert "petos" in sugerir_material(_t("Posesión 6v6", "POS", nj=12))
    assert "petos" not in sugerir_material(_t("Duelo 1v1", "EVO", "1v1 de velocidad", nj=2))


def test_espacio_implica_conos():
    out = sugerir_material(_t("Posesión", "POS", espacio_largo=30, espacio_ancho=20))
    assert "conos" in out


def test_porterias():
    assert "porterias_reducidas" in sugerir_material(_t("Posesión con porterías de paso", "POS"))
    assert "porterias_reducidas" in sugerir_material(_t("Finalización", "FIN", "remate a miniporterías"))
    # portería grande dibujada y solo "finalización": no hacen falta reducidas
    assert "porterias_reducidas" not in sugerir_material(_t("Finalización", "FIN", "finalización", elems=["goal_large"]))


def test_trabajo_fisico_sin_balon():
    out = sugerir_material(_t("Fuerza básica", "GYM", "sentadilla trasera y hip thrust", nj=8))
    assert out == []
    out = sugerir_material(_t("Movilidad", "MOV", "activación con minibandas: monster walks", nj=10))
    assert out == ["gomas"]


def test_balon_en_prevencion_si_el_texto_lo_dice():
    out = sugerir_material(_t("Copenhagen", "PRV", "aductor isométrico con balón", nj=10))
    assert out == ["balones"]


def test_maniquies_en_abp_y_gps():
    assert "maniquies" in sugerir_material(_t("Faltas", "ABP", "faltas frontales sobre barrera"))
    out = sugerir_material(_t("SSG", "SSG", "control con GPS y pulsómetros"))
    assert "gps" in out and "pulsometros" in out
    assert "pulsometros" not in sugerir_material(_t("RAMP", "MOV", "elevación de pulsaciones"))


def test_tolera_datos_raros():
    assert sugerir_material({}) == []
    assert sugerir_material({"grafico_data": "x", "num_jugadores_min": "n/a", "categoria": None}) == []


def test_circuito_fisico_sin_balon_por_defecto():
    out = sugerir_material(_t("Test de agilidad", "CIR", "carrera con cambios de dirección", elems=["cone"]))
    assert out == ["conos"]


def test_movilidad_ignora_rival_de_pizarra():
    out = sugerir_material(_t("Respiraciones", "MOV", "respiración en parejas", elems=["player", "opponent"]))
    assert "petos" not in out
