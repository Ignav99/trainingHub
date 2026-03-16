"""
TrainingHub Pro - Services Package
"""

from app.services.ai_errors import AIError
from app.services.ai_factory import get_ai_service

__all__ = [
    "AIError",
    "get_ai_service",
]
