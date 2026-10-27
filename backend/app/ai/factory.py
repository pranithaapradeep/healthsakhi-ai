"""Builds the configured AI provider. Selection is explicit (AI_PROVIDER); there is no automatic fallback
from one provider or model to another, so a missing free-tier key can never silently route to a paid API."""
from __future__ import annotations

from ..core.config import Settings
from .provider import AIProvider, NotConfiguredProvider


def _secret(value) -> str:  # type: ignore[no-untyped-def]
    return value.get_secret_value().strip() if value else ""


def build_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == "none":
        return NotConfiguredProvider("AI_PROVIDER=none")

    if settings.ai_provider == "groq":
        key = _secret(settings.groq_api_key)
        if not key:
            return NotConfiguredProvider("AI_PROVIDER=groq but GROQ_API_KEY is not set")
        from .groq_provider import GroqProvider

        return GroqProvider(
            api_key=key,
            model=settings.groq_model,
            max_completion_tokens=settings.groq_max_completion_tokens,
            timeout_seconds=settings.ai_timeout_seconds,
            reasoning_effort=settings.groq_reasoning_effort,
            max_context_messages=settings.groq_context_messages,
        )

    key = _secret(settings.anthropic_api_key)
    if not key:
        return NotConfiguredProvider("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set")
    from .claude import ClaudeProvider

    return ClaudeProvider(
        api_key=key,
        model=settings.claude_model,
        max_tokens=settings.ai_max_tokens,
        timeout_seconds=settings.ai_timeout_seconds,
        effort=settings.claude_effort,
    )
