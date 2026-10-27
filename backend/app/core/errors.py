from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .logging import logger


def _sanitize(errors: list[dict]) -> list[dict]:
    # FastAPI's default 422 echoes the submitted value ("input"), which could include a password.
    return [{"loc": list(e.get("loc", ())), "msg": e.get("msg", ""), "type": e.get("type", "")} for e in errors]


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": _sanitize(list(exc.errors()))})

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        # Log the exception type and path only — not the body, headers, or message text.
        logger.error("unhandled_error type=%s path=%s", type(exc).__name__, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "internal_error"})
