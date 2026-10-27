from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, field

from app.ai.provider import AIProviderError, AIResult, ChatTurn

REPLIES = {
    "en": "Rest, drink water and see a doctor if it gets worse. This is general information, not a diagnosis.",
    "ta": "ஓய்வு எடுங்கள், தண்ணீர் குடியுங்கள். வலி அதிகமானால் மருத்துவரை அணுகுங்கள். இது பொதுவான தகவல் மட்டுமே.",
    "hi": "आराम करें और पानी पिएँ। दर्द बढ़े तो डॉक्टर से मिलें। यह केवल सामान्य जानकारी है।",
}


@dataclass
class Call:
    system: str
    turns: list[ChatTurn]
    json_output: bool = False


@dataclass
class FakeProvider:
    """Records every call. `script` decides each reply: a string, an AIProviderError, or a callable."""

    script: list[str | dict | AIProviderError | Callable[[str, list[ChatTurn]], str]] = field(default_factory=list)
    default_language: str = "en"
    calls: list[Call] = field(default_factory=list)
    name: str = "fake"
    model: str = "fake-model"
    max_context_messages: int | None = None

    def generate(self, system: str, turns: list[ChatTurn], json_output: bool = False) -> AIResult:
        self.calls.append(Call(system, list(turns), json_output))
        step = self.script.pop(0) if self.script else REPLIES[self._lang(system)]
        if isinstance(step, dict):
            step = json.dumps(step, ensure_ascii=False)
        if isinstance(step, AIProviderError):
            raise step
        text = step(system, turns) if callable(step) else step
        return AIResult(text=text, model="fake-model", input_tokens=10, output_tokens=20, stop_reason="end_turn")

    @staticmethod
    def _lang(system: str) -> str:
        if "Reply only in Tamil" in system:
            return "ta"
        if "Reply only in Hindi" in system:
            return "hi"
        return "en"
