"""Tests for shared RFAF HTTP transport."""
from unittest.mock import MagicMock, patch

import pytest

from app.services.rfaf_http_transport import (
    RFAFUnavailableError,
    fetch_rfaf_bytes,
    reset_rfaf_transport,
)


@pytest.fixture(autouse=True)
def clean_transport():
    reset_rfaf_transport()
    yield
    reset_rfaf_transport()


def test_fetch_raises_on_empty_body_after_retries():
    session = MagicMock()
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.content = b""
    response.url = "https://www.rfaf.es/pnfg/NLogin?NSess=1"
    session.get.return_value = response

    with patch("app.services.rfaf_http_transport._get_session", return_value=session):
        with patch("app.services.rfaf_http_transport.warmup_session"):
            with patch("app.services.rfaf_http_transport._scraperapi_key", return_value=None):
                with patch("app.services.rfaf_http_transport._max_retries", return_value=2):
                    with pytest.raises(RFAFUnavailableError, match="0 bytes"):
                        fetch_rfaf_bytes(
                            "https://www.rfaf.es/pnfg/NPcd/NFG_Mov_LstCompeticiones",
                            {"competicion": "1"},
                        )


def test_fetch_returns_content_when_html_present():
    session = MagicMock()
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.content = b"<html><body>Competiciones</body></html>"
    response.url = "https://www.rfaf.es/pnfg/NPcd/NFG_Mov_LstCompeticiones"
    session.get.return_value = response

    with patch("app.services.rfaf_http_transport._get_session", return_value=session):
        with patch("app.services.rfaf_http_transport.warmup_session"):
            with patch("app.services.rfaf_http_transport._scraperapi_key", return_value=None):
                content = fetch_rfaf_bytes(
                    "https://www.rfaf.es/pnfg/NPcd/NFG_Mov_LstCompeticiones",
                    {"competicion": "1"},
                    max_retries=1,
                )
    assert b"Competiciones" in content


def test_scraperapi_path_used_when_key_configured():
    with patch("app.services.rfaf_http_transport._scraperapi_key", return_value="test-key"):
        with patch("app.services.rfaf_http_transport.requests.get") as mock_get:
            mock_get.return_value.content = b"<html>ok</html>"
            mock_get.return_value.raise_for_status.return_value = None
            content = fetch_rfaf_bytes(
                "https://www.rfaf.es/pnfg/NPcd/NFG_Mov_LstCompeticiones",
                {"competicion": "1"},
            )
    assert content == b"<html>ok</html>"
    assert mock_get.called
