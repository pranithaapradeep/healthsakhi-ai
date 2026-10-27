"""Diagnose the symptom checker against the REAL configured provider, stage by stage. Read-only; stores nothing.

Uses only a synthetic test symptom ("mild headache since yesterday"). Prints the provider, model, HTTP status,
error codes, finish reason, token usage and validation problems — never the API key. Makes about 4–6 AI calls.

Run from the backend folder:
    .venv\\Scripts\\python.exe -m scripts.diagnose_assessment
"""
from __future__ import annotations

import json
import logging
import sys
import traceback

from app.ai.factory import build_provider
from app.ai.prompts import build_system_prompt
from app.ai.provider import AIProviderError, ChatTurn
from app.assessment import service
from app.assessment.prompts import build_assessment_prompt, format_intake
from app.assessment.schemas import AssessmentRequest
from app.core.config import Settings

SYMPTOM = "mild headache since yesterday"


def cause_details(exc: BaseException) -> None:
    seen = 0
    while exc is not None and seen < 4:
        print(f"    {type(exc).__module__}.{type(exc).__name__}: {str(exc)[:300]}")
        status = getattr(exc, "status_code", None)
        body = getattr(exc, "body", None)
        if status is not None:
            print(f"      http_status={status}")
        if isinstance(body, dict):
            err = body.get("error", body)
            if isinstance(err, dict):
                print(f"      error.type={err.get('type')} error.code={err.get('code')}")
                print(f"      error.message={str(err.get('message'))[:400]}")
                fg = err.get("failed_generation")
                if fg:
                    print(f"      failed_generation (first 600 chars, synthetic input): {str(fg)[:600]!r}")
        exc = exc.__cause__ or exc.__context__  # type: ignore[assignment]
        seen += 1


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="LOG %(levelname)s %(name)s: %(message)s")
    settings = Settings()  # type: ignore[call-arg]
    provider = build_provider(settings)
    print(f"provider={provider.name} model={provider.model} groq_max_completion_tokens={settings.groq_max_completion_tokens} "
          f"reasoning_effort={settings.groq_reasoning_effort}")
    if provider.name == "none":
        print("No AI provider configured.")
        return 2

    print("\n[1] Request validation")
    req = AssessmentRequest(language="en", symptoms=SYMPTOM, duration="1_3d", severity="mild", trend="same", age_group="adult")
    print("  OK")

    print("\n[2] Safety rules")
    safety = service.evaluate_safety(req)
    print(f"  level={safety.level} categories={list(safety.categories)}")

    system = build_assessment_prompt("en", final_round=False)
    turns = [ChatTurn("user", format_intake(req, None))]

    print("\n[3] Chat-style call (no JSON mode) with the same prompt — isolates JSON mode")
    try:
        r = provider.generate(system, turns, json_output=False)
        print(f"  OK finish={r.stop_reason} tokens_in={r.input_tokens} tokens_out={r.output_tokens} chars={len(r.text)}")
    except AIProviderError as exc:
        print(f"  FAILED kind={exc.kind} detail={exc.detail}")
        cause_details(exc)

    print("\n[4] Assessment call exactly as the app makes it (JSON mode)")
    raw_text = None
    try:
        r = provider.generate(system, turns, json_output=True)
        raw_text = r.text
        print(f"  OK finish={r.stop_reason} tokens_in={r.input_tokens} tokens_out={r.output_tokens} chars={len(r.text)}")
    except AIProviderError as exc:
        print(f"  FAILED kind={exc.kind} detail={exc.detail}")
        cause_details(exc)

    if raw_text is not None:
        print("\n[5] Parsing and validation of that reply")
        try:
            parsed = service._parse(raw_text)
            print(f"  parse+schema OK status={parsed.status} urgency={parsed.urgency} "
                  f"lists={len(parsed.possible_explanations)}/{len(parsed.self_care)}/{len(parsed.seek_care_if)}")
            print(f"  post-check problem={service._problem(parsed, req, final_round=False)}")
            for m in service.DOSE_RE.finditer(service._visible_text(parsed)):
                print(f"  dose-regex match: {m.group(0)!r} in ...{service._visible_text(parsed)[max(0, m.start()-40):m.end()+40]!r}...")
        except Exception as exc:  # noqa: BLE001
            print(f"  FAILED {type(exc).__name__}: {str(exc)[:600]}")
            try:
                print(f"  reply keys: {sorted(json.loads(raw_text[raw_text.find('{'):raw_text.rfind('}')+1]).keys())}")
            except Exception:  # noqa: BLE001
                print(f"  reply start (synthetic input): {raw_text[:300]!r}")

    print("\n[6] Full service run (includes the corrective retry)")
    try:
        res = service.run_assessment(provider, req)
        print(f"  OK status={res.status} urgency={res.result.urgency if res.result else None}")
    except AIProviderError as exc:
        print(f"  FAILED kind={exc.kind} detail={exc.detail}")
        cause_details(exc)

    print("\n[7] Emergency red flag (must not call the AI)")
    calls = {"n": 0}
    real = provider.generate

    def counting(*a, **k):  # type: ignore[no-untyped-def]
        calls["n"] += 1
        return real(*a, **k)

    provider.generate = counting  # type: ignore[method-assign]
    res = service.run_assessment(provider, req.model_copy(update={"red_flags": ["chest_pain"]}))
    print(f"  status={res.status} categories={res.safety.categories} ai_calls={calls['n']}")
    _ = build_system_prompt  # keep import for reference
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        sys.exit(1)
