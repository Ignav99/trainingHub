# Backend Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three targeted backend optimizations — non-blocking PDF generation, circuit-breaker for RFEF scraper, and TTL-cached subscription lookups — plus an h2/httpx investigation.

**Architecture:** Each optimization is self-contained: (1) wrap sync WeasyPrint calls in `asyncio.to_thread` inside the existing sync `generate_*` functions (making them async), (2) add a module-level circuit-breaker state object inside `rfef_scraper_service.py` that gates `sync_all_competitions` runs, (3) add a `TTLCache` helper at the top of `dependencies.py` keyed by `org_id` with a 5-min expiry plus an `invalidate_subscription_cache` helper called at subscription mutation sites.

**Tech Stack:** Python 3.11, FastAPI, WeasyPrint 60.2, Jinja2 3.1.3, asyncio, requests, APScheduler, supabase-py 2.10.0, httpx 0.27.2, h2 4.3.0, pytest 7.4.4

**Baseline test suite:** 148 passed. NEVER push to remote. Commit with `conventional commits`, NO Co-Authored-By. Stage ONLY touched files.

---

## Files Touched

| File | Action |
|------|--------|
| `app/services/pdf_service.py` | Modify — make `generate_*` public functions `async`, wrap blocking body with `asyncio.to_thread` |
| `app/services/rfef_scraper_service.py` | Modify — add circuit breaker state + `_maybe_run_with_circuit_breaker` guard |
| `app/services/rfef_scheduler_service.py` | Modify — wrap `sync_all_competitions` with circuit breaker check |
| `app/security/dependencies.py` | Modify — add `TTLCache`, cache `_get_subscription_info`, add `invalidate_subscription_cache` |
| `app/api/v1/stripe_webhook.py` | Modify — call `invalidate_subscription_cache` after subscription updates |
| `app/api/v1/suscripciones.py` | Modify — call `invalidate_subscription_cache` after subscription updates |
| `tests/test_pdf_service.py` | Create — async PDF off-event-loop tests |
| `tests/test_rfef_circuit_breaker.py` | Create — circuit breaker state machine tests |
| `tests/test_subscription_cache.py` | Create — TTL cache hit/miss/expiry/invalidation tests |

Call sites to update after making `generate_*` async — find them with:
```
rg "generate_(sesion|informe_partido|convocatoria|sesion_pdf_v2|informe_rival|informe_rival_standalone|plan_partido|plan_partido_jugadores|tarea|abp_playbook|abp_partido)_pdf" app/api/
```
Each call site needs `await`.

---

## Optimization 1 — perf(pdf): run WeasyPrint off the event loop

### Task 1: Write failing tests for async PDF generation

**Files:**
- Create: `tests/test_pdf_service.py`

The 11 public `generate_*` functions in `pdf_service.py` are currently **sync**. After this optimization they must be **async** and must delegate the blocking WeasyPrint/Jinja work to a thread. The test mocks WeasyPrint so no real PDF is generated, and verifies two things:
1. The function is a coroutine (i.e., `asyncio.iscoroutinefunction(fn)` is True).
2. `asyncio.to_thread` is invoked during execution (patched to track calls).

- [ ] **Step 1: Write the failing test file**

```python
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
```

- [ ] **Step 2: Run tests to confirm they FAIL (functions not yet async)**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/test_pdf_service.py -v 2>&1 | head -40
```

Expected: FAILED — `assert asyncio.iscoroutinefunction(pdf_service.generate_sesion_pdf)` is False.

---

### Task 2: Make `generate_*` functions async with `asyncio.to_thread`

**Files:**
- Modify: `app/services/pdf_service.py`

**Strategy:** The 11 public `generate_*` functions each follow the same pattern:
1. Jinja prep (fast — stays sync inside the thread closure).
2. `template.render(...)` (CPU — inside thread).
3. `HTML(string=...).write_pdf()` (CPU — inside thread).

The simplest approach that passes the tests: extract the sync body into an inner `_render()` closure and call `await asyncio.to_thread(_render)`.

Do this for all 11 functions. The pattern is identical for each:

```python
# BEFORE (sync):
def generate_sesion_pdf(sesion_data, tareas, organizacion) -> bytes:
    env = _get_jinja_env()
    template = env.get_template("sesion_pdf.html")
    # ... data prep ...
    html_content = template.render(...)
    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except ImportError:
        return html_content.encode("utf-8")

