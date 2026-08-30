from app.services.jugador_tipo import incluye_tracking_carga, resolve_tipo_jugador


def test_resolve_tipo_from_column():
    assert resolve_tipo_jugador({"tipo_jugador": "juvenil", "es_invitado": True}) == "juvenil"
    assert resolve_tipo_jugador({"tipo_jugador": "plantilla", "es_invitado": False}) == "plantilla"


def test_resolve_tipo_legacy_invitado_flag():
    assert resolve_tipo_jugador({"es_invitado": True}) == "invitado"
    assert resolve_tipo_jugador({"es_invitado": False}) == "plantilla"


def test_filial_and_prueba_have_load_tracking():
    assert incluye_tracking_carga({"tipo_jugador": "juvenil", "es_invitado": True})
    assert incluye_tracking_carga({"tipo_jugador": "prueba", "es_invitado": True})
    assert incluye_tracking_carga({"tipo_jugador": "plantilla"})
    assert not incluye_tracking_carga({"tipo_jugador": "invitado", "es_invitado": True})
    assert not incluye_tracking_carga({"es_invitado": True})
