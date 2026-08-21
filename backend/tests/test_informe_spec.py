from app.services.informe_spec import InformeSpec, narrativa_periodo, parse_informe_prompt


def test_metodologia_breve_competicion():
    spec = parse_informe_prompt(
        "informe breve de competición para el jefe de metodología, últimos 5 partidos"
    )
    assert spec.audiencia == "metodologia"
    assert spec.profundidad == "breve"
    assert spec.ambito == "competicion"
    assert spec.ultimos_n == 5
    assert spec.asunto in ("resultados", "temporada", "microciclo")


def test_amistosos_excluidos_por_defecto_oficial():
    spec = parse_informe_prompt("estadísticas de temporada oficiales sin amistosos")
    assert spec.ambito == "competicion"
    assert spec.asunto == "temporada"


def test_ficha_jugador_por_nombre():
    jugadores = [
        {"id": "abc", "nombre": "Carlos", "apellidos": "Ramírez", "apodo": "Rama"},
        {"id": "zzz", "nombre": "Luis", "apellidos": "Pérez", "apodo": None},
    ]
    spec = parse_informe_prompt("ficha extendida de Ramírez", jugadores=jugadores)
    assert spec.asunto == "jugador"
    assert spec.profundidad == "extendido"
    assert spec.jugador_id == "abc"


def test_plantilla_disciplina():
    spec = parse_informe_prompt("plantilla extendida con minutos y tarjetas")
    assert spec.asunto == "plantilla"
    assert "plantilla" in spec.secciones
    assert "disciplina" in spec.secciones


def test_una_hoja_es_breve():
    spec = parse_informe_prompt("últimos 5 oficiales, una hoja, para el cuerpo técnico")
    assert spec.profundidad == "breve"
    assert spec.ultimos_n == 5
    assert spec.ambito == "competicion"


def test_blank_notas_and_dates():
    spec = InformeSpec(notas="", fecha_desde="", titulo="")
    assert spec.notas is None
    assert spec.fecha_desde is None
    assert spec.titulo is None


def test_narrativa_vacia():
    text = narrativa_periodo({"pj": 0}, "Solo competición", "estandar")
    assert "No hay partidos" in text


def test_narrativa_direccion_con_racha():
    text = narrativa_periodo(
        {"pj": 4, "pg": 2, "pe": 1, "pp": 1, "gf": 5, "gc": 4},
        "Solo competición",
        "estandar",
        "direccion",
        racha=["V", "E", "D", "V"],
    )
    assert "4 partidos" in text
    assert "pts" in text
    assert "V-E-D-V" in text
