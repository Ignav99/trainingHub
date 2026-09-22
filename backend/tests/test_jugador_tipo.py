from app.services.jugador_tipo import (
    auto_include_in_sesion_asistencia,
    incluye_tracking_carga,
    is_filial,
    resolve_tipo_jugador,
    rpe_roster_sort_key,
)


def test_resolve_tipo_from_column():
    assert resolve_tipo_jugador({"tipo_jugador": "juvenil", "es_invitado": True}) == "juvenil"
    assert resolve_tipo_jugador({"tipo_jugador": "plantilla", "es_invitado": False}) == "plantilla"


def test_resolve_tipo_legacy_invitado_flag():
    assert resolve_tipo_jugador({"es_invitado": True}) == "invitado"
    assert resolve_tipo_jugador({"es_invitado": False}) == "plantilla"


def test_filial_is_not_auto_included_in_session_attendance():
    assert auto_include_in_sesion_asistencia({"tipo_jugador": "plantilla"})
    assert not auto_include_in_sesion_asistencia({"tipo_jugador": "juvenil"})
    assert not auto_include_in_sesion_asistencia({"tipo_jugador": "prueba"})
    assert not auto_include_in_sesion_asistencia({"tipo_jugador": "invitado", "es_invitado": True})
    assert is_filial({"tipo_jugador": "juvenil"})
    assert not is_filial({"tipo_jugador": "plantilla"})


def test_filial_and_prueba_have_load_tracking():
    assert incluye_tracking_carga({"tipo_jugador": "juvenil", "es_invitado": True})
    assert incluye_tracking_carga({"tipo_jugador": "prueba", "es_invitado": True})
    assert incluye_tracking_carga({"tipo_jugador": "plantilla"})
    assert not incluye_tracking_carga({"tipo_jugador": "invitado", "es_invitado": True})
    assert not incluye_tracking_carga({"es_invitado": True})


def test_rpe_roster_sorts_plantilla_by_dorsal_then_filial_externos():
    roster = [
        {"nombre": "Filial", "apellidos": "Diez", "dorsal": 2, "tipo_jugador": "juvenil"},
        {"nombre": "Invitado", "apellidos": "Once", "dorsal": 11, "es_invitado": True},
        {"nombre": "Beto", "apellidos": "Baja", "dorsal": 9, "tipo_jugador": "plantilla"},
        {"nombre": "Ana", "apellidos": "Alta", "dorsal": 4, "tipo_jugador": "plantilla"},
        {"nombre": "Cero", "apellidos": "Sin", "dorsal": None, "tipo_jugador": "plantilla"},
        {"nombre": "Prueba", "apellidos": "Ocho", "dorsal": 8, "tipo_jugador": "prueba"},
    ]
    ordered = sorted(roster, key=rpe_roster_sort_key)
    assert [p["nombre"] for p in ordered] == ["Ana", "Beto", "Cero", "Filial", "Prueba", "Invitado"]
