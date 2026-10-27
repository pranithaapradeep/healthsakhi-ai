from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..core.config import Settings
from ..core.logging import logger
from ..db.models import User
from ..db.session import get_db
from . import service
from .deps import get_current_user, get_settings_dep
from .schemas import LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _enforce_limit(request: Request, key: str, limit: int, window: int) -> None:
    allowed, retry_after = request.app.state.rate_limiter.hit(key, limit, window)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="too_many_attempts", headers={"Retry-After": str(retry_after)}
        )


def _set_session_cookie(response: Response, settings: Settings, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def _clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name, path="/", httponly=True, secure=settings.cookie_secure, samesite=settings.cookie_samesite
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    data: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> User:
    _enforce_limit(request, f"register:{_client_ip(request)}", settings.register_rate_limit, settings.register_rate_window_seconds)
    try:
        user = service.register_user(db, data)
    except service.EmailAlreadyRegistered:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_already_registered") from None
    _set_session_cookie(response, settings, service.create_session(db, user, settings.session_ttl_hours))
    logger.info("user_registered user_id=%s", user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> User:
    ip = _client_ip(request)
    _enforce_limit(request, f"login:{ip}:{data.email}", settings.login_rate_limit, settings.login_rate_window_seconds)
    _enforce_limit(request, f"login-ip:{ip}", settings.login_rate_limit * 4, settings.login_rate_window_seconds)
    user = service.authenticate(db, data.email, data.password)
    if user is None:
        # Same response whether the email exists or the password is wrong.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    _set_session_cookie(response, settings, service.create_session(db, user, settings.session_ttl_hours))
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: Session = Depends(get_db), settings: Settings = Depends(get_settings_dep)) -> Response:
    token = request.cookies.get(settings.session_cookie_name)
    if token and len(token) <= 128:
        service.revoke_session(db, token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    _clear_session_cookie(response, settings)
    return response


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