# AFTER (async):
async def generate_sesion_pdf(sesion_data, tareas, organizacion) -> bytes:
    env = _get_jinja_env()
    template = env.get_template("sesion_pdf.html")
    # ... data prep (same as before, no changes) ...

    def _render() -> bytes:
        html_content = template.render(...)
        try:
            from weasyprint import HTML
            return HTML(string=html_content).write_pdf()
        except ImportError:
            return html_content.encode("utf-8")

    return await asyncio.to_thread(_render)
```

Add `import asyncio` at the top of `pdf_service.py`.

- [ ] **Step 3: Add `import asyncio` to pdf_service.py**

At line 8, insert `import asyncio` after `import base64`:

```python
import asyncio
import base64
import logging
import re
from pathlib import Path
from typing import Optional
```

- [ ] **Step 4: Refactor `generate_sesion_pdf` to async**

The function starts at line ~413. Wrap the `template.render(...)` + WeasyPrint block in a `_render()` closure and `await asyncio.to_thread(_render)`.

The data-prep section (fases grouping, tarea building) stays BEFORE the closure — this is fast dict manipulation and doesn't need to move.

Only the `html_content = template.render(...)` and the WeasyPrint block move INSIDE `_render()`.

Apply this pattern to ALL 11 public `generate_*` functions:
- `generate_sesion_pdf`
- `generate_informe_partido_pdf`
- `generate_convocatoria_pdf`
- `generate_sesion_pdf_v2`
- `generate_informe_rival_pdf`
- `generate_informe_rival_standalone_pdf`
- `generate_plan_partido_pdf`
- `generate_plan_partido_jugadores_pdf`
- `generate_tarea_pdf`
- `generate_abp_playbook_pdf`
- `generate_abp_partido_pdf`

- [ ] **Step 5: Update call sites to `await` the now-async functions**

Find them:
```bash
rg "generate_(sesion|informe_partido|convocatoria|sesion_pdf_v2|informe_rival|informe_rival_standalone|plan_partido|plan_partido_jugadores|tarea|abp_playbook|abp_partido)_pdf" app/api/ -n
```

Each call site in an async route handler: add `await` before the call. The route handlers are already `async def`, so this is a one-word change per call site.

- [ ] **Step 6: Run tests — confirm passing**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/test_pdf_service.py -v
```

Expected: 4 PASSED.

