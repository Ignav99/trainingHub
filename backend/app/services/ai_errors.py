"""
TrainingHub Pro - Shared AI Error
Common exception for all AI providers (Claude, Gemini).
"""


class AIError(Exception):
    """Error in AI provider communication."""

    def __init__(self, message: str, status_code: int = 500, provider: str = "unknown"):
        self.message = message
        self.status_code = status_code
        self.provider = provider
        super().__init__(message)
