from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..ai.http import http_error_for
from ..ai.provider import AIProviderError
from ..auth.deps import get_optional_user
from ..db.models import User
from ..db.session import get_db
from . import service
from .schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

def _guest_id(request: Request, response: Response) -> uuid.UUID:
    settings = request.app.state.settings
    raw = request.cookies.get(settings.guest_cookie_name)
    try:
        if raw and len(raw) <= 64:
            return uuid.UUID(raw)
    except ValueError:
        pass
    guest_id = uuid.uuid4()
    response.set_cookie(
        settings.guest_cookie_name,
        str(guest_id),
        max_age=settings.guest_ttl_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )
    return guest_id


@router.post("", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    request: Request,
    response: Response,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """Send a message and get a reply in the selected language. Works for guests and signed-in users."""
    settings = request.app.state.settings
    owner = service.Owner(user=user, guest_id=None if user else _guest_id(request, response))

    limiter = request.app.state.rate_limiter
    ip = request.client.host if request.client else "unknown"
    for key, limit in ((f"chat:{owner.key}", settings.chat_rate_limit), (f"chat-ip:{ip}", settings.chat_rate_limit * 3)):
        allowed, retry_after = limiter.hit(key, limit, settings.chat_rate_window_seconds)
        if not allowed:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_messages", headers={"Retry-After": str(retry_after)})

    try:
        conversation, user_msg, reply, safety = service.handle_chat(
            db, request.app.state.ai_provider, owner, data, settings.chat_history_messages
        )
    except service.ConversationNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "conversation_not_found") from None
    except AIProviderError as exc:
        db.rollback()
        raise http_error_for(exc, request.app.state.ai_provider, "chat") from None

    return ChatResponse(
        conversation_id=conversation.id,
        language=conversation.language,  # type: ignore[arg-type]
        title=conversation.title,
        user_message=user_msg,  # type: ignore[arg-type]
        assistant_message=reply,  # type: ignore[arg-type]
        emergency=safety.to_dict() if safety.level != "none" else None,
    )