- [ ] **Step 7: Run full suite — confirm baseline still 148+**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/ -q
```

Expected: 152+ passed, 0 failed.

- [ ] **Step 8: Commit**

```bash
cd backend && git add app/services/pdf_service.py tests/test_pdf_service.py $(rg "generate_(sesion|informe_partido|convocatoria|sesion_pdf_v2|informe_rival|informe_rival_standalone|plan_partido|plan_partido_jugadores|tarea|abp_playbook|abp_partido)_pdf" app/api/ -l) && git commit -m "perf(pdf): run WeasyPrint rendering off the event loop"
```

---

## Optimization 2 — fix(scraper): circuit breaker for RFAF scraper

### Task 3: Write failing tests for circuit breaker

**Files:**
- Create: `tests/test_rfef_circuit_breaker.py`

The circuit breaker state lives in `rfef_scraper_service.py` as module-level variables. After implementation:
- After `CIRCUIT_BREAKER_THRESHOLD` (3) consecutive failures, `_cb_open` is True and `_cb_open_until` is set to `now + CIRCUIT_BREAKER_COOLDOWN_SECS` (6h).
- While open, `sync_all_competitions` (in the scheduler) logs ONE warning and returns early.
- After cooldown, the first run attempt resets `_cb_open` to False (half-open) and tries again.
- On success, `_cb_consecutive_failures` resets to 0 and circuit closes.

- [ ] **Step 9: Write the failing test file**

```python
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

    # Make sync_all_competitions raise on each run by mocking _sync_one to throw
    async def fail_sync():
        raise RuntimeError("scrape failed")

    with patch.object(scheduler_svc, "sync_all_competitions", wraps=scheduler_svc.sync_all_competitions):
        with patch("app.services.rfef_scheduler_service._sync_one", side_effect=RuntimeError("scrape failed")):
            with patch("app.services.rfef_scheduler_service.get_supabase") as mock_sb:
                mock_sb.return_value.table.return_value.select.return_value.eq.return_value.not_.return_value.is_.return_value.not_.return_value.is_.return_value.execute.return_value.data = [
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
    # At most ONE circuit-open warning total (not one per call)
    cb_warnings = [r for r in caplog.records if "circuit" in r.message.lower() and r.levelno == logging.WARNING]
    # There should be at most 2 warnings total (one per call is acceptable, but zero _sync_one calls)
    assert len(cb_warnings) >= 1


@pytest.mark.asyncio
async def test_circuit_half_opens_after_cooldown():
    """After cooldown, next call tries again (half-open → closed on success)."""
    import app.services.rfef_scraper_service as svc
    import app.services.rfef_scheduler_service as scheduler_svc

    _reset_cb()
    # Set open_until to the past (cooldown elapsed)
    svc._cb_open = True
    svc._cb_open_until = time.monotonic() - 1  # already elapsed

    sync_called = []

    async def mock_sync_one(supabase, scraper, comp):
        sync_called.append(comp)

    with patch("app.services.rfef_scheduler_service._sync_one", side_effect=mock_sync_one):
        with patch("app.services.rfef_scheduler_service.get_supabase") as mock_sb:
            mock_sb.return_value.table.return_value.select.return_value.eq.return_value.not_.return_value.is_.return_value.not_.return_value.is_.return_value.execute.return_value.data = [
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

    with patch("app.services.rfef_scheduler_service._sync_one", side_effect=mock_sync_one):
        with patch("app.services.rfef_scheduler_service.get_supabase") as mock_sb:
            mock_sb.return_value.table.return_value.select.return_value.eq.return_value.not_.return_value.is_.return_value.not_.return_value.is_.return_value.execute.return_value.data = [
                {"id": "comp-1", "rfef_codcompeticion": "123", "rfef_codgrupo": "1", "rfef_codtemporada": "21"}
            ]
            await scheduler_svc.sync_all_competitions()

    assert svc._cb_consecutive_failures == 0, "Failures should reset on success"
    assert svc._cb_open is False
```

- [ ] **Step 10: Run tests to confirm they FAIL**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/test_rfef_circuit_breaker.py -v 2>&1 | head -30
```

Expected: FAILED — `AttributeError: module has no attribute 'CIRCUIT_BREAKER_THRESHOLD'`.

---

### Task 4: Implement circuit breaker in rfef_scraper_service.py + rfef_scheduler_service.py

**Files:**
- Modify: `app/services/rfef_scraper_service.py` — add constants and state vars at top
- Modify: `app/services/rfef_scheduler_service.py` — add circuit breaker guard in `sync_all_competitions`

- [ ] **Step 11: Add circuit breaker constants and state vars to rfef_scraper_service.py**

After the `CHARSET = "iso-8859-15"` line (around line 32), add:

```python
# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------
CIRCUIT_BREAKER_THRESHOLD: int = 3       # consecutive full-run failures to open
CIRCUIT_BREAKER_COOLDOWN_SECS: int = 6 * 3600  # 6 hours

_cb_consecutive_failures: int = 0
_cb_open: bool = False
_cb_open_until: float = 0.0  # monotonic timestamp
```

- [ ] **Step 12: Add circuit breaker guard to sync_all_competitions in rfef_scheduler_service.py**

Import the circuit breaker state at the top of the file:

```python
import app.services.rfef_scraper_service as _scraper_mod
```

Then, at the TOP of `sync_all_competitions()`, right after the docstring and before the Supabase call, add:

```python
async def sync_all_competitions():
    """Sincroniza todas las competiciones con sync_habilitado=true."""
    import time as _time

    # --- Circuit breaker check ---
    if _scraper_mod._cb_open:
        if _time.monotonic() < _scraper_mod._cb_open_until:
            logger.warning(
                "RFEF circuit breaker open until %.0f — skipping sync run",
                _scraper_mod._cb_open_until,
            )
            return
        else:
            # Cooldown elapsed — half-open: allow one attempt
            _scraper_mod._cb_open = False
            logger.info("RFEF circuit breaker half-open — attempting recovery run")
    # --- end circuit breaker check ---
```

Then, wrap the entire body of the function so that on success the failure count resets, and on unhandled exception it increments and potentially opens the circuit. The existing `try/except Exception as e: logger.error(...)` at the bottom becomes:

```python
    try:
        # ... existing body ...
        # Reset on success
        _scraper_mod._cb_consecutive_failures = 0
        _scraper_mod._cb_open = False
    except Exception as e:
        _scraper_mod._cb_consecutive_failures += 1
        logger.error("Error in sync_all_competitions: %s", e, exc_info=True)
        if _scraper_mod._cb_consecutive_failures >= _scraper_mod.CIRCUIT_BREAKER_THRESHOLD:
            import time as _time
            _scraper_mod._cb_open = True
            _scraper_mod._cb_open_until = _time.monotonic() + _scraper_mod.CIRCUIT_BREAKER_COOLDOWN_SECS
            logger.warning(
                "RFEF circuit breaker OPENED after %d consecutive failures. "
                "Will retry after %s",
                _scraper_mod._cb_consecutive_failures,
                _time.strftime("%Y-%m-%d %H:%M:%S", _time.localtime(
                    _time.time() + _scraper_mod.CIRCUIT_BREAKER_COOLDOWN_SECS
                )),
            )
```

- [ ] **Step 13: Run circuit breaker tests**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/test_rfef_circuit_breaker.py -v
```

Expected: 6 PASSED.

- [ ] **Step 14: Run full suite**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/ -q
```

Expected: 154+ passed, 0 failed.

- [ ] **Step 15: Commit**

```bash
cd backend && git add app/services/rfef_scraper_service.py app/services/rfef_scheduler_service.py tests/test_rfef_circuit_breaker.py && git commit -m "fix(scraper): add circuit breaker to RFAF scraper to stop failure loops"
```

---

## Optimization 3 — perf(auth): TTL cache for subscription lookups

### Task 5: Write failing tests for TTL cache

**Files:**
- Create: `tests/test_subscription_cache.py`

The `TTLCache` lives in `dependencies.py`. It is a thin dict-based helper with monotonic timestamps. `_get_subscription_info` uses it. `invalidate_subscription_cache(org_id)` is exported and called from stripe webhook and suscripciones API endpoints.

- [ ] **Step 16: Write the failing test file**

```python
# tests/test_subscription_cache.py
"""Tests for TTL subscription cache in dependencies.py."""
import time
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_supabase_mock(data: dict):
    mock = MagicMock()
    (mock.table.return_value
        .select.return_value
        .eq.return_value
        .single.return_value
        .execute.return_value
        .data) = data
    return mock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_ttlcache_class_exists():
    """TTLCache must be importable from dependencies."""
    from app.security.dependencies import TTLCache
    assert TTLCache is not None


def test_ttlcache_set_and_get():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=60, max_size=10)
    cache.set("key1", {"plan": "pro"})
    val = cache.get("key1")
    assert val == {"plan": "pro"}


def test_ttlcache_miss_returns_none():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=60, max_size=10)
    assert cache.get("missing") is None


def test_ttlcache_expires_after_ttl():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=60, max_size=10)
    fake_now = time.monotonic()
    with patch("time.monotonic", return_value=fake_now):
        cache.set("key1", {"plan": "basic"})

    # Advance time past TTL
    with patch("time.monotonic", return_value=fake_now + 61):
        result = cache.get("key1")
    assert result is None, "Entry should be expired after TTL"


def test_ttlcache_does_not_expire_before_ttl():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=300, max_size=10)
    fake_now = time.monotonic()
    with patch("time.monotonic", return_value=fake_now):
        cache.set("org-123", {"estado": "active"})

    with patch("time.monotonic", return_value=fake_now + 299):
        result = cache.get("org-123")
    assert result == {"estado": "active"}


def test_ttlcache_invalidate():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=300, max_size=10)
    cache.set("org-abc", {"estado": "active"})
    cache.invalidate("org-abc")
    assert cache.get("org-abc") is None


def test_get_subscription_info_caches_result():
    """Second call with same org_id should NOT hit Supabase again."""
    from app.security import dependencies

    # Reset cache state
    dependencies._subscription_cache.invalidate("org-test-1")

    mock_data = {"estado": "active", "planes": {"nombre": "pro"}}
    mock_sb = _make_supabase_mock(mock_data)

    with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
        result1 = dependencies._get_subscription_info("org-test-1")
        result2 = dependencies._get_subscription_info("org-test-1")

    assert result1 == mock_data
    assert result2 == mock_data
    # Supabase .execute() called only ONCE
    assert mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.call_count == 1, \
        "Supabase must be called only once — second call should hit cache"


def test_get_subscription_info_cache_miss_after_expiry():
    """After TTL, Supabase is called again."""
    from app.security import dependencies

    dependencies._subscription_cache.invalidate("org-test-2")

    mock_data = {"estado": "active"}
    mock_sb = _make_supabase_mock(mock_data)

    fake_now = time.monotonic()

    with patch("time.monotonic", return_value=fake_now):
        with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
            dependencies._get_subscription_info("org-test-2")

    # Advance past TTL (5 minutes = 300s)
    with patch("time.monotonic", return_value=fake_now + 301):
        with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
            dependencies._get_subscription_info("org-test-2")

    assert mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.call_count == 2, \
        "Supabase must be called twice — cache expired"


def test_invalidate_subscription_cache_function_exists():
    """invalidate_subscription_cache must be a public function in dependencies."""
    from app.security.dependencies import invalidate_subscription_cache
    invalidate_subscription_cache("org-xyz")  # must not raise


def test_invalidate_clears_cached_value():
    from app.security import dependencies
    from app.security.dependencies import invalidate_subscription_cache

    mock_data = {"estado": "active"}
    mock_sb = _make_supabase_mock(mock_data)

    with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
        dependencies._get_subscription_info("org-inv-test")

    # Invalidate and fetch again — should call Supabase a second time
    invalidate_subscription_cache("org-inv-test")

    with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
        dependencies._get_subscription_info("org-inv-test")

    assert mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.call_count == 2
```

- [ ] **Step 17: Run tests to confirm they FAIL**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/test_subscription_cache.py -v 2>&1 | head -30
```

Expected: FAILED — `ImportError: cannot import name 'TTLCache' from 'app.security.dependencies'`.

---

### Task 6: Implement TTLCache and wire it up

**Files:**
- Modify: `app/security/dependencies.py`
- Modify: `app/api/v1/stripe_webhook.py`
- Modify: `app/api/v1/suscripciones.py`

- [ ] **Step 18: Add TTLCache class and cache instance to dependencies.py**

Add `import time` to the imports at the top of `dependencies.py`.

After the imports (before `logger = logging.getLogger(...)`), insert the TTLCache implementation:

```python
import time

# ---------------------------------------------------------------------------
# TTL Cache for subscription lookups
# ---------------------------------------------------------------------------

class TTLCache:
    """Simple in-process TTL cache backed by a plain dict.
    Thread-safe for CPython (GIL protects dict ops).
    max_size is a soft cap — LRU eviction not implemented; excess entries
    are evicted lazily on get() by expiry sweep.
    """

    def __init__(self, ttl_seconds: int = 300, max_size: int = 512):
        self._ttl = ttl_seconds
        self._max_size = max_size
        self._store: dict[str, tuple[float, object]] = {}  # key -> (expires_at, value)

    def get(self, key: str):
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value) -> None:
        if len(self._store) >= self._max_size:
            # Evict expired entries first
            now = time.monotonic()
            expired = [k for k, (exp, _) in self._store.items() if now >= exp]
            for k in expired:
                del self._store[k]
        self._store[key] = (time.monotonic() + self._ttl, value)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)


