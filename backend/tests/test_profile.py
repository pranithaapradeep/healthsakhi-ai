import pytest
from sqlalchemy import func, select

from app.db.models import Conversation, Message, SymptomAssessment, User, UserSession
from tests.helpers import PASSWORD, registered_user_id, seed_conversation

PROFILE = "/api/v1/profile"


@pytest.mark.parametrize(
    "method,kwargs",
    [("get", {}), ("patch", {"json": {"preferred_language": "hi"}}), ("delete", {"json": {"password": PASSWORD}})],
)
def test_profile_requires_authentication(make_client, method, kwargs):
    res = make_client().request(method.upper(), PROFILE, **kwargs)
    assert res.status_code == 401


def test_get_and_update_profile(client):
    registered_user_id(client)
    assert client.get(PROFILE).json()["preferred_language"] == "ta"

    res = client.patch(PROFILE, json={"preferred_language": "hi", "display_name": "  Asha V  ", "voice_autoplay": True})
    assert res.status_code == 200
    body = client.get(PROFILE).json()
    assert body["preferred_language"] == "hi"
    assert body["display_name"] == "Asha V"
    assert body["voice_autoplay"] is True


@pytest.mark.parametrize(
    "payload",
    [{"preferred_language": "fr"}, {"email": "new@example.com"}, {"password_hash": "x"}, {"display_name": ""}, {"voice_autoplay": "maybe"}],
)
def test_profile_update_validation(client, payload):
    registered_user_id(client)
    assert client.patch(PROFILE, json=payload).status_code == 422


def test_delete_account_requires_correct_password(client, db):
    registered_user_id(client)
    res = client.request("DELETE", PROFILE, json={"password": "not-my-password"})
    assert res.status_code == 403
    assert db.scalar(select(func.count()).select_from(User)) == 1
    assert client.get(PROFILE).status_code == 200


def test_delete_account_removes_all_user_data(client, make_client, db):
    user_id = registered_user_id(client)
    other_id = registered_user_id(make_client(), email="ravi@example.com")
    conv_id = seed_conversation(db, user_id)
    other_conv = seed_conversation(db, other_id)
    db.add(SymptomAssessment(user_id=user_id, conversation_id=conv_id, language="en", answers={"duration": "2 days"}))
    db.commit()

    res = client.request("DELETE", PROFILE, json={"password": PASSWORD})
    assert res.status_code == 204
    assert client.get(PROFILE).status_code == 401

    db.expire_all()
    assert db.get(User, user_id) is None
    assert db.scalar(select(func.count()).select_from(UserSession).where(UserSession.user_id == user_id)) == 0
    assert db.scalar(select(func.count()).select_from(Conversation).where(Conversation.user_id == user_id)) == 0
    assert db.scalar(select(func.count()).select_from(Message).where(Message.conversation_id == conv_id)) == 0
    assert db.scalar(select(func.count()).select_from(SymptomAssessment).where(SymptomAssessment.user_id == user_id)) == 0
    # Other users are untouched.
    assert db.get(User, other_id) is not None
    assert db.get(Conversation, other_conv) is not None


def test_deleted_account_cannot_log_in(client, make_client):
    registered_user_id(client)
    client.request("DELETE", PROFILE, json={"password": PASSWORD})
    res = make_client().post("/api/v1/auth/login", json={"email": "asha@example.com", "password": PASSWORD})
    assert res.status_code == 401


def test_delete_account_password_attempts_are_rate_limited(client, db):
    user_id = registered_user_id(client)
    for _ in range(5):
        assert client.request("DELETE", PROFILE, json={"password": "guess-guess"}).status_code == 403
    blocked = client.request("DELETE", PROFILE, json={"password": PASSWORD})
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) >= 1
    db.expire_all()
    assert db.get(User, user_id) is not None
