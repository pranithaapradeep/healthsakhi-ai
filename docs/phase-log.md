# Phase log

## Phase 1 — Frontend foundation (written 2026-10-25)

- React + TypeScript + Vite + Tailwind CSS v4, React Router.
- 10 required pages + 404, responsive layout, mobile menu, skip link.
- UI strings in English, Tamil and Hindi (`src/i18n/strings.ts`), typed so missing keys fail type-checking.
- Self-hosted Noto Sans / Noto Sans Tamil / Noto Sans Devanagari (no third-party font requests).
- Static emergency banner with `tel:112`, rendered without login or network.
- API client separated from UI (`src/api/`); dashboard shows backend reachability.
- Pages for chat, assessment, hospitals, tips, auth show honest "being built" notices until their phase.

Verification: pending (`phase1.log`).

Verified 2026-10-25 on Windows (Node 25, npm 11.6): `npm run typecheck` pass, `npm test` 28/28, `npm run build` pass.
Fix during verification: Node 25's built-in `localStorage` shadowed jsdom's in Vitest; `src/test/setup.ts` now
restores jsdom's real Web Storage.

## Phase 2 — Backend and database (written 2026-10-25)

- FastAPI app factory, settings via environment, Alembic `0001_initial`.
- Tables: users, user_sessions, conversations, messages, symptom_assessments.
- Auth: Argon2id, opaque httpOnly session cookie (hash stored), logout revocation, rate limits, CSRF header.
- Profile read/update/delete (password-confirmed, cascading), conversation list/read/delete with ownership checks.
- Frontend: AuthContext, real login/register/logout, profile + account deletion, history list, language sync.
- Tests: backend pytest (SQLite default, optional PostgreSQL `*_test`), frontend Vitest with mocked API.

Verification: pending (`phase2-*.log`).

### Phase 2 verification notes (2026-10-25)

- `/api/health` "degraded" investigation: `scripts/check_db.py` showed the code path, `.env` and database were
  correct (no `DATABASE_URL` override; app engine and `/api/health` OK). Cause: a uvicorn process started before
  the last `.env` edit kept cached settings. Hardening: `.env` path anchored to `backend/`, health check catches
  only database errors and logs error class + SQLSTATE, README run command uses `--reload-include .env`.
- pytest run 1: 72 passed, 1 failed — regression test assumed psycopg raises `OperationalError`; on Windows it
  raises the subclass `ConnectionTimeout`. Test now checks the class hierarchy.
- Review fixes: account deletion password attempts rate-limited; logout keeps the user signed in (with a message)
  if the server could not revoke the session; dashboard distinguishes "database unavailable" (503) from
  "not reachable"; httpx → httpx2 for Starlette's TestClient; Alembic `path_separator = os`.

Phase 2 verified 2026-10-25 from tool artefacts (no log files were saved): pytest cache shows 74 tests collected
and `lastfailed` empty; Vitest results cache shows App, strings and auth test files passing; `dist/` rebuilt.

## Phase 3 — Claude integration and multilingual chat (written 2026-10-25)

- `app/ai/`: provider interface, Claude adapter (no sampling params; `output_config.effort`), factory,
  server-side system prompt, script-based language check with one corrective retry.
- `POST /api/v1/chat`: guests (httpOnly guest cookie) and users; ownership checks; context window; all-or-nothing
  persistence; rate limit; provider errors → `ai_timeout` / `ai_unavailable` / `ai_busy` / `ai_not_configured`.
- Frontend chat: bubbles with timestamps, typing indicator, stop, retry, new chat, copy, safe list/bold rendering,
  Enter-to-send (IME-safe), reopen from History, disclaimer + 112.
- `scripts/eval_language.py`: opt-in live check of ta/hi/en/code-switched/emergency replies (costs money).

Verification: pending.

### Phase 3 run 1 (Windows, 2026-10-25)
- Frontend: typecheck pass, Vitest 61/61, build pass.
- Backend: collection error — `tests/test_ai_claude.py` imported `httpx`, but anthropic 2.3.0 is built on `httpx2`.
  Fixed (test imports httpx2). 120 other tests collected.

### Phase 3b — Groq free-tier provider
- `AI_PROVIDER` (groq default | anthropic | none), explicit, no fallback between providers or models.
- `app/ai/groq_provider.py`: official `groq` SDK, `openai/gpt-oss-120b` (production; verified on Groq's models
  and deprecations pages 2026-10-25), `include_reasoning=False`, `reasoning_effort=low`, history capped at 8.
- New error kinds: `rate_limited` → 429 `ai_rate_limited` (+Retry-After), `too_large` → 413,
  `model_unavailable` → 503. Frontend messages in en/ta/hi.

