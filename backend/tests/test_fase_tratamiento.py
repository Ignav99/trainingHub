from app.services.medical_availability_service import (
    default_disponibilidad,
    disponibilidad_from_fase_tratamiento,
    estado_from_record,
    normalize_create_fase,
    records_que_afectan_disponibilidad,
    resolve_record_disponibilidad,
)


def test_fase_tratamiento_mapea_disponibilidad():
    assert disponibilidad_from_fase_tratamiento("reposo") == "fuera"
    assert disponibilidad_from_fase_tratamiento("margen") == "individual"
    assert disponibilidad_from_fase_tratamiento("inicio_grupo") == "grupo_adaptado"
    assert disponibilidad_from_fase_tratamiento("disponible") == "pleno"
    assert disponibilidad_from_fase_tratamiento(None) is None


def test_resolve_record_prioriza_fase_tratamiento():
    rec = {
        "tipo": "lesion",
        "estado": "activo",
        "disponibilidad": "fuera",
        "fase_tratamiento": "inicio_grupo",
    }
    assert resolve_record_disponibilidad(rec) == "grupo_adaptado"


def test_historico_no_cambia_disponibilidad_default_alta():
    assert default_disponibilidad("lesion", "alta") == "pleno"


def test_fase_disponible_cuenta_como_activo_en_programa():
    rec = {
        "tipo": "lesion",
        "estado": "en_recuperacion",
        "fase_tratamiento": "disponible",
    }
    assert resolve_record_disponibilidad(rec) == "pleno"
    assert estado_from_record(rec) == "activo"


def test_reposo_es_lesionado():
    rec = {"tipo": "lesion", "estado": "activo", "fase_tratamiento": "reposo"}
    assert estado_from_record(rec) == "lesionado"


def test_margen_es_en_recuperacion():
    rec = {"tipo": "lesion", "estado": "activo", "fase_tratamiento": "margen"}
    assert estado_from_record(rec) == "en_recuperacion"


def test_molestias_siempre_pleno():
    rec = {
        "tipo": "molestias",
        "estado": "activo",
        "fase_tratamiento": "reposo",
        "disponibilidad": "fuera",
        "severidad": "grave",
    }
    assert default_disponibilidad("molestias", "activo", severidad="grave") == "pleno"
    assert resolve_record_disponibilidad(rec) == "pleno"
    assert estado_from_record(rec) == "activo"


def test_molestias_no_afectan_disponibilidad_del_jugador():
    records = [
        {"tipo": "molestias", "estado": "activo", "disponibilidad": "pleno"},
        {"tipo": "lesion", "estado": "activo", "fase_tratamiento": "margen"},
    ]
    ops = records_que_afectan_disponibilidad(records)
    assert len(ops) == 1
    assert ops[0]["tipo"] == "lesion"


def test_lesion_nueva_solo_reposo_o_margen():
    assert normalize_create_fase("lesion", "inicio_grupo") == ("reposo", "fuera")
    assert normalize_create_fase("lesion", "disponible") == ("reposo", "fuera")
    assert normalize_create_fase("lesion", "margen") == ("margen", "individual")
    assert normalize_create_fase("lesion", "reposo") == ("reposo", "fuera")
    assert normalize_create_fase("molestias", "reposo") == (None, "pleno")
    assert normalize_create_fase("lesion", "reposo", is_historical=True) == (None, "pleno")