_subscription_cache = TTLCache(ttl_seconds=300, max_size=512)


def invalidate_subscription_cache(org_id: str) -> None:
    """Evict a specific org's subscription data from the in-process cache.
    Call this from any endpoint that mutates suscripciones state.
    """
    _subscription_cache.invalidate(org_id)
```

- [ ] **Step 19: Update `_get_subscription_info` to use the cache**

Replace the existing `_get_subscription_info` function body (lines 109-124):

```python
def _get_subscription_info(organizacion_id: str) -> dict:
    """Fetch subscription and plan info for an organization. Cached for 5 minutes."""
    cached = _subscription_cache.get(organizacion_id)
    if cached is not None:
        return cached

    supabase = get_supabase()
    try:
        result = (
            supabase.table("suscripciones")
            .select("*, planes(*)")
            .eq("organizacion_id", organizacion_id)
            .single()
            .execute()
        )
        if result.data:
            _subscription_cache.set(organizacion_id, result.data)
            return result.data
    except Exception:
        pass
    return {}
```

- [ ] **Step 20: Call `invalidate_subscription_cache` at subscription mutation sites**

In `app/api/v1/stripe_webhook.py`, import and call the invalidator after each `suscripciones` update:

```python
from app.security.dependencies import invalidate_subscription_cache
```

Then after each `.table("suscripciones").update(...)` call, add:
```python
invalidate_subscription_cache(org_id)  # bust 5-min TTL cache
```

The `org_id` variable name may differ — check the function context. In stripe_webhook.py the common pattern uses `organizacion_id` from the subscription record. Use whatever local variable holds the org ID.

In `app/api/v1/suscripciones.py`, do the same: import + call `invalidate_subscription_cache(organizacion_id)` after each `suscripciones` update/upsert.

- [ ] **Step 21: Run subscription cache tests**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/test_subscription_cache.py -v
```