Phase 3b verified 2026-10-25 from tool artefacts (no log files saved): pytest cache 159 ids, `lastfailed` empty;
Vitest cache: 5 files passed. Note: `requirements.txt` on the device did not yet pin `groq` (installed manually) —
recompile required.

## Phase 4 — Symptom checker and deterministic safety layer (written 2026-10-25)

- `app/safety/`: rules (en/ta/hi/transliterated), normaliser, matcher, fixed emergency wording, `/safety/check`.
- `app/assessment/`: stateless `POST /api/v1/assessment`; red flags/emergency phrases bypass AI and rate limits;
  urgent floors; JSON-mode AI with validation, one corrective retry (format/final/dose/language), dose removal.
- Chat: safety check before AI; fixed 112 text prepended; emergency reply saved even if the AI fails.
- Providers: `generate(..., json_output=False)`; Groq uses `response_format={"type":"json_object"}`.
- Frontend: symptom-checker wizard, result view, `EmergencyGuidance`, chat emergency alert; 81 new strings × 3.
- Pre-checks run in the cloud workspace (not the full suite): all `test_safety_rules.py` cases against the real
  matcher (0 failures); 21 assessment scenarios against the real service with a fake provider.

Verification: pending.

Phase 4 run (Windows): pytest 289 passed; groq==1.7.0 now pinned; Vitest 81/81; build passed.

### Bug: symptom checker always "assistant unavailable" (2026-10-25)
- Diagnosis (`scripts/diagnose_assessment.py`): Groq HTTP 200; a JSON reply with status "complete" validated, but
  when the model chose `need_more_info` it sent `"urgency": ""`. `AIAssessmentOutput.urgency` accepted only the three
  levels or null, so validation failed, the retry failed the same way, and the API returned 502 `ai_bad_response`
  (shown as "unavailable"). Both UI paths ("None of these" and typed symptoms) send a valid request and reach this
  same step; the request was never the problem.
- Fix: blank/"none"/"N/A" urgency → null (never a value or a guess); nulls/strings tolerated for list fields;
  status/urgency case-normalised; prompt now asks for `null`. A "complete" reply without urgency is still retried
  and then rejected deliberately (502 `ai_bad_response`, own UI message, retryable). Invalid-output logs list field
  names/types only. Dose filter got a trailing word boundary ("2 tablespoons" no longer counts as a dose).

### Bug: guest continuation lost the assistant turn (flaky test, 2026-10-25)
- `test_guest_continues_own_conversation_but_not_anothers` failed with turns `["user", "user"]` (306 passed, 1 failed).
- Cause (latent since Phase 3): history is ordered by `created_at`, ties broken by random UUID. Python 3.11 on
  Windows has a coarse clock, so a question and its reply often got identical timestamps; about half the time the
  reply sorted first and was then dropped (context must start with a user turn).
- Fix: `chat/service.py` gives each new message a strictly increasing timestamp within its conversation
  (≥ previous + 1 µs). No schema change. Regression tests freeze the clock to force ties, including 20 repeats of
  the original scenario and the saved-history order. Limitation: two simultaneous requests in the same
  conversation could still interleave.

## Phase 5 — India-wide hospital finder (2026-10-25)
- Provider: OpenStreetMap (Nominatim geocoding, Overpass search, OSM tiles via Leaflet). Google Places rejected
  (terms/cost), ABDM HFR not available without partner credentials. See README "Hospital finder".
- Backend `app/hospitals/`: provider interface + OSM provider (1 req/s Nominatim throttle, one Overpass query at
  a time, TTL cache with hashed keys, timeouts, 429/504 mapping), specialty mapping (20 departments from
  `healthcare:speciality`; status listed_unverified / not_listed / unavailable — never verified), `POST
  /api/v1/hospitals/search` (India bounding box, radius 5/10/25/50, exactly one of coords or query, per-IP rate
  limit, no coordinates or query text in logs). Version 0.5.0. `httpx` added to requirements.in.
- Frontend: `/hospitals` rewritten — click-only geolocation (denied/unavailable/timeout states), manual search,
  filters that re-run the last search, lazy-loaded Leaflet map synced with the list, hospital cards showing only
  listed data. ~65 new strings × 3 languages. New deps: leaflet, react-leaflet, @types/leaflet.
- Tests written: `backend/tests/test_hospitals.py`, `test_hospitals_osm.py` (mocked transport, no network);
  `frontend/src/pages/hospitals.test.tsx` (mocked geolocation, fetch and map).
- Pre-check in the cloud workspace: OSM parsing, caching, throttle, error mapping and request validation exercised
  against a mocked transport. The full suites have not run yet.

Verification: pending.

Phase 5 run (Windows, reported): pytest 385 passed (log seen); Vitest 111 passed in 7 files, typecheck and build
passed (reported by the user; log not seen).

