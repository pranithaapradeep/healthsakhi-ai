# Deterministic emergency-safety rules

**This is not a clinically validated triage system.** It is a conservative, rule-based layer that makes sure
emergency guidance (call **112**, or go to the nearest emergency department) is shown immediately and never
depends on an AI model. It has not been reviewed by clinicians; a clinical review of the phrase lists and
thresholds is required before any real-world use.

## Where it runs

| Place | What happens |
|---|---|
| Symptom checker — red-flag step | Ticking any red flag shows emergency guidance instantly in the browser. No network call, no AI. |
| Symptom checker — symptoms step | `POST /api/v1/safety/check` on what was typed; an emergency match skips the AI entirely. |
| `POST /api/v1/assessment` | Re-checks ticked flags, typed symptoms and follow-up answers on the server before anything else. Emergencies are answered by the rules, **before rate limiting** and without the AI. |
| `POST /api/v1/chat` | Checks each message. On an emergency match the saved reply always **starts** with fixed wording (112; plus Tele-MANAS 14416 for self-harm), and the model is told to repeat it. If the AI fails, the fixed wording is still returned and saved. The browser also calls `/safety/check` in parallel so the alert can appear before the AI answers. |

## Rules

Defined in `backend/app/safety/rules.py`; matching in `backend/app/safety/matcher.py`.

**Emergency** (also the 10 tickable red flags): stroke signs, severe breathing difficulty, chest pain/pressure,
unconsciousness/fainting, heavy bleeding (incl. vomiting/coughing blood), seizure, severe allergic swelling,
suicide/self-harm, poisoning/overdose, sudden severe headache.

**Urgent** (minimum urgency "see a doctor within 24 hours"; the AI may raise but never lower it):
- phrases: blood in stool or urine, severe abdominal pain, dehydration signs, bleeding/warning signs in pregnancy;
- structured answers: severity *severe*, or *moderate and getting worse*; baby under 1 year; pregnant **and**
  bleeding/pain mentioned.

Each rule has phrases in English, Tamil script, Devanagari and Latin-letter Tamil/Hindi (Tanglish/Hinglish).
Normalisation: Unicode NFC, case-folding, punctuation removal, `can't/cannot/can not`-style variants, and for
Devanagari the nukta (़), chandrabindu (ँ) and anusvara (ं) are ignored so `साँस / सांस`, `में / मे`,
`ज़हर / जहर` match. English uses whole-word matching; Tamil and Devanagari use substring matching.

## Known limitations

- **False positives by design:** "what are the signs of a stroke?" or "breathless after climbing stairs" trigger
  emergency guidance. The wording says "if this is happening now".
- **No negation handling:** "no chest pain" still matches. Ignoring negation could hide real emergencies.
- **Phrase lists are incomplete.** Misspellings, other dialects or unusual phrasing can be missed — the AI prompt
  still instructs the model to give 112 for emergency signs, but that is not guaranteed.
- Not validated against clinical datasets; translations need review by native speakers and clinicians.

## Changing rules

1. Edit `RULES` in `rules.py` (every rule needs phrases in all four groups).
2. Add positive and negative examples to `backend/tests/test_safety_rules.py`.
3. Run `.\.venv\Scripts\python.exe -m pytest tests/test_safety_rules.py`.
