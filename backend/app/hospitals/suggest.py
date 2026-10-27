"""Place suggestions while typing (search-as-you-type), isolated behind PlaceSuggester.

Nominatim's usage policy forbids autocomplete on its public server, so suggestions use Photon
(github.com/komoot/photon), an OpenStreetMap geocoder built for search-as-you-type. The public instance at
photon.komoot.io may be used "as long as the number of requests stay in a reasonable limit"; "extensive usage will
be throttled or completely banned", with no availability guarantee. To stay well inside that:
- the browser asks only after 3+ characters and a 400 ms pause, and caches per session;
- this server caches answers (including "no match") for 24 h, allows ~1 request/second to Photon in total,
  never retries, and rate-limits each client (PLACE_SUGGEST_RATE_LIMIT per minute).
For a public launch, run your own Photon instance and set PHOTON_URL.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from .cache import TTLCache
from .provider import HospitalProviderError
from .schemas import INDIA_LAT, INDIA_LON

MIN_INTERVAL_S = 1.0
MAX_SUGGESTIONS = 5
# Photon's public instance has labels in a few languages only; for Tamil/Hindi ask for the local name.
_PHOTON_LANGS = {"en"}


@dataclass(frozen=True)
class Suggestion:
    label: str  # the place's own name
    detail: str  # e.g. "Chennai, Tamil Nadu, 600003"
    lat: float
    lon: float
    kind: str  # Photon's type: city, district, locality, street, house, state, ...


class PlaceSuggester(Protocol):
    name: str
    attribution: str

    def suggest(self, query: str, language: str) -> list[Suggestion]: ...


class DisabledSuggester:
    name = "none"
    attribution = ""

    def suggest(self, query: str, language: str) -> list[Suggestion]:  # noqa: ARG002
        raise HospitalProviderError("not_configured", "PLACE_SUGGEST_PROVIDER=none")


def _detail(props: dict[str, Any]) -> str:
    parts: list[str] = []
    name = str(props.get("name") or "").strip()
    for key in ("district", "city", "county", "state", "postcode"):
        v = str(props.get(key) or "").strip()
        if v and v != name and v not in parts:
            parts.append(v)
    return ", ".join(parts)[:200]


def parse_feature(feature: dict[str, Any]) -> Suggestion | None:
    props = feature.get("properties") or {}
    if str(props.get("countrycode", "")).upper() != "IN":
        return None
    try:
        lon, lat = (float(v) for v in feature["geometry"]["coordinates"][:2])
    except (KeyError, TypeError, ValueError):
        return None
    if not (INDIA_LAT[0] <= lat <= INDIA_LAT[1] and INDIA_LON[0] <= lon <= INDIA_LON[1]):
        return None
    name = str(props.get("name") or props.get("postcode") or "").strip()
    if not name:
        return None
    return Suggestion(label=name[:200], detail=_detail(props), lat=lat, lon=lon, kind=str(props.get("type") or "place")[:30])


class PhotonSuggester:
    name = "photon"
    attribution = "Photon by komoot · © OpenStreetMap contributors"

    def __init__(self, url: str, user_agent: str, timeout_seconds: float, client: httpx.Client | None = None,
                 sleep=time.sleep, clock=time.monotonic) -> None:  # type: ignore[no-untyped-def]
        self.url = url.rstrip("/")
        self.timeout = timeout_seconds
        self._client = client or httpx.Client(timeout=timeout_seconds, headers={"User-Agent": user_agent}, follow_redirects=False)
        self._sleep, self._clock = sleep, clock
        self._cache = TTLCache(24 * 3600, max_entries=2048, clock=clock)
        self._lock = threading.Lock()
        self._last = -1e9

    def suggest(self, query: str, language: str) -> list[Suggestion]:
        q = " ".join(query.split())
        key = TTLCache.key("photon", q.casefold(), language)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        params: dict[str, str | int] = {"q": q, "limit": MAX_SUGGESTIONS + 3, "bbox": f"{INDIA_LON[0]},{INDIA_LAT[0]},{INDIA_LON[1]},{INDIA_LAT[1]}"}
        if language in _PHOTON_LANGS:
            params["lang"] = language
        # ~1 request/second to Photon in total. Suggestions are a convenience: if others are queued, give up quickly.
        if not self._lock.acquire(timeout=1.5):
            raise HospitalProviderError("busy", "suggestion queue full", retry_after=2)
        try:
            wait = MIN_INTERVAL_S - (self._clock() - self._last)
            if wait > 0:
                self._sleep(wait)
            try:
                res = self._client.get(self.url, params=params, timeout=self.timeout)
            except httpx.TimeoutException as exc:
                raise HospitalProviderError("timeout", "Photon request timed out") from exc
            except httpx.HTTPError as exc:
                raise HospitalProviderError("unavailable", f"Photon connection error ({type(exc).__name__})") from exc
            finally:
                self._last = self._clock()
        finally:
            self._lock.release()
        if res.status_code == 429:
            retry = res.headers.get("retry-after")
            raise HospitalProviderError("rate_limited", "Photon rate limit", retry_after=int(retry) if retry and retry.isdigit() else 30)
        if res.status_code in (408, 504):
            raise HospitalProviderError("timeout", f"Photon status {res.status_code}")
        if res.status_code >= 400:
            raise HospitalProviderError("unavailable", f"Photon status {res.status_code}")
        try:
            data = res.json()
        except ValueError as exc:
            raise HospitalProviderError("unavailable", "Photon returned invalid JSON") from exc
        features = data.get("features") if isinstance(data, dict) else None
        if not isinstance(features, list):
            raise HospitalProviderError("unavailable", "unexpected Photon response")
        out: list[Suggestion] = []
        seen: set[tuple[str, str]] = set()
        for feat in features:
            s = parse_feature(feat) if isinstance(feat, dict) else None
            if s and (s.label, s.detail) not in seen:
                seen.add((s.label, s.detail))
                out.append(s)
            if len(out) == MAX_SUGGESTIONS:
                break
        self._cache.set(key, out)  # a genuine "no match" ([]) is cached too; errors never are
        return out
