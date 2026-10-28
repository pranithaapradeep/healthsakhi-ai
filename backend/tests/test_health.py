from app.api.routes.health import VERSION


def test_health_unversioned_and_versioned(client):
    for path in ("/api/health", "/api/v1/health"):
        res = client.get(path)
        assert res.status_code == 200
        assert res.json() == {"status": "ok", "database": "ok", "version": VERSION}


def test_security_headers(client):
    res = client.get("/api/health")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["cache-control"] == "no-store"


def test_cors_allows_only_configured_origin(client):
    preflight = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-hs-client"}
    ok = client.options("/api/v1/auth/login", headers={"Origin": "http://localhost:5173", **preflight})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert ok.headers.get("access-control-allow-credentials") == "true"

    bad = client.options("/api/v1/auth/login", headers={"Origin": "https://evil.example", **preflight})
    assert "access-control-allow-origin" not in bad.headers


def test_openapi_docs_available(client):
    res = client.get("/api/openapi.json")
    assert res.status_code == 200
    paths = res.json()["paths"]
    assert "/api/v1/auth/login" in paths and "/api/v1/conversations/{conversation_id}" in paths


# --- Regression tests: database health reporting -------------------------------------------------------------
import logging  # noqa: E402

import psycopg  # noqa: E402
import pytest  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import ENV_FILE, Settings  # noqa: E402
from app.db.session import build_engine  # noqa: E402
from app.main import create_app  # noqa: E402

UNREACHABLE_SECRET = "hunter2-not-a-real-password"
# Port 1 on loopback: nothing listens there, so the connection is refused quickly. No real database is touched.
UNREACHABLE_URL = f"postgresql+psycopg://healthsakhi:{UNREACHABLE_SECRET}@127.0.0.1:1/healthsakhi_test?connect_timeout=3"


def _class_and_subclass_names(cls: type) -> set[str]:
    names, stack = set(), [cls]
    while stack:
        c = stack.pop()
        names.add(c.__name__)
        stack.extend(c.__subclasses__())
    return names


def test_health_reports_unreachable_database_with_cause_and_no_secrets(settings, caplog):
    engine = build_engine(UNREACHABLE_URL)
    try:
        app = create_app(settings, engine)
        with caplog.at_level(logging.WARNING, logger="healthsakhi"), TestClient(app) as c:
            res = c.get("/api/health")
    finally:
        engine.dispose()

    assert res.status_code == 503
    assert res.json() == {"status": "degraded", "database": "unavailable", "version": VERSION}
    # The log names the actual failure classes so the cause can be diagnosed. The exact driver class varies by
    # platform (e.g. psycopg raises ConnectionTimeout on Windows, a subclass of OperationalError), so check the
    # class hierarchy rather than one spelling.
    records = [r for r in caplog.records if r.getMessage().startswith("health_db_unavailable")]
    assert len(records) == 1
    sa_error, dbapi_name, _sqlstate = records[0].args
    assert sa_error == "OperationalError"
    assert dbapi_name in _class_and_subclass_names(psycopg.OperationalError)
    # ...without leaking credentials anywhere.
    assert UNREACHABLE_SECRET not in caplog.text
    assert UNREACHABLE_SECRET not in res.text


def test_health_does_not_mask_non_database_errors_as_database_outage(app):
    class Broken:
        def execute(self, *_a, **_k):
            raise RuntimeError("bug unrelated to the database")

        def close(self) -> None:
            pass

    app.state.session_factory = Broken
    with TestClient(app, raise_server_exceptions=False) as c:
        res = c.get("/api/health")
    assert res.status_code == 500
    assert res.json() == {"detail": "internal_error"}


def test_settings_read_backend_env_regardless_of_working_directory(tmp_path, monkeypatch):
    assert ENV_FILE.is_absolute()
    assert ENV_FILE == Settings.model_config["env_file"]
    assert ENV_FILE.parent.joinpath("app", "main.py").exists()  # i.e. ENV_FILE lives in the backend folder

    # A different .env in the current working directory must NOT be picked up.
    wrong = "sqlite:///from-wrong-directory.db"
    (tmp_path / ".env").write_text(f"DATABASE_URL={wrong}\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    if ENV_FILE.exists():
        assert Settings().database_url != wrong  # type: ignore[call-arg]
    else:
        with pytest.raises(ValidationError):  # no backend/.env: nothing loaded, and certainly not the wrong file
            Settings()  # type: ignore[call-arg]


def test_environment_variable_overrides_env_file(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@localhost:5432/from_env_var")
    assert Settings().database_url.endswith("/from_env_var")  # type: ignore[call-arg]


VERCEL = "https://healthsakhi-ai.vercel.app"


def _deployed_app(settings, engine):
    # The production frontend origin, as set in Render's CORS_ORIGINS (plus local development).
    return create_app(settings.model_copy(update={"cors_origins": f"{VERCEL}, http://localhost:5173"}), engine)


def test_cors_allows_the_deployed_frontend_with_credentials(settings, engine):
    app = _deployed_app(settings, engine)
    with TestClient(app) as c:
        pre = c.options(
            "/api/v1/chat",
            headers={"Origin": VERCEL, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-hs-client"},
        )
        assert pre.status_code == 200
        assert pre.headers["access-control-allow-origin"] == VERCEL  # exact origin, never "*"
        assert pre.headers["access-control-allow-credentials"] == "true"
        allowed = pre.headers["access-control-allow-headers"].lower()
        assert "x-hs-client" in allowed and "content-type" in allowed
        assert "POST" in pre.headers["access-control-allow-methods"]

        me = c.get("/api/v1/auth/me", headers={"Origin": VERCEL})  # 401 for a guest, but readable by the page
        assert me.headers["access-control-allow-origin"] == VERCEL
        assert me.headers["access-control-allow-credentials"] == "true"

        other = c.options("/api/v1/chat", headers={"Origin": "https://healthsakhi-ai-evil.vercel.app", "Access-Control-Request-Method": "POST"})
        assert "access-control-allow-origin" not in other.headers


def test_csrf_rejection_and_server_errors_still_carry_cors_headers(settings, engine):
    app = _deployed_app(settings, engine)

    @app.get("/api/v1/_boom")
    def _boom() -> None:
        raise RuntimeError("internal secret detail")

    with TestClient(app, raise_server_exceptions=False) as c:
        forbidden = c.post("/api/v1/safety/check", json={"text": "hi", "language": "en"}, headers={"Origin": VERCEL})  # no X-HS-Client
        assert forbidden.status_code == 403
        assert forbidden.headers["access-control-allow-origin"] == VERCEL

        boom = c.get("/api/v1/_boom", headers={"Origin": VERCEL, "X-HS-Client": "web"})
        assert boom.status_code == 500
        assert boom.json() == {"detail": "internal_error"}
        assert "secret" not in boom.text
        assert boom.headers["access-control-allow-origin"] == VERCEL
        assert boom.headers["x-content-type-options"] == "nosniff"  # security headers still applied

