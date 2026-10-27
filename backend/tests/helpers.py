from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import Conversation, Message

PASSWORD = "correct-horse-battery"


def register(client: TestClient, email: str = "asha@example.com", password: str = PASSWORD, name: str = "Asha", lang: str = "ta"):
    return client.post(
        "/api/v1/auth/register",
        json={"display_name": name, "email": email, "password": password, "preferred_language": lang},
    )


def registered_user_id(client: TestClient, email: str = "asha@example.com") -> uuid.UUID:
    res = register(client, email=email)
    assert res.status_code == 201, res.text
    return uuid.UUID(res.json()["id"])


def seed_conversation(db: Session, user_id: uuid.UUID | None, title: str = "Headache", texts: tuple[str, ...] = ("hi", "hello")) -> uuid.UUID:
    conv = Conversation(user_id=user_id, guest_id=None if user_id else uuid.uuid4(), title=title, language="en")
    db.add(conv)
    db.flush()
    for i, text in enumerate(texts):
        db.add(Message(conversation_id=conv.id, role="user" if i % 2 == 0 else "assistant", message_text=text))
    db.commit()
    return conv.id
