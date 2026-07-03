"""
TrainingHub Pro — Tests: Plan de Partido + Informe Rival + Alertas
Fase 1: Fundación del Microciclo como Centro.
"""

import pytest
from uuid import uuid4, UUID
from datetime import datetime, date, timedelta
from pydantic import ValidationError

from app.models.plan_partido import (
    EstadoPlanPartido,
    AlturaBloque,
    TipoPresion,
    TipoEmparejamiento,
    MovimientoClave,
    Emparejamiento,
    EspacioCampo,
    FasePlan,
    FasePlanABP,
    CambioPrevisto,
    MomentoPartido,
    EscenarioPartido,
    PlanPartidoBase,
    PlanPartidoCreate,
    PlanPartidoUpdate,
    PlanPartidoResponse,
    RivalJugadorClave,
    RivalPartidoHistorico,
    InformeRivalEnriquecidoCreate,
    InformeRivalEnriquecidoResponse,
    TipoAlerta,
    PrioridadAlerta,
    AlertaCreate,
    AlertaUpdate,
    AlertaResponse,
    VistaCompletaMicrociclo,
)


# ============ Fixtures ============

@pytest.fixture
def id_jugador():
    return uuid4()


@pytest.fixture
def id_partido():
    return uuid4()


@pytest.fixture
def id_microciclo():
    return uuid4()


@pytest.fixture
def id_rival():
    return uuid4()


@pytest.fixture
def id_game_model():
    return uuid4()


@pytest.fixture
def id_equipo():
    return uuid4()


@pytest.fixture
def una_fase_plan(id_jugador):
    """Crea una fase de plan de partido con emparejamientos y movimientos."""
    return FasePlan(
        nombre="Ataque Organizado",
        descripcion="Salida 3-2 contra presión alta rival",
        altura_bloque=AlturaBloque.MEDIO,
        tipo_presion=TipoPresion.ZONA,
        emparejamientos=[
            Emparejamiento(
                nuestro_jugador_id=id_jugador,
                rival_dorsal=9,
                rival_nombre="Delantero Centro",
                tipo=TipoEmparejamiento.MARCA,
                notas="Seguir hasta medio campo",
            )
        ],
        movimientos_clave=[
            MovimientoClave(
                titulo="Salida por banda derecha",
                descripcion="Lateral sube y extremo diagonaliza dentro",
                jugadores_involucrados=[id_jugador],
            )
        ],
        espacios_a_atacar=[
            EspacioCampo(
                nombre="Espalda lateral derecho",
                zona={"x": 0.7, "y": 0.3, "width": 0.2, "height": 0.4},
                descripcion="El rival deja mucho espacio al lateral",
            )
        ],
        espacios_a_proteger=[
            EspacioCampo(
                nombre="Pasillo central",
                zona={"x": 0.3, "y": 0.4, "width": 0.4, "height": 0.2},
            )
        ],
        referencias_visuales=["Video salida de balón vs equipo similar"],
        triggers=["Cuando el rival presiona con 2 puntas"],
    )


