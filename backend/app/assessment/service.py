"""Symptom-check orchestration.

Order of precedence (highest first):
  1. Red flags ticked by the person, or emergency phrases in anything they typed → immediate emergency result.
     The AI is not called, so emergency guidance never waits on (or depends on) the AI.
  2. Urgent safety rules (phrases or structured answers) set a minimum urgency the AI cannot lower.
  3. The AI asks up to 3 follow-up questions (one round at most) or returns a structured, uncertain, non-diagnostic
     result in the selected language.
Nothing is stored. Logs contain only levels, rule ids, language and timing — never what the person typed.
"""
from __future__ import annotations

import json
import re
import time

from pydantic import ValidationError

from ..ai.language import matches_language
from ..ai.provider import AIProvider, AIProviderError, ChatTurn
from ..core.logging import logger
from ..safety.matcher import SafetyResult, merge, normalize
from ..safety.matcher import check_text
from ..safety.schemas import SafetyOut
from .prompts import CORRECTION, LANGUAGE_NAMES, build_assessment_prompt, format_intake
from .schemas import AIAssessmentOutput, AssessmentRequest, AssessmentResponse, AssessmentResult

_RANK = {"routine": 0, "urgent": 1, "emergency": 2}

# Digits followed by a dose unit or tablet count, in English, Hindi and Tamil.
DOSE_RE = re.compile(
    # The trailing lookahead stops "2 tablespoons", "3 tabs open" or "10 mgs"-style partial words matching.
    r"\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ml|iu|tablets?|tabs?|capsules?|गोली|गोलियां|गोलियाँ|टैबलेट|மாத்திரை|மில்லி)(?![a-z])",
    re.IGNORECASE,
)
_PREGNANCY_CONCERN = re.compile(r"bleed|blood|pain|cramp|खून|दर्द|ब्लीडिंग|இரத்த|ரத்த|வலி")


def structured_safety(req: AssessmentRequest) -> SafetyResult:
    """Urgent-level reasons from the structured answers (not from free text)."""
    reasons: list[tuple[str, str]] = []
    if req.severity == "severe" or (req.severity == "moderate" and req.trend == "worse"):
        reasons.append(("severe_or_worsening", "structured:severity"))
    if req.age_group == "infant":
        reasons.append(("infant", "structured:infant"))
    text = normalize(" ".join([req.symptoms, req.other_symptoms, *(f.answer for f in req.followups)]))
    if req.pregnant == "yes" and _PREGNANCY_CONCERN.search(text):
        reasons.append(("pregnancy_warning", "structured:pregnancy"))
    if not reasons:
        return SafetyResult()
    return SafetyResult(level="urgent", categories=tuple(c for c, _ in reasons), rule_ids=tuple(r for _, r in reasons))


def evaluate_safety(req: AssessmentRequest) -> SafetyResult:
    ticked = (
        SafetyResult(level="emergency", categories=tuple(req.red_flags), rule_ids=tuple(f"red_flag:{c}" for c in req.red_flags))
        if req.red_flags
        else SafetyResult()
    )
    typed = check_text(req.symptoms, req.other_symptoms, *(f.answer for f in req.followups))
    return merge(ticked, typed, structured_safety(req))


def _out(safety: SafetyResult) -> SafetyOut:
    return SafetyOut(**safety.to_dict())


def _parse(text: str) -> AIAssessmentOutput:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned[cleaned.find("{") :]
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object")
    return AIAssessmentOutput.model_validate(json.loads(cleaned[start : end + 1]))


def _visible_text(o: AIAssessmentOutput) -> str:
    parts = [o.summary, o.recommended_next_step, *o.follow_up_questions, *o.possible_explanations, *o.self_care, *o.seek_care_if]
    return "\n".join(p for p in parts if p)


def _has_dose(o: AIAssessmentOutput) -> bool:
    return bool(DOSE_RE.search(_visible_text(o)))


def _problem(o: AIAssessmentOutput, req: AssessmentRequest, final_round: bool) -> str | None:
    if final_round and o.status != "complete":
        return "final"
    if _has_dose(o):
        return "dose"
    if not matches_language(_visible_text(o), req.language):
        return "language"
    return None


