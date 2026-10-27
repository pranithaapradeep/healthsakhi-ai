"""OpenStreetMap adapter: Nominatim (geocoding) + Overpass (facility search).

Usage policies this code follows (checked 2026-10-25):
- Nominatim (operations.osmfoundation.org/policies/nominatim): max 1 request/second, identifying User-Agent,
  results must be cached, no autocomplete. Searches run only when the person submits a search.
- Overpass public instance (wiki.openstreetmap.org/wiki/Overpass_API): < 10,000 queries/day in total (regular use:
  divide by 100), no parallel requests, pause after HTTP 429. The wiki currently describes the server as overloaded
  (Oct 2026). Commercial use should use a self-hosted or paid instance (OVERPASS_URL). No retries are made here.
- Data © OpenStreetMap contributors, ODbL — attribution is returned with every result.
Only facility tags are requested (no editor/user metadata).
"""
from __future__ import annotations

import json
import math
import re
import threading
import time
from typing import Any
from urllib.parse import urlparse

import httpx

from .cache import TTLCache
from .provider import Facility, HospitalProviderError, Place
from .specialties import specialties_from_osm

PIN_RE = re.compile(r"^\d{6}$")
_PHONE_OK = re.compile(r"^\+?[0-9][0-9 ()\-]{5,24}$")
_HOSPITAL = ('["amenity"="hospital"]', '["healthcare"="hospital"]')
_CLINIC = ('["amenity"~"^(clinic|doctors|dentist)$"]', '["healthcare"~"^(clinic|centre|dentist|physiotherapist|rehabilitation)$"]')
MAX_ELEMENTS = 5000
STANDARD_RADII_M = (5_000, 10_000, 25_000, 50_000)
# Extra margin around the radius so features whose centre lies inside the circle are still matched by the box
# even if part of their outline crosses its edge (hospital campuses are far smaller than this).
BBOX_MARGIN_M = 500
MIN_QUERY_SECONDS = 10  # never start an Overpass query with less time than this left in the budget
# Overpass admits queries by their declared resources; a modest memory limit is admitted more readily when the
# server is loaded than the 512 MiB default. Hospital answers for 50 km are a few MB at most.
MAXSIZE_BYTES = 64 * 1024 * 1024
# Bounded retries, only for failures that arrive *quickly* and are explicitly transient: 502/503 ("at capacity,
# retry with backoff") and connection errors. Never for 429 (the policy says pause 30 s), never after a read
# timeout (the query may still be running on the server) — so we never pile extra load on a slow server.
RETRY_STATUSES = frozenset({502, 503})
RETRY_BACKOFF_S = (2.0, 4.0)  # at most 3 attempts in total, all inside the same time budget


def _operator_type(value: str | None) -> str | None:
    v = (value or "").strip().lower()
    if v in {"government", "public", "state", "municipal"}:
        return "government"
    if v in {"private", "corporate"}:
        return "private"
    if v in {"community", "charitable", "non_profit", "ngo", "religious", "trust"}:
        return "charitable"
    return None


def _phones(tags: dict[str, str]) -> tuple[str, ...]:
    out: list[str] = []
    for key in ("phone", "contact:phone", "phone:mobile", "contact:mobile", "emergency:phone"):
        for part in re.split(r"[;,/]", tags.get(key, "")):
            p = part.strip()
            if p and _PHONE_OK.match(p) and p not in out:
                out.append(p)
    return tuple(out[:3])


def _website(tags: dict[str, str]) -> str | None:
    for key in ("website", "contact:website", "url"):
        raw = tags.get(key, "").strip()
        if not raw:
            continue
        if raw.startswith("www."):
            raw = "https://" + raw
        parsed = urlparse(raw)
        if parsed.scheme in ("http", "https") and parsed.netloc and " " not in raw and len(raw) <= 300:
            return raw
    return None


def _address(tags: dict[str, str]) -> str | None:
    if tags.get("addr:full"):
        return tags["addr:full"].strip()[:300]
    street = " ".join(p for p in (tags.get("addr:housenumber"), tags.get("addr:street")) if p)
    parts = [street, tags.get("addr:suburb") or tags.get("addr:neighbourhood"), tags.get("addr:city") or tags.get("addr:district"),
             tags.get("addr:state"), tags.get("addr:postcode")]
    text = ", ".join(p.strip() for p in parts if p and p.strip())
    return text[:300] or None


