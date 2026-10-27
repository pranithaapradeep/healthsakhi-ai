"""Try a primary hospital provider; on an error (never on a genuine empty result) ask a fallback provider.

The answer always reports the source that actually produced it, so a fallback is visible to the person.
"""
from __future__ import annotations

from ..core.logging import logger
from .provider import Facility, HospitalProvider, HospitalProviderError, Place, SourceInfo, search_with_source


class FallbackHospitalProvider:
    def __init__(self, primary: HospitalProvider, fallback: HospitalProvider, geocoder: HospitalProvider | None = None) -> None:
        self.primary, self.fallback = primary, fallback
        self.geocoder = geocoder  # when both share one geocoder (Nominatim), use it once — no duplicate lookups
        self.name = f"{primary.name}+{fallback.name}"
        self.source_name = primary.source_name
        self.attribution = primary.attribution
        self.license = primary.license

    def geocode(self, query: str, language: str) -> Place | None:
        if self.geocoder is not None:
            return self.geocoder.geocode(query, language)
        try:
            return self.primary.geocode(query, language)
        except HospitalProviderError as exc:
            logger.warning("hospital_provider_fallback step=geocode primary=%s kind=%s", self.primary.name, exc.kind)
            return self.fallback.geocode(query, language)

    def search_with_source(
        self, lat: float, lon: float, radius_m: int, include_clinics: bool, language: str
    ) -> tuple[list[Facility], SourceInfo]:
        try:
            return search_with_source(self.primary, lat, lon, radius_m, include_clinics, language)
        except HospitalProviderError as exc:
            # Location is never logged — only which provider failed and how.
            logger.warning("hospital_provider_fallback step=search primary=%s kind=%s", self.primary.name, exc.kind)
            return search_with_source(self.fallback, lat, lon, radius_m, include_clinics, language)

    def search(self, lat: float, lon: float, radius_m: int, include_clinics: bool, language: str) -> list[Facility]:
        return self.search_with_source(lat, lon, radius_m, include_clinics, language)[0]
