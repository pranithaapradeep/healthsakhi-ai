from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# backend/.env, resolved from this file's location so the app, Alembic and scripts read the same file
# no matter which directory they are started from. Real environment variables still take precedence.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application settings, read from environment variables, then backend/.env."""

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(min_length=1)
    cors_origins: str = "http://localhost:5173"

    session_cookie_name: str = "hs_session"
    session_ttl_hours: int = Field(default=168, ge=1, le=24 * 30)
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    login_rate_limit: int = Field(default=5, ge=1)
    login_rate_window_seconds: int = Field(default=60, ge=1)
    register_rate_limit: int = Field(default=10, ge=1)
    register_rate_window_seconds: int = Field(default=3600, ge=1)
    max_request_bytes: int = Field(default=64 * 1024, ge=1024)

    # AI provider (server-side only). Chosen explicitly; never falls back to another provider or model.
    # SecretStr keeps keys out of reprs and logs.
    ai_provider: Literal["groq", "anthropic", "none"] = "groq"

    groq_api_key: SecretStr | None = None
    groq_model: str = Field(default="openai/gpt-oss-120b", min_length=1)
    groq_reasoning_effort: Literal["low", "medium", "high"] | None = "low"
    groq_max_completion_tokens: int = Field(default=1536, ge=256, le=8192)
    groq_context_messages: int = Field(default=8, ge=2, le=100)

    anthropic_api_key: SecretStr | None = None
    claude_model: str = "claude-sonnet-5-5"
    claude_effort: Literal["low", "medium", "high"] = "medium"
    ai_max_tokens: int = Field(default=2048, ge=256, le=8192)  # includes any thinking tokens
    ai_timeout_seconds: float = Field(default=45, ge=5, le=120)

    # Chat
    chat_history_messages: int = Field(default=20, ge=2, le=100)  # prior messages sent to the model as context
    chat_rate_limit: int = Field(default=10, ge=1)  # per user/guest per window
    chat_rate_window_seconds: int = Field(default=60, ge=1)
    safety_rate_limit: int = Field(default=60, ge=1)  # deterministic safety checks per IP per minute
    assessment_rate_limit: int = Field(default=6, ge=1)  # AI symptom checks per user/guest per minute
    # Hospital search. "osm" = OpenStreetMap (Nominatim + Overpass); point the URLs at self-hosted or paid
    # instances for production. Never falls back to another provider.
    # osm = live Overpass; snapshot = offline OpenStreetMap copy (scripts/build_hospital_snapshot.py); none = off.
    hospital_provider: Literal["osm", "snapshot", "none"] = "osm"
    # Used when the snapshot is missing or cannot answer (e.g. clinics requested but not in the copy). Never on a
    # genuine "no results". The answer always names the source that served it.
    hospital_fallback_provider: Literal["osm", "none"] = "osm"
    # Relative paths are inside the backend folder.
    hospital_snapshot_path: str = "data/hospitals-india.json.gz"
    nominatim_url: str = "https://nominatim.openstreetmap.org"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    # Connect to OSM servers over IPv4 only — for networks where IPv6 to them stalls (see scripts/diagnose_hospitals).
    osm_ipv4_only: bool = False
    osm_contact: str = ""  # email or URL added to the User-Agent, as the OSM usage policies ask
    hospital_rate_limit: int = Field(default=10, ge=1)  # searches (and place lookups) per IP per minute
    # Total budget for one hospital search: waiting for our turn + the Overpass call. The public Overpass server
    # is often slow (20–30 s observed for Chennai in Oct 2026), so the default leaves room for that, but bounded.
    hospital_timeout_seconds: float = Field(default=40, ge=5, le=90)
    nominatim_timeout_seconds: float = Field(default=10, ge=2, le=30)
    hospital_cache_ttl_seconds: int = Field(default=3600, ge=60)

    # Place suggestions while typing. Nominatim's policy forbids autocomplete, so this uses Photon (OSM data,
    # built for search-as-you-type; public instance: "reasonable" use only, no availability guarantee).
    place_suggest_provider: Literal["photon", "none"] = "photon"
    photon_url: str = "https://photon.komoot.io/api"
    place_suggest_rate_limit: int = Field(default=30, ge=1)  # suggestion requests per IP per minute
    place_suggest_timeout_seconds: float = Field(default=4, ge=1, le=15)

    guest_cookie_name: str = "hs_guest"
    guest_ttl_days: int = Field(default=30, ge=1, le=365)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def cookie_secure(self) -> bool:
        # Browsers reject SameSite=None cookies that are not Secure.
        return self.environment == "production" or self.cookie_samesite == "none"

    @model_validator(mode="after")
    def _check_production(self) -> "Settings":
        if self.environment == "production":
            origins = self.cors_origin_list
            if not origins or any(o == "*" or not o.startswith("https://") for o in origins):
                raise ValueError("In production CORS_ORIGINS must list explicit https:// origins (no '*').")
            if self.database_url.startswith("sqlite"):
                raise ValueError("SQLite is not supported in production; use PostgreSQL.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
