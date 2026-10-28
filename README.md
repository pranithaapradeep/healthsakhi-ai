# HealthSakhi AI

Multilingual (Tamil · Hindi · English) healthcare assistant — final-year CS project.

> **Medical disclaimer:** HealthSakhi AI provides general health information only. It does not diagnose,
> prescribe, or confirm that anyone is safe, and it does not replace a clinician. Its emergency warnings are
> rule-based and **not** a clinically validated triage system. In an emergency in India, call **112**.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Frontend foundation, routing, i18n, responsive layout | Verified on Windows (typecheck, 28/28 tests, build) |
| 2 | FastAPI, PostgreSQL, Alembic, auth, profile, conversations API | Verified on Windows (pytest 74 collected / 0 failed; Vitest all files passed; build passed) |
| 3 | AI chat (Groq free tier or Claude), multilingual | Verified (pytest cache: 0 failed; Vitest all files passed; build; live eval reported passing) |
| 4 | Symptom checker + deterministic emergency rules | Verified on Windows (pytest 310 passed twice; Vitest 83/83; typecheck; build) |
| 5 | India-wide hospital finder (OpenStreetMap) | Written — awaiting verification |
| 6 | Voice input / spoken responses | Not started |
| 7 | Health tips (35 tips, 7 categories, 3 languages) — written, awaiting verification; bookmarks and history detail not started | In progress |
| 8 | Tests, security review, deployment docs | Not started |

## Architecture (so far)

```mermaid
flowchart LR
  B[React SPA<br/>Vite dev :5173] -- "/api (proxied in dev)<br/>httpOnly session cookie<br/>X-HS-Client header" --> A[FastAPI :8000<br/>/api/health · /api/v1/*]
  A --> P[(PostgreSQL<br/>healthsakhi)]
  T[pytest] --> S[(SQLite in-memory<br/>or healthsakhi_test)]
```

```
healthsakhi-ai/
  frontend/   React + TypeScript + Vite + Tailwind
  backend/    FastAPI + SQLAlchemy 2 + Alembic
    app/core      config, security (Argon2id, session tokens), rate limiting, middleware, errors
    app/db        models, engine/session
    app/auth      register / login / logout / me
    app/api       /api/v1 routes: health, profile, conversations
    migrations/   Alembic (0001_initial)
    tests/        pytest
  docs/
```

### API (v1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health`, `/api/v1/health` | — | Liveness + database check |
| POST | `/api/v1/auth/register` | — | Create account, start session |
| POST | `/api/v1/auth/login` | — | Start session (rate-limited) |
| POST | `/api/v1/auth/logout` | cookie | Revoke session |
| GET | `/api/v1/auth/me` | cookie | Current user |
| GET / PATCH | `/api/v1/profile` | cookie | Read / update name, language, voice autoplay |
| DELETE | `/api/v1/profile` | cookie + password | Delete account and all its data |
| GET | `/api/v1/conversations` | cookie | List own conversations |
| GET / DELETE | `/api/v1/conversations/{id}` | cookie | Read / delete own conversation (others → 404) |
| POST | `/api/v1/chat` | cookie **or guest** | Send a message, get a reply in `en`/`ta`/`hi` (rate-limited) |
| POST | `/api/v1/safety/check` | — | Deterministic emergency check of text (no AI, nothing stored) |
| POST | `/api/v1/assessment` | cookie **or guest** | One symptom-check step: emergency, follow-up questions, or result (nothing stored) |

Interactive docs: http://localhost:8000/api/docs

### Security decisions

- Passwords: Argon2id (`argon2-cffi`). Plaintext is never stored or logged.
- Sessions: random 256-bit token in an **httpOnly** cookie; only its SHA-256 hash is stored, so logout and
  account deletion revoke it server-side. No token is ever readable by, or stored in, the frontend.
