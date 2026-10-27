"""OpenStreetMap adapter tests with httpx.MockTransport — no network calls."""
import math
import threading
import time

import httpx
import pytest

from app.hospitals import service
from app.hospitals.osm import OSMHospitalProvider, bbox_around, build_overpass_query, parse_element
from app.hospitals.provider import HospitalProviderError
from app.hospitals.schemas import HospitalSearchRequest
from app.hospitals.service import haversine_km
from app.hospitals.specialties import OSM_VALUES, SPECIALTY_KEYS, specialties_from_osm

UA = "HealthSakhiAI/0.5 (+test@example.com)"


def make(handler, clock=None, slept=None, timeout=20, sleep=None):
    clock = clock or [0.0]
    slept = slept if slept is not None else []
    client = httpx.Client(transport=httpx.MockTransport(handler), headers={"User-Agent": UA})
    return OSMHospitalProvider("https://nominatim.test", "https://overpass.test/api/interpreter", UA, timeout, 3600,
                               client=client, sleep=sleep or slept.append, clock=lambda: clock[0], nominatim_timeout_seconds=10)


def node(id_, lat, lon, name):
    return {"type": "node", "id": id_, "lat": lat, "lon": lon, "tags": {"amenity": "hospital", "name": name}}


def ok(elements):
    return httpx.Response(200, json={"elements": elements})


def test_specialty_table_covers_all_twenty_departments():
    assert len(SPECIALTY_KEYS) == 20 and all(OSM_VALUES[k] for k in SPECIALTY_KEYS)


@pytest.mark.parametrize(
    "values,facility,emergency,expected",
    [
        (["cardiology", "general"], None, None, {"cardiology", "general_medicine"}),
        (["Paediatrics", " neonatology "], None, None, {"paediatrics"}),
        (["otolaryngology"], None, None, {"ent"}),
        (["gynaecology"], None, None, {"obgyn"}),
        (["orthopedics"], None, None, {"orthopaedics"}),
        ([], "dentist", None, {"dentistry"}),
        ([], None, "yes", {"emergency"}),
        (["trauma"], None, "no", set()),  # an explicit emergency=no wins
        (["homeopathy"], None, None, set()),
        ([], None, None, set()),
    ],
)
def test_specialties_from_osm(values, facility, emergency, expected):
    assert specialties_from_osm(values, facility, emergency) == expected


def test_parse_element_takes_only_what_is_listed():
    el = {"type": "node", "id": 7, "lat": 28.6, "lon": 77.2, "tags": {
        "amenity": "hospital", "name": "AIIMS", "name:hi": "एम्स", "healthcare:speciality": "neurology;oncology",
        "emergency": "yes", "phone": "+91 11 2658 8500;not-a-number", "website": "javascript:alert(1)",
        "contact:website": "https://www.aiims.edu", "operator:type": "government", "addr:city": "New Delhi",
        "addr:postcode": "110029", "opening_hours": "24/7"}}
    f = parse_element(el, "hi")
    assert f.name == "एम्स" and f.kind == "hospital"
    assert f.phones == ("+91 11 2658 8500",)
    assert f.website == "https://www.aiims.edu"  # the javascript: value is rejected
    assert f.address == "New Delhi, 110029" and f.opening_hours == "24/7" and f.operator_type == "government"
    assert f.specialties == {"neurology", "oncology", "emergency"} and f.has_specialty_info
    assert f.source_url == "https://www.openstreetmap.org/node/7"


def test_parse_way_centre_and_skip_unnamed_or_unlocated():
    assert parse_element({"type": "way", "id": 1, "center": {"lat": 9.9, "lon": 76.3}, "tags": {"healthcare": "hospital", "name": "X"}}, "en").lat == 9.9
    assert parse_element({"type": "node", "id": 2, "lat": 9.9, "lon": 76.3, "tags": {"amenity": "hospital"}}, "en") is None
    assert parse_element({"type": "way", "id": 3, "tags": {"amenity": "hospital", "name": "Y"}}, "en") is None


def test_minimal_listing_has_no_invented_details():
    f = parse_element({"type": "node", "id": 9, "lat": 26.1, "lon": 91.7, "tags": {"amenity": "hospital", "name": "Z"}}, "en")
    assert (f.address, f.phones, f.website, f.opening_hours, f.operator_type, f.emergency_tag) == (None, (), None, None, None, None)
    assert f.specialties == frozenset() and not f.has_specialty_info


