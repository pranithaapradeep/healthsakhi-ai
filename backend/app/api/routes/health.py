from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ...core.logging import logger
from ...db import models  # noqa: F401  (registers every table on Base.metadata)
from ...db.base import Base
from ...db.session import get_db
from ..schemas import HealthOut

router = APIRouter(tags=["health"])
VERSION = "0.5.0"


@router.get("/health", response_model=HealthOut)
def health(response: Response, db: Session = Depends(get_db)) -> HealthOut:
    try:
        db.execute(text("SELECT 1"))
        # Reachable is not enough: the tables must exist too. A database that was never migrated
        # ("alembic upgrade head") answers SELECT 1 but fails every real request.
        missing = sorted(set(Base.metadata.tables) - set(inspect(db.get_bind()).get_table_names()))
    except SQLAlchemyError as exc:
        # Only database errors mean "database unavailable"; anything else is a bug and must surface as a 500.
        # Log the error classes and SQLSTATE only — driver messages can contain host/user details.
        orig = getattr(exc, "orig", None)
        logger.warning(
            "health_db_unavailable error=%s dbapi_error=%s sqlstate=%s",
            type(exc).__name__,
            type(orig).__name__ if orig is not None else None,
            getattr(orig, "sqlstate", None),
        )
        response.status_code = 503
        return HealthOut(status="degraded", database="unavailable", version=VERSION)
    if missing:
        # Table names only (no connection details). The fix is to run the migrations, never create_all.
        logger.error("health_schema_missing tables=%s action=run_alembic_upgrade_head", ",".join(missing))
        response.status_code = 503
        return HealthOut(status="degraded", database="unavailable", version=VERSION)
    return HealthOut(status="ok", database="ok", version=VERSION)