- CSRF: POST/PATCH/DELETE under `/api/` require `X-HS-Client: web`; CORS allows only configured origins.
- Login: identical response for unknown email and wrong password; dummy hash check equalises timing; rate limits
  (5 per email+IP per minute, 20 per IP per minute; 10 registrations per IP per hour). In-memory, single instance.
- Request bodies over 64 KB → 413. Validation errors never echo submitted values. Unhandled errors return a
  generic 500 with no stack trace. Request bodies, tokens and message text are not logged.
- Production config refuses `*` or non-HTTPS CORS origins and SQLite.

### Data model

`users` (incl. `preferred_language`, `voice_autoplay`) · `user_sessions` · `conversations` (owned by a user
**or** a guest id) · `messages` · `symptom_assessments`. Foreign keys cascade on account deletion; CHECK
constraints enforce languages (`en`/`ta`/`hi`), message roles, assessment status, and that every conversation
and assessment has an owner. Chat messages are not a medical record.

---

## AI chat (Phase 3)

### Providers — chosen explicitly, never automatic

| `AI_PROVIDER` | Key in `backend/.env` | Default model | Cost |
|---|---|---|---|
| `groq` (default) | `GROQ_API_KEY` | `openai/gpt-oss-120b` (Groq production model) | Free tier with rate limits |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-5-5` | Paid per token ($2 / $10 per M input/output tokens) |
| `none` | — | — | Chat returns "AI not configured" |

There is **no fallback** between providers or models. If the selected provider's key is missing, chat replies
`ai_not_configured`; if the configured model is unavailable or decommissioned, chat replies `ai_model_unavailable`.
A missing Groq key can never route requests to the paid Anthropic API.

**Groq free-tier setup**

1. Sign in at https://console.groq.com and create a key under **API Keys**.
2. In `backend/.env` set `AI_PROVIDER=groq` and `GROQ_API_KEY=<your key>` (never commit `.env`; it is git-ignored).
3. Restart uvicorn (or rely on `--reload-include .env`).

Groq's published free-plan limits for `openai/gpt-oss-120b` (Oct 2026; your exact limits are on your Groq
account's limits page): about **30 requests/min, 1,000 requests/day, 8,000 tokens/min, 200,000 tokens/day**.
When they are reached Groq returns HTTP 429; HealthSakhi passes this on as `429 ai_rate_limited` with
`Retry-After`, and the UI says the free AI limit was reached. To stay inside the token budget, only the last
`GROQ_CONTEXT_MESSAGES` (default 8) messages are sent as context and reasoning is set to `low` and hidden.
Requests too large for the budget return `413 ai_request_too_large` ("start a new chat").

### How chat works

- Provider interface `app/ai/provider.py`; adapters `app/ai/groq_provider.py` and `app/ai/claude.py`;
  selection in `app/ai/factory.py`. Tests inject fakes — the test suite never calls any real or paid API.
- The system prompt (`app/ai/prompts.py`) lives only on the server and is identical for every provider. It fixes
  the reply language, forbids diagnosis, prescribing and "you are safe" statements, requires 112 for emergency signs
  and Tele-MANAS 14416 for self-harm, and forbids inventing facts, sources, hospitals or phone numbers.
- Replies are checked for the selected script (Tamil / Devanagari / Latin, `app/ai/language.py`); a reply in the
  wrong script is retried once with a reminder.
- A message and its reply are saved together only after the AI succeeds, so failures save nothing.
- Guests get a random `hs_guest` httpOnly cookie; signed-in users' chats are saved and reopenable from History.
- Message text and API keys are never logged (only ids, lengths, latency, provider, model and token counts).
- **Not yet:** streaming. "Stop" cancels waiting in the browser, but the server may still finish and save that reply.

### Live check (optional, uses your quota)

```powershell
Set-Location C:\dev\healthsakhi-ai\backend
.\.venv\Scripts\python.exe -m scripts.eval_language
```

Sends 6 representative messages (Tamil, Hindi, English, code-switched, and a stroke emergency) to the configured
provider and reports whether each reply stayed in the selected script and whether the emergency reply names 112.

## Symptom checker and emergency safety (Phase 4)

**General health information only — not a diagnosis and not a clinically validated triage system.**

Flow in the app (`/assessment`):
1. **Emergency signs first** — 10 red flags (stroke, breathing, chest pain, unconsciousness, heavy bleeding,
   seizure, severe allergy, self-harm, poisoning, sudden severe headache). Ticking any shows 112 guidance at once,
   with no network call and no AI.
2. **Symptoms** in the person's own words (any language), checked by the fixed rules before continuing.
3. **Details:** duration, severity, trend, age group, pregnancy (children/adults only, optional).
4. The AI (Groq by default) may ask **up to 3 follow-up questions once**, then returns a structured result:
   urgency (**emergency / urgent / routine**), summary, *possible* explanations (never a diagnosis), safe self-care,
   warning signs, and a next step — all in the selected language.

Safety precedence (`backend/app/assessment/service.py`):
- Emergency red flags or phrases anywhere (symptoms, follow-up answers) → emergency result from fixed rules; the AI
  is not called, and this path is never rate-limited.
- Urgent rules set a **minimum urgency** the AI cannot lower (the UI says when the rules set the level).
- AI output must be valid JSON in the required shape and language; dose-like text ("500 mg", "2 tablets") triggers
  a corrective retry and is then removed. Invalid output after one retry → `502 ai_bad_response`.
- Nothing is stored (the `symptom_assessments` table remains unused). Logs contain urgency, rule ids, language and
  timing — never symptom text.

Chat uses the same rules: emergency messages get fixed 112 wording first (and Tele-MANAS 14416 for self-harm),
even if the AI is down. Full rule documentation and limitations: [`docs/safety-rules.md`](docs/safety-rules.md).

## Hospital finder (Phase 5)

`/hospitals` finds hospitals anywhere in India — by the device's location (only after the person clicks
**Use my current location**) or by city, locality, state, PIN code or hospital name. Results appear on an
interactive map with a synchronised list, within 5, 10, 25 or 50 km, sorted by distance, with a directions link.
Emergency guidance (112) is shown above the search and never waits for it.

### Provider: OpenStreetMap (no API key, no cost — but not unlimited)

| Piece | Service | Terms that apply |
|---|---|---|
| Place / PIN lookup | Nominatim (`nominatim.openstreetmap.org`) | [Usage policy](https://operations.osmfoundation.org/policies/nominatim/): max 1 request/s, identifying User-Agent, results must be cached, no autocomplete. The backend enforces 1 req/s, caches for 1 h (unknown places 24 h) and only searches on submit. |
| Hospital search | Overpass API (`overpass-api.de`) | [Public instance](https://wiki.openstreetmap.org/wiki/Overpass_API): under 10,000 queries/day (for *regular* use: under 100/day), no parallel requests, pause after 429. The wiki currently describes it as **overloaded**. The backend sends one query at a time, never retries, caches successful answers 1 h, and reports 429 as "rate-limited". |
| Place suggestions while typing | Photon (`photon.komoot.io`) | [Public API](https://github.com/komoot/photon): use is welcome "as long as the number of requests stay in a reasonable limit"; heavy use is throttled or banned; no availability guarantee. Nominatim's policy forbids autocomplete, so it is not used for this. |
| Map tiles | `tile.openstreetmap.org` (browser) | [Tile policy](https://operations.osmfoundation.org/policies/tiles/): attribution shown on the map, no bulk/offline downloading, no SLA, access can be withdrawn. Set `VITE_MAP_TILE_URL`/`VITE_MAP_ATTRIBUTION` for a commercial tile provider. |
| Data licence | OpenStreetMap contributors | [ODbL 1.0](https://www.openstreetmap.org/copyright): attribution required (shown on the map and every card). |

These public servers are run by volunteers and donations. They are fine for development and a student
demo. **A public launch needs a self-hosted Nominatim/Overpass or a paid OSM-based provider** — set
`NOMINATIM_URL` / `OVERPASS_URL` (no code change). Set `OSM_CONTACT` to a real email or project URL; it goes
into the User-Agent so the operators can contact you. All provider code is in `backend/app/hospitals/osm.py`
behind the `HospitalProvider` interface (`provider.py`), so another source can be added without touching the UI.

Rejected: Google Places (its terms require results to be shown on a Google map; paid per request) and the
national Health Facility Registry (ABDM HFR — needs approved partner credentials; worth adding later as the
only source that could mark facilities as *verified*). Nothing is scraped.

### Speed, time limits and errors

Measured on 27 Oct 2026 (Chennai, 10 km, `scripts/diagnose_hospitals.py`): Nominatim 0.9 s; Overpass 32 s for the
old `around` query and 24 s for a bounding-box query — and 29 s even for Overpass's own status page. Most of the wait
is the public server's load, which this app cannot fix; what it can do:

- **Lighter query:** a bounding box (Overpass's spatial index) instead of `around`. The box is slightly larger than
  the circle; the backend keeps only facilities whose centre is within the chosen radius, so the radius is unchanged.
  `scripts/diagnose_hospitals.py` compares both queries' results within the radius on the live server.
- **Hard limits:** place lookup ≤ 10 s; hospital search ≤ `HOSPITAL_TIMEOUT_SECONDS` (default 40 s, covering the
  wait for our turn and the Overpass call, whose own `[timeout:]` ends 3 s earlier); the browser gives up at 50 s.
- **Stages:** typed places are looked up first (`POST /hospitals/resolve`), then hospitals are searched by that point,
  so the page shows "Finding the place…" then "Searching OpenStreetMap…", with a Cancel button.
- **Distinct messages:** took too long (504 / browser limit), rate-limited by OSM (upstream 429), our own queue busy,
  service unavailable (502/503/other), our own per-person limit (429), place not found (404), and a real
  "no hospitals listed here" (200 with no results). Failures are never cached or shown as empty results.
- **No duplicates:** repeated clicks on the same search are ignored; a new place cancels the old search and any late
  answer is dropped; identical searches arriving together at the server share one Overpass query.
- **Bounded retries:** only when Overpass answers *quickly* that it is at capacity (502/503 — its own message asks
  for retry with backoff) or the connection drops: at most 3 attempts, 2 s then 4 s apart, all inside the same 40 s
  budget. Never after 429 (policy: pause 30 s) or a read timeout (the query may still be running). Queries also
  declare a 64 MiB memory limit (`[maxsize:]`), which Overpass admits more readily than its 512 MiB default.
- **IPv4 option:** if `scripts/diagnose_hospitals.py` shows IPv6 connections to Overpass stalling, set
  `OSM_IPV4_ONLY=true`.
- **Cache:** successful Overpass answers for 1 h (a cached 50 km search also answers 25/10/5 km at the same point);
  place lookups 24 h; suggestions 24 h. In memory, per backend process.

Using a different Overpass server is a one-line change (`OVERPASS_URL`); try it first with
`scripts/diagnose_hospitals.py --overpass-url <url>`. Do not point the app at several servers at once.

### Place suggestions (autocomplete)

Typing 3+ characters and pausing for 400 ms shows up to 5 places in India (Photon). Arrow keys, Enter and Escape
work; hovering highlights; clicking fills the field without searching. Older answers never replace newer ones,
answers are cached in the browser for the session, and the backend allows about 1 request/second to Photon in
total and `PLACE_SUGGEST_RATE_LIMIT` (30) per person per minute. Photon labels are in English or the local name
(no Tamil/Hindi labels). If Photon is down or limiting, a friendly note appears and Search still works.
For a public launch, run your own Photon (`PHOTON_URL`) or turn suggestions off (`PLACE_SUGGEST_PROVIDER=none`).

### Data sources: live Overpass or an offline copy

`HOSPITAL_PROVIDER` chooses where hospital listings come from (all OpenStreetMap data, ODbL):

| Setting | What happens |
|---|---|
| `osm` (default) | Live Overpass for every uncached search. Fresh, but the public server is often slow or full. |
| `snapshot` | A local copy of India's OSM hospital listings, searched on this server in milliseconds; each answer shows "data as of <date>". If the copy is missing or cannot answer (clinics requested but not in the copy), it falls back to live Overpass (`HOSPITAL_FALLBACK_PROVIDER=osm`, or `none`). A genuine "no hospitals here" never triggers the fallback, and the page names the source that answered. |

Build the copy (about 64 tile queries, one at a time with pauses; stops without retrying if Overpass is busy and
resumes on the next run; at most about once a week):

```powershell
Set-Location C:\dev\healthsakhi-ai\backend
.\.venv\Scripts\python.exe -m scripts.build_hospital_snapshot
```

Then set `HOSPITAL_PROVIDER=snapshot` in `backend\.env` and restart. Typed places are still resolved by Nominatim, and
suggestions still use Photon. The finished copy (`backend/data/hospitals-india.json.gz`, about 3 MB) is committed so
the deployed server has it; partial/temporary build files stay out of Git. It is OpenStreetMap data under the ODbL:
keep the "© OpenStreetMap contributors" attribution the app shows with every answer. Rebuild and commit it again to
refresh it (each answer shows its "data as of" date).

Alternatives reviewed (Oct 2026): Geoapify Places (OSM-based; free 3,000 credits/day, key, attribution), LocationIQ
(free 5,000/day; the nearby-places API is not listed in the free plan), Google Places (paid per request, ~5,000 free
Nearby Search calls/month per a June 2026 third-party summary), the ABDM Health Facility Registry (verified
facilities; needs approved partner access) and data.gov.in hospital directories (licence and freshness unclear).
None is wired in; the provider interface (`app/hospitals/provider.py`) is where one would be added.

### What is shown — and what never is

- Only what the listing contains: name, address, phone(s), website, opening hours, type (hospital/clinic,
  government/private/charitable), listed departments, emergency department tag, source link. Missing fields say
  "not listed".
- **No doctors, ratings, bed or ICU availability, waiting times or "open now" claims** — the data has none.
- **Departments are never inferred from "it's a hospital".** A department filter matches only places whose listing
  names it (`healthcare:speciality`); these are labelled **"listed — not verified"**. Places with no department data
  are hidden unless "also show places with no department information" is ticked, and then labelled as such.
  Nothing is ever labelled "verified": no source used here verifies departments.
- Ambulance/emergency: 112 only. No other ambulance numbers are shown, because no reliable India-wide source for
  them is available here.

### Privacy

- Location is read once (`getCurrentPosition`, low accuracy) — never watched or stored.
- The browser rounds coordinates to 3 decimals (~110 m) and sends them in a POST body, never a URL.
- The backend uses them only for the provider query; it does not store or log them, or the search text
  (logs: source type, radius, department, result count, latency). Cache keys are hashed.
- Nothing from the hospital finder is sent to Groq or the AI chat.
- Directions links contain the hospital's position only.

### Coverage gaps

OSM coverage in India is uneven: cities are well mapped, many rural PHCs/CHCs and small nursing homes are missing,
and phone numbers, hours and departments are often absent or out of date. An empty result does not mean there
is no hospital nearby. The page says so and asks people to call before travelling.

## Health tips

`/tips` shows 35 short, plain-language tips in 7 categories (Health & Nutrition, Heart & Brain, Ayurveda & Herbs,
Cold, Fever & Cough, Digestion & Constipation, Hair & Skin Care, Liver, Kidney & Hepatitis), in English, Tamil and
Hindi. Search covers titles, descriptions, suggested foods/ingredients, keywords and category names in all three
languages, and works together with the category filter.

- Content lives in `frontend/src/data/healthTips.ts`, separate from the UI, and is loaded only when the page opens.
- Design: warm cream page, photo category tiles (click to filter; keyboard accessible), photo cards in a 1/2/3-column
  grid, a balanced urgent-care card with Call 112.
- **Photos** come from **Wikimedia Commons** and are bundled in `frontend/public/tips/` (500 px, lazy-loaded).
  `backend/scripts/fetch_tip_images.py` searches Commons per tip, keeps only CC0 / public-domain / CC BY / CC BY-SA
  photos, downloads them and writes `frontend/src/data/tipImages.generated.ts` with author, licence and source page.
  Each card credits its photo under "Learn more". Slots without a photo — or a photo that fails to load — show an
  illustrated fallback with the same alt text (alt text is in `tipImageAlt.ts`, three languages).
  Photos picked by search must be reviewed; wrong ones are pinned to a better file in the script's `PINNED` list.
- Every card has an evidence label: **Food-based tip**, **Traditional remedy** (Ayurveda/Siddha use; benefits not
  established), **Evidence limited** (some research, weak or mixed) or **Everyday habit** (self-care or when to see a
  doctor — added so habits like exercise and sleep are not mislabelled as foods or as unproven).
- Every card has a safety note (pregnancy, children, long-term illness, interacting medicines) and a "Learn more"
  section that separates traditional use from scientific evidence.
- No tip claims to treat hepatitis, kidney or liver disease, dengue or infections, to raise platelets, or to "detox";
  honey is never suggested under 12 months; an urgent-care notice with 112 sits at the top of the page.
  `healthTips.test.ts` checks these rules automatically.
- This is general education written for this project, not reviewed by a clinician; translations should be reviewed by
  native Tamil and Hindi speakers.

## Windows setup (PowerShell)

### Prerequisites

Node.js 20+ (you have v25), Python 3.11 (you have 3.11.9), Git, and PostgreSQL (below).

### 1. PostgreSQL

1. Install PostgreSQL for Windows with the EDB installer from https://www.postgresql.org/download/windows/
   (any currently supported major version). Keep port **5432**, remember the `postgres` superuser password.
   Stack Builder is not needed.
2. Create the app role and **two** databases — `healthsakhi` (development) and `healthsakhi_test` (tests only).
   Replace `17` with your installed version and choose your own password:

```powershell
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
& $psql -U postgres -h localhost -c "CREATE ROLE healthsakhi LOGIN PASSWORD 'choose-a-strong-password';"
& $psql -U postgres -h localhost -c "CREATE DATABASE healthsakhi OWNER healthsakhi TEMPLATE template0 ENCODING 'UTF8';"
& $psql -U postgres -h localhost -c "CREATE DATABASE healthsakhi_test OWNER healthsakhi TEMPLATE template0 ENCODING 'UTF8';"
```

UTF-8 is required for Tamil and Hindi text.

### 2. Backend

```powershell
Set-Location C:\dev\healthsakhi-ai\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip pip-tools
.\.venv\Scripts\pip-compile.exe --strip-extras requirements.in -o requirements.txt          # pins exact versions
.\.venv\Scripts\pip-compile.exe --strip-extras requirements-dev.in -o requirements-dev.txt
.\.venv\Scripts\pip-sync.exe requirements.txt requirements-dev.txt
Copy-Item .env.example .env
notepad .env        # set DATABASE_URL with your password
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe check            # must report no new upgrade operations
.\.venv\Scripts\uvicorn.exe app.main:create_app --factory --reload --reload-include .env --port 8000
```

Settings are read once per server process. `--reload-include .env` restarts the server when `.env` changes;
without it, restart uvicorn after editing `.env`.

Check http://localhost:8000/api/health → `{"status":"ok","database":"ok",...}`.
After the first compile, commit `requirements.txt` / `requirements-dev.txt`; later installs only need `pip-sync`.

### 3. Frontend (second PowerShell window)

```powershell
Set-Location C:\dev\healthsakhi-ai\frontend
npm install
npm run dev          # http://localhost:5173 — /api is proxied to :8000
```

### 4. Tests

```powershell
# Backend — default: in-memory SQLite (no PostgreSQL needed, no real data touched)
Set-Location C:\dev\healthsakhi-ai\backend
.\.venv\Scripts\python.exe -m pytest