def test_overpass_query_uses_a_bounding_box_not_around():
    q = build_overpass_query(13.082712, 80.270698, 10000, False, 25)
    assert "around" not in q and '["amenity"="hospital"]' in q and '["healthcare"="hospital"]' in q and "clinic" not in q
    assert q.startswith("[out:json][timeout:25][maxsize:67108864];") and q.endswith("out center tags;")
    s, w, n, e = bbox_around(13.083, 80.271, 10000)
    assert f"nwr({s:.4f},{w:.4f},{n:.4f},{e:.4f})" in q
    assert "clinic" in build_overpass_query(13.08, 80.27, 5000, True, 25)


@pytest.mark.parametrize("lat,lon", [(13.083, 80.271), (34.08, 74.80), (8.08, 77.55), (27.1, 93.6)])
@pytest.mark.parametrize("radius_m", [5000, 10000, 25000, 50000])
def test_bounding_box_contains_the_whole_search_circle(lat, lon, radius_m):
    s, w, n, e = bbox_around(lat, lon, radius_m)
    # Points on the circle in 16 directions (computed with the same haversine distance the service applies).
    for i in range(16):
        bearing = math.radians(i * 22.5)
        d = radius_m / 6_371_008.8
        p1 = math.radians(lat)
        p2 = math.asin(math.sin(p1) * math.cos(d) + math.cos(p1) * math.sin(d) * math.cos(bearing))
        l2 = math.radians(lon) + math.atan2(math.sin(bearing) * math.sin(d) * math.cos(p1), math.cos(d) - math.sin(p1) * math.sin(p2))
        plat, plon = math.degrees(p2), math.degrees(l2)
        assert abs(haversine_km(lat, lon, plat, plon) - radius_m / 1000) < 0.01
        assert s < plat < n and w < plon < e


def test_geocode_request_follows_nominatim_policy():
    seen = []

    def handler(req):
        seen.append(req)
        return httpx.Response(200, json=[{"lat": "13.08", "lon": "80.27", "display_name": "Chennai, Tamil Nadu, India"}])

    p = make(handler)
    place = p.geocode("  Chennai ", "ta")
    assert place.label == "Chennai, Tamil Nadu, India"
    req = seen[0]
    assert req.headers["user-agent"] == UA
    assert req.url.params["countrycodes"] == "in" and req.url.params["q"] == "Chennai" and req.url.params["accept-language"] == "ta"


def test_pin_code_uses_structured_postalcode_search():
    seen = []
    p = make(lambda req: seen.append(req) or httpx.Response(200, json=[]))
    assert p.geocode("110001", "en") is None
    assert seen[0].url.params["postalcode"] == "110001" and "q" not in seen[0].url.params


def test_geocode_is_cached_including_no_match():
    seen = []
    p = make(lambda req: seen.append(req) or httpx.Response(200, json=[]))
    p.geocode("Nowhere", "en")
    p.geocode("nowhere", "en")
    assert len(seen) == 1


def test_nominatim_is_limited_to_one_request_per_second():
    clock, slept = [100.0], []
    p = make(lambda req: httpx.Response(200, json=[]), clock=clock, slept=slept)
    p.geocode("Kochi", "en")
    p.geocode("Madurai", "en")  # same instant → must wait
    assert slept == [1.0]


def test_search_parses_and_caches():
    seen = []
    data = {"elements": [{"type": "node", "id": 1, "lat": 13.08, "lon": 80.27, "tags": {"amenity": "hospital", "name": "A"}}]}
    p = make(lambda req: seen.append(req) or httpx.Response(200, json=data))
    first = p.search(13.0827, 80.2707, 5000, False, "en")
    second = p.search(13.0827, 80.2707, 5000, False, "en")
    assert [f.name for f in first] == ["A"] and first == second and len(seen) == 1
    assert seen[0].method == "POST" and b"around" not in seen[0].content and b"nwr%28" in seen[0].content


@pytest.mark.parametrize(
    "response,kind",
    [
        (httpx.Response(429, headers={"retry-after": "12"}), "rate_limited"),
        (httpx.Response(504), "timeout"),
        (httpx.Response(408), "timeout"),
        (httpx.Response(502), "unavailable"),
        (httpx.Response(503), "unavailable"),
        (httpx.Response(502, text="This Overpass API server is currently at capacity. ... the request queue is full."), "overloaded"),
        (httpx.Response(500), "unavailable"),
        (httpx.Response(200, content=b"<html>not json</html>"), "unavailable"),
        (httpx.Response(200, json={"remark": "runtime error: Query timed out", "elements": []}), "timeout"),
        (httpx.Response(200, json={"unexpected": True}), "unavailable"),
    ],
)
def test_search_errors(response, kind):
    p = make(lambda req: response)
    with pytest.raises(HospitalProviderError) as info:
        p.search(13.08, 80.27, 5000, False, "en")
    assert info.value.kind == kind


def test_rate_limit_retry_after_is_kept():
    p = make(lambda req: httpx.Response(429, headers={"retry-after": "12"}))
    with pytest.raises(HospitalProviderError) as info:
        p.search(13.08, 80.27, 5000, False, "en")
    assert info.value.retry_after == 12


