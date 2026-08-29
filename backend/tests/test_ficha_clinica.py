from datetime import date
from uuid import uuid4

from app.models.ficha_clinica import BloqueEvaluacion, EvaluacionCreate, MomentoEvaluacion
from app.services.ficha_clinica_metrics import (
    apply_derived,
    asimetria_pct,
    clasificacion_imc,
    imc,
    lectura_ake,
    lsi_pct,
    porcentaje_grasa_faulkner,
    snapshot_para_informe,
    suma_pliegues_faulkner,
)


def test_imc_adulto():
    assert imc(74.2, 178) == 23.4
    assert imc(None, 178) is None
    assert imc(70, 0) is None
    assert clasificacion_imc(17.9) == "bajo_peso"
    assert clasificacion_imc(22.0) == "normopeso"
    assert clasificacion_imc(27.0) == "sobrepeso"
    assert clasificacion_imc(31.0) == "obesidad"


def test_faulkner_hombres():
    datos = {
        "pliegue_tricipital": 8,
        "pliegue_subescapular": 10,
        "pliegue_suprailiaco": 9,
        "pliegue_abdominal": 12,
        "sexo_formula": "hombre",
    }
    assert suma_pliegues_faulkner(datos) == 39
    # 0.153 * 39 + 5.783 = 11.75 → 11.8
    assert porcentaje_grasa_faulkner(datos) == 11.8


def test_faulkner_mujeres():
    datos = {
        "pliegue_tricipital": 12,
        "pliegue_subescapular": 14,
        "pliegue_suprailiaco": 16,
        "pliegue_abdominal": 18,
        "sexo_formula": "mujer",
    }
    assert porcentaje_grasa_faulkner(datos) == 20.7


def test_asimetria_y_lsi():
    assert asimetria_pct(12, 10) == 16.7
    assert lsi_pct(162, 180) == 90.0
    assert lsi_pct(None, 180) is None


def test_apply_derived_hoja_fisios():
    datos = apply_derived({
        "talla_cm": 178,
        "peso_kg": 74.2,
        "dedo_pared_d": 12,
        "dedo_pared_i": 9,
        "ake_deficit_d": 18,
        "ake_deficit_i": 32,
        "longitud_pierna_d": 90,
        "ybt_ant_d": 81,
    })
    assert datos["imc"] == 23.4
    assert datos["imc_clasificacion"] == "normopeso"
    assert datos["dedo_pared_asimetria"] == 3.0
    assert datos["ake_lectura_d"] == "normal"
    assert datos["ake_lectura_i"] == "severo"
    assert datos["ybt_ant_pct_d"] == 90.0
    assert lectura_ake(25) == "leve"


def test_evaluacion_create_schema():
    ev = EvaluacionCreate(
        jugador_id=uuid4(),
        equipo_id=uuid4(),
        bloque=BloqueEvaluacion.VALORACION,
        fecha=date(2026, 9, 12),
        momento=MomentoEvaluacion.PRETEMPORADA,
        datos={"talla_cm": 178, "peso_kg": 74.2},
        notas="Primera toma de pretemporada",
    )
    assert ev.bloque == BloqueEvaluacion.VALORACION
    assert ev.datos["talla_cm"] == 178


def test_snapshot_informe_flags():
    snap = snapshot_para_informe({
        "fecha": "2026-09-12",
        "momento": "pretemporada",
        "notas": "Ok",
        "datos": {
            "talla_cm": 178,
            "peso_kg": 74.2,
            "pelvis": "anteversion",
            "ake_deficit_i": 34,
            "dedo_pared_d": 12,
            "dedo_pared_i": 8,
        },
    })
    assert snap["imc"] == 23.4
    assert snap["momento"] == "Pretemporada"
    assert snap["imc_clasificacion"] == "normopeso"
    assert any("Pelvis" in h for h in snap["hallazgos"])
    assert any("AKE" in h for h in snap["hallazgos"])
    assert any("dedo-pared" in h for h in snap["hallazgos"])