def _name(tags: dict[str, str], language: str) -> str | None:
    for key in (f"name:{language}", "name", "name:en", "official_name"):
        if tags.get(key, "").strip():
            return tags[key].strip()[:200]
    return None


def parse_element(el: dict[str, Any], language: str) -> Facility | None:
    tags: dict[str, str] = {k: str(v) for k, v in (el.get("tags") or {}).items()}
    name = _name(tags, language)
    if el.get("type") == "node":
        lat, lon = el.get("lat"), el.get("lon")
    else:
        center = el.get("center") or {}
        lat, lon = center.get("lat"), center.get("lon")
    if name is None or lat is None or lon is None:
        return None  # unnamed or unlocatable listings are not shown rather than guessed
    is_hospital = tags.get("amenity") == "hospital" or tags.get("healthcare") == "hospital"
    facility_type = tags.get("healthcare") or tags.get("amenity")
    speciality_values = re.split(r"[;,]", tags.get("healthcare:speciality", ""))
    emergency = tags.get("emergency")
    return Facility(
        id=f"osm:{el.get('type')}/{el.get('id')}",
        name=name,
        kind="hospital" if is_hospital else "clinic",
        lat=float(lat),
        lon=float(lon),
        address=_address(tags),
        phones=_phones(tags),
        website=_website(tags),
        opening_hours=(tags.get("opening_hours") or "").strip()[:200] or None,
        operator_type=_operator_type(tags.get("operator:type")),  # type: ignore[arg-type]
        specialties=frozenset(specialties_from_osm(speciality_values, facility_type, emergency)),
        has_specialty_info=any(v.strip() for v in speciality_values),
        emergency_tag=emergency if emergency in ("yes", "no") else None,  # type: ignore[arg-type]
        source_url=f"https://www.openstreetmap.org/{el.get('type')}/{el.get('id')}",
    )


def bbox_around(lat: float, lon: float, radius_m: int) -> tuple[float, float, float, float]:
    """(south, west, north, east) of a box that contains the circle of radius_m (+ margin) around the point."""
    r = radius_m + BBOX_MARGIN_M
    dlat = r / 111_320
    dlon = r / (111_320 * max(math.cos(math.radians(lat)), 0.01))
    return (max(lat - dlat, -90.0), lon - dlon, min(lat + dlat, 90.0), lon + dlon)


def build_overpass_query(lat: float, lon: float, radius_m: int, include_clinics: bool, timeout_s: int) -> str:
    """Bounding-box query: uses Overpass's spatial index and is lighter than `around:` (which measures the distance
    to every way and relation). The box is larger than the circle; the service then keeps only facilities whose
    centre lies within the chosen radius, so the radius the person chose is still what is applied."""
    s, w, n, e = bbox_around(round(lat, 3), round(lon, 3), radius_m)
    box = f"({s:.4f},{w:.4f},{n:.4f},{e:.4f})"
    selectors = _HOSPITAL + (_CLINIC if include_clinics else ())
    body = "".join(f"nwr{box}{sel};" for sel in selectors)
    return f"[out:json][timeout:{timeout_s}][maxsize:{MAXSIZE_BYTES}];({body});out center tags;"