@pytest.fixture
def un_plan_partido(id_partido, id_microciclo, id_game_model, una_fase_plan):
    """Crea un plan de partido completo."""
    return PlanPartidoCreate(
        partido_id=id_partido,
        microciclo_id=id_microciclo,
        game_model_id=id_game_model,
        sistema_juego="4-3-3",
        estilo_previsto="posesión",
        once_inicial={
            "POR": uuid4(),
            "LD": uuid4(),
            "DFC-I": uuid4(),
            "DFC-D": uuid4(),
            "LI": uuid4(),
            "MC": uuid4(),
            "MCD": uuid4(),
            "MCO": uuid4(),
            "ED": uuid4(),
            "EI": uuid4(),
            "DC": uuid4(),
        },
        suplentes=[uuid4(), uuid4(), uuid4(), uuid4(), uuid4()],
        descartados=[uuid4()],
        capitan_id=uuid4(),
        fase_ataque_organizado=una_fase_plan,
        fase_defensa_organizada=FasePlan(
            nombre="Defensa Organizada",
            descripcion="Bloque medio 4-4-2",
            altura_bloque=AlturaBloque.MEDIO,
            tipo_presion=TipoPresion.MIXTA,
        ),
        fase_transicion_ofensiva=FasePlan(
            nombre="Transición Ofensiva",
            descripcion="Salida rápida por bandas",
        ),
        fase_transicion_defensiva=FasePlan(
            nombre="Transición Defensiva",
            descripcion="Repliegue 4-5-1 intensivo",
        ),
        fase_abp_ofensivo=FasePlanABP(
            nombre="ABP Ofensivo",
            sistema_marcaje="zona con bloqueo",
            jugadores_area=[uuid4() for _ in range(5)],
            jugadores_rechace=[uuid4() for _ in range(3)],
            jugadores_contra=[uuid4() for _ in range(2)],
        ),
        fase_abp_defensivo=FasePlanABP(
            nombre="ABP Defensivo",
            sistema_marcaje="individual en área, zona fuera",
            jugadores_area=[uuid4() for _ in range(6)],
            jugadores_rechace=[uuid4() for _ in range(2)],
            jugadores_contra=[uuid4()],
        ),
        momentos_partido=[
            MomentoPartido(
                rango="0-15",
                estrategia="Presión alta los primeros 15' para imponer ritmo",
            ),
            MomentoPartido(
                rango="75-90",
                estrategia="Gestión de juego si vamos ganando, cambios previstos",
                cambios_previstos=[
                    CambioPrevisto(
                        minuto_aprox=75,
                        sale_jugador_id=uuid4(),
                        entra_jugador_id=uuid4(),
                        motivo="Desgaste físico",
                    )
                ],
            ),
        ],
        escenarios=[
            EscenarioPartido(
                condicion="0-1_contra_min60",
                cambios_sistema="4-4-2 ofensivo",
                ajustes_tacticos="Adelantar bloque 15m, laterales como extremos",
            ),
            EscenarioPartido(
                condicion="1-0_favor_min80",
                ajustes_tacticos="Conservar balón, cambios para frescura defensiva",
            ),
        ],
        estado=EstadoPlanPartido.BORRADOR,
    )


@pytest.fixture
def un_informe_rival(id_rival, id_partido):
    """Crea un informe de rival enriquecido."""
    return InformeRivalEnriquecidoCreate(
        rival_id=id_rival,
        partido_id=id_partido,
        sistema_juego="4-2-3-1",
        sistema_variantes=["4-4-2 en defensa", "4-3-3 en ataque"],
        estilo="directo, transiciones rápidas",
        fortalezas=[
            "Transiciones ofensivas muy rápidas",
            "Balón parado ofensivo efectivo",
            "Presión alta coordinada",
        ],
        debilidades=[
            "Espacios entre líneas en bloque medio",
            "Salida de balón corta vulnerable a presión",
            "Encaja goles en últimos 15 minutos",
        ],
        jugadores_clave=[
            RivalJugadorClave(
                nombre="Carlos Martínez",
                dorsal=10,
                posicion="Mediapunta",
                fortalezas=["Visión de juego", "Último pase", "Disparo lejano"],
                debilidades=["Defensivamente pasivo", "Se frustra con marcaje individual"],
                tipo="peligroso",
            ),
            RivalJugadorClave(
                nombre="Diego López",
                dorsal=4,
                posicion="Central",
                fortalezas=["Juego aéreo"],
                debilidades=["Lento en el giro", "Salida de balón deficiente"],
                tipo="debilidad",
            ),
        ],
        lesionados_sancionados=["Miguel Sánchez (lesión muscular, baja 3 semanas)"],
        ultimos_partidos=[
            RivalPartidoHistorico(
                rival_nombre="CD Badajoz",
                fecha=date.today() - timedelta(days=7),
                resultado="W",
                goles_favor=2,
                goles_contra=0,
                sistema_rival="4-4-2",
            ),
            RivalPartidoHistorico(
                rival_nombre="Atlético B",
                fecha=date.today() - timedelta(days=14),
                resultado="L",
                goles_favor=0,
                goles_contra=3,
                sistema_rival="4-2-3-1",
            ),
        ],
        abp_ofensivo="Córners: envío al primer palo con bloqueo. Faltas laterales: balón al segundo palo.",
        abp_defensivo="Córners: marcaje zonal con 2 en zona de rechace.",
        mapa_presion={"altura_inicio": 0.7, "intensidad": "alta", "zonas_evitar": ["lateral_derecho"]},
    )


