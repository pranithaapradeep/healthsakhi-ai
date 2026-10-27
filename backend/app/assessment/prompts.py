"""Server-side instructions for the symptom-check mode. Appended to the shared safety prompt."""
from __future__ import annotations

from ..ai.prompts import Language, build_system_prompt

LANGUAGE_NAMES = {"en": "simple English", "ta": "Tamil (தமிழ் script)", "hi": "Hindi (Devanagari script)"}

_MODE = """

SYMPTOM CHECK MODE
These instructions replace the STYLE section above. Respond with ONE JSON object only — no text before or after \
it and no markdown. Keys stay in English; every string value must be in {language_name}.

{{
  "status": "need_more_info" or "complete",
  "follow_up_questions": [up to 3 short, focused questions],
  "urgency": "emergency" or "urgent" or "routine" (use null, not "", when asking follow-up questions),
  "summary": "1-3 sentences restating what the person reported",
  "possible_explanations": [up to 4 common possible explanations, each worded with uncertainty, e.g. "This could be ..."],
  "self_care": [up to 5 safe self-care steps when suitable — no medicine names or doses],
  "seek_care_if": [up to 5 warning signs that mean they should get medical help sooner],
  "recommended_next_step": "one clear sentence: what to do next and how soon"
}}

Rules for this mode:
- {round_rule}
- Urgency meanings: "emergency" = call 112 or go to an emergency department now; "urgent" = see a doctor today or \
within 24 hours; "routine" = self-care may help, and see a doctor if it does not improve, gets worse, or worries them.
- When unsure, choose the more urgent level. Never choose a level below the "minimum urgency" stated in the input.
- Possible explanations are not diagnoses. Never say which one it is and never say a serious condition is ruled out.
- Do not name medicines, doses or treatments to take; you may say to ask a doctor or pharmacist about medicines.
- Do not mention hospitals, phone numbers other than 112 and 14416, statistics or sources."""

_FIRST_ROUND = (
    'If information that is essential to judge urgency safely is missing, set "status" to "need_more_info" and ask up '
    'to 3 focused questions; set "urgency" to null and the other fields may be empty. Otherwise set "status" to '
    '"complete" and fill every field.'
)
_FINAL_ROUND = 'This is the final step. Set "status" to "complete" and fill every field. Do not ask more questions.'

_DURATION = {"lt_1d": "less than a day", "1_3d": "1-3 days", "4_7d": "4-7 days", "1_4w": "1-4 weeks", "gt_4w": "more than 4 weeks"}
_SEVERITY = {"mild": "mild (usual activities possible)", "moderate": "moderate (affects activities)", "severe": "severe (cannot do usual activities)"}
_TREND = {"better": "getting better", "same": "about the same", "worse": "getting worse"}
_AGE = {"infant": "baby under 1 year", "child": "child 1-17 years", "adult": "adult 18-64 years", "older_adult": "adult 65 or older"}
_PREG = {"yes": "yes", "no": "no", "unsure": "not sure", "not_applicable": "not applicable / not stated"}

CORRECTION = {
    "format": "Your previous reply was not a valid JSON object in the required format. Reply again with only the JSON object.",
    "final": 'Do not ask more questions. Reply again with only the JSON object, with "status": "complete" and every field filled.',
    "dose": "Your previous reply mentioned medicine doses. Reply again with only the JSON object and no medicine names or doses.",
    "language": "Your previous reply was not in the required language. Reply again with only the JSON object, every value in {language_name}.",
}


def build_assessment_prompt(language: Language, final_round: bool) -> str:
    return build_system_prompt(language) + _MODE.format(
        language_name=LANGUAGE_NAMES[language], round_rule=_FINAL_ROUND if final_round else _FIRST_ROUND
    )


def format_intake(req, minimum_urgency: str | None) -> str:  # type: ignore[no-untyped-def]
    lines = [
        "Symptom check details, as reported by the person:",
        f"- Main symptoms: {req.symptoms}",
        f"- Other symptoms: {req.other_symptoms or 'none mentioned'}",
        f"- Duration: {_DURATION[req.duration]}",
        f"- Severity: {_SEVERITY[req.severity]}",
        f"- Trend: {_TREND[req.trend]}",
        f"- Age group: {_AGE[req.age_group]}",
        f"- Pregnant: {_PREG[req.pregnant]}",
        "- Emergency warning signs ticked: none",
        f"- Minimum urgency required by the app's safety rules: {minimum_urgency or 'none'}",
    ]
    if req.followups:
        lines.append("Answers to your follow-up questions:")
        lines += [f"- Q: {f.question}\n  A: {f.answer or 'not answered'}" for f in req.followups]
    return "\n".join(lines)
