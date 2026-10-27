import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.ai.provider import AIProviderError
from app.db.models import Conversation, Message, SymptomAssessment
from app.main import create_app
from tests.conftest import CLIENT_HEADERS
from tests.fakes import FakeProvider
from tests.helpers import registered_user_id

URL = "/api/v1/assessment"
BASE = {
    "language": "en",
    "symptoms": "I have had a headache for two days.",
    "duration": "1_3d",
    "severity": "mild",
    "trend": "same",
    "age_group": "adult",
}
COMPLETE = {
    "status": "complete",
    "urgency": "routine",
    "summary": "You have had a mild headache for two days.",
    "possible_explanations": ["This could be a tension headache or dehydration."],
    "self_care": ["Rest in a quiet room.", "Drink enough water."],
    "seek_care_if": ["The headache becomes sudden or severe."],
    "recommended_next_step": "Rest, and see a doctor if it does not improve in a few days.",
}
TA_COMPLETE = {
    "status": "complete",
    "urgency": "routine",
    "summary": "உங்களுக்கு இரண்டு நாட்களாக லேசான தலைவலி உள்ளது.",
    "possible_explanations": ["இது மன அழுத்தத் தலைவலியாக இருக்கலாம்."],
    "self_care": ["ஓய்வு எடுங்கள், தண்ணீர் குடியுங்கள்."],
    "seek_care_if": ["வலி திடீரென கடுமையானால்."],
    "recommended_next_step": "சில நாட்களில் சரியாகவில்லை என்றால் மருத்துவரை அணுகவும்.",
}
HI_COMPLETE = {
    "status": "complete",
    "urgency": "routine",
    "summary": "आपको दो दिनों से हल्का सिरदर्द है।",
    "possible_explanations": ["यह तनाव वाला सिरदर्द हो सकता है।"],
    "self_care": ["आराम करें और पानी पिएँ।"],
    "seek_care_if": ["दर्द अचानक बहुत बढ़ जाए।"],
    "recommended_next_step": "कुछ दिनों में ठीक न हो तो डॉक्टर से मिलें।",
}


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture
def c(settings, engine, provider):
    with TestClient(create_app(settings, engine, ai_provider=provider), headers=CLIENT_HEADERS) as client:
        yield client


def post(c, **overrides):
    return c.post(URL, json={**BASE, **overrides})


# --- Intake and ordinary scenarios ---------------------------------------------------------------------------


def test_ordinary_symptoms_give_a_structured_routine_result(c, provider):
    provider.script = [COMPLETE]
    res = post(c)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "complete"
    assert body["safety"]["level"] == "none"
    assert body["result"] == {**{k: v for k, v in COMPLETE.items() if k != "status"}, "urgency_source": "ai"}
    call = provider.calls[0]
    assert call.json_output is True
    assert "SYMPTOM CHECK MODE" in call.system and "Never prescribe medicines" in call.system
    intake = call.turns[0].text
    assert "Main symptoms: I have had a headache for two days." in intake and "Duration: 1-3 days" in intake


def test_follow_up_questions_then_final_result(c, provider):
    provider.script = [{"status": "need_more_info", "follow_up_questions": ["Do you have a fever?", "Any vomiting?"]}]
    first = post(c).json()
    assert first["status"] == "need_more_info"
    assert first["follow_up_questions"] == ["Do you have a fever?", "Any vomiting?"]
    assert first["result"] is None
    assert "need_more_info" in provider.calls[0].system  # first round may ask questions

    provider.script = [COMPLETE]
    followups = [{"question": "Do you have a fever?", "answer": "No"}, {"question": "Any vomiting?", "answer": ""}]
    second = post(c, followups=followups).json()
    assert second["status"] == "complete"
    final = provider.calls[1]
    assert "This is the final step" in final.system
    assert "A: No" in final.turns[0].text and "A: not answered" in final.turns[0].text


