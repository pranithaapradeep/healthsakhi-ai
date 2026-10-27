import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.db.models import Conversation, Message, SymptomAssessment, User


def _user(**kw) -> User:
    return User(display_name="A", email=kw.pop("email", f"{uuid.uuid4().hex}@example.com"), password_hash=hash_password("x" * 8), **kw)


@pytest.mark.parametrize(
    "factory",
    [
        lambda: _user(preferred_language="fr"),
        lambda: _user(email="Upper@Example.com"),
        lambda: Conversation(language="en"),  # no owner
        lambda: Conversation(user_id=None, guest_id=uuid.uuid4(), language="de"),
        lambda: SymptomAssessment(guest_id=uuid.uuid4(), language="en", status="unknown", answers={}),
        lambda: SymptomAssessment(guest_id=uuid.uuid4(), language="en", current_step=-1, answers={}),
    ],
)
def test_database_constraints(db, factory):
    db.add(factory())
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_message_constraints(db):
    conv = Conversation(guest_id=uuid.uuid4(), language="ta")
    db.add(conv)
    db.commit()
    for bad in (Message(conversation_id=conv.id, role="system", message_text="x"), Message(conversation_id=conv.id, role="user", message_text="")):
        db.add(bad)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_unique_email(db):
    db.add(_user(email="same@example.com"))
    db.commit()
    db.add(_user(email="same@example.com"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_native_scripts_round_trip(db):
    conv = Conversation(guest_id=uuid.uuid4(), language="ta", title="தலைவலி")
    db.add(conv)
    db.flush()
    db.add_all(
        [
            Message(conversation_id=conv.id, role="user", message_text="எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது."),
            Message(conversation_id=conv.id, role="user", message_text="मुझे दो दिनों से सिरदर्द है।"),
        ]
    )
    db.commit()
    db.expire_all()
    texts = [m.message_text for m in db.get(Conversation, conv.id).messages]
    assert texts == ["எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.", "मुझे दो दिनों से सिरदर्द है।"]
