from app.models.abp import TipoABP
from app.services.sesion_labels import TIPOS_ABP


def test_tipo_abp_incluye_saque_centro():
    assert TipoABP.SAQUE_CENTRO.value == "saque_centro"
    assert TIPOS_ABP["saque_centro"] == "Saque de centro"
