"""Initial schema: users, sessions, conversations, messages, symptom assessments.

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-25
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

JSON = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def _ts(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("preferred_language", sa.String(2), server_default="en", nullable=False),
        sa.Column("voice_autoplay", sa.Boolean(), server_default=sa.false(), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.CheckConstraint("preferred_language IN ('en', 'ta', 'hi')", name=op.f("ck_users_preferred_language_valid")),
        sa.CheckConstraint("email = lower(email)", name=op.f("ck_users_email_lowercase")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        _ts("created_at"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_user_sessions_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_user_sessions_token_hash")),
    )
    op.create_index(op.f("ix_user_sessions_user_id"), "user_sessions", ["user_id"])
    op.create_index(op.f("ix_user_sessions_expires_at"), "user_sessions", ["expires_at"])

    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("guest_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(120), server_default="", nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.CheckConstraint("language IN ('en', 'ta', 'hi')", name=op.f("ck_conversations_language_valid")),
        sa.CheckConstraint("user_id IS NOT NULL OR guest_id IS NOT NULL", name=op.f("ck_conversations_has_owner")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_conversations_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_conversations")),
    )
    op.create_index(op.f("ix_conversations_guest_id"), "conversations", ["guest_id"])
    op.create_index("ix_conversations_user_id_updated_at", "conversations", ["user_id", "updated_at"])

    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("message_text", sa.Text(), nullable=False),
        _ts("created_at"),
        sa.CheckConstraint("role IN ('user', 'assistant')", name=op.f("ck_messages_role_valid")),
        sa.CheckConstraint("length(message_text) > 0", name=op.f("ck_messages_text_not_empty")),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], name=op.f("fk_messages_conversation_id_conversations"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_messages")),
    )
    op.create_index("ix_messages_conversation_id_created_at", "messages", ["conversation_id", "created_at"])

    op.create_table(
        "symptom_assessments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("guest_id", sa.Uuid(), nullable=True),
        sa.Column("conversation_id", sa.Uuid(), nullable=True),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("status", sa.String(16), server_default="in_progress", nullable=False),
        sa.Column("current_step", sa.Integer(), server_default="0", nullable=False),
        sa.Column("answers", JSON, nullable=False),
        sa.Column("result", JSON, nullable=True),
        sa.Column("emergency_detected", sa.Boolean(), server_default=sa.false(), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("language IN ('en', 'ta', 'hi')", name=op.f("ck_symptom_assessments_language_valid")),
        sa.CheckConstraint(
            "status IN ('in_progress', 'completed', 'escalated', 'abandoned')", name=op.f("ck_symptom_assessments_status_valid")
        ),
        sa.CheckConstraint("current_step >= 0", name=op.f("ck_symptom_assessments_step_non_negative")),
        sa.CheckConstraint("user_id IS NOT NULL OR guest_id IS NOT NULL", name=op.f("ck_symptom_assessments_has_owner")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_symptom_assessments_user_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            name=op.f("fk_symptom_assessments_conversation_id_conversations"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_symptom_assessments")),
    )
    op.create_index(op.f("ix_symptom_assessments_guest_id"), "symptom_assessments", ["guest_id"])
    op.create_index(op.f("ix_symptom_assessments_conversation_id"), "symptom_assessments", ["conversation_id"])
    op.create_index("ix_symptom_assessments_user_id_created_at", "symptom_assessments", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_table("symptom_assessments")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("user_sessions")
    op.drop_table("users")
