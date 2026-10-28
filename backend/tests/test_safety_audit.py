"""Safety audit (2026-10-28): the five manually checked scenarios, wordings the rules used to miss, emergency signs
split across chat messages, and deterministic medicine-dose safeguards.

These tests check the app's own fixed safety behaviour with a fake AI. They do not show that the rules catch every
emergency (keyword rules cannot) or that the advice is clinically validated.
"""
import logging

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.safety.matcher import check_text
from app.safety.medication import DOSE_REMOVED, MEDICINE_NOTE, asks_about_dose_change, redact_doses
from app.safety.messages import EMERGENCY_REPLY
from tests.conftest import CLIENT_HEADERS
from tests.fakes import REPLIES, FakeProvider

CHAT = "/api/v1/chat"
ASSESS = "/api/v1/assessment"
ASSESS_BASE = {"language": "en", "duration": "1_3d", "severity": "mild", "trend": "same", "age_group": "adult"}


@pytest.fixture
def provider() -> FakeProvider:
    return FakeProvider()


@pytest.fixture
def client(settings, engine, provider):
    with TestClient(create_app(settings, engine, ai_provider=provider), headers=CLIENT_HEADERS) as c:
        yield c


def chat(client, message, language="en", conversation_id=None):
    payload = {"message": message, "language": language}
    if conversation_id:
        payload["conversation_id"] = conversation_id
    res = client.post(CHAT, json=payload)
    assert res.status_code == 200, res.text
    return res.json()


def first_paragraph(body) -> str:
    return body["assistant_message"]["message_text"].split("\n\n")[0]


# --- 1. The five scenarios checked by hand ----------------------------------------------------------------------


@pytest.mark.parametrize(
    "message,categories",
    [
        ("I have severe chest pain and difficulty breathing", {"chest_pain", "breathing"}),
        ("My mother's face is drooping and her speech is slurred", {"stroke"}),
        ("After eating prawns my lips are swollen and my throat feels tight", {"anaphylaxis"}),
    ],
)
def test_manual_emergency_scenarios_get_fixed_112_guidance_first(client, provider, message, categories):
    body = chat(client, message)
    assert body["emergency"]["level"] == "emergency"
    assert categories <= set(body["emergency"]["categories"])
    # Prompt: the very first paragraph is the fixed instruction, with no question before it.
    first = first_paragraph(body)
    assert first == EMERGENCY_REPLY["en"]
    assert "112" in first and "?" not in first
    assert "AUTOMATIC SAFETY CHECK" in provider.calls[0].system


def test_manual_scenario_uncertain_diagnosis_is_not_an_emergency_and_keeps_the_no_diagnosis_rule(client, provider):
    body = chat(client, "I have had fever and body ache for 3 days. Do I have dengue?")
    assert body["emergency"] is None
    assert body["assistant_message"]["message_text"] == REPLIES["en"]
    system = provider.calls[0].system
    assert "Never say someone definitely has" in system and "not a diagnosis" in system


def test_manual_scenario_dose_escalation_never_shows_a_dose_and_adds_the_fixed_note(client, provider):
    provider.script = ["You could take 2 tablets of 5 mg instead of one. This is general information, not a diagnosis."]
    body = chat(client, "My BP tablets are not working. Can I double the dose?")
    reply = body["assistant_message"]["message_text"]
    assert "5 mg" not in reply and "2 tablets" not in reply
    assert DOSE_REMOVED["en"] in reply
    assert reply.endswith(MEDICINE_NOTE["en"])
    assert "MEDICINE QUESTION" in provider.calls[0].system


# --- 2. Emergency guidance is immediate and does not wait for questions -------------------------------------------


def test_symptom_checker_emergency_skips_the_ai_and_asks_no_questions(client, provider):
    res = client.post(ASSESS, json={**ASSESS_BASE, "symptoms": "my lips are swollen and my throat feels tight"})
    body = res.json()
    assert body["status"] == "emergency" and "anaphylaxis" in body["safety"]["categories"]
    assert body["follow_up_questions"] == []
    assert provider.calls == []  # nothing waits on the AI


def test_safety_check_endpoint_catches_the_newly_covered_wording(client):
    res = client.post("/api/v1/safety/check", json={"text": "difficulty in breathing since morning", "language": "en"})
    assert res.json()["level"] == "emergency"


# --- 3. Wordings the rules used to miss (all were "none" before this audit) -----------------------------------------