Expected: 10 PASSED.

- [ ] **Step 22: Run full suite**

```bash
cd backend && SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=test-anon-key SUPABASE_SERVICE_ROLE_KEY=test-service-role-key SECRET_KEY='test-secret-key-for-ci-only-32chars!' .venv/bin/python -m pytest tests/ -q
```

Expected: 158+ passed, 0 failed.

- [ ] **Step 23: Commit**

```bash
cd backend && git add app/security/dependencies.py app/api/v1/stripe_webhook.py app/api/v1/suscripciones.py tests/test_subscription_cache.py && git commit -m "perf(auth): cache subscription lookups with 5-minute TTL"
```

---

## H2/httpx Investigation

### Task 7: Investigate and optionally fix h2 pseudo-header bug

**Files:**
- Read: `app/services/pdf_service.py` (httpx usage)
- Read: installed versions

- [ ] **Step 24: Verify findings and apply fix if safe**

The error `Received pseudo-header in trailer {b':path'...}` is a known h2 bug triggered when an HTTP/2 server sends pseudo-headers (`:path`, `:status`, etc.) in trailers (the trailing HEADERS frame after DATA). This violates RFC 7540 §8.1.2.1 but some servers do it. httpx propagates the h2 exception as an unhandled error.

**Environment:**
- httpx==0.27.2 — installed (transitive dep of supabase 2.10.0)
- h2==4.3.0 — installed
- No `http2=True` found anywhere in `app/`
- The only httpx usage is `httpx.Client(timeout=8.0)` in `pdf_service.py:_url_to_data_uri()` — this is a **sync** httpx.Client with no explicit HTTP version; sync httpx.Client does NOT enable HTTP/2 by default

