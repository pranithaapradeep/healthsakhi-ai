"""Provider-neutral types for hospital search. Replace the data provider by implementing HospitalProvider."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol

# busy: our own queue (another search is still running); rate_limited: the upstream service answered 429;
# overloaded: the upstream service says it is at capacity (502/503 "queue full"), even after brief retries;
# timeout: no answer within the time budget; unavailable: other upstream failures (bad data, network, 5xx).
ProviderErrorKind = Literal["busy", "rate_limited", "overloaded", "timeout", "unavailable", "not_configured"]


@dataclass(frozen=True)
class Place:
    lat: float
    lon: float
    label: str


@dataclass(frozen=True)
class Facility:
    """One listing exactly as the provider supplied it — nothing inferred or invented."""

    id: str  # provider-scoped, e.g. "osm:node/123"
    name: str
    kind: Literal["hospital", "clinic"]
    lat: float
    lon: float
    address: str | None = None
    phones: tuple[str, ...] = ()
    website: str | None = None
    opening_hours: str | None = None
    operator_type: Literal["government", "private", "charitable"] | None = None
    specialties: frozenset[str] = field(default_factory=frozenset)  # normalized keys, as *listed* by the source
    has_specialty_info: bool = False  # the source lists at least one department for this facility
    emergency_tag: Literal["yes", "no"] | None = None
    source_url: str | None = None


@dataclass
class HospitalProviderError(Exception):
    kind: ProviderErrorKind
    detail: str = ""
    retry_after: int | None = None

    def __str__(self) -> str:
        return f"{self.kind}: {self.detail}"


class HospitalProvider(Protocol):
    name: str
    source_name: str  # shown to users, e.g. "OpenStreetMap"
    attribution: str
    license: str

    def geocode(self, query: str, language: str) -> Place | None:
        """Resolve a city, locality, state, PIN code or facility name in India. None if nothing matches."""
        ...

    def search(self, lat: float, lon: float, radius_m: int, include_clinics: bool, language: str) -> list[Facility]:
        """Facilities around a point (unsorted, may include some just outside the radius)."""
        ...


@dataclass(frozen=True)
class SourceInfo:
    """Which dataset actually answered a search — shown to the person, so a fallback is never hidden."""

    name: str
    attribution: str
    license: str
    data_as_of: str | None = None  # date of an offline copy; None = live service


def search_with_source(
    provider: HospitalProvider, lat: float, lon: float, radius_m: int, include_clinics: bool, language: str
) -> tuple[list[Facility], SourceInfo]:
    """Providers that can answer from different sources implement `search_with_source`; others are live."""
    fn = getattr(provider, "search_with_source", None)
    if fn is not None:
        return fn(lat, lon, radius_m, include_clinics, language)  # type: ignore[no-any-return]
    facilities = provider.search(lat, lon, radius_m, include_clinics, language)
    return facilities, SourceInfo(provider.source_name, provider.attribution, provider.license)


class DisabledHospitalProvider:
    name = "none"
    source_name = "none"
    attribution = ""
    license = ""

    def geocode(self, query: str, language: str) -> Place | None:  # noqa: ARG002
        raise HospitalProviderError("not_configured", "HOSPITAL_PROVIDER=none")

    def search(self, lat, lon, radius_m, include_clinics, language):  # type: ignore[no-untyped-def]  # noqa: ARG002
        raise HospitalProviderError("not_configured", "HOSPITAL_PROVIDER=none")
