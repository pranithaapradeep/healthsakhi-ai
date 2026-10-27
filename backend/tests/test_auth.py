from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.base import utcnow
from app.db.models import User, UserSession
from app.main import create_app
from tests.conftest import CLIENT_HEADERS
from tests.helpers import PASSWORD, register

ME = "/api/v1/auth/me"
LOGIN = "/api/v1/auth/login"
LOGOUT = "/api/v1/auth/logout"


def test_register_creates_user_and_session_cookie(client):
    res = register(client, email="Asha@Example.COM")
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "asha@example.com"
    assert body["display_name"] == "Asha"
    assert body["preferred_language"] == "ta"
    assert not {"password", "password_hash"} & body.keys()

    cookie = res.headers["set-cookie"].lower()
    assert "hs_session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie and "path=/" in cookie
    assert client.get(ME).json()["email"] == "asha@example.com"


def test_password_is_stored_only_as_argon2id_hash(client, db):
    register(client)
    user = db.scalar(select(User))
    assert user.password_hash.startswith("$argon2id$")
    assert PASSWORD not in user.password_hash


def test_session_token_is_stored_hashed(client, db):
    res = register(client)
    token = res.cookies.get("hs_session") or client.cookies.get("hs_session")
    stored = db.scalar(select(UserSession))
    assert token and stored.token_hash != token and len(stored.token_hash) == 64


def test_duplicate_email_is_rejected_case_insensitively(client, make_client):
    assert register(client, email="asha@example.com").status_code == 201
    res = register(make_client(), email="ASHA@example.com")
    assert res.status_code == 409
    assert res.json()["detail"] == "email_already_registered"


@pytest.mark.parametrize(
    "payload",
    [
        {"display_name": "A", "email": "not-an-email", "password": PASSWORD},
        {"display_name": "A", "email": "a@example.com", "password": "short7!"},
        {"display_name": "A", "email": "a@example.com", "password": "x" * 129},
        {"display_name": "A", "email": "a@example.com", "password": PASSWORD, "preferred_language": "fr"},
        {"display_name": "   ", "email": "a@example.com", "password": PASSWORD},
        {"display_name": "A\u0000B", "email": "a@example.com", "password": PASSWORD},
        {"display_name": "x" * 81, "email": "a@example.com", "password": PASSWORD},
        {"display_name": "A", "email": "a@example.com", "password": PASSWORD, "is_admin": True},
        {"email": "a@example.com", "password": PASSWORD},
    ],
)
def test_register_validation(client, payload):
    assert client.post("/api/v1/auth/register", json=payload).status_code == 422


def test_validation_errors_do_not_echo_submitted_password(client):
    res = client.post("/api/v1/auth/register", json={"display_name": "A", "email": "a@example.com", "password": "Sekr3t!"})
    assert res.status_code == 422
    assert "Sekr3t!" not in res.text


def test_login_logout_flow(client, make_client):
    register(client)
    fresh = make_client()
    res = fresh.post(LOGIN, json={"email": "ASHA@example.com", "password": PASSWORD})
    assert res.status_code == 200
    assert fresh.get(ME).status_code == 200

    assert fresh.post(LOGOUT).status_code == 204
    assert fresh.get(ME).status_code == 401


def test_logout_revokes_the_token_server_side(client, make_client):
    register(client)
    token = client.cookies.get("hs_session")
    assert client.post(LOGOUT).status_code == 204

    replay = make_client()
    replay.cookies.set("hs_session", token)
    assert replay.get(ME).status_code == 401


def test_wrong_password_and_unknown_email_get_identical_responses(client, make_client):
    register(client)
    wrong = make_client().post(LOGIN, json={"email": "asha@example.com", "password": "wrong-password"})
    unknown = make_client().post(LOGIN, json={"email": "nobody@example.com", "password": "wrong-password"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "invalid_credentials"}
    assert "set-cookie" not in wrong.headers


def test_me_requires_authentication(make_client):
    assert make_client().get(ME).status_code == 401


def test_forged_token_is_rejected(make_client):
    c = make_client()
    c.cookies.set("hs_session", "forged-token-value")
    assert c.get(ME).status_code == 401


def test_expired_session_is_rejected_and_removed(client, db):
    register(client)
    session = db.scalar(select(UserSession))
    session.expires_at = utcnow() - timedelta(minutes=1)
    db.commit()
    assert client.get(ME).status_code == 401
    db.expire_all()
    assert db.scalar(select(UserSession)) is None


def test_login_is_rate_limited(client, make_client):
    register(client)
    attacker = make_client()
    for _ in range(5):
        assert attacker.post(LOGIN, json={"email": "asha@example.com", "password": "guess-guess"}).status_code == 401
    blocked = attacker.post(LOGIN, json={"email": "asha@example.com", "password": PASSWORD})
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) >= 1


def test_registration_is_rate_limited(settings, engine):
    app = create_app(settings.model_copy(update={"register_rate_limit": 2}), engine)
    with TestClient(app, headers=CLIENT_HEADERS) as c:
        assert register(c, email="a1@example.com").status_code == 201
        assert register(c, email="a2@example.com").status_code == 201
        assert register(c, email="a3@example.com").status_code == 429


def test_state_changing_requests_require_client_header(app):
    with TestClient(app) as bare:
        res = bare.post(LOGIN, json={"email": "asha@example.com", "password": PASSWORD})
        assert res.status_code == 403
        assert res.json()["detail"] == "missing_client_header"
        assert bare.get("/api/health").status_code == 200  # safe methods are unaffected
