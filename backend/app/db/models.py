from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    false,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow

LANGUAGES = ("en", "ta", "hi")
MESSAGE_ROLES = ("user", "assistant")
ASSESSMENT_STATUSES = ("in_progress", "completed", "escalated", "abandoned")

JSONType = JSON().with_variant(JSONB(), "postgresql")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def _created() -> Any:
    return mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)


def _updated() -> Any:
    return mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(_in("preferred_language", LANGUAGES), name="preferred_language_valid"),
        CheckConstraint("email = lower(email)", name="email_lowercase"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(2), nullable=False, default="en", server_default="en")
    voice_autoplay: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    sessions: Mapped[list[UserSession]] = relationship(back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    conversations: Mapped[list[Conversation]] = relationship(back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    assessments: Mapped[list[SymptomAssessment]] = relationship(back_populates="user", cascade="all, delete-orphan", passive_deletes=True)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # SHA-256 of the cookie token; the token itself is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = _created()
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    user: Mapped[User] = relationship(back_populates="sessions")


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint(_in("language", LANGUAGES), name="language_valid"),
        CheckConstraint("user_id IS NOT NULL OR guest_id IS NOT NULL", name="has_owner"),
        Index("ix_conversations_user_id_updated_at", "user_id", "updated_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    # Random id from a guest cookie, so guests can continue a conversation without an account.
    guest_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")
    language: Mapped[str] = mapped_column(String(2), nullable=False)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    user: Mapped[User | None] = relationship(back_populates="conversations")
    messages: Mapped[list[Message]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", passive_deletes=True, order_by="Message.created_at"
    )


class Message(Base):
    """Chat text only. Not a medical record; no structured health data is extracted or stored here."""

    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(_in("role", MESSAGE_ROLES), name="role_valid"),
        CheckConstraint("length(message_text) > 0", name="text_not_empty"),
        Index("ix_messages_conversation_id_created_at", "conversation_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = _created()

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class SymptomAssessment(Base):
    """Progress and outcome of a guided symptom check (workflow implemented in Phase 4)."""

    __tablename__ = "symptom_assessments"
    __table_args__ = (
        CheckConstraint(_in("language", LANGUAGES), name="language_valid"),
        CheckConstraint(_in("status", ASSESSMENT_STATUSES), name="status_valid"),
        CheckConstraint("current_step >= 0", name="step_non_negative"),
        CheckConstraint("user_id IS NOT NULL OR guest_id IS NOT NULL", name="has_owner"),
        Index("ix_symptom_assessments_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    guest_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    language: Mapped[str] = mapped_column(String(2), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="in_progress", server_default="in_progress")
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    answers: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False, default=dict)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONType, nullable=True)
    emergency_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User | None] = relationship(back_populates="assessments")
