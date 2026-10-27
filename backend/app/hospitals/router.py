from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException, Request, status

from ..core.logging import logger
from . import service
from .provider import HospitalProviderError
from .schemas import (
    HospitalSearchRequest,
    HospitalSearchResponse,
    PlaceLookupRequest,
    PlaceOut,
    SuggestionOut,
    SuggestRequest,
    SuggestResponse,
)

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

_ERRORS = {
    "busy": (503, "hospital_provider_busy"),  # our own queue: another search is still running
    "rate_limited": (503, "hospital_provider_rate_limited"),  # the public service said 429
    "overloaded": (503, "hospital_provider_overloaded"),  # the public service is at capacity (502/503), after retries
    "timeout": (504, "hospital_provider_timeout"),
    "unavailable": (503, "hospital_provider_unavailable"),
    "not_configured": (503, "hospital_search_not_configured"),
}


def _limit(request: Request, bucket: str, limit: int) -> None:
    ip = request.client.host if request.client else "unknown"
    allowed, retry_after = request.app.state.rate_limiter.hit(f"{bucket}:{ip}", limit, 60)
    if not allowed:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_requests", headers={"Retry-After": str(retry_after)})


def _provider_error(exc: HospitalProviderError, what: str, provider_name: str) -> HTTPException:
    code_status, code = _ERRORS.get(exc.kind, (503, "hospital_provider_unavailable"))
    # Error kind and a fixed description only — never coordinates, place names or queries.
    logger.warning("%s_error provider=%s kind=%s detail=%s", what, provider_name, exc.kind, exc.detail)
    headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else None
    return HTTPException(code_status, code, headers=headers)


@router.post("/search", response_model=HospitalSearchResponse)
def search_hospitals(data: HospitalSearchRequest, request: Request) -> HospitalSearchResponse:
    """Find hospitals near a location in India. POST keeps coordinates out of URLs and access logs.

    Listings come from the configured data provider (OpenStreetMap by default). Specialties are only those the
    source lists, marked unverified; nothing about capacity or availability is known.
    """
    _limit(request, "hospitals", request.app.state.settings.hospital_rate_limit)
    provider = request.app.state.hospital_provider
    started = time.monotonic()
    try:
        result = service.search(provider, data)
    except service.LocationNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "location_not_found") from None
    except HospitalProviderError as exc:
        raise _provider_error(exc, "hospital_search", provider.name) from None
    # No coordinates, place names or queries in logs.
    logger.info(
        "hospital_search source=%s radius_km=%s specialty=%s clinics=%s results=%s latency_ms=%s",
        result.center.source,
        data.radius_km,
        data.specialty or "-",
        data.include_clinics,
        result.total,
        int((time.monotonic() - started) * 1000),
    )
    return result


@router.post("/resolve", response_model=PlaceOut)
def resolve_place(data: PlaceLookupRequest, request: Request) -> PlaceOut:
    """Turn a typed city, locality, state, PIN code or hospital name into a point (rounded to ~110 m)."""
    _limit(request, "hospitals", request.app.state.settings.hospital_rate_limit)
    provider = request.app.state.hospital_provider
    started = time.monotonic()
    try:
        center = service.resolve(provider, data.query, data.language)
    except service.LocationNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "location_not_found") from None
    except HospitalProviderError as exc:
        raise _provider_error(exc, "place_lookup", provider.name) from None
    logger.info("place_lookup found=true latency_ms=%s", int((time.monotonic() - started) * 1000))
    return PlaceOut(lat=center.lat, lon=center.lon, label=center.label or data.query)


@router.post("/suggest", response_model=SuggestResponse)
def suggest_places(data: SuggestRequest, request: Request) -> SuggestResponse:
    """Up to 5 place suggestions while typing (Photon by default). Only names and points of public places."""
    _limit(request, "place-suggest", request.app.state.settings.place_suggest_rate_limit)
    suggester = request.app.state.place_suggester
    try:
        found = suggester.suggest(data.query, data.language)
    except HospitalProviderError as exc:
        raise _provider_error(exc, "place_suggest", suggester.name) from None
    return SuggestResponse(
        suggestions=[SuggestionOut(label=s.label, detail=s.detail, lat=round(s.lat, 4), lon=round(s.lon, 4), kind=s.kind) for s in found],
        attribution=suggester.attribution,
    )
