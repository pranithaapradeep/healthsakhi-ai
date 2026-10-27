from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..core.config import Settings
from ..db.models import User
from ..db.session import get_db
from . import service


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(request.app.state.settings.session_cookie_name)
    if not token or len(token) > 128:
        return None
    return service.user_for_token(db, token)


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not_authenticated")
    return user
