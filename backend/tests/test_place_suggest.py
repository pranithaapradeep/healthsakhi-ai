"""Place suggestions (Photon adapter + API) — mocked, no network."""
import logging
from dataclasses import dataclass, field

import httpx
import pytest
from fastapi.testclient import TestClient

from app.hospitals.provider import HospitalProviderError
from app.hospitals.suggest import PhotonSuggester, Suggestion, parse_feature
from app.main import create_app
from tests.conftest import CLIENT_HEADERS

URL = "/api/v1/hospitals/suggest"
UA = "HealthSakhiAI/0.5 (+test@example.com)"


def feat(name, lat, lon, cc="IN", **props):
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"name": name, "countrycode": cc, "type": "city", **props}}


def photon(handler, clock=None, slept=None):
    clock = clock or [0.0]
    slept = slept if slept is not None else []
    client = httpx.Client(transport=httpx.MockTransport(handler), headers={"User-Agent": UA})
    return PhotonSuggester("https://photon.test/api", UA, 4, client=client, sleep=slept.append, clock=lambda: clock[0])


def ok(features):
    return httpx.Response(200, json={"type": "FeatureCollection", "features": features})


# --- Adapter ------------------------------------------------------------------------------------------------


def test_request_is_restricted_to_india_and_identifies_itself():
    seen = []
    photon(lambda req: seen.append(req) or ok([])).suggest("  Chen  nai ", "en")
    req = seen[0]
    assert req.headers["user-agent"] == UA and req.url.params["q"] == "Chen nai"
    assert req.url.params["bbox"] == "68.0,6.0,97.6,37.5" and req.url.params["lang"] == "en"
    assert req.extensions["timeout"]["read"] == 4


@pytest.mark.parametrize("lang", ["ta", "hi"])
def test_tamil_and_hindi_ask_for_local_names(lang):
    seen = []
    photon(lambda req: seen.append(req) or ok([])).suggest("Madurai", lang)
    assert "lang" not in seen[0].url.params


def test_parses_only_indian_places_and_builds_a_detail_line():
    features = [
        feat("Chennai", 13.08, 80.27, state="Tamil Nadu"),
        feat("Chennai", 13.08, 80.27, state="Tamil Nadu"),  # duplicate
        feat("Kathmandu", 27.7, 85.3, cc="NP"),
        feat("Nowhere", 51.5, -0.1),  # outside India's box
        feat("", 12.9, 77.6),  # unnamed
        feat("Anna Nagar", 13.085, 80.21, city="Chennai", state="Tamil Nadu", postcode="600040", type="district"),
    ]
    out = photon(lambda req: ok(features)).suggest("che", "en")
    assert out == [
        Suggestion("Chennai", "Tamil Nadu", 13.08, 80.27, "city"),
        Suggestion("Anna Nagar", "Chennai, Tamil Nadu, 600040", 13.085, 80.21, "district"),
    ]


def test_at_most_five_suggestions():
    out = photon(lambda req: ok([feat(f"Place {i}", 20 + i / 10, 78) for i in range(8)])).suggest("place", "en")
    assert len(out) == 5


def test_bad_geometry_is_skipped():
    assert parse_feature({"properties": {"name": "X", "countrycode": "IN"}, "geometry": {}}) is None


def test_cached_including_no_match_but_errors_are_not():
    calls = []
    p = photon(lambda req: calls.append(req) or ok([]))
    assert p.suggest("zzzq", "en") == [] and p.suggest("ZZZQ", "en") == []
    assert len(calls) == 1

    responses = [httpx.Response(503), ok([feat("Pune", 18.52, 73.85)])]
    q = photon(lambda req: responses.pop(0))
    with pytest.raises(HospitalProviderError):
        q.suggest("pune", "en")
    assert [s.label for s in q.suggest("pune", "en")] == ["Pune"]


def test_cache_expires_after_a_day():
    clock, calls = [0.0], []
    p = photon(lambda req: calls.append(req) or ok([]), clock=clock)
    p.suggest("kochi", "en")
    clock[0] = 24 * 3600 + 1
    p.suggest("kochi", "en")
    assert len(calls) == 2


def test_at_most_one_request_per_second_in_total():
    clock, slept = [50.0], []
    p = photon(lambda req: ok([]), clock=clock, slept=slept)
    p.suggest("kochi", "en")
    p.suggest("kolkata", "en")
    assert slept == [1.0]


