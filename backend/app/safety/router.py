from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from .matcher import check_text
from .schemas import SafetyCheckRequest, SafetyOut

router = APIRouter(prefix="/safety", tags=["safety"])


@router.post("/check", response_model=SafetyOut)
def safety_check(data: SafetyCheckRequest, request: Request) -> SafetyOut:
    """Deterministic emergency check of a piece of text. No AI, no login, nothing stored or logged.

    Lets the app show emergency guidance immediately, before (and independently of) any AI reply.
    Not a clinically validated triage system; see docs/safety-rules.md.
    """
    settings = request.app.state.settings
    ip = request.client.host if request.client else "unknown"
    allowed, retry_after = request.app.state.rate_limiter.hit(f"safety-ip:{ip}", settings.safety_rate_limit, 60)
    if not allowed:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_requests", headers={"Retry-After": str(retry_after)})
    return SafetyOut(**check_text(data.text).to_dict())
