"""Deterministic medicine-dose safeguards. Pure functions — no I/O, no AI, no logging.

NOT clinically validated. Two jobs only:
  1. Notice when someone asks about changing, doubling or increasing a medicine dose (phrase match, like rules.py),
     so the reply always carries the fixed medicine note below — not only when the AI remembers its instructions.
  2. Remove dose amounts ("500 mg", "2 tablets") from AI text, unless the person wrote that amount themselves
     (e.g. "I took 2 tablets" may be echoed back). The AI is told never to give doses; this enforces it.
The wording in MEDICINE_NOTE / DOSE_REMOVED needs review by a clinician and by native Tamil and Hindi speakers.
"""
from __future__ import annotations

import re

from .matcher import normalize

# Digits followed by a dose unit or tablet count, in English, Hindi and Tamil. (Shared with the symptom checker.)
DOSE_RE = re.compile(
    # The trailing lookahead stops "2 tablespoons", "3 tabs open" or "10 mgs"-style partial words matching.
    r"\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ml|iu|tablets?|tabs?|capsules?|गोली|गोलियां|गोलियाँ|टैबलेट|மாத்திரை|மில்லி)(?![a-z])",
    re.IGNORECASE,
)

# Asking to change a dose. English and Tamil/Hindi in Latin letters match on word boundaries; scripts as substrings.
_DOSE_CHANGE_LATIN = (
    "double dose", "double the dose", "double my dose", "increase the dose", "increase my dose", "increase dose",
    "higher dose", "extra dose", "extra tablet", "extra tablets", "extra pill", "extra pills", "more tablets",
    "more pills", "take more than", "maximum dose", "max dose", "how many tablets can i take", "how many pills can i take",
    "how much can i take", "stop taking my medicine", "stop taking my tablets", "stop my medicine",
    # Hinglish / Tanglish
    "dose badha", "dose badhana", "dose double", "zyada goli", "jyada goli", "zyada dawai", "jyada dawai",
    "athigama maathirai", "adhigama mathirai", "dose athigam",
)
_DOSE_CHANGE_SCRIPT = (
    "खुराक बढ़ा", "डोज़ बढ़ा", "डबल डोज़", "ज़्यादा गोली", "ज़्यादा दवा", "दवा बंद",
    "மாத்திரை அதிகமா", "அதிக மாத்திரை", "டோஸ் அதிக", "இரட்டை டோஸ்", "மருந்தை நிறுத்த", "மாத்திரையை நிறுத்த",
)
_LATIN_RE = re.compile(r"(?<![a-z0-9])(?:" + "|".join(map(re.escape, sorted({normalize(p) for p in _DOSE_CHANGE_LATIN}, key=len, reverse=True))) + r")(?![a-z0-9])")
_SCRIPT = tuple(normalize(p) for p in _DOSE_CHANGE_SCRIPT)

MEDICINE_NOTE = {
    "en": (
        "About medicines: please do not start, stop, double or increase a medicine dose on your own. Ask the doctor "
        "who prescribed it or a pharmacist. If someone has already taken too much of a medicine, call 112 now."
    ),
    "ta": (
        "மருந்துகள் பற்றி: எந்த மருந்தின் அளவையும் நீங்களாகவே தொடங்கவோ, நிறுத்தவோ, இரட்டிப்பாக்கவோ, அதிகரிக்கவோ "
        "வேண்டாம். மருந்து எழுதிக் கொடுத்த மருத்துவரிடமோ மருந்தாளரிடமோ கேளுங்கள். யாராவது ஏற்கனவே அதிக அளவு மருந்து "
        "எடுத்திருந்தால், உடனே 112-ஐ அழைக்கவும்."
    ),
    "hi": (
        "दवाओं के बारे में: किसी भी दवा की खुराक अपने आप शुरू, बंद, दोगुनी या ज़्यादा न करें। दवा लिखने वाले डॉक्टर "
        "या फार्मासिस्ट से पूछें। अगर किसी ने पहले ही ज़्यादा दवा ले ली है, तो तुरंत 112 पर कॉल करें।"
    ),
}

DOSE_REMOVED = {
    "en": "[dose removed — ask a doctor or pharmacist]",
    "ta": "[அளவு நீக்கப்பட்டது — மருத்துவர் அல்லது மருந்தாளரிடம் கேளுங்கள்]",
    "hi": "[खुराक हटाई गई — डॉक्टर या फार्मासिस्ट से पूछें]",
}


def asks_about_dose_change(text: str) -> bool:
    t = normalize(text)
    return bool(t) and (bool(_LATIN_RE.search(t)) or any(p in t for p in _SCRIPT))


def _key(span: str) -> str:
    return re.sub(r"\s+", "", span).casefold()


def redact_doses(reply: str, user_text: str, language: str) -> tuple[str, int]:
    """Replace dose amounts in the AI's reply with a fixed note, keeping amounts the person wrote themselves."""
    own = {_key(m.group(0)) for m in DOSE_RE.finditer(user_text)}
    removed = 0

    def _sub(m: re.Match[str]) -> str:
        nonlocal removed
        if _key(m.group(0)) in own:
            return m.group(0)
        removed += 1
        return DOSE_REMOVED[language]

    return DOSE_RE.sub(_sub, reply), removed
