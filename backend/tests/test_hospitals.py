"""Hospital search API with a fake provider — no network, no real map services."""
import logging
from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.models import Conversation, Message, SymptomAssessment
from app.hospitals.provider import Facility, HospitalProviderError, Place
from app.main import create_app
from tests.conftest import CLIENT_HEADERS

URL = "/api/v1/hospitals/search"
RESOLVE = "/api/v1/hospitals/resolve"

# Representative places across India (coordinates approximate city centres).
PLACES = {
    "chennai": Place(13.0827, 80.2707, "Chennai, Tamil Nadu, India"),
    "new delhi": Place(28.6139, 77.2090, "New Delhi, Delhi, India"),
    "guwahati": Place(26.1445, 91.7362, "Guwahati, Assam, India"),
    "port blair": Place(11.6234, 92.7265, "Port Blair, Andaman and Nicobar Islands, India"),
    "600003": Place(13.0878, 80.2785, "600003, Chennai, Tamil Nadu, India"),
    "kerala": Place(10.3529, 76.5120, "Kerala, India"),
}


def fac(id_, lat, lon, name=None, **kw) -> Facility:
    return Facility(id=f"osm:node/{id_}", name=name or f"Hospital {id_}", kind=kw.pop("kind", "hospital"), lat=lat, lon=lon,
                    source_url=f"https://www.openstreetmap.org/node/{id_}", **kw)


@dataclass
class FakeHospitals:
    facilities: list[Facility] = field(default_factory=list)
    error: HospitalProviderError | None = None
    geocode_calls: list[tuple[str, str]] = field(default_factory=list)
    search_calls: list[tuple[float, float, int, bool, str]] = field(default_factory=list)
    name: str = "fake"
    source_name: str = "OpenStreetMap"
    attribution: str = "© OpenStreetMap contributors"
    license: str = "ODbL 1.0"

    def geocode(self, query, language):  # type: ignore[no-untyped-def]
        self.geocode_calls.append((query, language))
        if self.error:
            raise self.error
        return PLACES.get(query.lower())

    def search(self, lat, lon, radius_m, include_clinics, language):  # type: ignore[no-untyped-def]
        self.search_calls.append((lat, lon, radius_m, include_clinics, language))
        if self.error:
            raise self.error
        return self.facilities


CHENNAI = [
    fac(1, 13.0830, 80.2710, "Near General", specialties=frozenset({"cardiology", "general_medicine", "emergency"}),
        has_specialty_info=True, emergency_tag="yes", phones=("+91 44 2530 5000",), website="https://ggh.example",
        address="EVR Salai, Chennai, 600003", opening_hours="24/7", operator_type="government"),
    fac(2, 13.1000, 80.2800, "No Info Hospital"),  # ~2 km, no specialty data at all
    fac(3, 13.1200, 80.2900, "Eye Hospital", specialties=frozenset({"ophthalmology"}), has_specialty_info=True, emergency_tag="no"),
    fac(4, 13.2000, 80.3000, "Cancer Centre", specialties=frozenset({"oncology"}), has_specialty_info=True),  # ~13 km
    fac(5, 13.5000, 80.2700, "Far Hospital"),  # ~46 km
    fac(6, 13.0900, 80.2750, "Dental Clinic", kind="clinic", specialties=frozenset({"dentistry"})),
]


@pytest.fixture
def provider():
    return FakeHospitals(facilities=list(CHENNAI))


@pytest.fixture
def c(settings, engine, provider):
    with TestClient(create_app(settings, engine, hospital_provider=provider), headers=CLIENT_HEADERS) as client:
        yield client


# --- Location: device and typed ------------------------------------------------------------------------------


def test_search_by_device_location_sorted_by_distance_within_radius(c, provider):
    res = c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "radius_km": 10})
    assert res.status_code == 200, res.text
    body = res.json()
    names = [r["name"] for r in body["results"]]
    assert names == ["Near General", "Dental Clinic", "No Info Hospital", "Eye Hospital"]
    distances = [r["distance_km"] for r in body["results"]]
    assert distances == sorted(distances) and all(d <= 10 for d in distances)
    assert body["center"] == {"lat": 13.083, "lon": 80.271, "label": None, "source": "device"}
    assert body["attribution"] == "© OpenStreetMap contributors" and body["provider"] == "OpenStreetMap"
    assert provider.geocode_calls == []


