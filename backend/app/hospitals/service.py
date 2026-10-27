"""Hospital search orchestration: resolve location → provider search → distance, radius, specialty status.

Privacy: coordinates are rounded to 3 decimals (~110 m) before they leave the server, are never stored, and are
never logged or sent to the AI provider.
"""
from __future__ import annotations

import math

from .provider import Facility, HospitalProvider, search_with_source
from .schemas import CenterOut, HospitalOut, HospitalSearchRequest, HospitalSearchResponse, SourceOut

_STATUS_RANK = {"verified": 0, "listed_unverified": 1, "unavailable": 2, "not_listed": 3}


class LocationNotFound(Exception):
    pass


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def specialty_status(f: Facility, key: str) -> str:
    """Never infers a department: only what the source lists. This source verifies nothing, so no 'verified'."""
    if key in f.specialties:
        return "listed_unverified"
    if key == "emergency" and f.emergency_tag is not None:
        return "not_listed"
    return "not_listed" if f.has_specialty_info else "unavailable"


def emergency_status(f: Facility) -> str:
    if f.emergency_tag == "yes" or "emergency" in f.specialties:
        return "listed"
    if f.emergency_tag == "no":
        return "not_listed"
    return "unknown"


def resolve(provider: HospitalProvider, query: str, language: str) -> CenterOut:
    place = provider.geocode(query, language)
    if place is None:
        raise LocationNotFound
    return CenterOut(lat=round(place.lat, 3), lon=round(place.lon, 3), label=place.label, source="search")


def search(provider: HospitalProvider, req: HospitalSearchRequest) -> HospitalSearchResponse:
    if req.query is not None:
        place = provider.geocode(req.query, req.language)
        if place is None:
            raise LocationNotFound
        center = CenterOut(lat=round(place.lat, 3), lon=round(place.lon, 3), label=place.label, source="search")
    else:
        # A point the person picked by name (suggestion / earlier lookup) vs. the device's own location.
        source = "search" if req.place_label else "device"
        center = CenterOut(lat=round(req.lat, 3), lon=round(req.lon, 3), label=req.place_label, source=source)  # type: ignore[arg-type]

    facilities, data_source = search_with_source(provider, center.lat, center.lon, req.radius_km * 1000, req.include_clinics, req.language)

    rows: list[HospitalOut] = []
    for f in facilities:
        distance = haversine_km(center.lat, center.lon, f.lat, f.lon)
        if distance > req.radius_km:
            continue
        status = specialty_status(f, req.specialty) if req.specialty else None
        if status == "not_listed" or (status == "unavailable" and not req.include_unknown):
            continue
        rows.append(
            HospitalOut(
                id=f.id,
                name=f.name,
                kind=f.kind,
                lat=f.lat,
                lon=f.lon,
                distance_km=round(distance, 2),
                address=f.address,
                phones=list(f.phones),
                website=f.website,
                opening_hours=f.opening_hours,
                operator_type=f.operator_type,
                emergency=emergency_status(f),  # type: ignore[arg-type]
                specialties=sorted(f.specialties),
                specialty_status=status,  # type: ignore[arg-type]
                source=SourceOut(name=data_source.name, url=f.source_url, license=data_source.license),
            )
        )
    # Listings that name the chosen department first, then nearest first.
    rows.sort(key=lambda r: (_STATUS_RANK.get(r.specialty_status or "", 0), r.distance_km, r.name))
    return HospitalSearchResponse(
        center=center,
        radius_km=req.radius_km,
        specialty=req.specialty,
        total=len(rows),
        results=rows[: req.limit],
        attribution=data_source.attribution,
        provider=data_source.name,
        data_as_of=data_source.data_as_of,
    )
