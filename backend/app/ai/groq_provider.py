"""Groq adapter (official `groq` SDK, chat completions). The API key never leaves the server.

Default model: openai/gpt-oss-120b — a Groq *production* model and Groq's recommended replacement for the
deprecated Llama 3.x models (console.groq.com/docs/models, /docs/deprecations, checked 2026-10-25).
If the configured model is unavailable this adapter raises `model_unavailable`; it never switches models.
"""
from __future__ import annotations

from typing import Any

import groq

from .provider import AIProviderError, AIResult, ChatTurn, retry_after_seconds

_MODEL_GONE_CODES = {"model_not_found", "model_decommissioned", "model_not_active"}
_BAD_OUTPUT_CODES = {"json_validate_failed", "output_parse_failed"}


def _error_code(exc: groq.APIStatusError) -> str | None:
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        err = body.get("error", body)
        if isinstance(err, dict) and isinstance(err.get("code"), str):
            return err["code"]
    code = getattr(exc, "code", None)
    return code if isinstance(code, str) else None


class GroqProvider:
    name = "groq"

    def __init__(
        self,
        api_key: str,
        model: str,
        max_completion_tokens: int,
        timeout_seconds: float,
        reasoning_effort: str | None = "low",
        max_context_messages: int | None = 8,
        client: Any | None = None,
    ) -> None:
        self.model = model
        self.max_completion_tokens = max_completion_tokens
        self.reasoning_effort = reasoning_effort
        # Free-tier token-per-minute budgets are small; Tamil/Hindi text uses many tokens, so cap history.
        self.max_context_messages = max_context_messages
        self._client = client or groq.Groq(api_key=api_key, timeout=timeout_seconds, max_retries=1)

    def generate(self, system: str, turns: list[ChatTurn], json_output: bool = False) -> AIResult:
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, *({"role": t.role, "content": t.text} for t in turns)],
            "max_completion_tokens": self.max_completion_tokens,
        }
        if json_output:
            kwargs["response_format"] = {"type": "json_object"}  # JSON mode; the caller validates the structure
        if self.model.startswith("openai/gpt-oss"):
            # Reasoning models: keep reasoning short and out of the response (we only show the final answer).
            kwargs["include_reasoning"] = False
            if self.reasoning_effort:
                kwargs["reasoning_effort"] = self.reasoning_effort
        try:
            completion = self._client.chat.completions.create(**kwargs)
        except groq.APITimeoutError as exc:
            raise AIProviderError("timeout", "request timed out") from exc
        except groq.RateLimitError as exc:
            raise AIProviderError("rate_limited", "Groq rate limit or free-tier quota reached", retry_after_seconds(exc.response.headers)) from exc
        except (groq.AuthenticationError, groq.PermissionDeniedError) as exc:
            raise AIProviderError("not_configured", f"Groq rejected the API key ({exc.status_code})") from exc
        except groq.NotFoundError as exc:
            raise AIProviderError("model_unavailable", f"model {self.model!r} not found") from exc
        except groq.APIStatusError as exc:
            code = _error_code(exc)
            if code in _MODEL_GONE_CODES:
                raise AIProviderError("model_unavailable", f"model {self.model!r} unavailable ({code})") from exc
            if code in _BAD_OUTPUT_CODES:
                raise AIProviderError("bad_response", f"provider could not produce valid JSON ({code})") from exc
            if exc.status_code == 413:
                raise AIProviderError("too_large", "request exceeds Groq token limit") from exc
            raise AIProviderError("unavailable", f"Groq status {exc.status_code}" + (f" ({code})" if code else "")) from exc
        except groq.APIConnectionError as exc:
            raise AIProviderError("unavailable", "could not connect to Groq") from exc

        choices = getattr(completion, "choices", None) or []
        if not choices:
            raise AIProviderError("bad_response", "no choices returned")
        choice = choices[0]
        text = (getattr(choice.message, "content", None) or "").strip()
        finish = getattr(choice, "finish_reason", None)
        if not text:
            raise AIProviderError("bad_response", f"empty reply (finish_reason={finish})")
        usage = getattr(completion, "usage", None)
        return AIResult(
            text=text,
            model=getattr(completion, "model", self.model),
            input_tokens=getattr(usage, "prompt_tokens", None),
            output_tokens=getattr(usage, "completion_tokens", None),
            stop_reason=finish,
        )
