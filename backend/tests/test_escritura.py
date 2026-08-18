from app.api.v1.escritura import _clean_ai_text, is_conservative_correction


def test_rejects_rewrites_that_change_too_much():
    original = "Presion alta tras perdida en campo rival."
    rewritten = "El equipo debe presionar muy arriba nada más perder el balón, cerrar por dentro y orientar la salida del rival hacia la banda."
    assert is_conservative_correction(original, rewritten) is False


def test_accepts_light_spelling_fix():
    original = "Presion alta tras perdida en campo rival."
    fixed = "Presión alta tras pérdida en campo rival."
    assert is_conservative_correction(original, fixed) is True


def test_clean_strips_fences_and_quotes():
    original = "hola"
    assert _clean_ai_text('```\nPresión alta\n```', original) == 'Presión alta'
    assert _clean_ai_text('"Presión alta"', original) == 'Presión alta'