def test_radius_filters(c):
    def names(radius):
        return [r["name"] for r in c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "radius_km": radius}).json()["results"]]

    assert "Cancer Centre" not in names(5) and "Cancer Centre" not in names(10)
    assert "Cancer Centre" in names(25) and "Far Hospital" not in names(25)
    assert "Far Hospital" in names(50)


@pytest.mark.parametrize("query", ["Chennai", "New Delhi", "Guwahati", "Port Blair", "600003", "Kerala"])
def test_typed_locations_across_india(c, provider, query):
    res = c.post(URL, json={"query": query, "radius_km": 25})
    assert res.status_code == 200
    place = PLACES[query.lower()]
    assert res.json()["center"]["label"] == place.label
    lat, lon, radius_m, _clinics, _lang = provider.search_calls[-1]
    assert (lat, lon, radius_m) == (round(place.lat, 3), round(place.lon, 3), 25_000)


def test_unknown_place_is_404(c):
    res = c.post(URL, json={"query": "Atlantis Nagar"})
    assert res.status_code == 404 and res.json()["detail"] == "location_not_found"


def test_language_is_passed_to_provider(c, provider):
    c.post(URL, json={"query": "Chennai", "language": "ta"})
    assert provider.geocode_calls[-1] == ("Chennai", "ta") and provider.search_calls[-1][4] == "ta"


def test_clinics_option_is_passed_to_provider(c, provider):
    c.post(URL, json={"lat": 13.08, "lon": 80.27, "include_clinics": True})
    assert provider.search_calls[-1][3] is True


# --- Specialties: never inferred ------------------------------------------------------------------------------


def test_specialty_filter_returns_only_listings_that_name_it(c):
    body = c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "radius_km": 25, "specialty": "oncology"}).json()
    assert [(r["name"], r["specialty_status"]) for r in body["results"]] == [("Cancer Centre", "listed_unverified")]


def test_include_unknown_adds_listings_without_specialty_data_but_never_contradicting_ones(c):
    body = c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "radius_km": 25, "specialty": "oncology", "include_unknown": True}).json()
    statuses = {r["name"]: r["specialty_status"] for r in body["results"]}
    assert statuses["Cancer Centre"] == "listed_unverified"
    assert statuses["No Info Hospital"] == "unavailable"  # a hospital is NOT assumed to have the department
    assert "Eye Hospital" not in statuses and "Near General" not in statuses  # they list other departments only
    assert body["results"][0]["name"] == "Cancer Centre"  # listed first, even though farther away


def test_nothing_is_ever_marked_verified(c):
    for specialty in ("cardiology", "emergency", "general_medicine", "dentistry"):
        body = c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "radius_km": 50, "specialty": specialty, "include_unknown": True}).json()
        assert all(r["specialty_status"] != "verified" for r in body["results"])


def test_emergency_department_status(c):
    body = c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "radius_km": 25, "specialty": "emergency", "include_unknown": True}).json()
    statuses = {r["name"]: (r["specialty_status"], r["emergency"]) for r in body["results"]}
    assert statuses["Near General"] == ("listed_unverified", "listed")
    assert statuses["No Info Hospital"] == ("unavailable", "unknown")
    assert "Eye Hospital" not in statuses  # its listing says emergency=no


def test_without_specialty_filter_no_status_is_reported(c):
    results = c.post(URL, json={"lat": 13.0827, "lon": 80.2707}).json()["results"]
    assert all(r["specialty_status"] is None for r in results)


def test_listing_fields_are_passed_through_not_invented(c):
    results = {r["name"]: r for r in c.post(URL, json={"lat": 13.0827, "lon": 80.2707}).json()["results"]}
    full = results["Near General"]
    assert full["phones"] == ["+91 44 2530 5000"] and full["website"] == "https://ggh.example"
    assert full["opening_hours"] == "24/7" and full["operator_type"] == "government"
    assert full["source"] == {"name": "OpenStreetMap", "url": "https://www.openstreetmap.org/node/1", "license": "ODbL 1.0"}
    bare = results["No Info Hospital"]
    assert bare["phones"] == [] and bare["website"] is None and bare["address"] is None
    assert bare["opening_hours"] is None and bare["operator_type"] is None and bare["specialties"] == []