def test_final_round_never_returns_more_questions(c, provider):
    provider.script = [{"status": "need_more_info", "follow_up_questions": ["More?"]}, COMPLETE]
    res = post(c, followups=[{"question": "Fever?", "answer": "no"}])
    assert res.json()["status"] == "complete"
    assert len(provider.calls) == 2

    provider.script = [{"status": "need_more_info", "follow_up_questions": ["More?"]}] * 2
    res = post(c, followups=[{"question": "Fever?", "answer": "no"}])
    assert res.status_code == 502 and res.json()["detail"] == "ai_bad_response"


# --- Red flags: emergency takes priority and never waits on the AI ---------------------------------------------


@pytest.mark.parametrize("flag", ["stroke", "breathing", "chest_pain", "unconscious", "bleeding", "seizure", "anaphylaxis", "self_harm", "poisoning", "severe_headache"])
def test_ticked_red_flag_returns_emergency_without_ai(c, provider, flag):
    res = post(c, red_flags=[flag])
    body = res.json()
    assert res.status_code == 200
    assert body["status"] == "emergency"
    assert body["safety"]["level"] == "emergency" and flag in body["safety"]["categories"]
    assert body["result"] is None and body["follow_up_questions"] == []
    assert provider.calls == []


@pytest.mark.parametrize(
    "lang,text,category",
    [
        ("en", "My father suddenly can't lift his left arm and his speech is slurred.", "stroke"),
        ("ta", "எனக்கு நெஞ்சு வலி இருக்கு", "chest_pain"),
        ("hi", "मुझे साँस नहीं आ रही", "breathing"),
    ],
)
def test_emergency_words_in_symptoms_skip_the_ai(c, provider, lang, text, category):
    body = post(c, language=lang, symptoms=text).json()
    assert body["status"] == "emergency" and category in body["safety"]["categories"]
    assert provider.calls == []


def test_emergency_in_follow_up_answer_overrides_everything(c, provider):
    body = post(c, followups=[{"question": "Anything else?", "answer": "now he has fainted"}]).json()
    assert body["status"] == "emergency" and "unconscious" in body["safety"]["categories"]
    assert provider.calls == []


def test_emergency_works_even_if_ai_is_down_and_rate_limit_is_exhausted(settings, engine):
    down = FakeProvider(script=[AIProviderError("unavailable")] * 5)
    app = create_app(settings.model_copy(update={"assessment_rate_limit": 1}), engine, ai_provider=down)
    with TestClient(app, headers=CLIENT_HEADERS) as client:
        assert client.post(URL, json=BASE).status_code == 503  # uses the one allowed AI request
        assert client.post(URL, json=BASE).status_code == 429  # ordinary request now rate-limited
        res = client.post(URL, json={**BASE, "red_flags": ["chest_pain"]})
    assert res.status_code == 200 and res.json()["status"] == "emergency"


# --- Urgency floors: the AI can raise urgency but never lower it ---------------------------------------------------


@pytest.mark.parametrize(
    "overrides,reason",
    [
        ({"severity": "severe"}, "severe_or_worsening"),
        ({"severity": "moderate", "trend": "worse"}, "severe_or_worsening"),
        ({"age_group": "infant"}, "infant"),
        ({"pregnant": "yes", "symptoms": "I have stomach pain since morning"}, "pregnancy_warning"),
        ({"symptoms": "There is blood in my stool"}, "blood_in_stool_urine"),
    ],
)
def test_safety_floor_raises_ai_routine_to_urgent(c, provider, overrides, reason):
    provider.script = [COMPLETE]  # AI says routine
    body = post(c, **overrides).json()
    assert body["status"] == "complete"
    assert body["result"]["urgency"] == "urgent"
    assert body["result"]["urgency_source"] == "safety_rules"
    assert reason in body["safety"]["categories"]
    assert "Minimum urgency required by the app's safety rules: urgent" in provider.calls[0].turns[0].text


def test_ai_may_raise_urgency(c, provider):
    provider.script = [{**COMPLETE, "urgency": "emergency"}]
    result = post(c).json()["result"]
    assert result["urgency"] == "emergency" and result["urgency_source"] == "ai"


