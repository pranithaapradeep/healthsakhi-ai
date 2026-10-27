"""Test configuration.

By default tests run on an in-memory SQLite database, so no PostgreSQL install and no real data are involved.
Set TEST_DATABASE_URL to run against PostgreSQL; the database name MUST end with `_test` and must differ from
the application's DATABASE_URL, otherwise the run is aborted before anything is touched.
"""
from __future__ import annotations

import os
from collections.abc import Callable, Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db import models  # noqa: F401
from app.db.base import Base
from app.db.session import build_engine
from app.main import create_app

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or "sqlite+pysqlite:///:memory:"
CLIENT_HEADERS = {"X-HS-Client": "web"}


def _assert_safe_test_database(url: str) -> None:
    parsed = make_url(url)
    if parsed.get_backend_name() == "sqlite":
        return
    name = parsed.database or ""
    if not name.endswith("_test"):
        pytest.exit(f"Refusing to run tests on database '{name}': its name must end with '_test'.", returncode=2)
    try:
        app_db = make_url(Settings().database_url).database  # type: ignore[call-arg]
    except Exception:  # noqa: BLE001 — no app config present is fine
        app_db = None
    if app_db == name:
        pytest.exit("TEST_DATABASE_URL points at the application database. Use a separate *_test database.", returncode=2)


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(  # type: ignore[call-arg]
        _env_file=None,
        environment="test",
        database_url=TEST_DATABASE_URL,
        cors_origins="http://localhost:5173",
        # Never use real keys from the environment in tests: no real or paid API calls.
        ai_provider="groq",
        groq_api_key=None,
        anthropic_api_key=None,
        hospital_provider="none",  # tests inject a fake hospital provider; never call real map services
        place_suggest_provider="none",
    )


@pytest.fixture(scope="session")
def engine(settings: Settings) -> Iterator[Engine]:
    _assert_safe_test_database(settings.database_url)
    eng = build_engine(settings.database_url)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture(autouse=True)
def _clean_database(engine: Engine) -> Iterator[None]:
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def app(settings: Settings, engine: Engine) -> FastAPI:
    return create_app(settings, engine)  # fresh rate limiter per test


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app, headers=CLIENT_HEADERS) as c:
        yield c


@pytest.fixture
def make_client(app: FastAPI) -> Iterator[Callable[[], TestClient]]:
    created: list[TestClient] = []

    def _make() -> TestClient:
        c = TestClient(app, headers=CLIENT_HEADERS)
        created.append(c)
        return c

    yield _make
    for c in created:
        c.close()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    with Session(engine, expire_on_commit=False) as session:
        yield session
