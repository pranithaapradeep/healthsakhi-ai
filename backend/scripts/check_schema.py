"""Check whether the database has the schema the app needs. Read-only, and prints no secrets.

Compares the tables the app's models define with the tables that exist, and the database's Alembic revision
with the latest migration in this repository. Never creates, alters or deletes anything.

Run from the backend folder (uses DATABASE_URL from the environment, else backend/.env):
    .venv\\Scripts\\python.exe -m scripts.check_schema

To check the Render database from your PC, set DATABASE_URL for this PowerShell window only (Render dashboard →
your database → "External Database URL", with the driver prefix postgresql+psycopg://), run the script, then close
the window. Do not save that URL in any file.
"""
from __future__ import annotations

import sys
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, pool, text
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.db import models  # noqa: F401  (registers every table on Base.metadata)
from app.db.base import Base

BACKEND = Path(__file__).resolve().parents[1]


def head_revision() -> str:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "migrations"))
    return ScriptDirectory.from_config(cfg).get_current_head() or "?"


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")
    url = Settings().database_url  # type: ignore[call-arg]
    u = make_url(url)
    # Where we are looking, without user name or password.
    print(f"database : {u.get_backend_name()} host={u.host!r} database={u.database!r}")

    engine = create_engine(url, poolclass=pool.NullPool, hide_parameters=True)
    try:
        with engine.connect() as conn:
            existing = set(inspect(conn).get_table_names())
            current = None
            if "alembic_version" in existing:
                current = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED to connect: {type(exc).__name__} (run scripts.check_db for details)")
        return 2
    finally:
        engine.dispose()

    required = set(Base.metadata.tables)
    missing = sorted(required - existing)
    head = head_revision()
    print(f"alembic  : database at {current or 'none (never migrated)'} | latest migration {head}")
    print(f"tables   : {len(required) - len(missing)} of {len(required)} present")
    for name in sorted(required):
        print(f"  {'ok     ' if name in existing else 'MISSING'} {name}")

    if not missing and current == head:
        print("RESULT   : schema is up to date.")
        return 0
    if missing and current == head:
        # Alembic thinks it is done, so 'upgrade head' would do nothing. Do not stamp or drop anything; ask first.
        print("RESULT   : tables are missing although Alembic records the latest revision. Do NOT run 'alembic stamp'.")
        print("           Stop here and investigate before changing anything.")
        return 1
    print("RESULT   : run the migrations:  alembic upgrade head  (creates missing tables; never drops data)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