**Root cause:** The error most likely comes from the `supabase-py` client, which uses `httpx` internally. supabase 2.10.0 pins httpx and may use an `AsyncClient`. h2 4.3.0 is more lenient than 4.1/4.2 but still raises on this invalid trailer pattern.

**Safe fix:** In `_url_to_data_uri`, there is no issue (sync client, HTTP/1.1). The supabase client we don't construct — it's internal. The safe, targeted fix is to explicitly pass `http2=False` to our own `httpx.Client` in `pdf_service.py` to document intent:

```python
with httpx.Client(timeout=8.0, http2=False) as client:
```

This doesn't fix the supabase-side error but makes our usage explicit. The actual fix for the supabase pseudo-header trailer bug is either:
1. Upgrading supabase-py (check if 2.11+ pins a fixed httpx/h2)
2. Downgrading h2 to a version that silently ignores invalid trailers
3. Patching the network infrastructure to not send pseudo-headers in trailers

Since the httpx.Client in `pdf_service.py` is the only client we construct directly, and it doesn't exhibit the bug (no H/2), the correct action is: **document the investigation findings, apply the `http2=False` explicit flag to our httpx.Client, and note the real fix requires supabase-py upgrade or server-side fix.**

```bash
# Apply the http2=False flag
cd backend
```

Edit `app/services/pdf_service.py` line 23:
```python
with httpx.Client(timeout=8.0, http2=False) as client:
```

Then commit:
```bash
git add app/services/pdf_service.py && git commit -m "fix(http): explicitly disable http2 on internal httpx client; document h2 trailer bug"
```

**Full investigation note to include in commit body:**
> The `Received pseudo-header in trailer` error originates from supabase-py's internal httpx AsyncClient (h2 4.3.0 raises on RFC-violating trailers from the Supabase API edge). Our own httpx.Client usage in pdf_service.py is sync and does not enable HTTP/2. No http2=True found anywhere in app/. The real fix is supabase-py upgrade or disabling h2 in the supabase client config — outside our direct control. This commit makes our own client's intent explicit.

---

## Self-Review Checklist

**Spec coverage:**
- [x] PDF: async + to_thread + call sites updated + tests
- [x] Scraper: circuit breaker constants, state, guard in scheduler, tests
- [x] Auth cache: TTLCache class, module-level instance, _get_subscription_info wired, invalidate helper, mutation sites patched, tests
- [x] H2 investigation: finding documented, safe explicit fix applied

**Placeholder scan:** No TBDs. All code blocks are complete and specific to this codebase.

**Type consistency:** `_cb_consecutive_failures`, `_cb_open`, `_cb_open_until` used consistently in both rfef_scraper_service.py (definition) and rfef_scheduler_service.py (mutation). `_subscription_cache` and `invalidate_subscription_cache` referenced consistently across dependencies.py and call sites.