@pytest.fixture
def alerta_sin_plan(id_equipo, id_microciclo):
    """Alerta: plan de partido faltante."""
    return AlertaCreate(
        equipo_id=id_equipo,
        microciclo_id=id_microciclo,
        tipo=TipoAlerta.PLAN_PARTIDO_FALTANTE,
        prioridad=PrioridadAlerta.ALTA,
        titulo="No hay plan de partido",
        mensaje="Faltan 3 días para el partido y no hay plan de partido creado.",
        accion_url=f"/microciclos/{id_microciclo}",
        metadata={"dias_restantes": 3},
    )


# ============ Tests: Modelos Plan de Partido ============

class TestPlanPartidoModelos:
    """Pruebas unitarias de los modelos Pydantic."""

    def test_crear_movimiento_clave(self, id_jugador):
        """Validar creación de MovimientoClave."""
        mov = MovimientoClave(
            titulo="Salida por banda",
            descripcion="Lateral sube, extremo diagonaliza",
            jugadores_involucrados=[id_jugador],
        )
        assert mov.titulo == "Salida por banda"
        assert len(mov.jugadores_involucrados) == 1
        assert mov.zona_inicio is None

    def test_movimiento_clave_sin_jugadores(self):
        """MovimientoClave sin jugadores es válido (por defecto)."""
        mov = MovimientoClave(titulo="Movimiento genérico", descripcion="Descripción")
        assert mov.jugadores_involucrados == []

    def test_crear_emparejamiento(self, id_jugador):
        """Validar creación de Emparejamiento."""
        emp = Emparejamiento(
            nuestro_jugador_id=id_jugador,
            rival_dorsal=10,
            rival_nombre="Mediapunta rival",
            tipo=TipoEmparejamiento.MARCA,
            notas="Seguir hasta campo propio",
        )
        assert emp.tipo == TipoEmparejamiento.MARCA
        assert emp.rival_dorsal == 10

    def test_emparejamiento_por_defecto(self, id_jugador):
        """Emparejamiento sin tipo usa MARCA por defecto."""
        emp = Emparejamiento(nuestro_jugador_id=id_jugador)
        assert emp.tipo == TipoEmparejamiento.MARCA

    def test_crear_espacio_campo(self):
        """Validar EspacioCampo con coordenadas normalizadas."""
        espacio = EspacioCampo(
            nombre="Espalda lateral",
            zona={"x": 0.7, "y": 0.3, "width": 0.2, "height": 0.4},
            descripcion="Hueco entre lateral y central",
        )
        assert espacio.nombre == "Espalda lateral"
        assert espacio.zona["x"] == 0.7

    def test_espacio_campo_sin_descripcion(self):
        """EspacioCampo con descripción opcional."""
        espacio = EspacioCampo(nombre="Zona X", zona={"x": 0.5, "y": 0.5, "width": 0.2, "height": 0.3})
        assert espacio.descripcion is None

    def test_crear_fase_plan(self, una_fase_plan):
        """Validar creación de FasePlan completa."""
        assert una_fase_plan.nombre == "Ataque Organizado"
        assert una_fase_plan.altura_bloque == AlturaBloque.MEDIO
        assert una_fase_plan.tipo_presion == TipoPresion.ZONA
        assert len(una_fase_plan.emparejamientos) == 1
        assert len(una_fase_plan.movimientos_clave) == 1
        assert len(una_fase_plan.espacios_a_atacar) == 1

    def test_fase_plan_minima(self):
        """FasePlan con solo nombre es válida."""
        fase = FasePlan(nombre="Fase mínima")
        assert fase.nombre == "Fase mínima"
        assert fase.emparejamientos == []
        assert fase.movimientos_clave == []

    def test_crear_fase_abp(self):
        """Validar FasePlanABP con todos sus campos."""
        jugadores_area = [uuid4() for _ in range(5)]
        fase = FasePlanABP(
            nombre="Córner ofensivo",
            sistema_marcaje="zona con bloqueo",
            jugadores_area=jugadores_area,
            jugadores_rechace=[uuid4() for _ in range(2)],
            jugadores_contra=[uuid4()],
            notas="Primer palo con bloqueo al portero",
        )
        assert len(fase.jugadores_area) == 5
        assert len(fase.jugadores_rechace) == 2
        assert len(fase.jugadores_contra) == 1

    def test_crear_momento_partido(self):
        """Validar MomentoPartido con cambios previstos."""
        momento = MomentoPartido(
            rango="60-75",
            estrategia="Mantener intensidad defensiva",
            cambios_previstos=[
                CambioPrevisto(
                    minuto_aprox=65,
                    sale_jugador_id=uuid4(),
                    entra_jugador_id=uuid4(),
                    motivo="Amarilla",
                )
            ],
        )
        assert momento.rango == "60-75"
        assert len(momento.cambios_previstos) == 1

    def test_crear_escenario_partido(self):
        """Validar EscenarioPartido."""
        escenario = EscenarioPartido(
            condicion="0-0_min75",
            cambios_sistema="4-2-4",
            ajustes_tacticos="Volcar juego por bandas, meter segundo delantero",
        )
        assert escenario.condicion == "0-0_min75"
        assert escenario.cambios_sistema == "4-2-4"

    def test_crear_plan_partido_completo(self, un_plan_partido):
        """Plan de partido completo con todas las fases."""
        assert un_plan_partido.sistema_juego == "4-3-3"
        assert un_plan_partido.estado == EstadoPlanPartido.BORRADOR
        assert len(un_plan_partido.once_inicial) == 11
        assert len(un_plan_partido.suplentes) == 5
        assert len(un_plan_partido.descartados) == 1
        assert un_plan_partido.fase_ataque_organizado is not None
        assert un_plan_partido.fase_defensa_organizada is not None
        assert un_plan_partido.fase_transicion_ofensiva is not None
        assert un_plan_partido.fase_transicion_defensiva is not None
        assert un_plan_partido.fase_abp_ofensivo is not None
        assert un_plan_partido.fase_abp_defensivo is not None
        assert len(un_plan_partido.momentos_partido) == 2
        assert len(un_plan_partido.escenarios) == 2

    def test_plan_partido_sistema_default(self, id_partido, id_microciclo):
        """Sistema de juego por defecto es 4-3-3."""
        plan = PlanPartidoCreate(partido_id=id_partido, microciclo_id=id_microciclo)
        assert plan.sistema_juego == "4-3-3"
        assert plan.estado == EstadoPlanPartido.BORRADOR
        assert plan.once_inicial == {}

    def test_plan_partido_update_parcial(self):
        """PlanPartidoUpdate permite actualizar solo campos específicos."""
        update = PlanPartidoUpdate(sistema_juego="4-4-2", notas="Ajuste táctico")
        assert update.sistema_juego == "4-4-2"
        assert update.estado is None  # No se actualiza este campo

    def test_plan_partido_sin_fases_opcionales(self, id_partido, id_microciclo):
        """Plan de partido mínimo (solo obligatorios)."""
        plan = PlanPartidoCreate(
            partido_id=id_partido,
            microciclo_id=id_microciclo,
            sistema_juego="4-4-2",
        )
        assert plan.fase_ataque_organizado is None
        assert plan.fase_defensa_organizada is None
        assert plan.momentos_partido == []


