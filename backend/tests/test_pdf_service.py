# tests/test_pdf_service.py
"""Tests for async PDF generation — WeasyPrint must run off the event loop."""
import asyncio
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_fake_pdf_bytes() -> bytes:
    return b"%PDF-1.4 fake"


def _patch_weasyprint():
    """Return a context manager that replaces weasyprint.HTML with a stub."""
    mock_html = MagicMock()
    mock_html.return_value.write_pdf.return_value = _make_fake_pdf_bytes()
    return patch("weasyprint.HTML", mock_html)


def _patch_jinja():
    """Patch Jinja FileSystemLoader so no real template files are needed."""
    mock_template = MagicMock()
    mock_template.render.return_value = "<html><body>stub</body></html>"
    mock_env = MagicMock()
    mock_env.get_template.return_value = mock_template
    mock_env.filters = {}
    return patch(
        "app.services.pdf_service._get_jinja_env", return_value=mock_env
    ), patch(
        "app.services.pdf_service._get_jinja_env_v2", return_value=mock_env
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_sesion_pdf_is_async_and_returns_bytes():
    from app.services import pdf_service

    assert asyncio.iscoroutinefunction(pdf_service.generate_sesion_pdf), \
        "generate_sesion_pdf must be async"

    ctx1, ctx2 = _patch_jinja()
    with _patch_weasyprint(), ctx1, ctx2:
        result = await pdf_service.generate_sesion_pdf(
            sesion_data={"equipos": {}, "titulo": "Test"},
            tareas=[],
            organizacion={"nombre": "Club Test"},
        )
    assert isinstance(result, bytes)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_generate_sesion_pdf_uses_to_thread():
    """asyncio.to_thread must be called so WeasyPrint runs off the event loop."""
    from app.services import pdf_service

    to_thread_calls = []
    original_to_thread = asyncio.to_thread

    async def spy_to_thread(func, *args, **kwargs):
        to_thread_calls.append(func)
        return await original_to_thread(func, *args, **kwargs)

    ctx1, ctx2 = _patch_jinja()
    with _patch_weasyprint(), ctx1, ctx2:
        with patch("asyncio.to_thread", side_effect=spy_to_thread):
            await pdf_service.generate_sesion_pdf(
                sesion_data={"equipos": {}, "titulo": "Test"},
                tareas=[],
                organizacion={"nombre": "Club Test"},
            )

    assert len(to_thread_calls) >= 1, \
        "asyncio.to_thread was not called — WeasyPrint is blocking the event loop"


@pytest.mark.asyncio
async def test_generate_informe_partido_pdf_is_async():
    from app.services import pdf_service

    assert asyncio.iscoroutinefunction(pdf_service.generate_informe_partido_pdf)

    ctx1, ctx2 = _patch_jinja()
    with _patch_weasyprint(), ctx1, ctx2:
        result = await pdf_service.generate_informe_partido_pdf(
            partido={}, rival={}, convocatoria=[], organizacion={}, equipo_nombre=""
        )
    assert isinstance(result, bytes)


@pytest.mark.asyncio
async def test_generate_convocatoria_pdf_is_async():
    from app.services import pdf_service

    assert asyncio.iscoroutinefunction(pdf_service.generate_convocatoria_pdf)

    ctx1, ctx2 = _patch_jinja()
    with _patch_weasyprint(), ctx1, ctx2:
        result = await pdf_service.generate_convocatoria_pdf(
            partido={}, rival={}, convocatoria=[], organizacion={}, equipo_nombre=""
        )
    assert isinstance(result, bytes)
