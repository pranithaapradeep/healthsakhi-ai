from __future__ import annotations

import unicodedata
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..api.schemas import MessageOut
from ..safety.schemas import SafetyOut
from ..auth.schemas import Language

MAX_MESSAGE_CHARS = 2000


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    language: Language
    conversation_id: uuid.UUID | None = None

    @field_validator("message")
    @classmethod
    def _clean(cls, v: str) -> str:
        v = unicodedata.normalize("NFC", v).strip()
        if not v:
            raise ValueError("must not be empty")
        # Allow newlines and tabs; reject other control characters.
        if any(unicodedata.category(ch) == "Cc" and ch not in "\n\t" for ch in v):
            raise ValueError("must not contain control characters")
        return v


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    language: Language
    title: str
    user_message: MessageOut
    assistant_message: MessageOut
    # Result of the deterministic safety rules for the user's message (null when nothing matched).
    emergency: SafetyOut | None = None
