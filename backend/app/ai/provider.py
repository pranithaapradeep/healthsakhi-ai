"""Provider-neutral interface for conversational AI. Swap providers without touching the chat logic."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol

ErrorKind = Literal[
    "not_configured",  # no key, or the provider rejected the key
    "timeout",
    "rate_limited",  # provider quota / rate limit (e.g. Groq free tier)
    "too_large",  # request exceeds the provider's per-request or per-minute token budget
    "model_unavailable",  # configured model not found or decommissioned — never silently replaced
    "unavailable",
    "refused",
    "bad_response",
]


@dataclass(frozen=True)
class ChatTurn:
    role: Literal["user", "assistant"]
    text: str


@dataclass(frozen=True)
class AIResult:
    text: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    stop_reason: str | None = None


@dataclass
class AIProviderError(Exception):
    kind: ErrorKind
    detail: str = field(default="")  # safe, non-secret summary for logs
    retry_after: int | None = None  # seconds, when the provider says when to retry

    def __str__(self) -> str:
        return f"{self.kind}: {self.detail}" if self.detail else self.kind


class AIProvider(Protocol):
    name: str
    model: str

    def generate(self, system: str, turns: list[ChatTurn], json_output: bool = False) -> AIResult:
        """Return the assistant's next reply. Raise AIProviderError on any failure.

        json_output=True asks the provider for a single JSON object (callers still validate it)."""
        ...


class NotConfiguredProvider:
    """Used when no API key is set: the app still runs and chat returns a clear 'not configured' error."""

    name = "none"
    model = "none"

    def __init__(self, reason: str = "no AI provider configured") -> None:
        self.reason = reason

    def generate(self, system: str, turns: list[ChatTurn], json_output: bool = False) -> AIResult:  # noqa: ARG002
        raise AIProviderError("not_configured", self.reason)


def retry_after_seconds(headers: object) -> int | None:
    """Parse a numeric Retry-After header from an SDK error response, if present."""
    try:
        value = headers.get("retry-after")  # type: ignore[attr-defined]
        return max(1, int(float(value))) if value is not None else None
    except (AttributeError, TypeError, ValueError):
        return None