class OSMHospitalProvider:
    name = "osm"
    source_name = "OpenStreetMap"
    attribution = "© OpenStreetMap contributors"
    license = "ODbL 1.0"

    def __init__(
        self,
        nominatim_url: str,
        overpass_url: str,
        user_agent: str,
        timeout_seconds: float,
        cache_ttl_seconds: float,
        client: httpx.Client | None = None,
        nominatim_timeout_seconds: float = 10,
        ipv4_only: bool = False,
        sleep=time.sleep,  # type: ignore[no-untyped-def]
        clock=time.monotonic,  # type: ignore[no-untyped-def]
    ) -> None:
        self.nominatim_url = nominatim_url.rstrip("/")
        self.overpass_url = overpass_url
        self.timeout = timeout_seconds  # total budget for one hospital search (queue wait + Overpass call)
        self.nominatim_timeout = nominatim_timeout_seconds
        # ipv4_only: for networks where IPv6 to these servers is broken (each new connection then stalls first).
        transport = httpx.HTTPTransport(local_address="0.0.0.0") if ipv4_only else None
        self._client = client or httpx.Client(
            timeout=timeout_seconds, headers={"User-Agent": user_agent}, follow_redirects=False, transport=transport
        )
        self._sleep, self._clock = sleep, clock
        self._geocode_cache = TTLCache(24 * 3600)
        # Successful Overpass answers only (raw elements, language-independent). Failures are never cached.
        self._search_cache = TTLCache(cache_ttl_seconds, max_entries=64, clock=clock)
        self._nominatim_lock = threading.Lock()
        self._last_nominatim = -1e9
        self._overpass_lock = threading.Lock()

    # --- Nominatim -----------------------------------------------------------------------------------------
    def geocode(self, query: str, language: str) -> Place | None:
        q = " ".join(query.split())
        key = TTLCache.key("geo", q.casefold(), language)
        cached = self._geocode_cache.get(key)
        if cached is not None:
            return cached or None  # False = cached "no match"

        params: dict[str, str | int] = {"format": "jsonv2", "countrycodes": "in", "limit": 1, "accept-language": language}
        if PIN_RE.match(q):
            params |= {"postalcode": q, "country": "India"}
        else:
            params["q"] = q
        # Max 1 request/second across all users of this process; queue for a few seconds at most.
        if not self._nominatim_lock.acquire(timeout=5):
            raise HospitalProviderError("busy", "too many place lookups at once", retry_after=5)
        try:
            wait = 1.0 - (self._clock() - self._last_nominatim)
            if wait > 0:
                self._sleep(wait)
            try:
                res = self._client.get(f"{self.nominatim_url}/search", params=params, timeout=self.nominatim_timeout)
            finally:
                self._last_nominatim = self._clock()
        finally:
            self._nominatim_lock.release()
        data = self._json(res, "Nominatim")
        place = None
        if isinstance(data, list) and data:
            top = data[0]
            try:
                place = Place(lat=float(top["lat"]), lon=float(top["lon"]), label=str(top.get("display_name", q))[:200])
            except (KeyError, TypeError, ValueError):
                place = None
        self._geocode_cache.set(key, place or False)
        return place

    # --- Overpass ------------------------------------------------------------------------------------------
    def _cached_elements(self, lat: float, lon: float, radius_m: int, include_clinics: bool) -> list[dict[str, Any]] | None:
        """Same point, same or larger radius: a cached larger search contains every facility of a smaller one."""
        for r in (radius_m, *[x for x in STANDARD_RADII_M if x > radius_m]):
            hit = self._search_cache.get(TTLCache.key("osm", f"{lat:.3f}", f"{lon:.3f}", r, include_clinics))
            if hit is not None:
                return hit
        return None

    def search(self, lat: float, lon: float, radius_m: int, include_clinics: bool, language: str) -> list[Facility]:
        elements = self._cached_elements(lat, lon, radius_m, include_clinics)
        if elements is None:
            elements = self._fetch(lat, lon, radius_m, include_clinics)
        return [f for el in elements if (f := parse_element(el, language))]

    def _fetch(self, lat: float, lon: float, radius_m: int, include_clinics: bool) -> list[dict[str, Any]]:
        deadline = self._clock() + self.timeout
        # One Overpass query at a time from this server (the public instance asks for no parallel queries).
        # Wait for our turn only as long as the budget still leaves time for the query itself.
        if not self._overpass_lock.acquire(timeout=max(self.timeout - MIN_QUERY_SECONDS, 0.1)):
            raise HospitalProviderError("busy", "another hospital search is still running", retry_after=10)
        try:
            # Identical searches that arrived together: the first one's answer is now cached — reuse it.
            cached = self._cached_elements(lat, lon, radius_m, include_clinics)
            if cached is not None:
                return cached
            res = self._post_with_retries(lat, lon, radius_m, include_clinics, deadline)
        finally:
            self._overpass_lock.release()
        data = self._json(res, "Overpass")
        if not isinstance(data, dict) or not isinstance(data.get("elements"), list):
            raise HospitalProviderError("unavailable", "unexpected Overpass response")
        remark = str(data.get("remark", ""))
        if "runtime error" in remark.lower():  # partial answer: never shown or cached as if complete
            raise HospitalProviderError("timeout" if "timed out" in remark.lower() else "unavailable", "Overpass runtime error")
        elements = data["elements"][:MAX_ELEMENTS]
        self._search_cache.set(TTLCache.key("osm", f"{lat:.3f}", f"{lon:.3f}", radius_m, include_clinics), elements)
        return elements

    def _post_with_retries(self, lat: float, lon: float, radius_m: int, include_clinics: bool, deadline: float) -> httpx.Response:
        for attempt in range(len(RETRY_BACKOFF_S) + 1):
            remaining = deadline - self._clock()
            if remaining < MIN_QUERY_SECONDS:
                raise HospitalProviderError("busy", "not enough time left in the search budget", retry_after=10)
            # The server-side [timeout:] is shorter than our wait, so Overpass stops first and says so.
            query = build_overpass_query(lat, lon, radius_m, include_clinics, int(remaining - 3))
            timeout = httpx.Timeout(remaining, connect=min(5.0, remaining))
            try:
                res = self._client.post(self.overpass_url, data={"data": query}, timeout=timeout)
            except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
                failure = HospitalProviderError("unavailable", f"Overpass connection error ({type(exc).__name__})")
            else:
                if res.status_code not in RETRY_STATUSES:
                    return res
                failure = self._upstream_error(res, "Overpass")
            # Retry only if a pause plus a full query still fit in the budget.
            if attempt == len(RETRY_BACKOFF_S) or deadline - self._clock() - RETRY_BACKOFF_S[attempt] < MIN_QUERY_SECONDS:
                raise failure
            self._sleep(RETRY_BACKOFF_S[attempt])
        raise AssertionError("unreachable")

    # --- shared --------------------------------------------------------------------------------------------
    @staticmethod
    def _upstream_error(res: httpx.Response, service: str) -> HospitalProviderError:
        text = res.text[:2000].lower()
        if any(w in text for w in ("capacity", "queue is full", "too busy", "overloaded")):
            return HospitalProviderError("overloaded", f"{service} at capacity ({res.status_code})", retry_after=60)
        return HospitalProviderError("unavailable", f"{service} status {res.status_code}")

    @staticmethod
    def _json(res: httpx.Response, service: str) -> Any:
        if res.status_code == 429:
            retry = res.headers.get("retry-after")
            raise HospitalProviderError("rate_limited", f"{service} rate limit", retry_after=int(retry) if retry and retry.isdigit() else 30)
        if res.status_code in (408, 504):
            raise HospitalProviderError("timeout", f"{service} status {res.status_code}")
        if res.status_code in RETRY_STATUSES:
            raise OSMHospitalProvider._upstream_error(res, service)
        if res.status_code >= 400:
            raise HospitalProviderError("unavailable", f"{service} status {res.status_code}")
        try:
            return res.json()
        except (json.JSONDecodeError, ValueError) as exc:
            raise HospitalProviderError("unavailable", f"{service} returned invalid JSON") from exc


def wrap_transport_errors(fn):  # type: ignore[no-untyped-def]
    """Map httpx network failures to provider errors without leaking request details."""

    def inner(*args, **kwargs):  # type: ignore[no-untyped-def]
        try:
            return fn(*args, **kwargs)
        except httpx.TimeoutException as exc:
            raise HospitalProviderError("timeout", "provider request timed out") from exc
        except httpx.HTTPError as exc:
            raise HospitalProviderError("unavailable", f"provider connection error ({type(exc).__name__})") from exc

    return inner


OSMHospitalProvider.geocode = wrap_transport_errors(OSMHospitalProvider.geocode)  # type: ignore[method-assign]
OSMHospitalProvider.search = wrap_transport_errors(OSMHospitalProvider.search)  # type: ignore[method-assign]
