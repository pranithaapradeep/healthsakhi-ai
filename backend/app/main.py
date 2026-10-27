"""HealthSakhi AI backend.

Run in development:  uvicorn app.main:create_app --factory --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Engine

from .ai.factory import build_provider
from .ai.provider import AIProvider
from .api.router import api_root, api_v1
from .core.config import Settings, get_settings
from .core.errors import register_error_handlers
from .core.logging import configure_logging
from .core.middleware import BodySizeLimitMiddleware, ClientHeaderMiddleware, SecurityHeadersMiddleware
from .core.ratelimit import RateLimiter
from .hospitals.factory import build_hospital_provider, build_place_suggester
from .hospitals.provider import HospitalProvider
from .hospitals.suggest import PlaceSuggester
from .db.session import build_engine, build_session_factory


def create_app(
    settings: Settings | None = None,
    engine: Engine | None = None,
    ai_provider: AIProvider | None = None,
    hospital_provider: HospitalProvider | None = None,
    place_suggester: PlaceSuggester | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    app = FastAPI(
        title="HealthSakhi AI API",
        version="0.5.0",
        description="General health information and navigation. Not a diagnostic or prescribing service.",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    engine = engine or build_engine(settings.database_url)
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = build_session_factory(engine)
    app.state.rate_limiter = RateLimiter()
    # The AI provider is server-side only; tests inject a fake so no paid API calls are made.
    app.state.ai_provider = ai_provider or build_provider(settings)
    app.state.hospital_provider = hospital_provider or build_hospital_provider(settings)
    app.state.place_suggester = place_suggester or build_place_suggester(settings)

    register_error_handlers(app)
    app.include_router(api_root)
    app.include_router(api_v1)

    # Starlette runs the last-added middleware first. Order (outer → inner):
    # CORS → security headers → size limit → client header (CSRF) → app
    app.add_middleware(ClientHeaderMiddleware)
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_request_bytes)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-HS-Client"],
        max_age=600,
    )
    return app
