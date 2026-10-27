"""Deterministic safety rules: independent of the AI and of the web layer."""
import pytest

from app.safety.matcher import check_text, merge, normalize
from app.safety.rules import RED_FLAG_CATEGORIES, RULES


def test_rule_table_is_complete():
    ids = [r.id for r in RULES]
    assert len(ids) == len(set(ids)), "rule ids must be unique"
    for r in RULES:
        assert r.en and r.ta and r.hi and r.lat, f"{r.id} needs English, Tamil, Hindi and transliterated phrases"
        assert all(any(0x0B80 <= ord(c) <= 0x0BFF for c in p) for p in r.ta), r.id
        assert all(any(0x0900 <= ord(c) <= 0x097F for c in p) for p in r.hi), r.id
    emergency_categories = {r.category for r in RULES if r.level == "emergency"}
    assert set(RED_FLAG_CATEGORIES) == emergency_categories


@pytest.mark.parametrize(
    "text,category",
    [
        # English
        ("My father suddenly can't lift his left arm and his speech is slurred.", "stroke"),
        ("her face is drooping", "stroke"),
        ("I cant breathe", "breathing"),
        ("I can not breathe properly", "breathing"),
        ("crushing chest pain since 20 minutes", "chest_pain"),
        ("he fainted and is not waking up", "unconscious"),
        ("the bleeding won't stop", "bleeding"),
        ("my son is having a seizure", "seizure"),
        ("her throat is swelling after a bee sting", "anaphylaxis"),
        ("I want to end my life", "self_harm"),
        ("child drank pesticide", "poisoning"),
        ("worst headache of my life", "severe_headache"),
        # Tamil
        ("எனக்கு நெஞ்சு வலி இருக்கு", "chest_pain"),
        ("அப்பாவுக்கு பேச்சு குழறல்", "stroke"),
        ("மூச்சு விட முடியவில்லை", "breathing"),
        ("அவர் மயங்கி விழுந்தார்", "unconscious"),
        ("குழந்தைக்கு வலிப்பு வந்தது", "seizure"),
        ("தற்கொலை எண்ணம் வருகிறது", "self_harm"),
        # Hindi (incl. spelling variants)
        ("सीने में दर्द हो रहा है", "chest_pain"),
        ("सीने मे दर्द", "chest_pain"),
        ("साँस नहीं ले पा रहा", "breathing"),
        ("सांस नहीं ले पा रही", "breathing"),
        ("ज़हर खा लिया", "poisoning"),
        ("जहर खा लिया", "poisoning"),
        ("मुँह टेढ़ा हो गया है", "stroke"),
        ("वह बेहोश है", "unconscious"),
        # Tanglish / Hinglish
        ("enaku nenju vali", "chest_pain"),
        ("mujhe saans nahi aa rahi", "breathing"),
        ("papa ko lakwa maar gaya", "stroke"),
        ("main aatmahatya karna chahta hoon", "self_harm"),
    ],
)
def test_emergency_phrases_in_all_languages(text, category):
    result = check_text(text)
    assert result.level == "emergency"
    assert category in result.categories


@pytest.mark.parametrize(
    "text,category",
    [
        ("blood in my stool since yesterday", "blood_in_stool_urine"),
        ("severe stomach pain", "severe_abdominal_pain"),
        ("can't keep water down", "dehydration"),
        ("மலத்தில் ரத்தம்", "blood_in_stool_urine"),
        ("पेशाब में खून", "blood_in_stool_urine"),
        ("bleeding during pregnancy", "pregnancy_warning"),
    ],
)
def test_urgent_phrases(text, category):
    result = check_text(text)
    assert result.level == "urgent"
    assert category in result.categories


@pytest.mark.parametrize(
    "text",
    [
        "I have had a headache for two days.",
        "எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.",
        "मुझे दो दिनों से सिरदर्द है।",
        "I have a cough and a runny nose",
        "my stomach hurts a little after lunch",
        "this outfit fits well",
        "நேற்றிலிருந்து சளி பிடித்திருக்கிறது",
        "नाक बह रही है और हल्का बुखार है",
        "",
    ],
)
def test_ordinary_symptoms_do_not_trigger(text):
    assert check_text(text).level == "none"


def test_emergency_outranks_urgent_and_keeps_both_categories():
    result = check_text("blood in my stool and now chest pain")
    assert result.level == "emergency"
    assert result.categories[0] == "chest_pain" and "blood_in_stool_urine" in result.categories


def test_checks_across_several_texts():
    assert check_text("mild cough", None, "and suddenly I can't breathe").level == "emergency"


def test_merge_takes_the_most_serious_level():
    merged = merge(check_text("blood in urine"), check_text("fainted"), check_text("cough"))
    assert merged.level == "emergency"
    assert merged.categories == ("unconscious", "blood_in_stool_urine")


def test_normalisation_handles_devanagari_variants_and_punctuation():
    assert normalize("साँस") == normalize("सांस")
    assert normalize("ज़हर") == normalize("जहर")
    assert normalize("CAN’T   breathe!!") == "can't breathe"


def test_word_boundaries_for_english():
    assert check_text("unfaintedly").level == "none"  # 'fainted' must be a whole word
    assert check_text("the poisonous-looking mushroom").level == "none"