@pytest.mark.parametrize(
    "response,kind",
    [(httpx.Response(429, headers={"retry-after": "60"}), "rate_limited"), (httpx.Response(504), "timeout"),
     (httpx.Response(503), "unavailable"), (httpx.Response(502), "unavailable"),
     (httpx.Response(200, content=b"<html>"), "unavailable"), (httpx.Response(200, json={"x": 1}), "unavailable")],
)
def test_upstream_errors(response, kind):
    with pytest.raises(HospitalProviderError) as info:
        photon(lambda req: response).suggest("delhi", "en")
    assert info.value.kind == kind
    if kind == "rate_limited":
        assert info.value.retry_after == 60


@pytest.mark.parametrize("exc,kind", [(httpx.ReadTimeout("t"), "timeout"), (httpx.ConnectError("c"), "unavailable")])
def test_network_errors(exc, kind):
    def handler(req):
        raise exc

    with pytest.raises(HospitalProviderError) as info:
        photon(handler).suggest("delhi", "en")
    assert info.value.kind == kind


# --- API ----------------------------------------------------------------------------------------------------


@dataclass
class FakeSuggester:
    results: list[Suggestion] = field(default_factory=lambda: [Suggestion("Chennai", "Tamil Nadu", 13.082712, 80.270698, "city")])
    error: HospitalProviderError | None = None
    calls: list[tuple[str, str]] = field(default_factory=list)
    name: str = "fake"
    attribution: str = "Photon by komoot · © OpenStreetMap contributors"

    def suggest(self, query, language):  # type: ignore[no-untyped-def]
        self.calls.append((query, language))
        if self.error:
            raise self.error
        return self.results


@pytest.fixture
def suggester():
    return FakeSuggester()


@pytest.fixture
def c(settings, engine, suggester):
    with TestClient(create_app(settings, engine, place_suggester=suggester), headers=CLIENT_HEADERS) as client:
        yield client


def test_suggest(c, suggester):
    res = c.post(URL, json={"query": "Chen", "language": "ta"})
    assert res.status_code == 200
    assert res.json() == {
        "suggestions": [{"label": "Chennai", "detail": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "kind": "city"}],
        "attribution": "Photon by komoot · © OpenStreetMap contributors",
    }
    assert suggester.calls == [("Chen", "ta")]


def test_no_match_is_an_empty_list(c, suggester):
    suggester.results = []
    res = c.post(URL, json={"query": "qqqq"})
    assert res.status_code == 200 and res.json()["suggestions"] == []


@pytest.mark.parametrize("payload", [{}, {"query": "ch"}, {"query": "  ch  "}, {"query": "x" * 81}, {"query": "Che\u0000n"},
                                     {"query": "Chennai", "language": "fr"}, {"query": "Chennai", "lat": 13}])
def test_validation(c, suggester, payload):
    assert c.post(URL, json=payload).status_code == 422 and suggester.calls == []


@pytest.mark.parametrize("kind,status,code", [("rate_limited", 503, "hospital_provider_rate_limited"), ("timeout", 504, "hospital_provider_timeout"),
                                              ("unavailable", 503, "hospital_provider_unavailable"), ("busy", 503, "hospital_provider_busy")])
def test_errors(c, suggester, kind, status, code):
    suggester.error = HospitalProviderError(kind, "test")
    res = c.post(URL, json={"query": "Chennai"})
    assert res.status_code == status and res.json()["detail"] == code


def test_disabled_by_default_in_tests(client):
    res = client.post(URL, json={"query": "Chennai"})
    assert res.status_code == 503 and res.json()["detail"] == "hospital_search_not_configured"


def test_rate_limited_per_client(settings, engine, suggester):
    app = create_app(settings.model_copy(update={"place_suggest_rate_limit": 2}), engine, place_suggester=suggester)
    with TestClient(app, headers=CLIENT_HEADERS) as client:
        assert client.post(URL, json={"query": "Chennai"}).status_code == 200
        assert client.post(URL, json={"query": "Chennai"}).status_code == 200
        res = client.post(URL, json={"query": "Chennai"})
    assert res.status_code == 429 and res.json()["detail"] == "too_many_requests"


def test_typed_text_is_not_logged(c, caplog):
    with caplog.at_level(logging.DEBUG):
        c.post(URL, json={"query": "Mylapore"})
    assert "Mylapore" not in caplog.text


def test_requires_client_header(settings, engine, suggester):
    with TestClient(create_app(settings, engine, place_suggester=suggester)) as bare:
        assert bare.post(URL, json={"query": "Chennai"}).status_code == 403
