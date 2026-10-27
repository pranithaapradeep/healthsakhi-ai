from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..auth.schemas import Language

MAX_CHECK_CHARS = 2000


class SafetyOut(BaseModel):
    level: Literal["emergency", "urgent", "none"]
    categories: list[str]
    rule_ids: list[str]


class SafetyCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=MAX_CHECK_CHARS)
    language: Language

    @field_validator("text")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        return v
