import time
import uuid

import pytest
from sqlalchemy import func, select

from app.db.models import Conversation, Message
from tests.helpers import registered_user_id, seed_conversation

BASE = "/api/v1/conversations"


def test_requires_authentication(make_client):
    c = make_client()
    assert c.get(BASE).status_code == 401
    assert c.get(f"{BASE}/{uuid.uuid4()}").status_code == 401
    assert c.delete(f"{BASE}/{uuid.uuid4()}").status_code == 401


def test_lists_only_own_conversations_newest_first(client, make_client, db):
    me = registered_user_id(client)
    other = registered_user_id(make_client(), email="ravi@example.com")
    first = seed_conversation(db, me, title="First")
    time.sleep(0.01)
    second = seed_conversation(db, me, title="Second")
    seed_conversation(db, other, title="Not mine")
    seed_conversation(db, None, title="Guest")

    res = client.get(BASE)
    assert res.status_code == 200
    assert [c["id"] for c in res.json()] == [str(second), str(first)]


def test_get_own_conversation_with_messages_in_order(client, db):
    me = registered_user_id(client)
    conv = seed_conversation(db, me, texts=("I have a headache", "Here is some general information", "Thanks"))
    res = client.get(f"{BASE}/{conv}")
    assert res.status_code == 200
    body = res.json()
    assert [m["message_text"] for m in body["messages"]] == ["I have a headache", "Here is some general information", "Thanks"]
    assert [m["role"] for m in body["messages"]] == ["user", "assistant", "user"]


def test_cannot_read_or_delete_another_users_conversation(client, make_client, db):
    registered_user_id(client)
    other = registered_user_id(make_client(), email="ravi@example.com")
    theirs = seed_conversation(db, other)

    assert client.get(f"{BASE}/{theirs}").status_code == 404
    assert client.delete(f"{BASE}/{theirs}").status_code == 404
    db.expire_all()
    assert db.get(Conversation, theirs) is not None


def test_cannot_access_guest_conversation_as_user(client, db):
    registered_user_id(client)
    guest_conv = seed_conversation(db, None)
    assert client.get(f"{BASE}/{guest_conv}").status_code == 404


def test_delete_own_conversation_removes_messages(client, db):
    me = registered_user_id(client)
    conv = seed_conversation(db, me)
    assert client.delete(f"{BASE}/{conv}").status_code == 204
    db.expire_all()
    assert db.get(Conversation, conv) is None
    assert db.scalar(select(func.count()).select_from(Message).where(Message.conversation_id == conv)) == 0
    assert client.get(f"{BASE}/{conv}").status_code == 404


@pytest.mark.parametrize("path", [f"{BASE}/not-a-uuid", f"{BASE}?limit=0", f"{BASE}?limit=101", f"{BASE}?offset=-1"])
def test_invalid_parameters(client, path):
    registered_user_id(client)
    assert client.get(path).status_code == 422
