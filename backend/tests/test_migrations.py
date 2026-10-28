"""The Alembic migration must produce exactly the schema the ORM models describe."""
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.db.base import Base

BACKEND = Path(__file__).resolve().parents[1]


def _config(url: str) -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "migrations"))
    cfg.attributes["database_url"] = url
    cfg.attributes["configure_logger"] = False
    return cfg


def test_upgrade_matches_models_and_downgrade_is_clean(tmp_path):
    url = f"sqlite+pysqlite:///{(tmp_path / 'migrate.db').as_posix()}"
    cfg = _config(url)
    command.upgrade(cfg, "head")

    engine = create_engine(url)
    try:
        insp = inspect(engine)
        assert set(insp.get_table_names()) == set(Base.metadata.tables) | {"alembic_version"}
        for name, table in Base.metadata.tables.items():
            assert {c["name"] for c in insp.get_columns(name)} == {c.name for c in table.columns}, name
            model_indexes = {ix.name for ix in table.indexes}
            assert {ix["name"] for ix in insp.get_indexes(name)} == model_indexes, name
            assert {fk["name"] for fk in insp.get_foreign_keys(name)} == {fk.name for fk in table.foreign_key_constraints}, name

        command.downgrade(cfg, "base")
        assert set(inspect(engine).get_table_names()) == {"alembic_version"}
    finally:
        engine.dispose()


# --- Production schema regressions (Render: tables never created → "relation conversations does not exist") ---
import logging  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import func, select  # noqa: E402

from app.db.models import Conversation, Message  # noqa: E402
from app.db.session import build_engine  # noqa: E402
from app.main import create_app  # noqa: E402
from tests.conftest import CLIENT_HEADERS  # noqa: E402
from tests.fakes import FakeProvider  # noqa: E402

REQUIRED = {"users", "user_sessions", "conversations", "messages", "symptom_assessments"}


def test_models_define_every_table_the_app_needs():
    assert set(Base.metadata.tables) == REQUIRED


def test_unmigrated_database_fails_health_and_names_the_missing_tables(settings, caplog):
    engine = build_engine("sqlite+pysqlite:///:memory:")  # reachable, but no tables — like a fresh Render database
    try:
        with caplog.at_level(logging.ERROR, logger="healthsakhi"), TestClient(create_app(settings, engine)) as c:
            res = c.get("/api/health")
    finally:
        engine.dispose()
    assert res.status_code == 503
    assert res.json()["database"] == "unavailable"
    logged = [r.getMessage() for r in caplog.records if r.getMessage().startswith("health_schema_missing")]
    assert len(logged) == 1
    for table in REQUIRED:
        assert table in logged[0]


def test_migrated_database_passes_health_and_stores_a_chat(tmp_path, settings):
    url = f"sqlite+pysqlite:///{(tmp_path / 'fresh.db').as_posix()}"
    command.upgrade(_config(url), "head")  # the schema comes only from the migration, as on Render
    engine = build_engine(url)
    try:
        app = create_app(settings, engine, ai_provider=FakeProvider())
        with TestClient(app, headers=CLIENT_HEADERS) as c:
            assert c.get("/api/health").status_code == 200
            res = c.post("/api/v1/chat", json={"message": "I have had a headache for two days.", "language": "en"})
        assert res.status_code == 200, res.text
        with engine.connect() as conn:
            assert conn.scalar(select(func.count()).select_from(Conversation)) == 1
            assert conn.scalar(select(func.count()).select_from(Message)) == 2

        # Running the migrations again (every deploy does) is a no-op and keeps the data.
        command.upgrade(_config(url), "head")
        with engine.connect() as conn:
            assert conn.scalar(select(func.count()).select_from(Conversation)) == 1
            assert conn.scalar(select(func.count()).select_from(Message)) == 2
    finally:
        engine.dispose()
