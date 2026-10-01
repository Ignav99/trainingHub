"""Pase del QR de la sala de vídeo. No hace falta una fila en revision_sessions."""

from __future__ import annotations

import hashlib
import hmac
from typing import Optional


def sign_video_room(code: str, secret: str) -> str:
    payload = f"video-sala:{code.upper().strip()}".encode()
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def video_room_pass_ok(code: str, room_pass: Optional[str], secret: str) -> bool:
    if not room_pass or not secret:
        return False
    expected = sign_video_room(code, secret)
    candidate = room_pass.strip().lower()
    if len(candidate) != len(expected):
        return False
    return hmac.compare_digest(expected, candidate)


def parse_sala_guest_token(token: str) -> Optional[tuple[str, Optional[str]]]:
    if not isinstance(token, str) or not token.startswith("sala:"):
        return None
    body = token[5:].strip()
    if not body:
        return None
    room_pass: Optional[str] = None
    if "." in body:
        raw_code, raw_pass = body.split(".", 1)
        room_pass = raw_pass.strip() or None
    else:
        raw_code = body
    code = raw_code.upper().strip()
    if len(code) < 4 or len(code) > 12:
        return None
    return code, room_pass
