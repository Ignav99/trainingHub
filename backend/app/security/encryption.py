"""
TrainingHub Pro - Encryption Service
AES-256-GCM encryption for GDPR Art. 9 sensitive data (medical records).
"""

import base64
import logging
import os
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

# Encryption key should be stored securely (env variable)
_ENCRYPTION_KEY: Optional[bytes] = None


def _get_key() -> bytes:
    """Get or initialize the encryption key."""
    global _ENCRYPTION_KEY
    if _ENCRYPTION_KEY is None:
        key_b64 = os.environ.get("MEDICAL_ENCRYPTION_KEY")
        if key_b64:
            _ENCRYPTION_KEY = base64.b64decode(key_b64)
        else:
            logger.warning(
                "MEDICAL_ENCRYPTION_KEY not set. Using derived key from SECRET_KEY. "
                "Set MEDICAL_ENCRYPTION_KEY for production."
            )
            from app.config import get_settings
            settings = get_settings()
            # Derive a 32-byte key from SECRET_KEY using SHA-256
            import hashlib
            _ENCRYPTION_KEY = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return _ENCRYPTION_KEY


def encrypt_field(plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypt a string field using AES-256-GCM.
    Returns base64-encoded: nonce + ciphertext + tag.
    Returns None if input is None.
    """
    if plaintext is None:
        return None

    try:
        key = _get_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        # Concatenate nonce + ciphertext (includes tag)
        encrypted = nonce + ciphertext
        return base64.b64encode(encrypted).decode("ascii")
    except Exception as e:
        logger.error(f"Encryption error: {e}")
        raise ValueError("Error al cifrar datos sensibles") from e


def decrypt_field(encrypted_b64: Optional[str]) -> Optional[str]:
    """
    Decrypt a base64-encoded AES-256-GCM encrypted field.
    Returns the plaintext string.
    Returns None if input is None.
    """
    if encrypted_b64 is None:
        return None

    try:
        key = _get_key()
        aesgcm = AESGCM(key)
        encrypted = base64.b64decode(encrypted_b64)
        nonce = encrypted[:12]
        ciphertext = encrypted[12:]
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode("utf-8")
    except Exception as e:
        logger.error(f"Decryption error: {e}")
        raise ValueError("Error al descifrar datos sensibles") from e


def generate_encryption_key() -> str:
    """Generate a new AES-256 key and return it as base64. Utility for setup."""
    key = AESGCM.generate_key(bit_length=256)
    return base64.b64encode(key).decode("ascii")
