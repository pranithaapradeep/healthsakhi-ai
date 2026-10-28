from __future__ import annotations

from pathlib import Path

from ..core.config import ENV_FILE, Settings
from ..core.logging import logger
from .provider import DisabledHospitalProvider, HospitalProvider
from .suggest import DisabledSuggester, PlaceSuggester


def user_agent(settings: Settings) -> str:
    contact = settings.osm_contact.strip()
    return f"HealthSakhiAI/0.5 (+{contact})" if contact else "HealthSakhiAI/0.5 (final-year student project)"


def snapshot_path(settings: Settings) -> Path:
    p = Path(settings.hospital_snapshot_path)
    return p if p.is_absolute() else ENV_FILE.parent / p  # ENV_FILE lives in the backend folder


def _live_osm(settings: Settings) -> HospitalProvider:
    from .osm import OSMHospitalProvider

    return OSMHospitalProvider(
        nominatim_url=settings.nominatim_url,
        overpass_url=settings.overpass_url,
        user_agent=user_agent(settings),
        timeout_seconds=settings.hospital_timeout_seconds,
        cache_ttl_seconds=settings.hospital_cache_ttl_seconds,
        nominatim_timeout_seconds=settings.nominatim_timeout_seconds,
        ipv4_only=settings.osm_ipv4_only,
    )


def build_hospital_provider(settings: Settings) -> HospitalProvider:
    if settings.hospital_provider == "none":
        return DisabledHospitalProvider()
    live = _live_osm(settings)  # also the geocoder (Nominatim) for typed places
    if settings.hospital_provider == "osm":
        return live
    from .fallback import FallbackHospitalProvider
    from .snapshot import SnapshotHospitalProvider

    path = snapshot_path(settings)
    if not path.is_file():
        # Say so once at startup (the file is loaded lazily, so otherwise every search fails over silently).
        # Logs the configured relative setting only, not the server's directory layout.
        logger.warning(
            "hospital_snapshot_missing setting=%s fallback=%s", settings.hospital_snapshot_path, settings.hospital_fallback_provider
        )
    snapshot = SnapshotHospitalProvider(path, geocoder=live)
    if settings.hospital_fallback_provider == "none":
        return snapshot
    return FallbackHospitalProvider(snapshot, live, geocoder=live)


def build_place_suggester(settings: Settings) -> PlaceSuggester:
    if settings.place_suggest_provider == "none":
        return DisabledSuggester()
    from .suggest import PhotonSuggester

    return PhotonSuggester(settings.photon_url, user_agent(settings), settings.place_suggest_timeout_seconds)
