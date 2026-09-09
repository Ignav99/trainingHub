from datetime import date
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.models.medico import TratamientoDiarioUpdate


class TestUpdateTratamiento:
    @pytest.fixture(autouse=True)
    def _need_api_stack(self):
        pytest.importorskip("fastapi")
        pytest.importorskip("supabase")

    @pytest.mark.asyncio
    async def test_updates_trabajo_and_fecha(self):
        from app.api.v1.medico import update_tratamiento

        registro_id = uuid4()
        entrada_id = uuid4()
        jugador_id = uuid4()
        updated = {
            "id": str(entrada_id),
            "registro_medico_id": str(registro_id),
            "jugador_id": str(jugador_id),
            "equipo_id": str(uuid4()),
            "fecha": "2026-09-10",
            "sesion_id": None,
            "entrenamiento_margen_id": None,
            "fase_tratamiento": "margen",
            "trabajo": "Isquios + movilidad",
            "ejercicios": "3x8 nordic",
            "feedback": "Mejor que ayer",
            "nutricion": None,
            "suplementacion": None,
            "creado_por": str(uuid4()),
            "created_at": "2026-09-09T10:00:00+00:00",
            "updated_at": "2026-09-09T12:00:00+00:00",
        }

        chain = MagicMock()
        chain.update.return_value = chain
        chain.eq.return_value = chain
        chain.execute.return_value = MagicMock(data=[updated])
        supabase = MagicMock()
        supabase.table.return_value = chain
        auth = MagicMock()
        auth.user_id = "user-1"

        with patch("app.api.v1.medico.get_supabase", return_value=supabase):
            result = await update_tratamiento(
                registro_id,
                entrada_id,
                TratamientoDiarioUpdate(
                    fecha=date(2026, 9, 10),
                    trabajo="Isquios + movilidad",
                    ejercicios="3x8 nordic",
                    feedback="Mejor que ayer",
                ),
                auth=auth,
            )

        assert result.trabajo == "Isquios + movilidad"
        assert str(result.fecha) == "2026-09-10"
        chain.update.assert_called_once()
        payload = chain.update.call_args[0][0]
        assert payload["trabajo"] == "Isquios + movilidad"
        assert payload["fecha"] == "2026-09-10"
        chain.eq.assert_any_call("id", str(entrada_id))
        chain.eq.assert_any_call("registro_medico_id", str(registro_id))

    @pytest.mark.asyncio
    async def test_404_when_missing(self):
        from fastapi import HTTPException

        from app.api.v1.medico import update_tratamiento

        chain = MagicMock()
        chain.update.return_value = chain
        chain.eq.return_value = chain
        chain.execute.return_value = MagicMock(data=[])
        supabase = MagicMock()
        supabase.table.return_value = chain
        auth = MagicMock()

        with patch("app.api.v1.medico.get_supabase", return_value=supabase):
            with pytest.raises(HTTPException) as err:
                await update_tratamiento(
                    uuid4(),
                    uuid4(),
                    TratamientoDiarioUpdate(trabajo="x"),
                    auth=auth,
                )
        assert err.value.status_code == 404


class TestTratamientoUiEdit:
    def test_cuaderno_wires_edit_not_only_delete(self):
        from pathlib import Path

        src = Path(__file__).resolve().parents[2] / "frontend" / "src" / "components" / "ficha-clinica" / "TratamientoCuaderno.tsx"
        text = src.read_text()
        assert "updateTratamiento" in text
        assert "Pencil" in text
        assert "startEdit" in text
        assert "deleteTratamiento" in text

