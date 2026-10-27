"""Shared mapping from provider failures to HTTP errors. Codes are stable; the frontend translates them."""
from __future__ import annotations

from fastapi import HTTPException

from ..core.logging import logger
from .provider import AIProvider, AIProviderError

AI_ERROR_HTTP: dict[str, tuple[int, str]] = {
    "not_configured": (503, "ai_not_configured"),
    "timeout": (504, "ai_timeout"),
    "rate_limited": (429, "ai_rate_limited"),
    "too_large": (413, "ai_request_too_large"),
    "model_unavailable": (503, "ai_model_unavailable"),
    "unavailable": (503, "ai_unavailable"),
    "refused": (502, "ai_refused"),
    "bad_response": (502, "ai_bad_response"),
}


def http_error_for(exc: AIProviderError, provider: AIProvider, feature: str) -> HTTPException:
    status, code = AI_ERROR_HTTP.get(exc.kind, (503, "ai_unavailable"))
    logger.warning("%s_ai_error provider=%s model=%s kind=%s detail=%s", feature, provider.name, provider.model, exc.kind, exc.detail)
    headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else None
    return HTTPException(status, code, headers=headers)
