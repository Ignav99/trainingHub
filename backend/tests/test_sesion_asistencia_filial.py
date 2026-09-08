from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_sesion_asistencia_has_opt_in_filial_endpoints():
    src = (ROOT / "app/api/v1/sesiones.py").read_text(encoding="utf-8")
    assert "@router.post(\"/{sesion_id}/asistencias/jugador\"" in src
    assert "@router.delete(\"/{sesion_id}/asistencias/jugador/{jugador_id}\"" in src
    assert "@router.delete(\"/{sesion_id}/asistencias/filial\"" in src
    assert "Quita de golpe a todos los jugadores del filial" in src
