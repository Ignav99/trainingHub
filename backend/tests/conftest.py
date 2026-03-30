"""
TrainingHub Pro - Test Configuration
Fixtures and shared configuration for pytest.
"""

import os
import pytest
from datetime import date, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

# Set required env vars before any app imports
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-32chars!")
os.environ.setdefault("DEBUG", "true")


# ============ Fixtures: IDs ============

@pytest.fixture
def fake_uuid():
    """Generate a random UUID string."""
    return str(uuid4())


@pytest.fixture
def org_id():
    return str(uuid4())


@pytest.fixture
def equipo_id():
    return str(uuid4())


@pytest.fixture
def user_id():
    return str(uuid4())


# ============ Fixtures: Sample Data ============

@pytest.fixture
def sample_jugador():
    """Sample player data."""
    return {
        "id": str(uuid4()),
        "nombre": "Marc",
        "apellidos": "Garcia Lopez",
        "dorsal": 10,
        "posicion_principal": "centrocampista",
        "posicion_secundaria": "delantero",
        "estado": "activo",
        "pie_dominante": "derecho",
        "fecha_nacimiento": "2000-05-15",
        "nivel_tecnico": 4,
        "nivel_tactico": 3,
        "nivel_fisico": 4,
        "nivel_mental": 3,
        "es_convocable": True,
    }


@pytest.fixture
def sample_jugadores():
    """Sample squad of players."""
    players = []
    positions = ["portero", "defensa", "defensa", "centrocampista", "delantero"]
    names = [
        ("Carlos", "Martinez", 1),
        ("Pablo", "Sanchez", 4),
        ("David", "Lopez", 5),
        ("Marc", "Garcia", 10),
        ("Alex", "Fernandez", 9),
    ]
    for (nombre, apellidos, dorsal), pos in zip(names, positions):
        players.append({
            "id": str(uuid4()),
            "nombre": nombre,
            "apellidos": apellidos,
            "dorsal": dorsal,
            "posicion_principal": pos,
            "estado": "activo",
            "nivel_tecnico": 3,
            "nivel_tactico": 3,
            "nivel_fisico": 3,
            "nivel_mental": 3,
            "es_convocable": True,
        })
    return players


@pytest.fixture
def sample_sesion():
    """Sample training session data."""
    return {
        "id": str(uuid4()),
        "equipo_id": str(uuid4()),
        "titulo": "Sesion MD-3: Resistencia",
        "fecha": date.today().isoformat(),
        "match_day": "MD-3",
        "estado": "planificada",
        "duracion_total": 90,
        "objetivo_principal": "Resistencia a la potencia",
        "fase_juego_principal": "ataque_organizado",
        "principio_tactico_principal": "Progresion",
        "intensidad_objetivo": "alta",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }


@pytest.fixture
def sample_partido():
    """Sample match data."""
    return {
        "id": str(uuid4()),
        "equipo_id": str(uuid4()),
        "rival_id": str(uuid4()),
        "fecha": date.today().isoformat(),
        "hora": "18:00",
        "localia": "local",
        "competicion": "Liga",
        "goles_favor": 2,
        "goles_contra": 1,
        "resultado": "victoria",
    }


@pytest.fixture
def sample_rpe_registros():
    """Sample RPE records for a team."""
    records = []
    for i in range(5):
        records.append({
            "id": str(uuid4()),
            "jugador_id": str(uuid4()),
            "fecha": date.today().isoformat(),
            "rpe": 5 + i,
            "sueno": 3,
            "fatiga": 3,
            "dolor": 2,
            "estres": 2,
            "humor": 4,
            "carga_sesion": (5 + i) * 90,
        })
    return records


# ============ Integration Test Fixtures ============

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for integration tests."""
    mock = MagicMock()

    # Chain-able query builder
    def make_chainable():
        chain = MagicMock()
        chain.select.return_value = chain
        chain.insert.return_value = chain
        chain.update.return_value = chain
        chain.delete.return_value = chain
        chain.eq.return_value = chain
        chain.neq.return_value = chain
        chain.in_.return_value = chain
        chain.order.return_value = chain
        chain.limit.return_value = chain
        chain.single.return_value = chain
        chain.maybe_single.return_value = chain
        chain.execute.return_value = MagicMock(data=[], count=0)
        return chain

    mock.table.return_value = make_chainable()
    return mock


@pytest.fixture
def test_client(mock_supabase):
    """FastAPI TestClient with mocked Supabase."""
    from fastapi.testclient import TestClient

    with patch("app.database.get_supabase", return_value=mock_supabase):
        with patch("app.database.init_supabase"):
            from app.main import app
            client = TestClient(app, raise_server_exceptions=False)
            yield client


@pytest.fixture
def auth_headers():
    """Fake auth headers for testing."""
    return {"Authorization": "Bearer test-token-123"}


@pytest.fixture
def mock_auth_context():
    """Create a mock AuthContext for dependency override."""
    from app.security.dependencies import AuthContext
    from app.security.permissions import Permission, _CT_FULL_PERMISSIONS

    return AuthContext(
        user=MagicMock(),
        user_id=str(uuid4()),
        organizacion_id=str(uuid4()),
        equipo_id=str(uuid4()),
        rol_en_equipo="entrenador_principal",
        permissions=set(_CT_FULL_PERMISSIONS) | {
            Permission.CLUB_MANAGE_BILLING,
            Permission.CLUB_MANAGE_ORG,
        },
        subscription_status="active",
    )