def test_empty_results(c, provider):
    provider.facilities = []
    res = c.post(URL, json={"query": "Guwahati"})
    assert res.status_code == 200 and res.json()["results"] == [] and res.json()["total"] == 0


def test_limit(c):
    body = c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "radius_km": 50, "limit": 2}).json()
    assert len(body["results"]) == 2 and body["total"] == 6


# --- Validation and privacy ---------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"lat": 13.08},
        {"lon": 80.27},
        {"lat": 13.08, "lon": 80.27, "query": "Chennai"},
        {"lat": 51.5074, "lon": -0.1278},  # London: outside India
        {"lat": 40.71, "lon": -74.0},
        {"lat": 200, "lon": 80},
        {"query": "a"},
        {"query": "x" * 121},
        {"query": "Chen\u0000nai"},
        {"query": "Chennai", "radius_km": 7},
        {"query": "Chennai", "specialty": "astrology"},
        {"query": "Chennai", "limit": 0},
        {"query": "Chennai", "limit": 101},
        {"query": "Chennai", "language": "fr"},
        {"query": "Chennai", "user_id": 1},
    ],
)
def test_validation(c, provider, payload):
    assert c.post(URL, json=payload).status_code == 422
    assert provider.geocode_calls == [] and provider.search_calls == []


def test_coordinates_are_rounded_before_leaving_the_server(c, provider):
    c.post(URL, json={"lat": 13.082712345, "lon": 80.270698765})
    lat, lon, *_ = provider.search_calls[-1]
    assert (lat, lon) == (13.083, 80.271)


def test_location_is_never_logged_or_stored(c, caplog, db):
    with caplog.at_level(logging.DEBUG):
        c.post(URL, json={"lat": 13.0827, "lon": 80.2707})
        c.post(URL, json={"query": "Port Blair"})
    assert "hospital_search source=device" in caplog.text and "hospital_search source=search" in caplog.text
    for secret in ("13.08", "80.27", "Port Blair", "port blair"):
        assert secret not in caplog.text
    for model in (Conversation, Message, SymptomAssessment):
        assert db.scalar(select(func.count()).select_from(model)) == 0


def test_get_is_not_allowed_so_coordinates_never_appear_in_urls(c):
    assert c.get(URL, params={"lat": 13.08, "lon": 80.27}).status_code == 405


def test_requires_client_header(settings, engine, provider):
    with TestClient(create_app(settings, engine, hospital_provider=provider)) as bare:
        assert bare.post(URL, json={"query": "Chennai"}).status_code == 403


def test_hospital_search_does_not_touch_the_ai(settings, engine, provider):
    from tests.fakes import FakeProvider

    ai = FakeProvider()
    with TestClient(create_app(settings, engine, ai_provider=ai, hospital_provider=provider), headers=CLIENT_HEADERS) as client:
        client.post(URL, json={"lat": 13.0827, "lon": 80.2707})
    assert ai.calls == []


# --- Provider failures and rate limits ------------------------------------------------------------------------


@pytest.mark.parametrize(
    "kind,status,code",
    [
        ("busy", 503, "hospital_provider_busy"),
        ("rate_limited", 503, "hospital_provider_rate_limited"),
        ("overloaded", 503, "hospital_provider_overloaded"),
        ("timeout", 504, "hospital_provider_timeout"),
        ("unavailable", 503, "hospital_provider_unavailable"),
        ("not_configured", 503, "hospital_search_not_configured"),
    ],
)
def test_provider_failures(c, provider, kind, status, code):
    provider.error = HospitalProviderError(kind, "test", retry_after=30 if kind == "busy" else None)
    res = c.post(URL, json={"query": "Chennai"})
    assert res.status_code == status and res.json()["detail"] == code
    if kind == "busy":
        assert res.headers["retry-after"] == "30"


