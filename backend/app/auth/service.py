from __future__ import annotations

from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.security import hash_password, hash_token, new_session_token, password_needs_rehash, verify_password
from ..db.base import as_utc, utcnow
from ..db.models import User, UserSession
from .schemas import RegisterRequest


class EmailAlreadyRegistered(Exception):
    pass


def register_user(db: Session, data: RegisterRequest) -> User:
    if db.scalar(select(User.id).where(User.email == data.email)) is not None:
        raise EmailAlreadyRegistered
    user = User(
        display_name=data.display_name,
        email=data.email,
        password_hash=hash_password(data.password),
        preferred_language=data.preferred_language,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:  # concurrent registration with the same email
        db.rollback()
        raise EmailAlreadyRegistered from exc
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    # verify_password runs against a dummy hash when the user does not exist, so timing is similar.
    if not verify_password(user.password_hash if user else None, password) or user is None:
        return None
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        db.commit()
    return user


def create_session(db: Session, user: User, ttl_hours: int) -> str:
    token = new_session_token()
    db.add(UserSession(user_id=user.id, token_hash=hash_token(token), expires_at=utcnow() + timedelta(hours=ttl_hours)))
    db.commit()
    return token


def user_for_token(db: Session, token: str) -> User | None:
    session = db.scalar(select(UserSession).where(UserSession.token_hash == hash_token(token)))
    if session is None:
        return None
    if as_utc(session.expires_at) <= utcnow():
        db.delete(session)
        db.commit()
        return None
    return session.user


def revoke_session(db: Session, token: str) -> None:
    db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
    db.commit()


def delete_user(db: Session, user: User) -> None:
    """Deletes the account; sessions, conversations, messages and assessments cascade in the database."""
    db.delete(user)
    db.commit()
