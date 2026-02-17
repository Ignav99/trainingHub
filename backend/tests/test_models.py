"""
Tests for Pydantic models.
Validates schema creation, validation rules, and computed fields.
"""

import pytest
from datetime import date, datetime
from uuid import uuid4

from app.models import (
    # Sesion
    SesionCreate,
    SesionUpdate,
    SesionResponse,
    SesionTareaResponse,
    MatchDay,
    FaseSesion,
    EstadoSesion,
    Intensidad,
    # Microciclo
    MicrocicloCreate,
    MicrocicloResponse,
    EstadoMicrociclo,
    # RPE
    RPECreate,
    RPEResponse,
    # Convocatoria
    ConvocatoriaCreate,
    ConvocatoriaResponse,
    # Comunicacion
    NotificacionResponse,
    MensajeCreate,
    # AI
    AIChatRequest,
    AIChatResponse,
    # KB
    KBSearchRequest,
    KBSearchResponse,
)


class TestSesionModels:
    """Tests for session models."""

    def test_sesion_create_basic(self):
        sesion = SesionCreate(
            titulo="Sesion de prueba",
            fecha=date.today(),
            match_day=MatchDay.MD_MINUS_3,
        )
        assert sesion.titulo == "Sesion de prueba"
        assert sesion.match_day == MatchDay.MD_MINUS_3

    def test_sesion_create_with_tareas(self):
        sesion = SesionCreate(
            titulo="Sesion completa",
            fecha=date.today(),
            match_day=MatchDay.MD_MINUS_4,
            objetivo_principal="Fuerza explosiva",
            intensidad_objetivo=Intensidad.ALTA,
        )
        assert sesion.intensidad_objetivo == Intensidad.ALTA
        assert sesion.tareas is None

    def test_sesion_create_short_title_fails(self):
        with pytest.raises(Exception):
            SesionCreate(
                titulo="AB",  # min_length=3
                fecha=date.today(),
                match_day=MatchDay.MD,
            )

    def test_sesion_update_partial(self):
        update = SesionUpdate(titulo="Nuevo titulo")
        data = update.model_dump(exclude_unset=True)
        assert "titulo" in data
        assert "fecha" not in data

    def test_sesion_response_computed_fields(self):
        response = SesionResponse(
            id=uuid4(),
            equipo_id=uuid4(),
            titulo="Test",
            fecha=date.today(),
            match_day=MatchDay.MD_MINUS_3,
            estado=EstadoSesion.PLANIFICADA,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            tareas=[],
        )
        assert response.duracion_calculada == 0
        assert response.num_tareas == 0

    def test_match_day_values(self):
        assert MatchDay.MD_PLUS_1.value == "MD+1"
        assert MatchDay.MD_MINUS_4.value == "MD-4"
        assert MatchDay.MD.value == "MD"

    def test_estado_sesion_values(self):
        assert EstadoSesion.BORRADOR.value == "borrador"
        assert EstadoSesion.COMPLETADA.value == "completada"


class TestMicrocicloModels:
    """Tests for microcycle models."""

    def test_microciclo_create(self):
        mc = MicrocicloCreate(
            equipo_id=uuid4(),
            fecha_inicio=date(2025, 3, 10),
            fecha_fin=date(2025, 3, 16),
            objetivo_principal="Preparar partido contra Real Madrid",
        )
        assert mc.fecha_inicio < mc.fecha_fin

    def test_microciclo_response(self):
        mc = MicrocicloResponse(
            id=uuid4(),
            equipo_id=uuid4(),
            fecha_inicio=date(2025, 3, 10),
            fecha_fin=date(2025, 3, 16),
            estado=EstadoMicrociclo.PLANIFICADO,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert mc.estado == EstadoMicrociclo.PLANIFICADO


class TestRPEModels:
    """Tests for RPE models."""

    def test_rpe_create_valid(self):
        rpe = RPECreate(
            jugador_id=uuid4(),
            rpe=7,
            sueno=4,
            fatiga=3,
        )
        assert rpe.rpe == 7

    def test_rpe_create_out_of_range(self):
        with pytest.raises(Exception):
            RPECreate(
                jugador_id=uuid4(),
                rpe=11,  # max 10
            )

    def test_rpe_create_below_range(self):
        with pytest.raises(Exception):
            RPECreate(
                jugador_id=uuid4(),
                rpe=0,  # min 1
            )


class TestConvocatoriaModels:
    """Tests for squad call-up models."""

    def test_convocatoria_create(self):
        conv = ConvocatoriaCreate(
            partido_id=uuid4(),
            jugador_id=uuid4(),
            titular=True,
            posicion_asignada="centrocampista",
            dorsal=10,
        )
        assert conv.titular is True
        assert conv.dorsal == 10


class TestAIChatModels:
    """Tests for AI chat models."""

    def test_chat_request_basic(self):
        req = AIChatRequest(
            mensaje="Como deberia planificar la sesion de manana?",
        )
        assert len(req.mensaje) > 0
        assert req.conversacion_id is None
        assert req.equipo_id is None

    def test_chat_request_with_context(self):
        req = AIChatRequest(
            mensaje="Analiza mi plantilla",
            equipo_id=uuid4(),
            contexto={"equipo_nombre": "FC Test"},
        )
        assert req.equipo_id is not None
        assert req.contexto["equipo_nombre"] == "FC Test"

    def test_chat_request_empty_message_fails(self):
        with pytest.raises(Exception):
            AIChatRequest(mensaje="")

    def test_chat_response(self):
        resp = AIChatResponse(
            conversacion_id=uuid4(),
            mensaje="Aqui tienes mi recomendacion...",
            tokens_input=100,
            tokens_output=200,
        )
        assert resp.tokens_input == 100


class TestKBModels:
    """Tests for Knowledge Base models."""

    def test_search_request(self):
        req = KBSearchRequest(query="periodizacion tactica")
        assert req.limite == 5  # default

    def test_search_response_empty(self):
        resp = KBSearchResponse(
            resultados=[],
            query="test",
            total=0,
        )
        assert resp.total == 0


class TestNotificacionModels:
    """Tests for notification models."""

    def test_notificacion_response(self):
        notif = NotificacionResponse(
            id=uuid4(),
            usuario_id=uuid4(),
            tipo="sesion_creada",
            titulo="Nueva sesion",
            leida=False,
            prioridad="normal",
            created_at=datetime.now(),
        )
        assert notif.leida is False
        assert notif.prioridad == "normal"