def test_pregnancy_without_concerning_words_has_no_floor(c, provider):
    provider.script = [COMPLETE]
    assert post(c, pregnant="yes", symptoms="mild runny nose").json()["result"]["urgency"] == "routine"


# --- Language -----------------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "lang,text,reply,instruction",
    [
        ("ta", "எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.", TA_COMPLETE, "Tamil (தமிழ் script)"),
        ("hi", "मुझे दो दिनों से सिरदर्द है।", HI_COMPLETE, "Hindi (Devanagari script)"),
    ],
)
def test_results_in_selected_language(c, provider, lang, text, reply, instruction):
    provider.script = [reply]
    body = post(c, language=lang, symptoms=text).json()
    assert body["language"] == lang and body["result"]["summary"] == reply["summary"]
    assert f"every string value must be in {instruction}" in provider.calls[0].system


def test_wrong_language_is_retried_once(c, provider):
    provider.script = [COMPLETE, TA_COMPLETE]
    body = post(c, language="ta", symptoms="எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.").json()
    assert body["result"]["summary"] == TA_COMPLETE["summary"]
    assert len(provider.calls) == 2 and "required language" in provider.calls[1].turns[-1].text


# --- Output safety --------------------------------------------------------------------------------------------


def test_dose_advice_triggers_retry_and_is_removed(c, provider):
    provider.script = [{**COMPLETE, "self_care": ["Take 500 mg paracetamol"]}, {**COMPLETE, "self_care": ["Take 2 tablets", "Rest"]}]
    result = post(c).json()["result"]
    assert result["self_care"] == ["Rest"]
    assert "medicine names or doses" in provider.calls[1].turns[-1].text


def test_dose_in_summary_is_rejected(c, provider):
    provider.script = [{**COMPLETE, "summary": "Take 650 mg now."}] * 2
    assert post(c).status_code == 502


@pytest.mark.parametrize("bad", ["not json", "{\"status\": \"complete\"}", "[1, 2]", "{\"status\": \"maybe\"}"])
def test_invalid_ai_output_is_retried_then_rejected(c, provider, bad):
    provider.script = [bad, bad]
    res = post(c)
    assert res.status_code == 502 and res.json()["detail"] == "ai_bad_response"
    assert len(provider.calls) == 2


def test_fenced_json_is_accepted(c, provider):
    import json

    provider.script = ["```json\n" + json.dumps(COMPLETE) + "\n```"]
    assert post(c).json()["status"] == "complete"


# --- Validation ---------------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "overrides",
    [
        {"symptoms": ""},
        {"symptoms": "   "},
        {"symptoms": "x" * 1001},
        {"other_symptoms": "x" * 501},
        {"language": "fr"},
        {"duration": "forever"},
        {"severity": "extreme"},
        {"trend": "up"},
        {"age_group": "teen"},
        {"pregnant": "maybe"},
        {"red_flags": ["headache"]},
        {"followups": [{"question": "q", "answer": "a"}] * 4},
        {"followups": [{"question": "", "answer": "a"}]},
        {"followups": [{"question": "q", "answer": "x" * 301}]},
        {"symptoms": "a\u0000b"},
        {"unexpected": True},
    ],
)
def test_validation_errors(c, provider, overrides):
    assert post(c, **overrides).status_code == 422
    assert provider.calls == []


def test_missing_required_fields(c):
    assert c.post(URL, json={"language": "en", "symptoms": "cough"}).status_code == 422


# --- Provider failures ----------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "kind,status,code",
    [
        ("timeout", 504, "ai_timeout"),
        ("rate_limited", 429, "ai_rate_limited"),
        ("unavailable", 503, "ai_unavailable"),
        ("not_configured", 503, "ai_not_configured"),
        ("model_unavailable", 503, "ai_model_unavailable"),
    ],
)
def test_provider_failures(c, provider, kind, status, code):
    provider.script = [AIProviderError(kind, "test")]
    res = post(c)
    assert res.status_code == status and res.json()["detail"] == code


