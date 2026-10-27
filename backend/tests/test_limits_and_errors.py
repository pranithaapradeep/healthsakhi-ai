import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from tests.conftest import CLIENT_HEADERS


def test_oversized_request_body_is_rejected(client):
    huge = "x" * (70 * 1024)
    res = client.post("/api/v1/auth/login", content=f'{{"email":"a@example.com","password":"{huge}"}}', headers={"Content-Type": "application/json"})
    assert res.status_code == 413
    assert res.json()["detail"] == "request_too_large"


def test_malformed_json_is_a_validation_error(client):
    res = client.post("/api/v1/auth/login", content="{not json", headers={"Content-Type": "application/json"})
    assert res.status_code == 422


def test_unhandled_errors_return_generic_message(app):
    @app.get("/api/v1/_boom")
    def _boom() -> None:
        raise RuntimeError("internal secret detail")

    with TestClient(app, headers=CLIENT_HEADERS, raise_server_exceptions=False) as c:
        res = c.get("/api/v1/_boom")
    assert res.status_code == 500
    assert res.json() == {"detail": "internal_error"}
    assert "secret" not in res.text and "Traceback" not in res.text


def test_unknown_route_is_404(client):
    assert client.get("/api/v1/does-not-exist").status_code == 404


def _settings(**overrides) -> Settings:
    base = {"_env_file": None, "database_url": "postgresql+psycopg://u:p@localhost/db"}
    return Settings(**{**base, **overrides})  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "overrides",
    [
        {"environment": "production", "cors_origins": "*"},
        {"environment": "production", "cors_origins": "http://insecure.example"},
        {"environment": "production", "cors_origins": ""},
        {"environment": "production", "cors_origins": "https://app.example", "database_url": "sqlite:///x.db"},
    ],
)
def test_unsafe_production_config_is_refused(overrides):
    with pytest.raises(ValidationError):
        _settings(**overrides)


def test_cookie_security_flags():
    assert _settings().cookie_secure is False
    assert _settings(cookie_samesite="none").cookie_secure is True
    assert _settings(environment="production", cors_origins="https://app.example").cookie_secure is True


def test_api_key_is_not_exposed_in_repr():
    s = _settings(anthropic_api_key="sk-ant-should-not-leak")
    assert "sk-ant-should-not-leak" not in repr(s)