### Phase 5 fix: slow "busy" hospital search + autocomplete (2026-10-27)
- Diagnosis (`scripts/diagnose_hospitals.py`, Chennai 10 km): Nominatim 200 in 0.9 s; Overpass `around` query 200
  in 32.1 s (479 elements); bounding-box query 200 in 23.6 s (521 elements, box > circle); Overpass status page 29 s.
  Configured budget was 25 s and the browser had no limit, so searches waited up to ~80 s and then showed "busy"
  (504 timeouts and 429s were both reported as busy). Cause: the overloaded public Overpass server, made worse by a
  heavier query and stacked waits.
- Changes: bbox query + centre-distance filter (radius unchanged); one 40 s budget per search; Nominatim 10 s;
  browser limits; two-step search with stage display and Cancel; separate rate-limited / timeout / busy /
  unavailable messages; duplicate and stale-response protection; single-flight at the server; cache reuse across
  radii; Photon suggestions via `POST /hospitals/suggest`; `POST /hospitals/resolve`; `place_label` on search.
- Changed tests (on purpose): the query-shape test (bbox instead of `around`) and upstream 429 now maps to
  `rate_limited` instead of `busy`.

Verification: pending.

Fix 3 run (Windows): pytest 468 passed; Vitest 128/132 (4 autocomplete tests matched the language selector's
<option>s — test-only fix); typecheck and build passed. Live comparison: bbox and around found the same 462
hospitals within 10 km of Chennai (bbox 44.6 s, around 30.5 s that run). DB auth failure resolved by the user;
check_db all OK.

### Hospital finder: Overpass at capacity (2026-10-27)
- Diagnostic: Overpass answered both queries in 0.2 s with HTTP 502 "currently at capacity … request queue is full;
  retry with exponential backoff". The "took too long" message the user saw comes from our 40 s Overpass budget
  (backend 504 → frontend `hospitals.timeoutUpstream`) or the browser's 50 s limit.
- Changes: bounded retries (3 attempts, 2 s/4 s, inside the budget) for quick 502/503 and connection errors only;
  `[maxsize:64MiB]`; new `overloaded` error (503 `hospital_provider_overloaded`) with its own message;
  `OSM_IPV4_ONLY` option; diagnostic step 0 times IPv4/IPv6 TCP connects (Overpass status page took ~29 s each run).

Verification: pending.

Fix 5 run (Windows, reported): pytest 479 passed; Vitest 133 passed in 7 files; typecheck and build passed.
Diagnostics (reported): Nominatim 0.6 s; Overpass status 41.5 s; normal query 502 queue full; IPv4-only query 200 in
30.5 s; IPv4 and IPv6 TCP connects both fast (so IPv6 was not the cause; the server is simply overloaded).

### Hospital data strategy: offline OSM copy + live fallback (2026-10-27)
- Compared providers (README "Data sources"). Chosen for this project: offline copy of OSM hospitals built by
  `scripts/build_hospital_snapshot.py` (tile by tile, polite, resumable), served by `SnapshotHospitalProvider`,
  with `FallbackHospitalProvider` → live Overpass on errors only. Responses carry `data_as_of` and the real source.
- Default unchanged (`HOSPITAL_PROVIDER=osm`) until the copy is built and checked.

Verification: pending.

Fix 8 run (Windows): pytest 518 passed. Offline OSM copy built: 62,961 hospitals, data as of 2026-10-27.

### Health Tips feature (2026-10-27)
- `/tips` placeholder replaced: 35 tips (5 per category × 7), English/Tamil/Hindi, search across all three languages
  plus category filter, clear button, empty state, "Learn more" sections, evidence labels, safety notes, urgent-care
  notice with 112. Data in `src/data/healthTips.ts` (lazy-loaded); search in `src/data/searchTips.ts`.
- Added a fourth evidence label, "Everyday habit", for non-food habits (activity, sleep, saline, when to see a doctor).
- Tests: `src/data/healthTips.test.ts` (completeness, safety rules, search), `src/pages/tips.test.tsx` (UI).
- No backend changes.

Verification: pending.

Tips run (Windows): Vitest 155 passed (9 files); typecheck passed; build passed with an INEFFECTIVE_DYNAMIC_IMPORT
warning for healthTips.ts and a 617 kB main chunk.

### Health Tips redesign (2026-10-27)
- Visual redesign (cream/sage palette, larger text, photo tiles and photo cards). Same 35 tips, categories, search,
  filters, Learn more and languages; new strings × 3 (hero, tile subtitles, comfort note, photo credit, about).
- Code splitting fixed: shared types/categories moved to `tipTypes.ts`, so `healthTips.ts` is only imported dynamically.
- Photos: Wikimedia Commons via `backend/scripts/fetch_tip_images.py` (run on the user's machine; licence-filtered;
  credits recorded). Until run, illustrated fallbacks are shown. Tests mock the photo manifest.

Verification: pending.