@pytest.mark.parametrize("exc,kind", [(httpx.ConnectTimeout("t"), "timeout"), (httpx.ConnectError("c"), "unavailable")])
def test_network_errors(exc, kind):
    def handler(req):
        raise exc

    p = make(handler)
    with pytest.raises(HospitalProviderError) as info:
        p.geocode("Delhi", "en")
    assert info.value.kind == kind


# --- Budgets, caching, single-flight ------------------------------------------------------------------------


def test_geocode_uses_its_own_short_timeout():
    seen = []
    make(lambda req: seen.append(req) or httpx.Response(200, json=[])).geocode("Pune", "en")
    assert seen[0].extensions["timeout"]["read"] == 10


def test_overpass_call_is_bounded_by_the_search_budget():
    seen = []
    p = make(lambda req: seen.append(req) or ok([]), timeout=40)
    p.search(13.08, 80.27, 10000, False, "en")
    t = seen[0].extensions["timeout"]
    assert t["read"] <= 40 and t["connect"] <= 5
    assert b"%5Btimeout%3A37%5D" in seen[0].content  # server-side limit ends before ours


def test_read_timeout_is_reported_as_timeout():
    def handler(req):
        raise httpx.ReadTimeout("slow")

    with pytest.raises(HospitalProviderError) as info:
        make(handler).search(13.08, 80.27, 10000, False, "en")
    assert info.value.kind == "timeout"


def test_waits_for_another_search_only_within_the_budget():
    p = make(lambda req: ok([]), timeout=10.3)  # leaves 0.3 s to wait for the queue
    p._overpass_lock.acquire()
    try:
        started = time.monotonic()
        with pytest.raises(HospitalProviderError) as info:
            p.search(13.08, 80.27, 10000, False, "en")
        assert info.value.kind == "busy" and time.monotonic() - started < 2
    finally:
        p._overpass_lock.release()