# Backend — against PostgreSQL. The database name MUST end in _test; otherwise the run aborts.
$env:TEST_DATABASE_URL = "postgresql+psycopg://healthsakhi:choose-a-strong-password@localhost:5432/healthsakhi_test"
.\.venv\Scripts\python.exe -m pytest
Remove-Item Env:TEST_DATABASE_URL

# Frontend
Set-Location C:\dev\healthsakhi-ai\frontend
npm run typecheck; npm test; npm run build
```

### Troubleshooting: `/api/health` says `"database": "unavailable"`

```powershell
Set-Location C:\dev\healthsakhi-ai\backend
.\.venv\Scripts\python.exe -m scripts.check_db
```

Read-only, prints no passwords. It shows which `.env` and `DATABASE_URL` the app resolves (and whether a
`DATABASE_URL` environment variable is overriding `.env`), then connects the way Alembic does, the way the app
does, and through `GET /api/health`, printing the real exception and SQLSTATE for any failing step. The server
log also records `health_db_unavailable error=… dbapi_error=… sqlstate=…`.

## Deploying the backend on Render

The schema comes **only** from Alembic migrations (`backend/migrations`); the app never creates tables itself.
A new database therefore needs `alembic upgrade head` before the API can store anything — otherwise requests fail
with `relation "conversations" does not exist`, while a bare connection check still succeeds.

Render web service (Root Directory: `backend`):

| Setting | Value |
|---|---|
| Build Command | `pip install -r requirements.txt` |
| Start Command | `alembic upgrade head && uvicorn app.main:create_app --factory --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |

