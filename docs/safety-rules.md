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
| `POST /api/v1/chat` | Checks each message, **and the last 3 of the person's messages read together** (so "I have pain" … "in my chest" is caught). On an emergency match the saved reply always **starts** with fixed wording (112; plus Tele-MANAS 14416 for self-harm), and the model is told to repeat it. If an emergency was flagged in one of the previous two messages, the model is reminded of it (without repeating the fixed paragraph). If the AI fails, the fixed wording is still returned and saved. The browser also calls `/safety/check` in parallel so the alert can appear before the AI answers. |
| Chat — medicines (`app/safety/medication.py`) | Questions about starting, stopping, doubling or increasing a dose add a fixed medicine note (ask the prescribing doctor or a pharmacist; 112 if too much was taken), and the model is told not to give doses. Dose amounts in the AI's reply ("500 mg", "2 tablets") are replaced by a fixed note unless the person wrote that amount themselves. |

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

## Audit 2026-10-28

Probing the rules with 32 realistic emergency wordings found 28 that were not caught (they depended entirely on the
AI), e.g. "difficulty in breathing", "I can't breath", "my chest hurts", "he is not responding", "my child swallowed my
tablets", "I don't want to live anymore". Common wordings were added to the existing rules (no new categories);
29 of the 32 are now caught. Deliberately **not** covered, and needing clinical design rather than more keywords:

- "fits" on its own (too ambiguous: "this outfit fits well");
- combinations that are only dangerous together, e.g. "hives and trouble swallowing";
- quantities, e.g. "I took 20 paracetamol tablets" (any threshold is a clinical decision);
- typos beyond the common "breath"/"chest pian" spellings — there is no fuzzy matching.

New accepted false positive: "the app is not responding" (from "is not responding").
Tests: `backend/tests/test_safety_audit.py`.

### Needs clinical and language review before real-world use

- every phrase list, especially the Latin-letter Hindi/Tamil and the new everyday wordings;
- the fixed emergency and medicine wording in Tamil and Hindi (`messages.py`, `medication.py`);
- whether urgent-level signs (blood in stool/urine, pregnancy warnings, dehydration) should also add fixed chat text
  (today chat reports them to the app but only the AI wording advises care);
- retention of stored conversations (guest conversations are kept indefinitely; messages are stored as plain text).

## Changing rules

1. Edit `RULES` in `rules.py` (every rule needs phrases in all four groups).
2. Add positive and negative examples to `backend/tests/test_safety_rules.py` (or `test_safety_audit.py`).
3. Run `.\.venv\Scripts\python.exe -m pytest tests/test_safety_rules.py`.
