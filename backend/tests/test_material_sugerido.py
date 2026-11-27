from app.services.material_sugerido import estimar_petos, sugerir_material


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
    assert sugerir_material(_t("Rondo", "RND", material=["petos:9", "aros"])) == ["petos:9", "aros"]


def test_rondo_con_oposicion_lleva_cantidad_de_petos():
    out = sugerir_material(_t("Rondo 6v2 dos toques", "RND", "Rondo 6 contra 2 en espacio reducido", nj=8))
    assert out == ["balones", "petos:2", "conos"]


def test_pizarra_manda_sin_maniquies():
    out = sugerir_material(
        _t("Circuito", "CIR", elems=["player", "ball", "cone", "marker_disc", "hurdle", "pole", "ladder", "mannequin", "mini_goal"])
    )
    assert out == ["balones", "conos", "picas", "vallas", "escaleras", "porterias_reducidas"]


def test_nunca_maniquies_gps_pulsometros():
    out = sugerir_material(_t("Faltas", "ABP", "faltas frontales sobre barrera con maniquí, GPS y pulsómetros"))
    assert not {"maniquies", "gps", "pulsometros"} & set(out)
    out = sugerir_material(_t("X", "CIR", elems=["mannequin"]))
    assert "maniquies" not in out


def test_petos_estructura_declarada():
    assert estimar_petos(_t("x", "POS", estructura_equipos="6vs6+2")) == 8
    assert estimar_petos(_t("x", "POS", estructura_equipos="5vs2")) == 2
    assert estimar_petos(_t("x", "POS", estructura_equipos="4vs4+3")) == 7
    assert estimar_petos(_t("x", "POS", estructura_equipos="8vs3+1")) == 4
    assert estimar_petos(_t("x", "POS", estructura_equipos="10vs10")) == 10
    assert estimar_petos(_t("x", "POS", estructura_equipos="8vs6")) == 6


def test_petos_desde_titulo():
    assert estimar_petos(_t("Posesión 4 vs 4 + 1 C interior + 2 C exterior", "POS")) == 7
    assert estimar_petos(_t("Oleadas 3v2 + 2v1 continuas", "EVO")) == 2


def test_petos_tres_equipos():
    assert estimar_petos(_t("Tricolor", "POS", "tres equipos de 4", nj=12)) == 8


def test_petos_desde_pizarra_y_fallback():
    # 6 propios, 4 rivales, 2 comodines -> 4 + 2
    assert estimar_petos(_t("x", "POS", elems=["player"] * 6 + ["opponent"] * 4 + ["player_joker"] * 2)) == 6
    # sin datos: mitad de jugadores, nunca menos de 1
    assert estimar_petos(_t("x", "POS", nj=13)) == 7
    assert estimar_petos(_t("x", "POS", nj=1)) == 1
    assert estimar_petos({}) is None


def test_rival_o_comodin_implica_petos_con_cantidad():
    out = sugerir_material(_t("X", "POS", elems=["player", "opponent"]))
    assert any(e.startswith("petos:") for e in out)
    assert any(e.startswith("petos:") for e in sugerir_material(_t("X", "POS", elems=["player", "player_joker"])))


def test_texto_equipos_necesita_6_jugadores():
    assert any(e.startswith("petos") for e in sugerir_material(_t("Posesión 6v6", "POS", nj=12)))
    assert not any(e.startswith("petos") for e in sugerir_material(_t("Duelo 1v1", "EVO", "1v1 de velocidad", nj=2)))


def test_espacio_implica_conos_salvo_trabajo_fisico():
    assert "conos" in sugerir_material(_t("Posesión", "POS", espacio_largo=30, espacio_ancho=20))
    assert "conos" not in sugerir_material(_t("Fuerza", "CIR", "circuito de fuerza por postas", espacio_largo=20, espacio_ancho=10))
    assert "conos" not in sugerir_material(_t("Movilidad", "MOV", "en una zona de 15 m", espacio_largo=15, espacio_ancho=10))


def test_porterias():
    assert "porterias_reducidas" in sugerir_material(_t("Posesión con porterías de paso", "POS"))
    assert "porterias_reducidas" in sugerir_material(_t("Finalización", "FIN", "remate a miniporterías"))
    assert "porterias_reducidas" not in sugerir_material(_t("Finalización", "FIN", "finalización", elems=["goal_large"]))


def test_trabajo_fisico_vacio_y_equipo_explicito():
    assert sugerir_material(_t("Fuerza básica", "GYM", "sentadilla trasera y hip thrust", nj=8)) == []
    assert sugerir_material(_t("RAMP", "MOV", "elevación de pulsaciones y movilidad", nj=10)) == []
    assert sugerir_material(_t("Movilidad", "MOV", "activación con minibandas", nj=10)) == ["gomas"]


def test_picas_vallas_solo_con_evidencia_en_juegos():
    assert sugerir_material(_t("Posesión 4v4", "POS", "con vallas y picas")) == ["balones", "petos:4"]  # texto no basta
    out = sugerir_material(_t("Circuito de saltos", "CIR", "saltos de valla y escaleras de coordinación"))
    assert "vallas" in out and "escaleras" in out


def test_balon_en_prevencion_si_el_texto_lo_dice():
    assert sugerir_material(_t("Copenhagen", "PRV", "aductor isométrico con balón", nj=10)) == ["balones"]


def test_circuito_fisico_sin_balon_por_defecto():
    assert sugerir_material(_t("Test de agilidad", "CIR", "carrera con cambios de dirección", elems=["cone"])) == ["conos"]


def test_movilidad_ignora_rival_de_pizarra():
    out = sugerir_material(_t("Respiraciones", "MOV", "respiración en parejas", elems=["player", "opponent"]))
    assert not any(e.startswith("petos") for e in out)


def test_tolera_datos_raros():
    assert sugerir_material({}) == []
    assert sugerir_material({"grafico_data": "x", "num_jugadores_min": "n/a", "categoria": None}) == []


def test_petos_duelos_pequenos_en_paralelo():
    assert estimar_petos(_t("Sprint + 1 vs 1", "LUD", nj=18)) == 9
    assert estimar_petos(_t("2 vs 1 en bandas", "SSG", nj=21)) == 7
    assert estimar_petos(_t("1v1", "EVO", nj=1)) == 1
