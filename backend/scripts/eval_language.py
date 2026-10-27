"""LIVE evaluation against the configured AI provider (AI_PROVIDER in backend/.env) — opt-in.

With AI_PROVIDER=groq this runs on Groq's free tier (it uses a few of your daily free requests/tokens).
With AI_PROVIDER=anthropic it costs money (roughly a few US cents per run).

Sends representative Tamil, Hindi, English, code-switched and emergency messages through the same prompt and
language check the app uses, and reports whether each reply stayed in the selected language and whether the
emergency case mentions 112. Prints replies so a person can review tone and safety; prints no secrets.

Run from the backend folder (requires the provider's API key in backend/.env):
    .venv\\Scripts\\python.exe -m scripts.eval_language
"""
from __future__ import annotations

import sys
import time

from app.ai.factory import build_provider
from app.ai.language import matches_language, script_stats
from app.ai.prompts import build_system_prompt
from app.ai.provider import AIProviderError, ChatTurn
from app.core.config import Settings

CASES = [
    ("ta", "எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.", False),
    ("hi", "मुझे दो दिनों से सिरदर्द है।", False),
    ("en", "I have had a headache for two days.", False),
    ("ta", "எனக்கு fever and body pain இருக்கு, what should I do?", False),
    ("hi", "Mujhe kal se pet mein dard hai", False),
    ("en", "My father suddenly can't lift his left arm and his speech is slurred.", True),
]


def main() -> int:
    settings = Settings()  # type: ignore[call-arg]
    provider = build_provider(settings)
    if provider.name == "none":
        print(f"No AI provider is configured (AI_PROVIDER={settings.ai_provider}); set its API key in backend/.env.")
        return 2
    print(f"provider={provider.name} model={provider.model}\n")
    failures = 0
    for lang, message, emergency in CASES:
        try:
            try:
                result = provider.generate(build_system_prompt(lang), [ChatTurn("user", message)])  # type: ignore[arg-type]
            except AIProviderError as exc:
                if exc.kind != "rate_limited":
                    raise
                wait = min(exc.retry_after or 20, 65)  # free-tier per-minute limits: wait once, then retry
                print(f"[{lang}] rate limited, waiting {wait}s ...")
                time.sleep(wait)
                result = provider.generate(build_system_prompt(lang), [ChatTurn("user", message)])  # type: ignore[arg-type]
        except AIProviderError as exc:
            print(f"[{lang}] ERROR {exc.kind}: {exc.detail}\n")
            failures += 1
            continue
        ok_lang = matches_language(result.text, lang)
        ok_emergency = (not emergency) or ("112" in result.text)
        failures += (not ok_lang) + (not ok_emergency)
        s = script_stats(result.text)
        print(f"[{lang}] language_ok={ok_lang} emergency_112={'n/a' if not emergency else ok_emergency} "
              f"scripts(ta/dev/latin)={s.tamil}/{s.devanagari}/{s.latin} tokens={result.input_tokens}+{result.output_tokens}")
        print(f"  Q: {message}")
        print("  A: " + result.text.replace("\n", "\n     ") + "\n")
    print("SUMMARY:", "all checks passed" if failures == 0 else f"{failures} check(s) failed")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
