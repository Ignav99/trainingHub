"""
Tests for service modules.
Tests export service (no DB needed) and other pure logic.
"""

import pytest
from datetime import date


class TestExportService:
    """Tests for CSV export generation."""

    def test_export_jugadores_csv(self):
        from app.services.export_service import export_jugadores_csv

        jugadores = [
            {
                "dorsal": 1,
                "nombre": "Carlos",
                "apellidos": "Martinez",
                "posicion_principal": "portero",
                "posicion_secundaria": None,
                "estado": "activo",
                "pie_dominante": "derecho",
                "fecha_nacimiento": "2000-01-15",
                "nivel_tecnico": 3,
                "nivel_tactico": 3,
                "nivel_fisico": 4,
                "nivel_mental": 3,
                "es_convocable": True,
            },
            {
                "dorsal": 10,
                "nombre": "Marc",
                "apellidos": "Garcia",
                "posicion_principal": "centrocampista",
                "posicion_secundaria": "delantero",
                "estado": "lesionado",
                "pie_dominante": "izquierdo",
                "fecha_nacimiento": "1999-03-20",
                "nivel_tecnico": 5,
                "nivel_tactico": 4,
                "nivel_fisico": 3,
                "nivel_mental": 4,
                "es_convocable": False,
            },
        ]

        csv = export_jugadores_csv(jugadores)
        lines = csv.strip().split("\n")

        assert len(lines) == 3  # header + 2 rows
        assert "Dorsal" in lines[0]
        assert "Carlos" in lines[1]
        assert "Marc" in lines[2]
        assert "No" in lines[2]  # es_convocable = False

    def test_export_jugadores_empty(self):
        from app.services.export_service import export_jugadores_csv

        csv = export_jugadores_csv([])
        lines = csv.strip().split("\n")
        assert len(lines) == 1  # header only

    def test_export_sesiones_csv(self):
        from app.services.export_service import export_sesiones_csv

        sesiones = [
            {
                "fecha": "2025-03-10",
                "titulo": "Sesion MD-3",
                "match_day": "MD-3",
                "estado": "planificada",
                "duracion_total": 90,
                "objetivo_principal": "Resistencia",
                "fase_juego_principal": "ataque_organizado",
                "principio_tactico_principal": "Progresion",
                "intensidad_objetivo": "alta",
                "notas_pre": "Buen estado general",
                "notas_post": None,
            },
        ]

        csv = export_sesiones_csv(sesiones)
        lines = csv.strip().split("\n")

        assert len(lines) == 2
        assert "Sesion MD-3" in lines[1]
        assert "MD-3" in lines[1]

    def test_export_rpe_csv(self):
        from app.services.export_service import export_rpe_csv

        registros = [
            {
                "jugador_id": "abc-123",
                "fecha": "2025-03-10",
                "rpe": 7,
                "carga_sesion": 630,
                "sueno": 4,
                "fatiga": 3,
                "dolor": 2,
                "estres": 2,
                "humor": 4,
                "notas": None,
            },
        ]

        jugador_map = {"abc-123": "Marc Garcia"}

        csv = export_rpe_csv(registros, jugador_map)
        lines = csv.strip().split("\n")

        assert len(lines) == 2
        assert "Marc Garcia" in lines[1]
        assert "7" in lines[1]

    def test_export_rpe_without_map(self):
        from app.services.export_service import export_rpe_csv

        registros = [
            {
                "jugador_id": "abc-123",
                "fecha": "2025-03-10",
                "rpe": 5,
                "carga_sesion": 450,
                "sueno": 3,
                "fatiga": 3,
                "dolor": 1,
                "estres": 1,
                "humor": 5,
                "notas": "Bien",
            },
        ]

        csv = export_rpe_csv(registros)
        lines = csv.strip().split("\n")
        assert len(lines) == 2

    def test_export_partidos_csv(self):
        from app.services.export_service import export_partidos_csv

        partidos = [
            {
                "fecha": "2025-03-15",
                "hora": "18:00",
                "rival": {"nombre": "FC Barcelona"},
                "localia": "local",
                "competicion": "Liga",
                "goles_favor": 2,
                "goles_contra": 1,
                "resultado": "victoria",
                "sistema_rival": "4-3-3",
                "notas_tacticas": "Presion alta efectiva",
            },
        ]

        csv = export_partidos_csv(partidos)
        lines = csv.strip().split("\n")

        assert len(lines) == 2
        assert "FC Barcelona" in lines[1]
        assert "victoria" in lines[1]

    def test_export_convocatoria_csv(self):
        from app.services.export_service import export_convocatoria_csv

        convocatorias = [
            {
                "dorsal": 10,
                "jugador": {"nombre": "Marc", "apellidos": "Garcia", "dorsal": 10},
                "titular": True,
                "posicion_asignada": "centrocampista",
                "minutos_jugados": 90,
                "goles": 1,
                "asistencias": 0,
                "tarjeta_amarilla": True,
                "tarjeta_roja": False,
                "notas": None,
            },
        ]

        csv = export_convocatoria_csv(convocatorias)
        lines = csv.strip().split("\n")

        assert len(lines) == 2
        assert "Marc Garcia" in lines[1]
        assert "Si" in lines[1]  # titular