def test_identical_concurrent_searches_share_one_overpass_query():
    calls = []

    def handler(req):
        calls.append(req)
        time.sleep(0.2)
        return ok([node(1, 13.08, 80.27, "A")])

    p = make(handler)
    results = []
    threads = [threading.Thread(target=lambda: results.append(p.search(13.08, 80.27, 10000, False, "en"))) for _ in range(3)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(calls) == 1 and [[f.name for f in r] for r in results] == [["A"]] * 3


def test_cache_expires():
    clock, calls = [0.0], []
    p = make(lambda req: calls.append(req) or ok([]), clock=clock)
    p.search(13.08, 80.27, 10000, False, "en")
    clock[0] = 3599
    p.search(13.08, 80.27, 10000, False, "en")
    assert len(calls) == 1
    clock[0] = 3601
    p.search(13.08, 80.27, 10000, False, "en")
    assert len(calls) == 2


def test_cache_is_language_independent_but_names_are_localised():
    calls = []
    el = {"type": "node", "id": 1, "lat": 13.08, "lon": 80.27, "tags": {"amenity": "hospital", "name": "GH", "name:ta": "அரசு மருத்துவமனை"}}
    p = make(lambda req: calls.append(req) or ok([el]))
    assert p.search(13.08, 80.27, 10000, False, "en")[0].name == "GH"
    assert p.search(13.08, 80.27, 10000, False, "ta")[0].name == "அரசு மருத்துவமனை"
    assert len(calls) == 1


def test_a_cached_larger_radius_answers_a_smaller_one_but_not_the_reverse():
    calls = []
    p = make(lambda req: calls.append(req) or ok([]))
    p.search(13.08, 80.27, 50000, False, "en")
    p.search(13.08, 80.27, 10000, False, "en")
    p.search(13.08, 80.27, 5000, False, "en")
    assert len(calls) == 1
    p.search(13.08, 80.27, 50000, True, "en")  # clinics: different data
    assert len(calls) == 2
    q = make(lambda req: calls.append(req) or ok([]))
    q.search(13.08, 80.27, 10000, False, "en")
    q.search(13.08, 80.27, 25000, False, "en")
    assert len(calls) == 4


@pytest.mark.parametrize("first", [httpx.Response(504), httpx.Response(429), httpx.Response(500),
                                   httpx.Response(200, json={"remark": "runtime error: Query timed out", "elements": [node(1, 13.08, 80.27, "Partial")]})])
def test_failures_and_partial_answers_are_never_cached(first):
    responses = [first, ok([node(2, 13.08, 80.27, "B")])]
    p = make(lambda req: responses.pop(0))
    with pytest.raises(HospitalProviderError):
        p.search(13.08, 80.27, 10000, False, "en")
    assert [f.name for f in p.search(13.08, 80.27, 10000, False, "en")] == ["B"]


def test_genuine_empty_answer_is_returned_as_empty_not_an_error():
    assert make(lambda req: ok([])).search(13.08, 80.27, 10000, False, "en") == []


def test_box_corners_are_dropped_by_the_distance_filter():
    """The box is wider than the circle: corner listings come back from Overpass but are not shown."""
    lat, lon = 13.083, 80.271
    s, w, n, e = bbox_around(lat, lon, 10000)
    corner = node(1, n - 0.001, e - 0.001, "Corner")  # inside the box, ~14 km away
    edge = node(2, lat + 0.089, lon, "Edge")  # ~9.9 km north
    centre = node(3, lat, lon, "Centre")
    p = make(lambda req: ok([corner, edge, centre]))
    res = service.search(p, HospitalSearchRequest(lat=lat, lon=lon, radius_km=10))
    assert [r.name for r in res.results] == ["Centre", "Edge"]
    assert all(r.distance_km <= 10 for r in res.results)



# --- Bounded retries (only quick, explicitly transient failures) ---------------------------------------------

CAPACITY = "# 502 Gateway Timeout\n\nThis Overpass API server is currently at capacity. All query workers are busy\nand the request queue is full."


def test_retries_a_quick_at_capacity_answer_with_backoff():
    calls, slept = [], []
    responses = [httpx.Response(502, text=CAPACITY), httpx.Response(503, text=CAPACITY), ok([node(1, 13.08, 80.27, "A")])]
    p = make(lambda req: calls.append(req) or responses.pop(0), slept=slept)
    assert [f.name for f in p.search(13.08, 80.27, 10000, False, "en")] == ["A"]
    assert len(calls) == 3 and slept == [2.0, 4.0]


def test_gives_up_after_three_attempts_and_says_overloaded():
    calls, slept = [], []
    p = make(lambda req: calls.append(req) or httpx.Response(502, text=CAPACITY), slept=slept)
    with pytest.raises(HospitalProviderError) as info:
        p.search(13.08, 80.27, 10000, False, "en")
    assert info.value.kind == "overloaded" and info.value.retry_after == 60
    assert len(calls) == 3 and slept == [2.0, 4.0]
    # …and the failure is not cached: the next search asks again.
    with pytest.raises(HospitalProviderError):
        p.search(13.08, 80.27, 10000, False, "en")
    assert len(calls) == 6


@pytest.mark.parametrize("response,kind", [(httpx.Response(429, headers={"retry-after": "30"}), "rate_limited"),
                                           (httpx.Response(504), "timeout"), (httpx.Response(500), "unavailable")])
def test_no_retry_for_rate_limits_gateway_timeouts_or_other_errors(response, kind):
    calls, slept = [], []
    p = make(lambda req: calls.append(req) or response, slept=slept)
    with pytest.raises(HospitalProviderError) as info:
        p.search(13.08, 80.27, 10000, False, "en")
    assert info.value.kind == kind and len(calls) == 1 and slept == []


def test_no_retry_after_a_read_timeout():
    calls = []

    def handler(req):
        calls.append(req)
        raise httpx.ReadTimeout("slow")

    with pytest.raises(HospitalProviderError) as info:
        make(handler).search(13.08, 80.27, 10000, False, "en")
    assert info.value.kind == "timeout" and len(calls) == 1


def test_connection_error_is_retried():
    calls, slept = [], []

    def handler(req):
        calls.append(req)
        if len(calls) == 1:
            raise httpx.ConnectError("reset")
        return ok([])

    assert make(handler, slept=slept).search(13.08, 80.27, 10000, False, "en") == []
    assert len(calls) == 2 and slept == [2.0]


def test_retries_stay_inside_the_time_budget():
    clock, calls = [0.0], []

    def sleep(s):
        clock[0] += s

    def handler(req):
        calls.append(req)
        clock[0] += 3  # each answer takes 3 s
        return httpx.Response(503, text=CAPACITY)

    p = make(handler, clock=clock, timeout=16, sleep=sleep)  # 3 s + 2 s backoff leaves 11 s; + 3 s + 4 s leaves 4 s
    with pytest.raises(HospitalProviderError) as info:
        p.search(13.08, 80.27, 10000, False, "en")
    assert info.value.kind == "overloaded" and len(calls) == 2 and clock[0] <= 16
    timeouts = [r.extensions["timeout"]["read"] for r in calls]
    assert timeouts == [16, 11]  # each attempt only gets what is left


def test_ipv4_only_option_builds_an_ipv4_transport():
    p = OSMHospitalProvider("https://n.test", "https://o.test", UA, 20, 60, ipv4_only=True)
    assert p._client._transport._pool._local_address == "0.0.0.0"