- `alembic upgrade head` creates only what is missing and never drops data; when the schema is already current it does
  nothing, so running it on every start is safe. If it fails, uvicorn does not start and the previous deploy keeps serving.
  (On paid plans you may instead put `alembic upgrade head` in **Pre-Deploy Command** and keep uvicorn alone as the Start Command.)
- `/api/health` answers 503 (`"database": "unavailable"`) when any required table is missing, and the log line
  `health_schema_missing tables=...` names them — so a database that was never migrated cannot look healthy.
- Environment: `DATABASE_URL` (Render's *Internal* Database URL, with the `postgresql+psycopg://` prefix),
  `ENVIRONMENT=production`, `CORS_ORIGINS=https://<your-frontend>`, `COOKIE_SAMESITE=none`, plus the AI provider key.
- Hospital search: `HOSPITAL_PROVIDER=snapshot` (searches the committed offline copy on the server; the public
  Overpass server often refuses or throttles shared cloud servers) and `OSM_CONTACT=<your email or project URL>`
  (required by the Nominatim usage policy for typed-place lookups). No API key is needed. If the log shows
  `hospital_snapshot_missing` at startup, the copy was not deployed.
- Read-only check of any database (prints no secrets): `python -m scripts.check_schema`.

## Known limitations (so far)

- Rate limiting is per process (in memory); multiple backend instances need a shared store.
- UI translations should be reviewed by native Tamil and Hindi speakers.
- Voice arrives in a later phase; its page shows a "being built" notice and never shows invented data.
- Health tip content has not been reviewed by a clinician or by native Tamil/Hindi speakers yet.
- Hospital finder: public OSM servers have no SLA and fair-use limits; the in-memory cache and Nominatim throttle are
  per process. Specialty data is sparse and unverified (see Phase 5).
