from __future__ import annotations

import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..auth.schemas import Language
from .specialties import SpecialtyKey

# Generous bounding box around India incl. Andaman & Nicobar and Lakshadweep (it also covers some border areas
# of neighbouring countries; geocoding itself is restricted to India).
INDIA_LAT = (6.0, 37.5)
INDIA_LON = (68.0, 97.6)

SpecialtyStatus = Literal["verified", "listed_unverified", "not_listed", "unavailable"]


def clean_text(v: str | None, min_len: int) -> str | None:
    if v is None:
        return None
    v = " ".join(unicodedata.normalize("NFC", v).split())
    if len(v) < min_len:
        raise ValueError("too short")
    if any(unicodedata.category(ch).startswith("C") for ch in v):
        raise ValueError("must not contain control characters")
    return v


class HospitalSearchRequest(BaseModel):
    """Either the device location (lat+lon) or a typed place (city, locality, state, PIN code or hospital name)."""

    model_config = ConfigDict(extra="forbid")

    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    query: str | None = Field(default=None, min_length=2, max_length=120)
    # Name of a place the person already picked (suggestion or earlier lookup); only with lat/lon, display only.
    place_label: str | None = Field(default=None, min_length=1, max_length=200)
    radius_km: Literal[5, 10, 25, 50] = 10
    specialty: SpecialtyKey | None = None
    include_clinics: bool = False
    include_unknown: bool = False  # also show listings with no specialty information when a specialty is chosen
    language: Language = "en"
    limit: int = Field(default=50, ge=1, le=100)

    @field_validator("query")
    @classmethod
    def _clean(cls, v: str | None) -> str | None:
        return clean_text(v, 2)

    @field_validator("place_label")
    @classmethod
    def _clean_label(cls, v: str | None) -> str | None:
        return clean_text(v, 1)

    @model_validator(mode="after")
    def _one_location(self) -> "HospitalSearchRequest":
        has_point = self.lat is not None or self.lon is not None
        if has_point and (self.lat is None or self.lon is None):
            raise ValueError("lat and lon must be given together")
        if has_point == (self.query is not None):
            raise ValueError("give either lat/lon or query, not both or neither")
        if self.place_label is not None and not has_point:
            raise ValueError("place_label is only used with lat/lon")
        if has_point and not (INDIA_LAT[0] <= self.lat <= INDIA_LAT[1] and INDIA_LON[0] <= self.lon <= INDIA_LON[1]):  # type: ignore[operator]
            raise ValueError("location is outside India")
        return self


class SourceOut(BaseModel):
    name: str
    url: str | None
    license: str


class HospitalOut(BaseModel):
    id: str
    name: str
    kind: Literal["hospital", "clinic"]
    lat: float
    lon: float
    distance_km: float
    address: str | None
    phones: list[str]
    website: str | None
    opening_hours: str | None  # exactly as listed by the source
    operator_type: Literal["government", "private", "charitable"] | None
    emergency: Literal["listed", "not_listed", "unknown"]
    specialties: list[str]  # departments the source lists (unverified)
    specialty_status: SpecialtyStatus | None  # for the requested specialty, if any
    source: SourceOut


class CenterOut(BaseModel):
    lat: float
    lon: float
    label: str | None
    source: Literal["device", "search"]


class HospitalSearchResponse(BaseModel):
    center: CenterOut
    radius_km: int
    specialty: str | None
    total: int
    results: list[HospitalOut]
    attribution: str
    provider: str
    data_as_of: str | None = None  # date of the offline OpenStreetMap copy that answered; None = live service


class PlaceLookupRequest(BaseModel):
    """Resolve a typed place to a point before the (slower) hospital search, so the UI can show each stage."""

    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=2, max_length=120)
    language: Language = "en"

    @field_validator("query")
    @classmethod
    def _clean(cls, v: str) -> str:
        return clean_text(v, 2)  # type: ignore[return-value]


class PlaceOut(BaseModel):
    lat: float
    lon: float
    label: str


class SuggestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=3, max_length=80)
    language: Language = "en"

    @field_validator("query")
    @classmethod
    def _clean(cls, v: str) -> str:
        return clean_text(v, 3)  # type: ignore[return-value]


class SuggestionOut(BaseModel):
    label: str
    detail: str
    lat: float
    lon: float
    kind: str


class SuggestResponse(BaseModel):
    suggestions: list[SuggestionOut]
    attribution: str
