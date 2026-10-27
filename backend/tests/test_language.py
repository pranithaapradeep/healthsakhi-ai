import pytest

from app.ai.language import matches_language
from app.ai.prompts import build_system_prompt, language_reminder


@pytest.mark.parametrize(
    "text,lang,expected",
    [
        ("எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.", "ta", True),
        ("मुझे दो दिनों से सिरदर्द है।", "hi", True),
        ("I have had a headache for two days.", "en", True),
        ("I have had a headache for two days.", "ta", False),
        ("I have had a headache for two days.", "hi", False),
        ("मुझे दो दिनों से सिरदर्द है।", "ta", False),
        ("எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.", "en", False),
        # English medical terms in brackets are allowed inside Tamil/Hindi replies.
        ("உங்களுக்கு நீரிழிவு (diabetes) உள்ளதா என்று மருத்துவர் சோதிப்பார். ஓய்வு எடுங்கள்.", "ta", True),
        ("आराम करें और पानी पिएँ। डॉक्टर ब्लड प्रेशर (blood pressure) जाँच सकते हैं।", "hi", True),
        ("112", "ta", True),  # nothing to judge
    ],
)
def test_matches_language(text, lang, expected):
    assert matches_language(text, lang) is expected


@pytest.mark.parametrize("lang", ["en", "ta", "hi"])
def test_prompt_has_language_and_safety_rules(lang):
    prompt = build_system_prompt(lang)
    for rule in ("not a doctor", "Never prescribe medicines", "Never tell someone they are safe", "call 112", "14416", "Do not invent"):
        assert rule in prompt
    assert language_reminder(lang)