def _log_invalid(exc: Exception, attempt: int) -> None:
    # Field names and error types only — never the values, which may echo what the person typed.
    if isinstance(exc, ValidationError):
        fields = ",".join(f"{'.'.join(map(str, e['loc'])) or '<root>'}:{e['type']}" for e in exc.errors())
    else:
        fields = type(exc).__name__
    logger.warning("assessment_invalid_output attempt=%s fields=%s", attempt, fields)


def _ask(provider: AIProvider, req: AssessmentRequest, floor: str | None, final_round: bool) -> AIAssessmentOutput:
    system = build_assessment_prompt(req.language, final_round)
    turns = [ChatTurn("user", format_intake(req, floor))]
    raw = provider.generate(system, turns, json_output=True)
    try:
        parsed: AIAssessmentOutput | None = _parse(raw.text)
        problem = _problem(parsed, req, final_round)
    except (ValueError, ValidationError) as exc:
        _log_invalid(exc, attempt=1)
        parsed, problem = None, "format"
    if problem is None:
        return parsed  # type: ignore[return-value]

    # One corrective retry.
    logger.warning("assessment_retry reason=%s language=%s", problem, req.language)
    note = CORRECTION[problem].format(language_name=LANGUAGE_NAMES[req.language])
    raw2 = provider.generate(system, [*turns, ChatTurn("assistant", raw.text), ChatTurn("user", note)], json_output=True)
    try:
        parsed2 = _parse(raw2.text)
    except (ValueError, ValidationError) as exc:
        _log_invalid(exc, attempt=2)
        raise AIProviderError("bad_response", "assessment output invalid after retry") from exc
    problem2 = _problem(parsed2, req, final_round)
    if problem2 == "final":
        raise AIProviderError("bad_response", "assessment still incomplete after retry")
    if problem2 == "language":
        logger.warning("assessment_language_mismatch language=%s giving_up=1", req.language)
    return parsed2


def _drop_dose_items(o: AIAssessmentOutput) -> AIAssessmentOutput:
    """Last line of defence: remove any list item that still mentions a dose; fail if a key sentence does."""
    if DOSE_RE.search(o.summary) or DOSE_RE.search(o.recommended_next_step):
        raise AIProviderError("bad_response", "dose mentioned in summary or next step")
    keep = lambda items: [x for x in items if not DOSE_RE.search(x)]  # noqa: E731
    return o.model_copy(
        update={
            "possible_explanations": keep(o.possible_explanations),
            "self_care": keep(o.self_care),
            "seek_care_if": keep(o.seek_care_if),
            "follow_up_questions": keep(o.follow_up_questions),
        }
    )


def run_assessment(provider: AIProvider, req: AssessmentRequest) -> AssessmentResponse:
    started = time.monotonic()
    safety = evaluate_safety(req)

    if safety.is_emergency:
        logger.info("assessment_emergency language=%s rules=%s", req.language, ",".join(safety.rule_ids))
        return AssessmentResponse(status="emergency", language=req.language, safety=_out(safety))

    floor = "urgent" if safety.level == "urgent" else None
    final_round = bool(req.followups)
    output = _drop_dose_items(_ask(provider, req, floor, final_round))

    if output.status == "need_more_info":
        logger.info("assessment_followup language=%s questions=%s", req.language, len(output.follow_up_questions))
        return AssessmentResponse(
            status="need_more_info", language=req.language, safety=_out(safety), follow_up_questions=output.follow_up_questions
        )

    ai_urgency = output.urgency or "urgent"
    urgency, source = ai_urgency, "ai"
    if floor and _RANK[floor] > _RANK[ai_urgency]:
        urgency, source = floor, "safety_rules"  # the AI can raise urgency but never lower it below the rules

    logger.info(
        "assessment_complete language=%s urgency=%s source=%s rules=%s latency_ms=%s",
        req.language,
        urgency,
        source,
        ",".join(safety.rule_ids) or "-",
        int((time.monotonic() - started) * 1000),
    )
    return AssessmentResponse(
        status="complete",
        language=req.language,
        safety=_out(safety),
        result=AssessmentResult(
            urgency=urgency,  # type: ignore[arg-type]
            urgency_source=source,  # type: ignore[arg-type]
            summary=output.summary,
            possible_explanations=output.possible_explanations,
            self_care=output.self_care,
            seek_care_if=output.seek_care_if,
            recommended_next_step=output.recommended_next_step,
        ),
    )
