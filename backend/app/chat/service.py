"""Chat orchestration: ownership, context window, provider call, language check, persistence.

Persistence is all-or-nothing: the user's message and the reply are saved together only after the provider
succeeds, so a failed request leaves no half-finished conversation and the client can simply retry.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..ai.language import matches_language
from ..ai.prompts import build_system_prompt, language_reminder
from ..ai.provider import AIProvider, AIProviderError, AIResult, ChatTurn
from ..core.logging import logger
from ..db.base import as_utc, utcnow
from ..db.models import Conversation, Message, User
from ..safety.matcher import SafetyResult, check_text
from ..safety.medication import MEDICINE_NOTE, asks_about_dose_change, redact_doses
from ..safety.messages import emergency_text
from .schemas import ChatRequest

TITLE_CHARS = 60
# Emergency phrases can be split over messages ("I have pain" … "in my chest"): check the latest few together.
RECENT_USER_MESSAGES = 3


class ConversationNotFound(Exception):
    pass


@dataclass(frozen=True)
class Owner:
    user: User | None
    guest_id: uuid.UUID | None

    @property
    def key(self) -> str:
        return f"user:{self.user.id}" if self.user else f"guest:{self.guest_id}"


def _title_from(message: str) -> str:
    first_line = message.splitlines()[0].strip()
    return first_line if len(first_line) <= TITLE_CHARS else first_line[: TITLE_CHARS - 1].rstrip() + "…"


def _load_conversation(db: Session, owner: Owner, conversation_id: uuid.UUID) -> Conversation:
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    if owner.user is not None:
        stmt = stmt.where(Conversation.user_id == owner.user.id)
    else:
        stmt = stmt.where(Conversation.user_id.is_(None), Conversation.guest_id == owner.guest_id)
    conversation = db.scalar(stmt)
    if conversation is None:
        raise ConversationNotFound
    return conversation


_TICK = timedelta(microseconds=1)


def _message_timestamps(db: Session, conversation: Conversation) -> tuple[datetime, datetime]:
    """Strictly increasing timestamps for the next (user, assistant) pair in this conversation.

    History is read back in `created_at` order. The system clock can return the same value for messages written
    microseconds apart (Python 3.11 on Windows has ~1-16 ms resolution), and ties would then be broken by random
    UUIDs — putting a reply before its question, after which the reply is dropped from the model's context.
    """
    last = db.scalar(select(func.max(Message.created_at)).where(Message.conversation_id == conversation.id))
    now = utcnow()
    if last is not None and now <= as_utc(last):
        now = as_utc(last) + _TICK
    return now, now + _TICK


def _context(db: Session, conversation: Conversation | None, limit: int) -> list[ChatTurn]:
    if conversation is None:
        return []
    rows = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(limit)
    ).all()
    turns = [ChatTurn(role=m.role, text=m.message_text) for m in reversed(rows)]  # type: ignore[arg-type]
    # The Messages API expects the conversation to start with a user turn.
    while turns and turns[0].role != "user":
        turns.pop(0)
    return turns


@dataclass(frozen=True)
class SafetyContext:
    safety: SafetyResult  # what this reply acts on (fixed 112 guidance when it is an emergency)
    earlier: SafetyResult  # emergency signs from earlier messages, already answered with fixed guidance
    medication: bool  # the person asks about changing a medicine dose


def assess_safety(message: str, earlier_user_messages: list[str]) -> SafetyContext:
    """Deterministic checks for one chat turn. No AI involved; keyword rules cannot catch every emergency."""
    recent = earlier_user_messages[-(RECENT_USER_MESSAGES - 1) :] if RECENT_USER_MESSAGES > 1 else []
    current = check_text(message)
    earlier = check_text(*recent)
    safety = current
    if not current.is_emergency and not earlier.is_emergency:
        combined = check_text(*recent, message)
        if combined.is_emergency:
            safety = combined  # only visible when the recent messages are read together
    return SafetyContext(safety=safety, earlier=earlier, medication=asks_about_dose_change(message))


def _generate(provider: AIProvider, request: ChatRequest, turns: list[ChatTurn], ctx: SafetyContext) -> AIResult:
    safety = ctx.safety
    system = build_system_prompt(
        request.language,
        safety.categories if safety.is_emergency else None,
        earlier_emergency_categories=ctx.earlier.categories if ctx.earlier.is_emergency else None,
        medication_question=ctx.medication,
    )
    result = provider.generate(system, turns)
    if not matches_language(result.text, request.language):
        # One corrective retry if the reply came back in the wrong script.
        logger.warning("chat_language_mismatch language=%s retrying=1", request.language)
        retry_turns = [*turns, ChatTurn("assistant", result.text), ChatTurn("user", language_reminder(request.language))]
        retry = provider.generate(system, retry_turns)
        if matches_language(retry.text, request.language):
            return retry
        logger.warning("chat_language_mismatch language=%s retrying=0 giving_up=1", request.language)
        return retry
    return result


def handle_chat(
    db: Session, provider: AIProvider, owner: Owner, request: ChatRequest, history_limit: int
) -> tuple[Conversation, Message, Message, SafetyResult]:
    conversation = _load_conversation(db, owner, request.conversation_id) if request.conversation_id else None
    provider_cap = getattr(provider, "max_context_messages", None)
    limit = min(history_limit, provider_cap) if provider_cap else history_limit
    turns = [*_context(db, conversation, limit), ChatTurn("user", request.message)]

    # Deterministic safety rules run first and do not depend on the AI.
    ctx = assess_safety(request.message, [t.text for t in turns[:-1] if t.role == "user"])
    safety = ctx.safety

    started = time.monotonic()
    doses_removed = 0
    try:
        result = _generate(provider, request, turns, ctx)
        # The AI is told never to give doses; enforce it (amounts the person wrote themselves are kept).
        reply_text, doses_removed = redact_doses(result.text, request.message, request.language)
    except AIProviderError as exc:
        if not safety.is_emergency:
            raise  # nothing has been written yet; the client can retry
        # Emergency guidance must never depend on the AI being available.
        logger.warning("chat_ai_error_during_emergency kind=%s", exc.kind)
        result, reply_text = AIResult(text="", model="safety-rules"), ""
    elapsed_ms = int((time.monotonic() - started) * 1000)
    if ctx.medication or doses_removed:
        # Fixed wording, so the medicine warning never depends on the AI remembering it.
        note = MEDICINE_NOTE[request.language]
        reply_text = f"{reply_text}\n\n{note}".strip() if reply_text else note
    if safety.is_emergency:
        # Fixed emergency wording always comes first, ahead of any AI text.
        fixed = emergency_text(request.language, safety.categories)
        reply_text = f"{fixed}\n\n{reply_text}".strip() if reply_text else fixed

    if conversation is None:
        conversation = Conversation(
            user_id=owner.user.id if owner.user else None,
            guest_id=None if owner.user else owner.guest_id,
            title=_title_from(request.message),
            language=request.language,
        )
        db.add(conversation)
        db.flush()
    conversation.language = request.language
    conversation.updated_at = utcnow()

    user_at, reply_at = _message_timestamps(db, conversation)
    user_msg = Message(conversation_id=conversation.id, role="user", message_text=request.message, created_at=user_at)
    db.add(user_msg)
    db.flush()
    reply = Message(conversation_id=conversation.id, role="assistant", message_text=reply_text, created_at=reply_at)
    db.add(reply)
    db.commit()
    db.refresh(user_msg)
    db.refresh(reply)

    # Metadata only — never message text.
    logger.info(
        "chat_reply conversation_id=%s language=%s model=%s latency_ms=%s in_tokens=%s out_tokens=%s chars_in=%s chars_out=%s safety=%s rules=%s earlier_emergency=%s medication=%s doses_removed=%s",
        conversation.id,
        request.language,
        result.model,
        elapsed_ms,
        result.input_tokens,
        result.output_tokens,
        len(request.message),
        len(reply_text),
        safety.level,
        ",".join(safety.rule_ids) or "-",
        ctx.earlier.is_emergency,
        ctx.medication,
        doses_removed,
    )
    return conversation, user_msg, reply, safety