# ============ Tests: Informe Rival Enriquecido ============

class TestInformeRival:
    """Pruebas del modelo de informe de rival."""

    def test_crear_informe_rival_completo(self, un_informe_rival):
        """Informe completo con todas las secciones."""
        assert un_informe_rival.sistema_juego == "4-2-3-1"
        assert len(un_informe_rival.fortalezas) == 3
        assert len(un_informe_rival.debilidades) == 3
        assert len(un_informe_rival.jugadores_clave) == 2
        assert len(un_informe_rival.ultimos_partidos) == 2

    def test_informe_rival_minimo(self, id_rival):
        """Informe mínimo solo con rival_id."""
        informe = InformeRivalEnriquecidoCreate(rival_id=id_rival)
        assert informe.fortalezas == []
        assert informe.debilidades == []
        assert informe.jugadores_clave == []

    def test_jugador_clave_tipos(self):
        """JugadorClave con diferentes tipos."""
        peligroso = RivalJugadorClave(nombre="X", tipo="peligroso")
        debilidad = RivalJugadorClave(nombre="Y", tipo="debilidad")
        neutral = RivalJugadorClave(nombre="Z")
        assert peligroso.tipo == "peligroso"
        assert debilidad.tipo == "debilidad"
        assert neutral.tipo == "neutral"

    def test_ultimo_partido_sin_fecha(self):
        """Partido histórico sin fecha es válido."""
        partido = RivalPartidoHistorico(
            rival_nombre="CD Ejemplo",
            resultado="D",
            goles_favor=1,
            goles_contra=1,
        )
        assert partido.fecha is None
        assert partido.resultado == "D"


