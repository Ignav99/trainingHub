"""
Shared HTTP transport for RFAF scraping.

RFAF often returns HTTP 200 with an empty body for datacenter IPs or when
flooded with concurrent requests. This module serializes all RFAF traffic
through one session, applies browser-like headers, optional proxy / ScraperAPI,
and enforces a minimum interval between requests.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Optional

import requests

logger = logging.getLogger(__name__)

LOGIN_URL = "https://www.rfaf.es/pnfg/NLogin"
PORTAL_URL = "https://www.rfaf.es/pnfg/"
RFAF_BASE = "https://www.rfaf.es"

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}

try:
    from curl_cffi import requests as curl_requests

    _HAS_CURL_CFFI = True
except ImportError:  # pragma: no cover - optional dependency
    curl_requests = None  # type: ignore[assignment]
    _HAS_CURL_CFFI = False


class RFAFUnavailableError(Exception):
    """RFAF did not return usable HTML after retries."""


_lock = threading.Lock()
_last_request_at = 0.0
_session: Optional[requests.Session] = None
_session_created_at = 0.0
_warmed_up = False
_last_referer = PORTAL_URL
_use_curl_cffi = False


def _settings():
    from app.config import get_settings

    return get_settings()


def _min_interval() -> float:
    settings = _settings()
    return getattr(settings, "RFAF_MIN_REQUEST_INTERVAL_SEC", 0.45) or 0.45


def _max_retries() -> int:
    settings = _settings()
    return int(getattr(settings, "RFAF_FETCH_MAX_RETRIES", 5) or 5)


def _session_max_age() -> int:
    settings = _settings()
    return int(getattr(settings, "RFAF_SESSION_MAX_AGE_SEC", 1800) or 1800)


def _should_use_curl_cffi() -> bool:
    settings = _settings()
    flag = getattr(settings, "RFAF_USE_CURL_CFFI", True)
    return bool(flag) and _HAS_CURL_CFFI


def _proxy_dict() -> dict[str, str]:
    settings = _settings()
    proxies: dict[str, str] = {}
    http_proxy = getattr(settings, "RFAF_HTTP_PROXY", None)
    https_proxy = getattr(settings, "RFAF_HTTPS_PROXY", None) or http_proxy
    if http_proxy:
        proxies["http"] = http_proxy
    if https_proxy:
        proxies["https"] = https_proxy
    return proxies


def _scraperapi_key() -> Optional[str]:
    settings = _settings()
    return getattr(settings, "SCRAPERAPI_KEY", None) or None


def _throttle() -> None:
    global _last_request_at
    interval = _min_interval()
    if interval <= 0:
        return
    elapsed = time.monotonic() - _last_request_at
    if elapsed < interval:
        time.sleep(interval - elapsed)
    _last_request_at = time.monotonic()


def _build_session() -> requests.Session:
    global _use_curl_cffi
    _use_curl_cffi = _should_use_curl_cffi()
    if _use_curl_cffi:
        session = curl_requests.Session(impersonate="chrome131")  # type: ignore[union-attr]
        logger.info("RFAF transport: curl_cffi (chrome131)")
    else:
        session = requests.Session()
        logger.info("RFAF transport: requests.Session")

    session.headers.update(DEFAULT_HEADERS)
    proxies = _proxy_dict()
    if proxies:
        session.proxies.update(proxies)
        logger.info("RFAF transport: using HTTP proxy")
    if _scraperapi_key():
        logger.info("RFAF transport: ScraperAPI enabled (country=es)")
    return session


def _get_session(*, force_new: bool = False) -> requests.Session:
    global _session, _session_created_at, _warmed_up, _last_referer
    now = time.monotonic()
    if (
        force_new
        or _session is None
        or (now - _session_created_at) > _session_max_age()
    ):
        if _session is not None:
            try:
                _session.close()
            except Exception:
                pass
        _session = _build_session()
        _session_created_at = now
        _warmed_up = False
        _last_referer = PORTAL_URL
    return _session


def reset_rfaf_transport() -> None:
    """Reset shared session (tests / after hard failure)."""
    global _session, _warmed_up, _last_referer, _session_created_at
    if _session is not None:
        try:
            _session.close()
        except Exception:
            pass
    _session = None
    _warmed_up = False
    _last_referer = PORTAL_URL
    _session_created_at = 0.0


def warmup_session(*, force: bool = False) -> None:
    """Obtain JSESSIONID via the NLogin redirect chain."""
    global _warmed_up, _last_referer
    if _warmed_up and not force:
        return

    session = _get_session(force_new=force)
    try:
        response = session.get(LOGIN_URL, timeout=20, allow_redirects=True)
        login_url = str(response.url)
        if "NSess=1" not in login_url:
            response = session.get(f"{LOGIN_URL}?NSess=1", timeout=20, allow_redirects=True)
            login_url = str(response.url)
        _last_referer = login_url
        _warmed_up = True
        cookie = session.cookies.get("JSESSIONID")
        if cookie:
            logger.info("RFAF session cookie obtained (JSESSIONID)")
        else:
            logger.warning("RFAF warmup completed without JSESSIONID cookie")
    except Exception as exc:
        logger.warning("RFAF warmup failed: %s", exc)
        raise RFAFUnavailableError(f"No se pudo iniciar sesión con la RFAF: {exc}") from exc


def _fetch_via_scraperapi(full_url: str) -> bytes:
    api_key = _scraperapi_key()
    if not api_key:
        raise RFAFUnavailableError("ScraperAPI key missing")

    response = requests.get(
        "http://api.scraperapi.com",
        params={
            "api_key": api_key,
            "url": full_url,
            "country_code": "es",
            "render": "false",
        },
        timeout=90,
    )
    response.raise_for_status()
    content = response.content or b""
    if len(content) == 0:
        raise RFAFUnavailableError("ScraperAPI returned empty body for RFAF URL")
    return content


def fetch_rfaf_bytes(
    url: str,
    params: Optional[dict] = None,
    *,
    referer: Optional[str] = None,
    max_retries: Optional[int] = None,
) -> bytes:
    """Fetch raw HTML bytes from RFAF with global lock, warmup, and retries."""
    global _last_referer

    params = params or {}
    prepared = requests.Request("GET", url, params=params).prepare()
    full_url = prepared.url or url
    retries = max_retries if max_retries is not None else _max_retries()

    if _scraperapi_key():
        with _lock:
            _throttle()
            try:
                return _fetch_via_scraperapi(full_url)
            except Exception as exc:
                raise RFAFUnavailableError(
                    f"ScraperAPI no pudo obtener la página RFAF: {exc}"
                ) from exc

    last_error: Optional[str] = None
    with _lock:
        for attempt in range(retries):
            _throttle()
            force_warmup = attempt > 0
            try:
                if force_warmup:
                    _get_session(force_new=True)
                warmup_session(force=force_warmup)

                session = _get_session()
                headers = {"Referer": referer or _last_referer}
                response = session.get(
                    url,
                    params=params,
                    headers=headers,
                    timeout=45,
                    allow_redirects=True,
                )
                response.raise_for_status()
                _last_referer = str(response.url)

                content = response.content or b""
                if len(content) > 0:
                    if len(content) < 100:
                        logger.warning(
                            "RFAF response very small (%d bytes) for %s",
                            len(content),
                            url,
                        )
                    return content

                last_error = "empty body (0 bytes)"
                wait = min(2 * (attempt + 1), 10)
                logger.warning(
                    "RFAF returned 0 bytes (attempt %d/%d), retrying in %ds…",
                    attempt + 1,
                    retries,
                    wait,
                )
                _warmed_up = False
                time.sleep(wait)
            except RFAFUnavailableError:
                raise
            except Exception as exc:
                last_error = str(exc)
                if attempt < retries - 1:
                    wait = min(2 * (attempt + 1), 10)
                    logger.warning(
                        "RFAF fetch error (attempt %d/%d): %s, retrying in %ds…",
                        attempt + 1,
                        retries,
                        exc,
                        wait,
                    )
                    _warmed_up = False
                    time.sleep(wait)
                else:
                    break

    hint = (
        " La RFAF suele bloquear IPs de datacenter (Render). "
        "Configura SCRAPERAPI_KEY o RFAF_HTTPS_PROXY con un proxy residencial en España."
    )
    raise RFAFUnavailableError(
        f"RFAF no devolvió datos tras {retries} intentos ({last_error or 'unknown'}).{hint}"
    )


def fetch_rfaf_html(
    url: str,
    params: Optional[dict] = None,
    *,
    charset: str = "iso-8859-15",
    **kwargs,
) -> str:
    content = fetch_rfaf_bytes(url, params, **kwargs)
    return content.decode(charset, errors="replace")
