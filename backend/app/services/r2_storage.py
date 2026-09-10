"""
Cloudflare R2 para recortes de revisión.

El navegador sube directo al bucket (igual que ahora con Storage).
La reproducción no paga egress. 15 GB × 15 días sale por céntimos, no 25 $/mes.

CORS del bucket (PUT/GET/HEAD, AllowedHeaders *):
  https://traininghub-frontend-eu.onrender.com
  http://localhost:3000
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone
from urllib.parse import quote

import requests

from app.config import get_settings

logger = logging.getLogger(__name__)

_REGION = "auto"
_SERVICE = "s3"


def r2_enabled() -> bool:
    s = get_settings()
    return bool(
        s.R2_ACCOUNT_ID
        and s.R2_ACCESS_KEY_ID
        and s.R2_SECRET_ACCESS_KEY
        and s.R2_BUCKET
        and s.R2_PUBLIC_BASE_URL
    )


def r2_config_error() -> str | None:
    """Error de claves mal pegadas. El token cfut_ no sirve como Access Key ID de S3."""
    s = get_settings()
    key = (s.R2_ACCESS_KEY_ID or "").strip()
    if key.lower().startswith("cfut_"):
        return (
            "R2_ACCESS_KEY_ID no es el token que empieza por cfut_. "
            "En Cloudflare → R2 → Tokens de API crea uno nuevo y copia "
            "«Access Key ID» / «ID de clave de acceso» (32 caracteres), no el valor del token."
        )
    return None


def _host(account_id: str) -> str:
    return f"{account_id}.r2.cloudflarestorage.com"


def _sign_key(secret: str, datestamp: str) -> bytes:
    k_date = hmac.new(("AWS4" + secret).encode("utf-8"), datestamp.encode("utf-8"), hashlib.sha256).digest()
    k_region = hmac.new(k_date, _REGION.encode("utf-8"), hashlib.sha256).digest()
    k_service = hmac.new(k_region, _SERVICE.encode("utf-8"), hashlib.sha256).digest()
    return hmac.new(k_service, b"aws4_request", hashlib.sha256).digest()


def _uri_encode(path: str, *, slash: bool) -> str:
    return quote(path, safe="/" if slash else "")


def _presign(method: str, storage_path: str, expires: int) -> str:
    s = get_settings()
    if not r2_enabled():
        raise RuntimeError("R2 no está configurado")
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    host = _host(s.R2_ACCOUNT_ID or "")
    bucket = s.R2_BUCKET
    key = storage_path.lstrip("/")
    canonical_uri = "/" + _uri_encode(bucket, slash=True) + "/" + _uri_encode(key, slash=True)
    credential = f"{s.R2_ACCESS_KEY_ID}/{datestamp}/{_REGION}/{_SERVICE}/aws4_request"
    # Solo se firma `host`. Content-Type lo manda el navegador sin entrar en la firma
    # (si no, un 403 de R2 llega sin CORS y el XHR dice «compruebe su conexión» al 99%).
    query_items = [
        ("X-Amz-Algorithm", "AWS4-HMAC-SHA256"),
        ("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD"),
        ("X-Amz-Credential", credential),
        ("X-Amz-Date", amz_date),
        ("X-Amz-Expires", str(expires)),
        ("X-Amz-SignedHeaders", "host"),
    ]
    canonical_query = "&".join(f"{_uri_encode(k, slash=False)}={_uri_encode(v, slash=False)}" for k, v in query_items)
    canonical_headers = f"host:{host}\n"
    canonical_request = "\n".join([
        method,
        canonical_uri,
        canonical_query,
        canonical_headers,
        "host",
        "UNSIGNED-PAYLOAD",
    ])
    scope = f"{datestamp}/{_REGION}/{_SERVICE}/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256",
        amz_date,
        scope,
        hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
    ])
    signature = hmac.new(
        _sign_key(s.R2_SECRET_ACCESS_KEY or "", datestamp),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"https://{host}{canonical_uri}?{canonical_query}&X-Amz-Signature={signature}"


def presign_put(storage_path: str, mime: str, expires: int = 3600) -> str:
    """URL firmada para PUT del recorte (hasta 200MB) desde el navegador."""
    return _presign("PUT", storage_path, expires)


def presign_get(storage_path: str, expires: int = 14400) -> str:
    """URL firmada para reproducir el recorte (Chrome / iPad no siempre abren r2.dev)."""
    return _presign("GET", storage_path, expires)


def public_url(storage_path: str) -> str:
    s = get_settings()
    base = (s.R2_PUBLIC_BASE_URL or "").rstrip("/")
    return f"{base}/{storage_path.lstrip('/')}"


def put_file(signed_url: str, local_path: str, mime: str) -> None:
    """Fallback: PUT desde disco sin cargar el vídeo entero en RAM."""
    size = os.path.getsize(local_path)
    with open(local_path, "rb") as fh:
        res = requests.put(
            signed_url,
            data=fh,
            headers={"Content-Type": mime, "Content-Length": str(size)},
            timeout=300,
        )
    if res.status_code not in (200, 201, 204):
        raise RuntimeError(f"R2 PUT {res.status_code}: {res.text[:200]}")


def delete_object(storage_path: str) -> None:
    if not r2_enabled() or not storage_path:
        return
    s = get_settings()
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    host = _host(s.R2_ACCOUNT_ID or "")
    bucket = s.R2_BUCKET
    key = storage_path.lstrip("/")
    canonical_uri = "/" + _uri_encode(bucket, slash=True) + "/" + _uri_encode(key, slash=True)
    canonical_headers = f"host:{host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:{amz_date}\n"
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join([
        "DELETE",
        canonical_uri,
        "",
        canonical_headers,
        signed_headers,
        "UNSIGNED-PAYLOAD",
    ])
    scope = f"{datestamp}/{_REGION}/{_SERVICE}/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256",
        amz_date,
        scope,
        hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
    ])
    signature = hmac.new(
        _sign_key(s.R2_SECRET_ACCESS_KEY or "", datestamp),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    auth = (
        f"AWS4-HMAC-SHA256 Credential={s.R2_ACCESS_KEY_ID}/{scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    url = f"https://{host}{canonical_uri}"
    try:
        res = requests.delete(
            url,
            headers={
                "Authorization": auth,
                "x-amz-date": amz_date,
                "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
                "Host": host,
            },
            timeout=20,
        )
        if res.status_code not in (200, 204, 404):
            logger.warning("R2 delete %s -> %s %s", storage_path, res.status_code, res.text[:200])
    except Exception as exc:
        logger.warning("R2 delete failed %s: %s", storage_path, exc)