def test_without_any_ai_key_ordinary_check_reports_not_configured_but_emergency_still_works(settings, engine):
    app = create_app(settings.model_copy(update={"groq_api_key": None, "anthropic_api_key": None}), engine)
    with TestClient(app, headers=CLIENT_HEADERS) as client:
        assert client.post(URL, json=BASE).json()["detail"] == "ai_not_configured"
        assert client.post(URL, json={**BASE, "red_flags": ["stroke"]}).json()["status"] == "emergency"


# --- Access, privacy, abuse controls ---------------------------------------------------------------------------


def test_guests_and_signed_in_users_can_use_it(c, provider):
    provider.script = [COMPLETE, COMPLETE]
    assert post(c).status_code == 200
    registered_user_id(c)
    assert post(c).status_code == 200


def test_nothing_is_stored(c, provider, db):
    provider.script = [COMPLETE]
    post(c)
    post(c, red_flags=["stroke"])
    for model in (SymptomAssessment, Conversation, Message):
        assert db.scalar(select(func.count()).select_from(model)) == 0


def test_requires_client_header(settings, engine, provider):
    with TestClient(create_app(settings, engine, ai_provider=provider)) as bare:
        assert bare.post(URL, json=BASE).status_code == 403


def test_rate_limited(settings, engine):
    p = FakeProvider(script=[COMPLETE, COMPLETE, COMPLETE])
    app = create_app(settings.model_copy(update={"assessment_rate_limit": 2}), engine, ai_provider=p)
    with TestClient(app, headers=CLIENT_HEADERS) as client:
        assert client.post(URL, json=BASE).status_code == 200
        assert client.post(URL, json=BASE).status_code == 200
        res = client.post(URL, json=BASE)
    assert res.status_code == 429 and int(res.headers["retry-after"]) >= 1
    assert len(p.calls) == 2


def test_oversized_body_rejected(c):
    assert c.post(URL, content="{" + " " * (70 * 1024) + "}", headers={"Content-Type": "application/json"}).status_code == 413


def test_symptom_text_is_not_logged(c, provider, caplog):
    secret = "private symptom detail 4471"
    provider.script = [COMPLETE]
    with caplog.at_level(logging.DEBUG):
        post(c, symptoms=f"{secret} headache")
        post(c, symptoms=f"{secret} and chest pain")
    assert "assessment_complete" in caplog.text and "assessment_emergency" in caplog.text
    assert secret not in caplog.text
    assert COMPLETE["summary"] not in caplog.text


# --- Regression: real Groq follow-up replies used "" for urgency (2026-10-25) ---------------------------------
# Groq returned HTTP 200 with {"status": "need_more_info", "urgency": "", "summary": "", ...}. The schema rejected
# "" for urgency, the retry produced the same, and every assessment that needed follow-up questions failed with
# 502 ai_bad_response ("The assistant is unavailable"), whichever way the person reached the submit step.

GROQ_FOLLOWUP_REPLY = {
    "status": "need_more_info",
    "follow_up_questions": ["Do you have a fever?", "Any nausea or vomiting?", "Any sensitivity to light?"],
    "urgency": "",
    "summary": "",
    "possible_explanations": [],
    "self_care": [],
    "seek_care_if": [],
    "recommended_next_step": "",
}

# What the frontend sends after "None of these — continue" → typed symptoms → details.
NONE_OF_THESE_PATH = {
    **BASE,
    "symptoms": "mild headache since yesterday",
    "red_flags": [],
    "other_symptoms": "",
    "pregnant": "not_applicable",
    "followups": [],
}


def test_regression_empty_urgency_in_follow_up_reply_is_accepted(c, provider):
    provider.script = [GROQ_FOLLOWUP_REPLY]
    res = c.post(URL, json=NONE_OF_THESE_PATH)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "need_more_info"
    assert body["follow_up_questions"] == GROQ_FOLLOWUP_REPLY["follow_up_questions"]
    assert body["result"] is None
    assert len(provider.calls) == 1  # no wasted retry
    assert 'set "urgency" to null' in provider.calls[0].system