@pytest.mark.parametrize(
    "text,category",
    [
        ("I can't breath", "breathing"),
        ("difficulty in breathing", "breathing"),
        ("breathing difficulty since an hour", "breathing"),
        ("I am not able to breathe", "breathing"),
        ("my baby is turning blue", "breathing"),
        ("saans lene me taklif ho rahi hai", "breathing"),
        ("my chest hurts badly", "chest_pain"),
        ("pain in chest and sweating", "chest_pain"),
        ("left arm pain and chest heaviness", "chest_pain"),
        ("my heart is paining", "chest_pain"),
        ("her face is crooked and she can't move her right arm", "stroke"),
        ("his speech is not clear suddenly", "stroke"),
        ("my lips are swollen", "anaphylaxis"),
        ("throat feels tight after eating peanuts", "anaphylaxis"),
        ("she fell and is not responding", "unconscious"),
        ("my child swallowed my tablets", "poisoning"),
        ("my son drank kerosene", "poisoning"),
        ("I don't want to live anymore", "self_harm"),
        ("I want to end it all", "self_harm"),
    ],
)
def test_common_wordings_are_caught(text, category):
    result = check_text(text)
    assert result.level == "emergency" and category in result.categories


@pytest.mark.parametrize(
    "text",
    [
        "we use a kerosene stove at home",
        "this outfit fits well",
        "I take tablets for blood pressure",
        "my arm hurts after the vaccine",
        "I have a sore throat",
        "can I take paracetamol with food",
    ],
)
def test_ordinary_sentences_still_do_not_trigger(text):
    assert check_text(text).level == "none"


# --- 4. Emergency signs split across messages -------------------------------------------------------------------


def test_emergency_split_over_two_messages_is_caught(client, provider):
    first = chat(client, "I have pain")
    assert first["emergency"] is None
    second = chat(client, "in my chest since an hour", conversation_id=first["conversation_id"])
    assert second["emergency"]["level"] == "emergency" and "chest_pain" in second["emergency"]["categories"]
    assert first_paragraph(second) == EMERGENCY_REPLY["en"]


def test_after_an_emergency_the_ai_keeps_the_context_without_repeating_the_fixed_text(client, provider):
    first = chat(client, "my father is having chest pain")
    assert first["emergency"]["level"] == "emergency"
    later = chat(client, "what should we do while we wait?", conversation_id=first["conversation_id"])
    assert later["emergency"] is None
    assert later["assistant_message"]["message_text"] == REPLIES["en"]  # no duplicate fixed paragraph
    system = provider.calls[-1].system
    assert "EARLIER SAFETY CHECK" in system and "chest pain" in system


def test_unrelated_earlier_messages_do_not_create_an_emergency(client):
    first = chat(client, "I have a mild cold")
    later = chat(client, "and a runny nose", conversation_id=first["conversation_id"])
    assert later["emergency"] is None


# --- 5. Medicine-dose safeguards (pure functions) ---------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "can I double the dose of my sugar tablets?",
        "how many tablets can I take in a day",
        "should I stop taking my medicine",
        "kya main dose badha sakta hoon",
        "क्या मैं दवा की खुराक बढ़ा सकता हूँ",
        "மாத்திரை அதிகமா எடுக்கலாமா",
    ],
)
def test_dose_change_questions_are_recognised(text):
    assert asks_about_dose_change(text)


@pytest.mark.parametrize("text", ["I have a headache", "what is a healthy breakfast", "my doctor changed my tablets last year"])
def test_ordinary_questions_are_not_dose_questions(text):
    assert not asks_about_dose_change(text)


def test_redaction_removes_new_doses_but_keeps_amounts_the_person_wrote():
    text, removed = redact_doses("You took 2 tablets. Next, take 500 mg every 6 hours.", "I took 2 tablets of paracetamol", "en")
    assert removed == 1
    assert "2 tablets" in text and "500 mg" not in text and DOSE_REMOVED["en"] in text


def test_redaction_leaves_ordinary_text_alone():
    assert redact_doses(REPLIES["en"], "hello", "en") == (REPLIES["en"], 0)


def test_medicine_note_is_in_the_selected_language(client):
    body = chat(client, "क्या मैं दवा की खुराक बढ़ा सकता हूँ?", language="hi")
    reply = body["assistant_message"]["message_text"]
    assert reply.endswith(MEDICINE_NOTE["hi"])
    assert "112" in MEDICINE_NOTE["hi"] and "112" in MEDICINE_NOTE["ta"] and "112" in MEDICINE_NOTE["en"]


# --- 6. Privacy: the new checks log only flags, never what the person wrote ---------------------------------------


def test_new_safety_logging_contains_no_message_text(client, caplog):
    secret = "my secret husband chest pain detail"
    with caplog.at_level(logging.DEBUG):
        chat(client, secret)
        chat(client, "can I double the dose of my secret tablets?")
    assert "chat_reply" in caplog.text and "medication=True" in caplog.text
    assert secret not in caplog.text and "secret tablets" not in caplog.text
