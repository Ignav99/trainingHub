"""
TrainingHub Pro - Security Module
Permissions, license enforcement, and encryption.

Use direct imports to avoid triggering database config at import time:
    from app.security.permissions import Permission, DEFAULT_PERMISSIONS
    from app.security.dependencies import require_permission, AuthContext
    from app.security.encryption import encrypt_field, decrypt_field
"""
