from __future__ import annotations

import unicodedata
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Language = Literal["en", "ta", "hi"]


def clean_display_name(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("must not be empty")
    if any(unicodedata.category(ch).startswith("C") for ch in value):
        raise ValueError("must not contain control characters")
    return value


def normalize_email(value: str) -> str:
    return value.strip().lower()


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=1, max_length=80)
    email: EmailStr  # email-validator enforces the 254-character limit
    password: str = Field(min_length=8, max_length=128)
    preferred_language: Language = "en"

    _clean_name = field_validator("display_name")(clean_display_name)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return normalize_email(v)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr  # email-validator enforces the 254-character limit
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return normalize_email(v)


class UserOut(BaseModel):
    """Public view of a user. Never includes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    email: str
    preferred_language: Language
    voice_autoplay: bool
    created_at: datetime
