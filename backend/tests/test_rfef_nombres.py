"""El acta no puede colgar la sanción del jugador que no es."""

from app.services.rfef_nombres import emparejar_jugador_rfef

FILIAL = [
    {"id": "franco", "nombre": "Francisco", "apellidos": "Franco"},
    {"id": "manuel", "nombre": "Manuel", "apellidos": "Vicedo"},
    {"id": "pablo", "nombre": "Pablo Aurelio", "apellidos": "Vicedo"},
    {"id": "gori", "nombre": "Gonzalo", "apellidos": "Gori"},
    {"id": "juan", "nombre": "Juan", "apellidos": "De la calle"},
    {"id": "vargas", "nombre": "Carlos", "apellidos": "Vargas"},
]


def test_franco_guerra_es_francisco_franco():
    ficha = emparejar_jugador_rfef("FRANCO GUERRA, FRANCISCO MANUEL", FILIAL)
    assert ficha["id"] == "franco"


def test_no_confunde_a_los_dos_vicedo():
    pablo = emparejar_jugador_rfef("VICEDO SANCHEZ, PABLO AURELIO", FILIAL)
    assert pablo["id"] == "pablo"


def test_el_apellido_compuesto_no_basta_sin_el_nombre():
    assert emparejar_jugador_rfef("VICEDO SANCHEZ, MANUEL", FILIAL)["id"] == "manuel"
    assert emparejar_jugador_rfef("GORI CALLE, GONZALO LUIS", FILIAL)["id"] == "gori"
    assert emparejar_jugador_rfef("DE LA CALLE YERGA, JUAN CAYETANO", FILIAL)["id"] == "juan"


def test_una_sancion_ya_cumplida_no_se_cuelga_de_otro():
    assert emparejar_jugador_rfef("VARGAS DE LOS REYES, CARLOS", FILIAL)["id"] == "vargas"
    assert emparejar_jugador_rfef("ALGUIEN, NADIE", FILIAL) is None