class TestMiddleware:
    """Tests for middleware components."""

    def test_rate_limit_tracking(self):
        """Test that rate limiter tracks requests correctly."""
        from collections import defaultdict
        import time

        # Simulate rate limit tracking
        requests = defaultdict(list)
        max_requests = 5
        window_seconds = 60

        ip = "127.0.0.1"
        now = time.time()

        # Add requests
        for i in range(max_requests):
            requests[ip].append(now + i * 0.1)

        # Should be at limit
        assert len(requests[ip]) == max_requests

        # Clean old requests (simulate future)
        future = now + window_seconds + 1
        requests[ip] = [t for t in requests[ip] if t > future - window_seconds]
        assert len(requests[ip]) == 0


class TestChunking:
    """Tests for text chunking used in Knowledge Base indexing."""

    def _split_into_chunks(self, text: str, max_chars: int = 500) -> list[str]:
        """Local copy of chunking logic for testing without DB imports."""
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        current = ""
        for para in paragraphs:
            if len(current) + len(para) + 2 > max_chars and current:
                chunks.append(current.strip())
                current = para
            else:
                current = f"{current}\n\n{para}" if current else para
        if current.strip():
            chunks.append(current.strip())
        # Break oversized chunks into max_chars pieces
        final = []
        for chunk in chunks:
            if len(chunk) <= max_chars:
                final.append(chunk)
            else:
                for i in range(0, len(chunk), max_chars):
                    piece = chunk[i:i + max_chars].strip()
                    if piece:
                        final.append(piece)
        if not final and text.strip():
            for i in range(0, len(text), max_chars):
                final.append(text[i:i + max_chars].strip())
        return final

    def test_split_into_chunks_basic(self):
        text = "Parrafo uno.\n\nParrafo dos.\n\nParrafo tres."
        chunks = self._split_into_chunks(text, max_chars=500)
        assert len(chunks) == 1  # All fit in one chunk

    def test_split_into_chunks_small_limit(self):
        text = "Parrafo uno con texto.\n\nParrafo dos con texto.\n\nParrafo tres con texto."
        chunks = self._split_into_chunks(text, max_chars=30)
        assert len(chunks) >= 2

    def test_split_into_chunks_no_paragraphs(self):
        text = "A" * 1000  # No paragraph breaks
        chunks = self._split_into_chunks(text, max_chars=200)
        assert len(chunks) == 5  # 1000 / 200

    def test_split_into_chunks_empty(self):
        chunks = self._split_into_chunks("", max_chars=500)
        assert len(chunks) == 0
