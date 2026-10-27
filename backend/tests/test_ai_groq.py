"""Groq adapter tests with a fake SDK client — no network, no API key, no quota used."""
import logging
from types import SimpleNamespace

import groq
import httpx  # the groq SDK is built on httpx
import pytest
from pydantic import SecretStr

from app.ai.factory import build_provider
from app.ai.groq_provider import GroqProvider
from app.ai.provider import AIProviderError, ChatTurn, NotConfiguredProvider

REQ = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
FAKE_KEY = "gsk_test_not_a_real_key_123"


def _resp(status: int, headers: dict | None = None) -> httpx.Response:
    return httpx.Response(status, request=REQ, headers=headers or {})


class FakeCompletions:
    def __init__(self, outcome):
        self.outcome = outcome
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


def _provider(outcome, model="openai/gpt-oss-120b", effort="low"):
    completions = FakeCompletions(outcome)
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    p = GroqProvider(api_key=FAKE_KEY, model=model, max_completion_tokens=1536, timeout_seconds=10, reasoning_effort=effort, client=client)
    return p, completions


def _completion(content="Rest and drink water.", finish="stop"):
    return SimpleNamespace(
        model="openai/gpt-oss-120b",
        choices=[SimpleNamespace(message=SimpleNamespace(content=content), finish_reason=finish)],
        usage=SimpleNamespace(prompt_tokens=321, completion_tokens=45),
    )


# --- Success ------------------------------------------------------------------------------------------------


def test_success_builds_request_with_system_prompt_first():
    provider, completions = _provider(_completion(" Rest and drink water. "))
    result = provider.generate("SYSTEM RULES", [ChatTurn("user", "hi"), ChatTurn("assistant", "hello"), ChatTurn("user", "again")])
    assert result.text == "Rest and drink water."
    assert (result.input_tokens, result.output_tokens, result.stop_reason) == (321, 45, "stop")

    [kwargs] = completions.calls
    assert kwargs["model"] == "openai/gpt-oss-120b"
    assert kwargs["messages"] == [
        {"role": "system", "content": "SYSTEM RULES"},
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
        {"role": "user", "content": "again"},
    ]
    assert kwargs["max_completion_tokens"] == 1536
    # Reasoning is kept short and never returned to the app/user.
    assert kwargs["include_reasoning"] is False
    assert kwargs["reasoning_effort"] == "low"
    assert not {"temperature", "top_p", "stream"} & kwargs.keys()


def test_tamil_and_hindi_text_pass_through_unchanged():
    tamil = "ஓய்வு எடுங்கள், தண்ணீர் குடியுங்கள்."
    provider, completions = _provider(_completion(tamil))
    result = provider.generate("S", [ChatTurn("user", "முழு வாக்கியம் मुझे सिरदर्द है")])
    assert result.text == tamil
    assert completions.calls[0]["messages"][1]["content"] == "முழு வாக்கியம் मुझे सिरदर्द है"


def test_non_reasoning_models_get_no_reasoning_parameters():
    provider, completions = _provider(_completion(), model="some/other-model")
    provider.generate("S", [ChatTurn("user", "hi")])
    assert "include_reasoning" not in completions.calls[0] and "reasoning_effort" not in completions.calls[0]


# --- Failures -----------------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "exc,kind",
    [
        (groq.APITimeoutError(request=REQ), "timeout"),
        (groq.APIConnectionError(request=REQ), "unavailable"),
        (groq.AuthenticationError("invalid api key", response=_resp(401), body=None), "not_configured"),
        (groq.PermissionDeniedError("forbidden", response=_resp(403), body=None), "not_configured"),
        (groq.NotFoundError("model not found", response=_resp(404), body=None), "model_unavailable"),
        (
            groq.BadRequestError(
                "decommissioned", response=_resp(400), body={"error": {"code": "model_decommissioned", "message": "x"}}
            ),
            "model_unavailable",
        ),
        (groq.APIStatusError("too large", response=_resp(413), body=None), "too_large"),
        (groq.InternalServerError("over capacity", response=_resp(503), body=None), "unavailable"),
        (groq.BadRequestError("bad request", response=_resp(400), body={"error": {"code": "invalid_request"}}), "unavailable"),
    ],
)
def test_sdk_errors_are_mapped(exc, kind):
    provider, completions = _provider(exc)
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == kind
    assert len(completions.calls) == 1  # no hidden retries with other models


def test_rate_limit_carries_retry_after():
    provider, _ = _provider(groq.RateLimitError("rate limited", response=_resp(429, {"retry-after": "12"}), body=None))
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == "rate_limited"
    assert info.value.retry_after == 12


def test_unavailable_model_is_reported_never_replaced():
    provider, completions = _provider(groq.NotFoundError("The model `x` does not exist", response=_resp(404), body=None), model="x")
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == "model_unavailable"
    assert [c["model"] for c in completions.calls] == ["x"]


@pytest.mark.parametrize("outcome", [_completion(content=""), _completion(content=None, finish="length"), SimpleNamespace(choices=[])])
def test_empty_replies_are_errors(outcome):
    provider, _ = _provider(outcome)
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == "bad_response"


# --- Configuration: explicit selection, no fallback, no key leaks -------------------------------------------


def test_groq_is_the_default_provider_and_uses_a_production_model(settings):
    provider = build_provider(settings.model_copy(update={"groq_api_key": SecretStr(FAKE_KEY)}))
    assert isinstance(provider, GroqProvider)
    assert provider.model == "openai/gpt-oss-120b"
    assert provider.max_context_messages == 8


def test_missing_groq_key_never_falls_back_to_anthropic(settings):
    provider = build_provider(settings.model_copy(update={"ai_provider": "groq", "groq_api_key": None, "anthropic_api_key": SecretStr("sk-ant-x")}))
    assert isinstance(provider, NotConfiguredProvider)
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert info.value.kind == "not_configured"
    assert "GROQ_API_KEY" in info.value.detail


def test_provider_none_disables_ai(settings):
    provider = build_provider(settings.model_copy(update={"ai_provider": "none", "groq_api_key": SecretStr(FAKE_KEY)}))
    assert isinstance(provider, NotConfiguredProvider)


def test_key_never_appears_in_settings_repr_errors_or_logs(settings, caplog):
    s = settings.model_copy(update={"groq_api_key": SecretStr(FAKE_KEY)})
    assert FAKE_KEY not in repr(s) and FAKE_KEY not in str(s.model_dump())
    provider, _ = _provider(groq.AuthenticationError("Invalid API Key", response=_resp(401), body=None))
    with caplog.at_level(logging.DEBUG), pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")])
    assert FAKE_KEY not in str(info.value) and FAKE_KEY not in caplog.text


def test_json_output_requests_json_mode():
    provider, completions = _provider(_completion('{"status": "complete"}'))
    provider.generate("S", [ChatTurn("user", "hi")], json_output=True)
    assert completions.calls[0]["response_format"] == {"type": "json_object"}
    provider.generate("S", [ChatTurn("user", "hi")])
    assert "response_format" not in completions.calls[1]


def test_json_validation_failure_is_a_bad_response():
    exc = groq.BadRequestError("json failed", response=_resp(400), body={"error": {"code": "json_validate_failed"}})
    provider, _ = _provider(exc)
    with pytest.raises(AIProviderError) as info:
        provider.generate("S", [ChatTurn("user", "hi")], json_output=True)
    assert info.value.kind == "bad_response"
