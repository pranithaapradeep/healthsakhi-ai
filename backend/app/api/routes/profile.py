from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ...auth import service
from ...auth.deps import get_current_user
from ...auth.schemas import UserOut
from ...core.logging import logger
from ...core.security import verify_password
from ...db.models import User
from ...db.session import get_db
from ..schemas import DeleteAccountRequest, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserOut)
def get_profile(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("", response_model=UserOut)
def update_profile(data: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    data: DeleteAccountRequest, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Response:
    """Permanently delete the account and all associated conversations, messages, assessments and sessions."""
    settings = request.app.state.settings
    # Same budget as login, so a hijacked session cannot be used to brute-force the password here.
    allowed, retry_after = request.app.state.rate_limiter.hit(
        f"delete-account:{user.id}", settings.login_rate_limit, settings.login_rate_window_seconds
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="too_many_attempts", headers={"Retry-After": str(retry_after)}
        )
    if not verify_password(user.password_hash, data.password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="password_incorrect")
    user_id = user.id
    service.delete_user(db, user)
    logger.info("user_deleted user_id=%s", user_id)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(settings.session_cookie_name, path="/", httponly=True, secure=settings.cookie_secure, samesite=settings.cookie_samesite)
    return response