@pytest.mark.parametrize("kind,status,code", [("rate_limited", 503, "hospital_provider_rate_limited"), ("timeout", 504, "hospital_provider_timeout")])
def test_provider_failures_on_place_lookup(c, provider, kind, status, code):
    provider.error = HospitalProviderError(kind, "test", retry_after=30 if kind == "rate_limited" else None)
    res = c.post(RESOLVE, json={"query": "Chennai"})
    assert res.status_code == status and res.json()["detail"] == code
    if kind == "rate_limited":
        assert res.headers["retry-after"] == "30"


def test_failure_is_distinct_from_genuine_empty_results(c, provider):
    provider.facilities = []
    ok = c.post(URL, json={"lat": 13.08, "lon": 80.27})
    assert ok.status_code == 200 and ok.json()["total"] == 0 and ok.json()["results"] == []
    provider.error = HospitalProviderError("timeout", "test")
    assert c.post(URL, json={"lat": 13.08, "lon": 80.27}).status_code == 504


def test_disabled_provider_by_default_in_tests(client):
    res = client.post(URL, json={"query": "Chennai"})
    assert res.status_code == 503 and res.json()["detail"] == "hospital_search_not_configured"


def test_rate_limited(settings, engine, provider):
    app = create_app(settings.model_copy(update={"hospital_rate_limit": 2}), engine, hospital_provider=provider)
    with TestClient(app, headers=CLIENT_HEADERS) as client:
        assert client.post(URL, json={"query": "Chennai"}).status_code == 200
        assert client.post(URL, json={"query": "Chennai"}).status_code == 200
        res = client.post(URL, json={"query": "Chennai"})
    assert res.status_code == 429 and int(res.headers["retry-after"]) >= 1



# --- Two-step search: resolve the place, then search by its point -------------------------------------------


def test_resolve_returns_a_rounded_point_and_label(c, provider):
    res = c.post(RESOLVE, json={"query": "Chennai", "language": "hi"})
    assert res.status_code == 200
    assert res.json() == {"lat": 13.083, "lon": 80.271, "label": "Chennai, Tamil Nadu, India"}
    assert provider.geocode_calls == [("Chennai", "hi")] and provider.search_calls == []


def test_resolve_unknown_place_is_404(c):
    res = c.post(RESOLVE, json={"query": "Atlantis Nagar"})
    assert res.status_code == 404 and res.json()["detail"] == "location_not_found"


@pytest.mark.parametrize("payload", [{}, {"query": "a"}, {"query": "x" * 121}, {"query": "Chennai", "lat": 13.0}, {"query": "Chen\u0007nai"}])
def test_resolve_validation(c, provider, payload):
    assert c.post(RESOLVE, json=payload).status_code == 422 and provider.geocode_calls == []


def test_search_by_picked_place_keeps_its_name_and_radius(c, provider):
    res = c.post(URL, json={"lat": 13.0827, "lon": 80.2707, "place_label": "Chennai, Tamil Nadu", "radius_km": 25})
    assert res.status_code == 200
    body = res.json()
    assert body["center"] == {"lat": 13.083, "lon": 80.271, "label": "Chennai, Tamil Nadu", "source": "search"}
    assert body["radius_km"] == 25 and provider.search_calls[-1][2] == 25_000
    assert provider.geocode_calls == []  # no second geocoding


@pytest.mark.parametrize("payload", [{"query": "Chennai", "place_label": "Chennai"}, {"lat": 13.08, "lon": 80.27, "place_label": ""},
                                     {"lat": 13.08, "lon": 80.27, "place_label": "x" * 201}])
def test_place_label_validation(c, payload):
    assert c.post(URL, json=payload).status_code == 422


def test_resolve_does_not_log_the_place(c, caplog):
    with caplog.at_level(logging.DEBUG):
        c.post(RESOLVE, json={"query": "Port Blair"})
        c.post(URL, json={"lat": 11.6234, "lon": 92.7265, "place_label": "Port Blair"})
    assert "place_lookup found=true" in caplog.text
    for secret in ("Port Blair", "11.62", "92.72"):
        assert secret not in caplog.text