# ============ Tests: Alertas ============

class TestAlertas:
    """Pruebas del sistema de alertas."""

    def test_crear_alerta(self, alerta_sin_plan):
        """Crear alerta de plan faltante."""
        assert alerta_sin_plan.tipo == TipoAlerta.PLAN_PARTIDO_FALTANTE
        assert alerta_sin_plan.prioridad == PrioridadAlerta.ALTA
        assert alerta_sin_plan.titulo == "No hay plan de partido"
        assert alerta_sin_plan.metadata["dias_restantes"] == 3

    def test_alerta_carga_critica(self, id_equipo):
        """Alerta de carga crítica."""
        alerta = AlertaCreate(
            equipo_id=id_equipo,
            tipo=TipoAlerta.CARGA_CRITICA,
            prioridad=PrioridadAlerta.URGENTE,
            titulo="Carga crítica: Juan García",
            mensaje="ACWR de 1.82 — riesgo de lesión elevado.",
            entidad_tipo="jugador",
            entidad_id=uuid4(),
            metadata={"acwr": 1.82},
        )
        assert alerta.tipo == TipoAlerta.CARGA_CRITICA
        assert alerta.prioridad == PrioridadAlerta.URGENTE

    def test_alerta_sin_microciclo(self, id_equipo):
        """Alerta sin microciclo asociado."""
        alerta = AlertaCreate(
            equipo_id=id_equipo,
            tipo=TipoAlerta.RIVAL_NUEVO_ENTRENADOR,
            prioridad=PrioridadAlerta.NORMAL,
            titulo="El rival tiene nuevo entrenador",
        )
        assert alerta.microciclo_id is None
        assert alerta.accion_url is None

    def test_resolver_alerta(self):
        """Marcar alerta como resuelta."""
        update = AlertaUpdate(resuelta=True, notas_resolucion="Plan creado")
        assert update.resuelta is True
        assert update.notas_resolucion == "Plan creado"

    def test_tipos_alerta(self):
        """Todos los tipos de alerta definidos."""
        tipos = list(TipoAlerta)
        assert TipoAlerta.PLAN_PARTIDO_FALTANTE in tipos
        assert TipoAlerta.CARGA_CRITICA in tipos
        assert TipoAlerta.MICROCICLO_SIN_SESION in tipos
        assert TipoAlerta.JUGADOR_SANCION in tipos
        assert TipoAlerta.FALTA_ABP_PLAN in tipos
        assert len(tipos) >= 7


# ============ Tests: Integración ============

