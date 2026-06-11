# tests/test_rfef_circuit_breaker.py
"""Tests for RFEF scraper circuit breaker."""
import time
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


# ---------------------------------------------------------------------------
# Helpers — reset circuit breaker state between tests
# ---------------------------------------------------------------------------

def _reset_cb():
    """Reset circuit breaker module state to closed/clean."""
    import app.services.rfef_scraper_service as svc
    svc._cb_consecutive_failures = 0
    svc._cb_open = False
    svc._cb_open_until = 0.0


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_circuit_breaker_constants_exist():
    """Module must export the threshold and cooldown constants."""
    import app.services.rfef_scraper_service as svc
    assert hasattr(svc, "CIRCUIT_BREAKER_THRESHOLD")
    assert hasattr(svc, "CIRCUIT_BREAKER_COOLDOWN_SECS")
    assert svc.CIRCUIT_BREAKER_THRESHOLD == 3
    assert svc.CIRCUIT_BREAKER_COOLDOWN_SECS == 6 * 3600


def test_cb_state_variables_exist():
    """Module must have the three state variables."""
    import app.services.rfef_scraper_service as svc
    assert hasattr(svc, "_cb_consecutive_failures")
    assert hasattr(svc, "_cb_open")
    assert hasattr(svc, "_cb_open_until")


@pytest.mark.asyncio
async def test_circuit_opens_after_threshold_failures():
    """After CIRCUIT_BREAKER_THRESHOLD consecutive failures, circuit opens."""
    import app.services.rfef_scraper_service as svc
    import app.services.rfef_scheduler_service as scheduler_svc

    _reset_cb()

    with patch.object(scheduler_svc, "sync_all_competitions", wraps=scheduler_svc.sync_all_competitions):
        with patch("app.services.rfef_scheduler_service._sync_one", side_effect=RuntimeError("scrape failed")):
            with patch("app.services.rfef_scheduler_service.get_supabase") as mock_sb:
                mock_sb.return_value.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.not_.is_.return_value.execute.return_value.data = [
                    {"id": "comp-1", "rfef_codcompeticion": "123", "rfef_codgrupo": "1", "rfef_codtemporada": "21"}
                ]
                for _ in range(svc.CIRCUIT_BREAKER_THRESHOLD):
                    await scheduler_svc.sync_all_competitions()

    assert svc._cb_open is True, "Circuit should be open after threshold failures"
    assert svc._cb_open_until > time.monotonic(), "open_until should be in the future"


@pytest.mark.asyncio
async def test_circuit_skips_while_open(caplog):
    """While circuit is open, sync_all_competitions returns early with one warning."""
    import app.services.rfef_scraper_service as svc
    import app.services.rfef_scheduler_service as scheduler_svc
    import logging

    _reset_cb()
    # Manually open the circuit
    svc._cb_open = True
    svc._cb_open_until = time.monotonic() + 99999

    sync_called = []

    with patch("app.services.rfef_scheduler_service._sync_one", side_effect=lambda *a, **kw: sync_called.append(1)):
        with caplog.at_level(logging.WARNING):
            await scheduler_svc.sync_all_competitions()
            await scheduler_svc.sync_all_competitions()  # second call — no extra warning

    assert len(sync_called) == 0, "_sync_one must not be called while circuit is open"
    # There should be at least 1 circuit-open warning
    cb_warnings = [r for r in caplog.records if "circuit" in r.message.lower() and r.levelno == logging.WARNING]
    assert len(cb_warnings) >= 1


@pytest.mark.asyncio
async def test_circuit_half_opens_after_cooldown():
    """After cooldown, next call tries again (half-open -> closed on success)."""
    import app.services.rfef_scraper_service as svc
    import app.services.rfef_scheduler_service as scheduler_svc

    _reset_cb()
    # Set open_until to the past (cooldown elapsed)
    svc._cb_open = True
    svc._cb_open_until = time.monotonic() - 1  # already elapsed

    sync_called = []

    async def mock_sync_one(supabase, scraper, comp):
        sync_called.append(comp)

    with patch("app.services.rfef_scheduler_service._sync_one", new=AsyncMock(side_effect=mock_sync_one)):
        with patch("app.services.rfef_scheduler_service.get_supabase") as mock_sb:
            mock_sb.return_value.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.not_.is_.return_value.execute.return_value.data = [
                {"id": "comp-1", "rfef_codcompeticion": "123", "rfef_codgrupo": "1", "rfef_codtemporada": "21"}
            ]
            await scheduler_svc.sync_all_competitions()

    assert len(sync_called) >= 1, "After cooldown, syncs should run"
    assert svc._cb_open is False, "Circuit should close after successful run"
    assert svc._cb_consecutive_failures == 0


@pytest.mark.asyncio
async def test_circuit_resets_on_success():
    """A successful run resets consecutive failure count."""
    import app.services.rfef_scraper_service as svc
    import app.services.rfef_scheduler_service as scheduler_svc

    _reset_cb()
    svc._cb_consecutive_failures = 2  # 2 failures so far, not yet open

    async def mock_sync_one(supabase, scraper, comp):
        pass  # success

    with patch("app.services.rfef_scheduler_service._sync_one", new=AsyncMock(side_effect=mock_sync_one)):
        with patch("app.services.rfef_scheduler_service.get_supabase") as mock_sb:
            mock_sb.return_value.table.return_value.select.return_value.eq.return_value.not_.is_.return_value.not_.is_.return_value.execute.return_value.data = [
                {"id": "comp-1", "rfef_codcompeticion": "123", "rfef_codgrupo": "1", "rfef_codtemporada": "21"}
            ]
            await scheduler_svc.sync_all_competitions()

    assert svc._cb_consecutive_failures == 0, "Failures should reset on success"
    assert svc._cb_open is False
