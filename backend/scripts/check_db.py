"""Diagnose the database connection exactly as the running app does. Prints no secrets.

Run from the backend folder:
    .venv\\Scripts\\python.exe -m scripts.check_db

Read-only: runs SELECT queries and GET /api/health. Never creates, alters or deletes anything.
"""
from __future__ import annotations

import os
import sys
import traceback

from sqlalchemy import create_engine, pool, text
from sqlalchemy.engine import make_url

SECRET: str | None = None


def scrub(value: object) -> str:
    s = str(value)
    return s.replace(SECRET, "***") if SECRET else s


def redact(url: str) -> str:
    try:
        return make_url(url).render_as_string(hide_password=True)
    except Exception:  # noqa: BLE001
        return "<unparseable URL>"


def describe(exc: BaseException) -> None:
    seen = 0
    while exc is not None and seen < 5:
        sqlstate = getattr(exc, "sqlstate", None)
        print(f"    {type(exc).__module__}.{type(exc).__name__}" + (f" [SQLSTATE {sqlstate}]" if sqlstate else ""))
        for line in scrub(exc).strip().splitlines()[:6]:
            print(f"      {line}")
        exc = exc.__cause__ or exc.__context__  # type: ignore[assignment]
        seen += 1


def url_shape(label: str, url: str) -> None:
    """Describe the connection URL's parts WITHOUT printing the password: only its length and red flags."""
    from urllib.parse import unquote

    try:
        u = make_url(url)
    except Exception as exc:  # noqa: BLE001
        print(f"  {label}: cannot be parsed ({type(exc).__name__})")
        return
    print(f"  {label}: driver={u.drivername} user={u.username!r} host={u.host!r} port={u.port} database={u.database!r}")
    pw = u.password
    if pw is None:
        print("    password: MISSING from the URL")
        return
    pw = str(pw)
    raw = url.split("://", 1)[-1].rsplit("@", 1)[0].split(":", 1)[-1] if "@" in url else ""
    flags = []
    if pw != pw.strip():
        flags.append("starts/ends with a space")
    if pw and (pw[0] in "\"'" or pw[-1] in "\"'"):
        flags.append("starts/ends with a quote character")
    if any(c in raw for c in "@/?#[] "):
        flags.append("contains @ / ? # [ ] or space that should be percent-encoded in a URL")
    if "%" in raw and unquote(raw) != raw:
        flags.append("is percent-encoded (fine if intended: e.g. %40 means @)")
    if url.count("@") > 1:
        flags.append("the URL has more than one @ (an unencoded @ in the password breaks parsing)")
    print(f"    password: present, {len(pw)} characters" + ("" if not flags else " — CHECK: " + "; ".join(flags)))


def env_file_shape(path) -> None:  # type: ignore[no-untyped-def]
    """Look at backend/.env's DATABASE_URL line(s) without printing them."""
    data = path.read_bytes()
    print("  .env encoding:", "UTF-16 (Notepad 'Unicode' — not supported, save as UTF-8)" if data[:2] in (b"\xff\xfe", b"\xfe\xff")
          else "UTF-8 with BOM" if data[:3] == b"\xef\xbb\xbf" else "UTF-8 / ASCII")
    lines = data.decode("utf-8-sig", errors="replace").splitlines()
    hits = [ln for ln in lines if ln.strip().startswith("DATABASE_URL")]
    print(f"  DATABASE_URL lines in .env: {len(hits)}" + (" — CHECK: more than one; the LAST one wins" if len(hits) > 1 else ""))
    for ln in hits:
        value = ln.split("=", 1)[1] if "=" in ln else ""
        notes = []
        if value != value.strip():
            notes.append("spaces around the value")
        if value.strip() and value.strip()[0] in "\"'":
            notes.append("value is quoted")
        if " #" in value:
            notes.append("contains ' #' — anything after it is treated as a comment")
        print("    line:", ", ".join(notes) if notes else "no formatting problems found")
    pg = sorted(k for k in os.environ if k.startswith("PG"))
    print("  PG* environment variables set (names only):", pg or "none")


def step(title: str, fn) -> bool:  # type: ignore[no-untyped-def]
    print(f"\n[{title}]")
    try:
        fn()
        print("  OK")
        return True
    except Exception as exc:  # noqa: BLE001
        print("  FAILED")
        describe(exc)
        return False


def main() -> int:
    global SECRET
    import psycopg
    import sqlalchemy

    from app.core.config import ENV_FILE, Settings

    print("python       :", sys.executable)
    print("virtualenv   :", sys.prefix != sys.base_prefix)
    print("cwd          :", os.getcwd())
    print("sqlalchemy   :", sqlalchemy.__version__, "| psycopg:", psycopg.__version__, "| libpq:", psycopg.pq.version())
    print(".env file    :", ENV_FILE, "| exists:", ENV_FILE.exists())

    env_override = os.environ.get("DATABASE_URL")
    print("DATABASE_URL in process environment (overrides .env):", env_override is not None)
    if env_override is not None:
        print("  environment value:", redact(env_override))

    settings = Settings()  # type: ignore[call-arg]
    url = settings.database_url
    SECRET = make_url(url).password or None
    print("effective URL:", redact(url))
    print("\n[0. Connection settings — shape only, no secret values]")
    url_shape("effective URL", url)
    if ENV_FILE.exists():
        env_file_shape(ENV_FILE)
    try:
        from dotenv import dotenv_values

        file_url = dotenv_values(ENV_FILE).get("DATABASE_URL") if ENV_FILE.exists() else None
        print("effective URL equals backend/.env value:", file_url == url)
    except ImportError:
        pass

    def alembic_style() -> None:
        eng = create_engine(url, poolclass=pool.NullPool)
        try:
            with eng.connect() as conn:
                row = conn.execute(
                    text("SELECT current_database(), current_user, inet_server_addr()::text, inet_server_port(), version()")
                ).one()
                print(f"  database={row[0]} user={row[1]} server={row[2]}:{row[3]}")
                print(f"  {row[4].split(',')[0]}")
                print("  alembic_version:", conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one_or_none())
        finally:
            eng.dispose()

    def app_engine() -> None:
        from app.db.session import build_engine, build_session_factory

        eng = build_engine(url)
        try:
            with build_session_factory(eng)() as session:
                session.execute(text("SELECT 1"))
        finally:
            eng.dispose()

    def app_health() -> None:
        from fastapi.testclient import TestClient

        from app.main import create_app

        app = create_app(settings)
        try:
            with TestClient(app) as client:
                res = client.get("/api/health")
            print(f"  HTTP {res.status_code} {res.json()}")
            if res.status_code != 200:
                raise RuntimeError("health endpoint reported a problem (see warning line above)")
        finally:
            app.state.engine.dispose()

    results = [
        step("1. Connect like Alembic (NullPool)", alembic_style),
        step("2. Connect through the app's engine and session", app_engine),
        step("3. GET /api/health through the real app", app_health),
    ]
    print("\nSUMMARY:", "all checks passed" if all(results) else "see FAILED steps above")
    if all(results):
        print("If a running server still reports 'degraded', it was started with different settings:")
        print("restart uvicorn from the backend folder, and check for a DATABASE_URL environment variable in that shell.")
    return 0 if all(results) else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:  # noqa: BLE001
        print(scrub(traceback.format_exc()))
        sys.exit(2)
