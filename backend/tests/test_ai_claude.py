"""Claude adapter tests with a fake SDK client — no network, no API key, no cost."""
from types import SimpleNamespace

import anthropic
import pytest

try:  # anthropic>=2 is built on httpx2; older releases on httpx
    import httpx2 as httpx
except ImportError:  # pragma: no cover
    import httpx  # type: ignore[no-redef]

from app.ai.claude import ClaudeProvider
from app.ai.factory import build_provider
from app.ai.provider import AIProviderError, ChatTurn, NotConfiguredProvider

REQ = httpx.Request("POST", "https://api.anthropic.com/v1/messages")


def _resp(status: int) -> httpx.Response:
    return httpx.Response(status, request=REQ)


class FakeMessages:
    def __init__(self, outcome):
        self.outcome = outcome
        self.kwargs: dict | None = None

    def create(self, **kwargs):
        self.kwargs = kwargs
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


def _provider(outcome, effort="medium"):
    messages = FakeMessages(outcome)
    client = SimpleNamespace(messages=messages)
    return ClaudeProvider(api_key="unused", model="claude-test", max_tokens=1024, timeout_seconds=10, effort=effort, client=client), messages


def _message(*blocks, stop_reason="end_turn"):
    return SimpleNamespace(
        content=list(blocks), model="claude-test", stop_reason=stop_reason, usage=SimpleNamespace(input_tokens=12, output_tokens=34)
    )


def test_builds_request_and_extracts_text_only():
    provider, messages = _provider(
        _message(SimpleNamespace(type="thinking", thinking="hidden"), SimpleNamespace(type="text", text=" Hello "), SimpleNamespace(type="text", text="there"))
    )
    result = provider.generate("SYSTEM", [ChatTurn("user", "hi"), ChatTurn("assistant", "yo"), ChatTurn("user", "again")])
    assert result.text == "Hello there"
    assert (result.input_tokens, result.output_tokens) == (12, 34)
    assert messages.kwargs == {
        "model": "claude-test",
        "max_tokens": 1024,
        "system": "SYSTEM",
        "messages": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "yo"}, {"role": "user", "content": "again"}],
        "output_config": {"effort": "medium"},
    }
    # Sampling parameters are rejected by current models and must never be sent.
    assert not {"temperature", "top_p", "top_k"} & messages.kwargs.keys()


def test_effort_is_optional():
    provider, messages = _provider(_message(SimpleNamespace(type="text", text="ok")), effort=None)
    provider.generate("S", [ChatTurn("user", "hi")])
    assert "output_config" not in messages.kwargs


@pytest.mark.parametrize(
    "exc,kind",
    [
        (anthropic.APITimeoutError(request=REQ), "timeout"),
        (anthropic.APIConnectionError(request=REQ), "unavailable"),
        (anthropic.RateLimitError("slow down", response=_resp(429), body=None), "rate_limited"),
        (anthropic.AuthenticationError("bad key", response=_resp(401), body=None), "not_configured"),
        (anthropic.PermissionDeniedError("nope", response=_resp(403), body=None), "not_configured"),
        (anthropic.InternalServerError("boom", response=_resp(500), body=None), "unavailable"),
        (anthropic.BadRequestError("bad", response=_resp(400), body=None), "unavailable"),
        (anthropic.NotFoundError("no such model", response=_resp(404), body=None), "model_unavailable"),
    ],
)
def test_sdk_errors_are_mapped(exc, kind):
    provider, _ = _provider(exc)
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == kind


def test_refusal_and_empty_replies_are_errors():
    provider, _ = _provider(_message(SimpleNamespace(type="text", text="no"), stop_reason="refusal"))
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == "refused"

    provider, _ = _provider(_message(SimpleNamespace(type="thinking", thinking="...")))
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == "bad_response"


def test_factory_without_key_returns_not_configured(settings):
    provider = build_provider(settings.model_copy(update={"ai_provider": "anthropic", "anthropic_api_key": None}))
    assert isinstance(provider, NotConfiguredProvider)


def test_factory_with_key_builds_claude_without_network(settings):
    from pydantic import SecretStr

    provider = build_provider(
        settings.model_copy(
            update={"ai_provider": "anthropic", "anthropic_api_key": SecretStr("sk-ant-test"), "claude_model": "claude-sonnet-5-5"}
        )
    )
    assert isinstance(provider, ClaudeProvider)
    assert provider.model == "claude-sonnet-5-5"
