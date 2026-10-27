"""Anthropic Claude adapter (Messages API). The API key never leaves the server."""
from __future__ import annotations

from typing import Any

import anthropic

from .provider import AIProviderError, AIResult, ChatTurn, retry_after_seconds


class ClaudeProvider:
    name = "anthropic"

    def __init__(
        self,
        api_key: str,
        model: str,
        max_tokens: int,
        timeout_seconds: float,
        effort: str | None = None,
        client: Any | None = None,
    ) -> None:
        self.model = model
        self.max_tokens = max_tokens
        self.effort = effort
        # max_retries=1: one quick retry on transient errors; the request timeout bounds the total wait.
        self._client = client or anthropic.Anthropic(api_key=api_key, timeout=timeout_seconds, max_retries=1)

    def generate(self, system: str, turns: list[ChatTurn], json_output: bool = False) -> AIResult:  # noqa: ARG002
        # JSON output is requested through the prompt for Claude; callers validate the result.
        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": system,
            "messages": [{"role": t.role, "content": t.text} for t in turns],
        }
        # Current models reject temperature/top_p/top_k, so none are sent. Effort trades latency for depth.
        if self.effort:
            kwargs["output_config"] = {"effort": self.effort}
        try:
            response = self._client.messages.create(**kwargs)
        except anthropic.APITimeoutError as exc:
            raise AIProviderError("timeout", "request timed out") from exc
        except anthropic.RateLimitError as exc:
            raise AIProviderError("rate_limited", "provider rate limit", retry_after_seconds(exc.response.headers)) from exc
        except (anthropic.AuthenticationError, anthropic.PermissionDeniedError) as exc:
            raise AIProviderError("not_configured", f"provider rejected credentials ({exc.status_code})") from exc
        except anthropic.NotFoundError as exc:
            raise AIProviderError("model_unavailable", f"model {self.model!r} not found") from exc
        except anthropic.APIStatusError as exc:
            raise AIProviderError("unavailable", f"provider status {exc.status_code}") from exc
        except anthropic.APIConnectionError as exc:
            raise AIProviderError("unavailable", "could not connect to provider") from exc

        stop_reason = getattr(response, "stop_reason", None)
        if stop_reason == "refusal":
            raise AIProviderError("refused", "model declined to answer")
        # Thinking blocks (if any) are skipped; only visible text is returned.
        text = "".join(getattr(b, "text", "") for b in response.content if getattr(b, "type", None) == "text").strip()
        if not text:
            raise AIProviderError("bad_response", f"empty reply (stop_reason={stop_reason})")
        usage = getattr(response, "usage", None)
        return AIResult(
            text=text,
            model=getattr(response, "model", self.model),
            input_tokens=getattr(usage, "input_tokens", None),
            output_tokens=getattr(usage, "output_tokens", None),
            stop_reason=stop_reason,
        )