def test_regression_full_flow_via_none_of_these_path(c, provider):
    provider.script = [GROQ_FOLLOWUP_REPLY, COMPLETE]
    first = c.post(URL, json=NONE_OF_THESE_PATH).json()
    answers = [{"question": q, "answer": "no"} for q in first["follow_up_questions"]]
    second = c.post(URL, json={**NONE_OF_THESE_PATH, "followups": answers})
    assert second.status_code == 200
    assert second.json()["status"] == "complete" and second.json()["result"]["urgency"] == "routine"


def test_regression_typed_symptoms_path_without_red_flag_step_fields(c, provider):
    # Same request without the optional fields the frontend always sends: still valid, same code path.
    provider.script = [GROQ_FOLLOWUP_REPLY]
    payload = {k: v for k, v in NONE_OF_THESE_PATH.items() if k not in ("red_flags", "other_symptoms", "pregnant", "followups")}
    res = c.post(URL, json=payload)
    assert res.status_code == 200 and res.json()["status"] == "need_more_info"


@pytest.mark.parametrize("blank", ["", "  ", "none", "N/A", None])
def test_blank_urgency_is_treated_as_missing_not_as_a_value(c, provider, blank):
    provider.script = [{**GROQ_FOLLOWUP_REPLY, "urgency": blank}]
    assert c.post(URL, json=NONE_OF_THESE_PATH).json()["status"] == "need_more_info"


def test_complete_reply_with_empty_urgency_is_retried_and_never_guessed(c, provider):
    provider.script = [{**COMPLETE, "urgency": ""}, COMPLETE]
    res = c.post(URL, json=NONE_OF_THESE_PATH)
    assert res.json()["result"]["urgency"] == "routine"
    assert len(provider.calls) == 2

    provider.script = [{**COMPLETE, "urgency": ""}, {**COMPLETE, "urgency": ""}]
    res = c.post(URL, json=NONE_OF_THESE_PATH)
    assert res.status_code == 502
    assert res.json() == {"detail": "ai_bad_response"}  # deliberate, safe error — no validation dump
    assert "validation" not in res.text.lower() and "literal_error" not in res.text


def test_tolerates_nulls_and_case_variants(c, provider):
    provider.script = [{**COMPLETE, "status": "Complete", "urgency": " URGENT ", "possible_explanations": None, "seek_care_if": "Fever over 3 days"}]
    result = c.post(URL, json=NONE_OF_THESE_PATH).json()["result"]
    assert result["urgency"] == "urgent"
    assert result["possible_explanations"] == []
    assert result["seek_care_if"] == ["Fever over 3 days"]


def test_genuinely_invalid_urgency_is_still_rejected(c, provider):
    provider.script = [{**COMPLETE, "urgency": "maybe"}] * 2
    assert c.post(URL, json=NONE_OF_THESE_PATH).status_code == 502


def test_invalid_output_logs_field_names_only(c, provider, caplog):
    provider.script = [{**COMPLETE, "urgency": "maybe", "summary": "private detail 9917"}] * 2
    with caplog.at_level(logging.WARNING):
        c.post(URL, json=NONE_OF_THESE_PATH)
    assert "assessment_invalid_output attempt=1 fields=urgency:literal_error" in caplog.text
    assert "private detail 9917" not in caplog.text and "mild headache" not in caplog.text


def test_emergency_red_flag_wins_even_when_ai_would_return_blank_fields(c, provider):
    provider.script = [GROQ_FOLLOWUP_REPLY]
    body = c.post(URL, json={**NONE_OF_THESE_PATH, "red_flags": ["chest_pain"]}).json()
    assert body["status"] == "emergency" and body["safety"]["categories"] == ["chest_pain"]
    assert provider.calls == []


@pytest.mark.parametrize(
    "text,is_dose",
    [
        ("Take 500 mg paracetamol", True),
        ("take 2 tablets", True),
        ("5 ml syrup", True),
        ("Mix 2 tablespoons of honey in warm water", False),
        ("Rest for 2 days", False),
    ],
)
def test_dose_filter_word_boundary(text, is_dose):
    from app.assessment.service import DOSE_RE

    assert bool(DOSE_RE.search(text)) is is_dose