class TestVistaCompletaMicrociclo:
    """Pruebas de integración del WAR ROOM."""

    def test_vista_completa_con_plan_partido(self, id_partido, id_microciclo, un_plan_partido):
        """Vista completa con plan de partido."""
        micro_data = {
            "id": str(id_microciclo),
            "equipo_id": str(uuid4()),
            "fecha_inicio": "2026-01-12",
            "fecha_fin": "2026-01-18",
            "objetivo_principal": "Presión alta",
        }

        vista = VistaCompletaMicrociclo(
            microciclo=micro_data,
            sesiones=[],
            plantilla={"total": 20, "disponibles": 18, "lesionados": 2},
            rpe={"rpe_promedio_semana": 6.5},
            plan_partido=PlanPartidoResponse(
                id=uuid4(),
                created_by=uuid4(),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                **un_plan_partido.model_dump(mode="json"),
            ),
        )

        assert vista.plan_partido is not None
        assert vista.plan_partido.sistema_juego == "4-3-3"
        assert vista.plantilla["disponibles"] == 18

    def test_vista_completa_con_informe_rival(self, id_microciclo, un_informe_rival):
        """Vista completa con informe del rival."""
        vista = VistaCompletaMicrociclo(
            microciclo={"id": str(id_microciclo)},
            sesiones=[{"id": str(uuid4()), "fecha": "2026-01-14"}],
            plantilla={"total": 20, "disponibles": 19},
            rpe={"rpe_promedio_semana": 5.8},
            informe_rival=InformeRivalEnriquecidoResponse(
                id=uuid4(),
                created_by=uuid4(),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                **un_informe_rival.model_dump(mode="json"),
            ),
        )

        assert vista.informe_rival is not None
        assert vista.informe_rival.sistema_juego == "4-2-3-1"
        assert len(vista.informe_rival.jugadores_clave) == 2

    def test_vista_completa_con_alertas(self, id_microciclo, alerta_sin_plan):
        """Vista completa con alertas activas."""
        alerta_response = AlertaResponse(
            id=uuid4(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            **alerta_sin_plan.model_dump(mode="json"),
        )

        vista = VistaCompletaMicrociclo(
            microciclo={"id": str(id_microciclo)},
            sesiones=[],
            plantilla={"total": 20, "disponibles": 18},
            rpe={},
            alertas=[alerta_response],
        )

        assert len(vista.alertas) == 1
        assert vista.alertas[0].tipo == TipoAlerta.PLAN_PARTIDO_FALTANTE

    def test_vista_completa_minima(self, id_microciclo):
        """Vista completa mínima (sin plan ni informe)."""
        vista = VistaCompletaMicrociclo(
            microciclo={"id": str(id_microciclo)},
            sesiones=[],
            plantilla={"total": 20, "disponibles": 20},
            rpe={},
        )

        assert vista.plan_partido is None
        assert vista.informe_rival is None
        assert vista.alertas == []


# ============ Tests: Validaciones ============

class TestValidaciones:
    """Validaciones de datos incorrectos."""

    def test_movimiento_clave_falta_titulo(self):
        """MovimientoClave requiere título."""
        with pytest.raises(ValidationError):
            MovimientoClave(descripcion="Sin título")

    def test_emparejamiento_falta_jugador(self):
        """Emparejamiento requiere nuestro_jugador_id."""
        with pytest.raises(ValidationError):
            Emparejamiento()

    def test_plan_partido_falta_partido(self, id_microciclo):
        """PlanPartido requiere partido_id."""
        with pytest.raises(ValidationError):
            PlanPartidoCreate(microciclo_id=id_microciclo)

    def test_plan_partido_falta_microciclo(self, id_partido):
        """PlanPartido requiere microciclo_id."""
        with pytest.raises(ValidationError):
            PlanPartidoCreate(partido_id=id_partido)

    def test_alerta_falta_equipo(self):
        """Alerta requiere equipo_id."""
        with pytest.raises(ValidationError):
            AlertaCreate(
                tipo=TipoAlerta.PLAN_PARTIDO_FALTANTE,
                prioridad=PrioridadAlerta.NORMAL,
                titulo="Test",
            )

    def test_alerta_falta_tipo(self, id_equipo):
        """Alerta requiere tipo."""
        with pytest.raises(ValidationError):
            AlertaCreate(
                equipo_id=id_equipo,
                prioridad=PrioridadAlerta.NORMAL,
                titulo="Test",
            )

    def test_rival_jugador_clave_falta_nombre(self):
        """JugadorClave requiere nombre."""
        with pytest.raises(ValidationError):
            RivalJugadorClave()

    def test_informe_rival_falta_rival(self):
        """InformeRival requiere rival_id."""
        with pytest.raises(ValidationError):
            InformeRivalEnriquecidoCreate()
