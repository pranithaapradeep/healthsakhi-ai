"""Deterministic emergency-safety rules.

NOT a clinically validated triage system. These rules are deliberately conservative: they would rather show
emergency guidance unnecessarily (e.g. when someone asks *about* chest pain) than miss a real emergency.
They run before, and independently of, any AI model, so emergency guidance never depends on the AI.

Each rule lists phrases per writing system:
  en  — English (matched on word boundaries; can't/won't spelling variants are generated automatically)
  ta  — Tamil script (substring match; Tamil is agglutinative)
  hi  — Devanagari (substring match; nukta, chandrabindu and anusvara are ignored on both sides)
  lat — Tamil/Hindi typed in Latin letters ("Tanglish"/"Hinglish"), matched like English

To add or change a rule: edit RULES, then run tests/test_safety_rules.py — every rule must have phrases in all
four groups. Document the source/rationale for new red flags in docs/safety-rules.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Level = Literal["emergency", "urgent"]

# Red-flag categories a person can tick directly in the symptom checker (all emergency level).
RED_FLAG_CATEGORIES = (
    "stroke",
    "breathing",
    "chest_pain",
    "unconscious",
    "bleeding",
    "seizure",
    "anaphylaxis",
    "self_harm",
    "poisoning",
    "severe_headache",
)


@dataclass(frozen=True)
class Rule:
    id: str
    category: str
    level: Level
    en: tuple[str, ...]
    ta: tuple[str, ...]
    hi: tuple[str, ...]
    lat: tuple[str, ...]


RULES: tuple[Rule, ...] = (
    # ---------------------------------------------------------------- emergency
    Rule(
        "stroke_signs", "stroke", "emergency",
        en=("stroke", "face drooping", "face droop", "drooping face", "facial droop", "face is drooping", "face has dropped",
            "face drooped", "mouth is drooping", "slurred speech", "speech is slurred", "slurring",
            "can't speak", "can't talk properly", "sudden weakness", "weakness on one side", "numb on one side",
            "can't lift his arm", "can't lift her arm", "can't lift my arm", "paralysis", "paralysed", "paralyzed"),
        ta=("பக்கவாதம்", "முகம் கோணல்", "முகம் ஒரு பக்கம்", "வாய் கோணல்", "பேச்சு குழறல்", "பேச்சு குழறு", "பேச முடியவில்லை",
            "பேச முடியல", "கை தூக்க முடியவில்லை", "கை தூக்க முடியல", "ஒரு பக்கம் செயலிழ", "ஒரு பக்கம் உணர்ச்சி இல்லை"),
        hi=("लकवा", "स्ट्रोक", "चेहरा टेढ़ा", "मुँह टेढ़ा", "मुंह टेढ़ा", "बोलने में दिक्कत", "बोल नहीं पा", "आवाज़ लड़खड़ा",
            "जुबान लड़खड़ा", "हाथ नहीं उठ", "एक तरफ कमजोरी", "एक तरफ़ कमज़ोरी", "एक तरफ सुन्न"),
        lat=("pakkavatham", "pakkavaatham", "lakwa", "laqwa", "muh tedha", "munh tedha", "chehra tedha", "bol nahi pa"),
    ),
    Rule(
        "breathing_severe", "breathing", "emergency",
        en=("can't breathe", "unable to breathe", "difficulty breathing", "trouble breathing", "struggling to breathe",
            "hard to breathe", "short of breath", "shortness of breath", "breathless", "gasping", "choking",
            "lips turning blue", "blue lips", "not breathing", "stopped breathing"),
        ta=("மூச்சு விட முடியவில்லை", "மூச்சு விட முடியல", "மூச்சுத் திணறல்", "மூச்சு திணறல்", "மூச்சுத்திணறல்",
            "மூச்சு வாங்க முடியல", "மூச்சு வாங்குது", "மூச்சு இல்லை", "உதடு நீல"),
        hi=("साँस नहीं ले पा", "साँस नहीं आ", "साँस लेने में तकलीफ", "साँस लेने में दिक्कत", "साँस फूल", "दम घुट",
            "होंठ नीले", "साँस रुक"),
        lat=("moochu vida mudiyala", "moochu vida mudiyavillai", "moochu thinaral", "saans nahi", "sans nahi", "saans phool",
             "saans lene me takleef", "saans lene mein takleef", "dam ghut"),
    ),
    Rule(
        "chest_pain", "chest_pain", "emergency",
        en=("chest pain", "pain in my chest", "pain in the chest", "pain in his chest", "pain in her chest", "chest pressure",
            "chest tightness", "tight chest", "tightness in my chest", "crushing chest", "heart attack"),
        ta=("நெஞ்சு வலி", "நெஞ்சுவலி", "நெஞ்சில் வலி", "மார்பு வலி", "மார்பில் வலி", "நெஞ்சு அழுத்தம்", "நெஞ்சு இறுக்க", "மாரடைப்பு"),
        hi=("सीने में दर्द", "सीने मे दर्द", "छाती में दर्द", "सीने में जकड़न", "सीने में दबाव", "दिल का दौरा", "हार्ट अटैक"),
        lat=("nenju vali", "nenjuvali", "nenjil vali", "maarbu vali", "maaradaippu", "seene me dard", "seene mein dard",
             "chhati me dard", "chati mein dard", "chhati mein dard", "dil ka daura"),
    ),
    Rule(
        "unconscious", "unconscious", "emergency",
        en=("unconscious", "passed out", "fainted", "fainting", "not waking up", "won't wake up", "can't wake",
            "unresponsive", "collapsed", "lost consciousness", "blacked out"),
        ta=("மயக்கம்", "மயங்கி விழுந்", "நினைவு இழந்", "நினைவிழந்", "சுயநினைவு இல்லை", "எழுப்ப முடியவில்லை", "எழுப்ப முடியல"),
        hi=("बेहोश", "होश नहीं", "होश खो", "होश में नहीं", "उठ नहीं रहा", "उठ नहीं रही"),
        lat=("mayakkam", "mayangi", "behosh", "hosh nahi", "hosh kho"),
    ),
    Rule(
        "heavy_bleeding", "bleeding", "emergency",
        en=("heavy bleeding", "bleeding heavily", "won't stop bleeding", "bleeding won't stop", "can't stop the bleeding",
            "bleeding a lot", "lot of blood", "coughing up blood", "coughing blood", "vomiting blood", "vomited blood"),
        ta=("அதிக இரத்தப்போக்கு", "அதிக ரத்தப்போக்கு", "ரத்தம் நிற்கவில்லை", "இரத்தம் நிற்கவில்லை", "ரத்தம் நிக்கல",
            "ரத்த வாந்தி", "இரத்த வாந்தி", "ரத்தம் கொட்டு", "இருமலில் ரத்தம்", "இருமலில் இரத்தம்"),
        hi=("बहुत खून", "खून नहीं रुक", "खून बह रहा", "खून की उल्टी", "खांसी में खून", "खाँसी में खून", "ज़्यादा खून"),
        lat=("ratham nikkala", "ratha vanthi", "bahut khoon", "khoon nahi ruk", "khoon ki ulti", "khoon beh"),
    ),
    Rule(
        "seizure", "seizure", "emergency",
        en=("seizure", "seizures", "convulsion", "convulsions", "convulsing", "having fits", "had fits", "having a fit",
            "had a fit", "fit attack"),
        ta=("வலிப்பு", "ஜன்னி"),
        hi=("दौरा पड़", "दौरे पड़", "मिर्गी", "झटके आ"),
        lat=("valippu", "fits vandhu", "fits varudhu", "mirgi", "daura pad", "dora pad", "jhatke aa"),
    ),
    Rule(
        "anaphylaxis", "anaphylaxis", "emergency",
        en=("anaphylaxis", "anaphylactic", "throat swelling", "throat is swelling", "throat is closing", "swollen throat",
            "tongue swelling", "swollen tongue", "lips swelling", "swollen lips", "face swelling", "severe allergic"),
        ta=("தொண்டை வீக்கம்", "தொண்டை வீங்கி", "நாக்கு வீக்கம்", "நாக்கு வீங்கி", "உதடு வீங்கி", "முகம் வீங்கி"),
        hi=("गले में सूजन", "गला सूज", "जीभ सूज", "जीभ में सूजन", "होंठ सूज", "चेहरा सूज", "गंभीर एलर्जी"),
        lat=("thondai veekkam", "naakku veengi", "gala sooj", "jeebh sooj", "chehra sooj"),
    ),
    Rule(
        "self_harm", "self_harm", "emergency",
        en=("suicide", "suicidal", "kill myself", "end my life", "want to die", "self harm", "self-harm", "hurt myself",
            "harm myself", "cut myself", "no reason to live"),
        ta=("தற்கொலை", "சாக வேண்டும்", "சாகணும்", "சாகப் போகிறேன்", "உயிரை மாய்த்து", "என்னை நானே காயப்படுத்த", "வாழ விருப்பமில்லை"),
        hi=("आत्महत्या", "खुदकुशी", "ख़ुदकुशी", "मरना चाहता", "मरना चाहती", "जान दे दूं", "जान दे दूँ", "खुद को नुकसान",
            "जीना नहीं चाहता", "जीना नहीं चाहती"),
        lat=("thatkolai", "tharkolai", "saaganum", "aatmahatya", "atmahatya", "khudkushi", "marna chahta", "marna chahti",
             "jaan de dunga", "jaan de dungi"),
    ),
    Rule(
        "poisoning", "poisoning", "emergency",
        en=("poison", "poisoned", "poisoning", "pesticide", "swallowed bleach", "drank bleach", "drank acid", "swallowed acid",
            "overdose", "took too many pills", "too many tablets"),
        ta=("விஷம்", "பூச்சிக்கொல்லி", "அதிக மாத்திரை"),
        hi=("ज़हर", "जहर", "कीटनाशक", "बहुत सारी गोलियाँ", "ज़्यादा गोलियां"),
        lat=("visham", "poochikolli", "zeher", "zahar", "jahar", "keetnashak"),
    ),
    Rule(
        "severe_headache", "severe_headache", "emergency",
        en=("worst headache", "sudden severe headache", "sudden very bad headache", "thunderclap headache", "thunderclap"),
        ta=("திடீர் கடுமையான தலைவலி", "திடீரென கடுமையான தலைவலி", "தாங்க முடியாத தலைவலி"),
        hi=("अचानक तेज़ सिरदर्द", "अचानक बहुत तेज़ सिरदर्द", "असहनीय सिरदर्द"),
        lat=("achanak tez sir dard", "achanak tej sar dard", "thanga mudiyatha thalaivali"),
    ),
    # ---------------------------------------------------------------- urgent (see a doctor within 24 hours)
    Rule(
        "blood_in_stool_urine", "blood_in_stool_urine", "urgent",
        en=("blood in stool", "blood in my stool", "bloody stool", "black stool", "black tarry stool", "blood in urine",
            "blood in my urine", "bloody urine"),
        ta=("மலத்தில் இரத்தம்", "மலத்தில் ரத்தம்", "கருப்பு மலம்", "சிறுநீரில் இரத்தம்", "சிறுநீரில் ரத்தம்"),
        hi=("मल में खून", "टट्टी में खून", "काला मल", "पेशाब में खून"),
        lat=("malathil ratham", "siruneeril ratham", "potty me khoon", "tatti me khoon", "peshab me khoon", "peshab mein khoon"),
    ),
    Rule(
        "severe_abdominal_pain", "severe_abdominal_pain", "urgent",
        en=("severe abdominal pain", "severe stomach pain", "severe belly pain", "terrible stomach pain", "unbearable stomach pain"),
        ta=("கடுமையான வயிற்று வலி", "தாங்க முடியாத வயிற்று வலி", "பயங்கர வயிற்று வலி"),
        hi=("पेट में तेज़ दर्द", "पेट में बहुत तेज़ दर्द", "पेट में असहनीय दर्द"),
        lat=("kadumaiyana vayitru vali", "pet me tez dard", "pet mein tej dard", "pet me bahut dard"),
    ),
    Rule(
        "dehydration", "dehydration", "urgent",
        en=("not passing urine", "no urine", "haven't urinated", "can't keep fluids down", "can't keep water down",
            "can't keep anything down", "very dehydrated", "severely dehydrated"),
        ta=("சிறுநீர் வரவில்லை", "சிறுநீர் போகவில்லை", "தண்ணீர் கூட வாந்தி", "எதையும் குடிக்க முடியவில்லை"),
        hi=("पेशाब नहीं आ", "पेशाब नहीं हुआ", "पानी भी नहीं रुक", "कुछ भी नहीं रुक रहा", "पानी की कमी"),
        lat=("peshab nahi aa", "paani bhi nahi ruk", "siruneer varala"),
    ),
    Rule(
        "pregnancy_bleeding", "pregnancy_warning", "urgent",
        en=("bleeding during pregnancy", "pregnant and bleeding", "bleeding while pregnant", "baby not moving",
            "baby stopped moving", "water broke", "waters broke"),
        ta=("கர்ப்ப காலத்தில் இரத்தப்போக்கு", "கர்ப்பமாக இருக்கும்போது ரத்தம்", "குழந்தை அசையவில்லை", "பனிக்குடம் உடைந்"),
        hi=("गर्भावस्था में खून", "प्रेगनेंसी में खून", "बच्चा हिल नहीं रहा", "पानी की थैली फट"),
        lat=("pregnancy me bleeding", "baccha hil nahi raha", "kulandhai asaiyala"),
    ),
)
