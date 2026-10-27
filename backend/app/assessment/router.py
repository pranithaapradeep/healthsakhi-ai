from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..ai.http import http_error_for
from ..ai.provider import AIProviderError
from ..auth.deps import get_optional_user
from ..db.models import User
from . import service
from .schemas import AssessmentRequest, AssessmentResponse

router = APIRouter(prefix="/assessment", tags=["assessment"])


@router.post("", response_model=AssessmentResponse)
def assess(data: AssessmentRequest, request: Request, user: User | None = Depends(get_optional_user)) -> AssessmentResponse:
    """Run one step of the symptom check. Guests allowed. Nothing is stored.

    Emergency red flags are answered immediately by fixed safety rules — before rate limiting and without the AI.
    This is general health information, not a diagnosis, and not a clinically validated triage system.
    """
    provider = request.app.state.ai_provider
    # Emergency guidance is never rate-limited or delayed.
    if service.evaluate_safety(data).is_emergency:
        return service.run_assessment(provider, data)

    settings = request.app.state.settings
    owner = f"user:{user.id}" if user else f"guest:{request.cookies.get(settings.guest_cookie_name) or (request.client.host if request.client else 'unknown')}"
    allowed, retry_after = request.app.state.rate_limiter.hit(f"assess:{owner}", settings.assessment_rate_limit, 60)
    if not allowed:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_requests", headers={"Retry-After": str(retry_after)})

    try:
        return service.run_assessment(provider, data)
    except AIProviderError as exc:
        raise http_error_for(exc, provider, "assessment") from None
