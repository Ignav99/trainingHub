"""Tests del extractor de keywords / keyphrases (ES táctico)."""

from app.services.keywords import normalize_keyword_list, synthesize_keywords


def test_presion_alta_tras_perdida():
    out = synthesize_keywords("Mejorar la presión alta tras pérdida")
    assert "presion alta tras perdida" in out
    assert "alta" not in out
    assert "tras" not in out


def test_salida_de_balon_phrase():
    out = synthesize_keywords("Trabajar salida de balón y progresión")
    assert "salida de balon" in out
    assert "progresion" in out
    assert "salidadebalon" not in out
    # no debe partir "salida" / "balon" sueltos si ya hay frase
    assert not ("salida" in out and "balon" in out)


def test_manual_extra_preserves_spaces():
    out = synthesize_keywords(None, extra=["salida de balón"])
    assert out == ["salida de balon"]


def test_normalize_does_not_glue():
    out = normalize_keyword_list(["salida de balon", "presión alta", "alta"])
    assert "salida de balon" in out
    assert "presion alta" in out
    assert "alta" not in out  # weak single


def test_1v1_and_rondo_kept():
    out = synthesize_keywords("Rondo + 1v1 en amplitud")
    assert "rondo" in out
    assert "1v1" in out
    assert "amplitud" in out
    assert "rondo 1v1" not in out
    assert "rondo + 1v1" not in out


def test_pressing_split_on_slash():
    out = synthesize_keywords("Presión / pressing + transición")
    assert "pressing" in out
    assert "transicion" in out
    assert "presion pressing" not in out
    assert "presion pressing + transicion" not in out


def test_empty_objetivo():
    assert synthesize_keywords("") == []
    assert synthesize_keywords(None, extra=[]) == []


def test_dedup_and_max():
    out = synthesize_keywords(
        "Presión alta. Presión alta otra vez.",
        extra=["presion alta"],
        max_keywords=5,
    )
    assert out.count("presion alta") == 1
