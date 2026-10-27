from __future__ import annotations

import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..auth.schemas import Language
from ..safety.schemas import SafetyOut

RedFlag = Literal[
    "stroke", "breathing", "chest_pain", "unconscious", "bleeding",
    "seizure", "anaphylaxis", "self_harm", "poisoning", "severe_headache",
]
Duration = Literal["lt_1d", "1_3d", "4_7d", "1_4w", "gt_4w"]
Severity = Literal["mild", "moderate", "severe"]
Trend = Literal["better", "same", "worse"]
AgeGroup = Literal["infant", "child", "adult", "older_adult"]
Pregnancy = Literal["yes", "no", "unsure", "not_applicable"]
Urgency = Literal["emergency", "urgent", "routine"]

MAX_SYMPTOMS = 1000
MAX_OTHER = 500
MAX_QA = 300
MAX_FOLLOWUPS = 3


def _clean_text(v: str, allow_empty: bool = False) -> str:
    v = unicodedata.normalize("NFC", v).strip()
    if not v and not allow_empty:
        raise ValueError("must not be empty")
    if any(unicodedata.category(ch) == "Cc" and ch not in "\n\t" for ch in v):
        raise ValueError("must not contain control characters")
    return v


class FollowUpAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=MAX_QA)
    answer: str = Field(default="", max_length=MAX_QA)  # blank = "don't know"

    @field_validator("question")
    @classmethod
    def _q(cls, v: str) -> str:
        return _clean_text(v)

    @field_validator("answer")
    @classmethod
    def _a(cls, v: str) -> str:
        return _clean_text(v, allow_empty=True)


class AssessmentRequest(BaseModel):
    """One symptom-check step. Stateless: the client sends the full intake each time; nothing is stored."""

    model_config = ConfigDict(extra="forbid")

    language: Language
    red_flags: list[RedFlag] = Field(default_factory=list, max_length=10)
    symptoms: str = Field(min_length=1, max_length=MAX_SYMPTOMS)
    other_symptoms: str = Field(default="", max_length=MAX_OTHER)
    duration: Duration
    severity: Severity
    trend: Trend
    age_group: AgeGroup
    pregnant: Pregnancy = "not_applicable"
    followups: list[FollowUpAnswer] = Field(default_factory=list, max_length=MAX_FOLLOWUPS)

    @field_validator("symptoms")
    @classmethod
    def _s(cls, v: str) -> str:
        return _clean_text(v)

    @field_validator("other_symptoms")
    @classmethod
    def _o(cls, v: str) -> str:
        return _clean_text(v, allow_empty=True)

    @field_validator("red_flags")
    @classmethod
    def _dedupe(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(v))


class AssessmentResult(BaseModel):
    urgency: Urgency
    # "safety_rules" when fixed rules raised the level above what the AI suggested (or the AI was not used).
    urgency_source: Literal["safety_rules", "ai"]
    summary: str
    possible_explanations: list[str]
    self_care: list[str]
    seek_care_if: list[str]
    recommended_next_step: str


class AssessmentResponse(BaseModel):
    status: Literal["emergency", "need_more_info", "complete"]
    language: Language
    safety: SafetyOut
    follow_up_questions: list[str] = Field(default_factory=list)
    result: AssessmentResult | None = None


def _clip(n: int):  # type: ignore[no-untyped-def]
    def inner(v: object) -> object:
        return [str(x).strip() for x in v if str(x).strip()][:n] if isinstance(v, list) else v

    return inner


_BLANK = {"", "none", "null", "n/a", "na", "unknown", "-"}


def _blank_to_none(v: object) -> object:
    """Real model output often uses "" / "none" / "N/A" for "not given". Treat those as absent (None) — never
    as a value — so a missing urgency can't slip through as an empty string or be guessed."""
    if v is None:
        return None
    if isinstance(v, str):
        text = v.strip().lower()
        return None if text in _BLANK else text
    return v


def _null_to_empty_str(v: object) -> object:
    return "" if v is None else v


def _as_list(v: object) -> object:
    if v is None or (isinstance(v, str) and not v.strip()):
        return []
    if isinstance(v, str):
        return [v]
    return v


class AIAssessmentOutput(BaseModel):
    """What the model must return. Validated strictly; anything else triggers one corrective retry, and a second
    failure becomes a deliberate `bad_response` error (never an unhandled exception)."""

    model_config = ConfigDict(extra="ignore")

    status: Literal["need_more_info", "complete"]
    follow_up_questions: list[str] = Field(default_factory=list)
    urgency: Urgency | None = None
    summary: str = Field(default="", max_length=1500)
    possible_explanations: list[str] = Field(default_factory=list)
    self_care: list[str] = Field(default_factory=list)
    seek_care_if: list[str] = Field(default_factory=list)
    recommended_next_step: str = Field(default="", max_length=800)

    _u = field_validator("urgency", mode="before")(_blank_to_none)
    _st = field_validator("status", mode="before")(lambda v: v.strip().lower().replace(" ", "_").replace("-", "_") if isinstance(v, str) else v)
    _str = field_validator("summary", "recommended_next_step", mode="before")(_null_to_empty_str)
    _lists = field_validator("follow_up_questions", "possible_explanations", "self_care", "seek_care_if", mode="before")(_as_list)
    _q = field_validator("follow_up_questions", mode="before")(_clip(MAX_FOLLOWUPS))
    _p = field_validator("possible_explanations", mode="before")(_clip(4))
    _sc = field_validator("self_care", "seek_care_if", mode="before")(_clip(5))

    @field_validator("follow_up_questions", "possible_explanations", "self_care", "seek_care_if")
    @classmethod
    def _item_length(cls, v: list[str]) -> list[str]:
        return [x[:400] for x in v]

    @model_validator(mode="after")
    def _complete(self) -> "AIAssessmentOutput":
        if self.status == "need_more_info" and not self.follow_up_questions:
            raise ValueError("need_more_info requires follow_up_questions")
        if self.status == "complete" and (self.urgency is None or not self.summary.strip() or not self.recommended_next_step.strip()):
            raise ValueError("complete requires urgency, summary and recommended_next_step")
        return self
