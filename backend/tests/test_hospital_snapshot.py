"""Offline OSM copy, provider fallback and provider selection — all local files and fakes, no network."""
import gzip
import json
import logging
from dataclasses import dataclass, field

import httpx
import pytest
from fastapi.testclient import TestClient

from app.hospitals import service
from app.hospitals.factory import build_hospital_provider, snapshot_path
from app.hospitals.fallback import FallbackHospitalProvider
from app.hospitals.osm import OSMHospitalProvider
from app.hospitals.provider import DisabledHospitalProvider, Facility, HospitalProviderError, Place
from app.hospitals.schemas import HospitalSearchRequest
from app.hospitals.snapshot import FORMAT, SnapshotHospitalProvider
from app.main import create_app
from scripts import build_hospital_snapshot as builder
from tests.conftest import CLIENT_HEADERS

LAT, LON = 13.083, 80.271


def hosp(id_, lat, lon, name, **tags):
    return {"type": "node", "id": id_, "lat": lat, "lon": lon, "tags": {"amenity": "hospital", "name": name, **tags}}


ELEMENTS = [
    hosp(1, 13.084, 80.272, "Near GH", **{"name:ta": "அருகு அரசு மருத்துவமனை", "healthcare:speciality": "neurology"}),
    {"type": "way", "id": 2, "center": {"lat": 13.10, "lon": 80.28}, "tags": {"healthcare": "hospital", "name": "Way Hospital"}},
    hosp(3, 13.20, 80.30, "Thirteen km"),  # ~13 km
    hosp(4, 13.50, 80.27, "Far Hospital"),  # ~46 km
    {"type": "node", "id": 5, "lat": 13.09, "lon": 80.275, "tags": {"amenity": "clinic", "name": "Small Clinic"}},
    hosp(6, 28.61, 77.21, "Delhi Hospital"),
]


def write(path, elements=ELEMENTS, clinics=False, fmt=FORMAT, as_of="2026-10-26"):
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump({"format": fmt, "data_as_of": as_of, "include_clinics": clinics, "elements": elements}, fh)
    return path


@dataclass
class FakeLive:
    facilities: list = field(default_factory=lambda: [Facility(id="osm:node/99", name="Live Hospital", kind="hospital", lat=13.085, lon=80.27)])
    error: HospitalProviderError | None = None
    geocode_calls: list = field(default_factory=list)
    search_calls: int = 0
    name: str = "fake-live"
    source_name: str = "OpenStreetMap"
    attribution: str = "© OpenStreetMap contributors"
    license: str = "ODbL 1.0"

    def geocode(self, query, language):  # type: ignore[no-untyped-def]
        self.geocode_calls.append(query)
        return Place(LAT, LON, "Chennai, Tamil Nadu, India")

    def search(self, lat, lon, radius_m, include_clinics, language):  # type: ignore[no-untyped-def]
        self.search_calls += 1
        if self.error:
            raise self.error
        return self.facilities


def run(provider, radius_km=10, **kw):
    return service.search(provider, HospitalSearchRequest(lat=LAT, lon=LON, radius_km=radius_km, **kw))


# --- Offline copy ---------------------------------------------------------------------------------------------


def test_snapshot_answers_with_the_same_radius_rules(tmp_path):
    p = SnapshotHospitalProvider(write(tmp_path / "h.json.gz"))
    assert [r.name for r in run(p, 10).results] == ["Near GH", "Way Hospital"]
    assert [r.name for r in run(p, 25).results] == ["Near GH", "Way Hospital", "Thirteen km"]
    assert "Far Hospital" in [r.name for r in run(p, 50).results]
    assert all(r.distance_km <= 50 for r in run(p, 50).results)
    assert "Delhi Hospital" not in [r.name for r in run(p, 50).results]


def test_snapshot_reports_its_date_and_source(tmp_path):
    res = run(SnapshotHospitalProvider(write(tmp_path / "h.json.gz")))
    assert res.data_as_of == "2026-10-26" and res.provider == "OpenStreetMap (offline copy)"
    assert res.results[0].source.license == "ODbL 1.0" and res.results[0].source.url == "https://www.openstreetmap.org/node/1"


def test_snapshot_names_departments_and_unverified_status_as_live(tmp_path):
    p = SnapshotHospitalProvider(write(tmp_path / "h.json.gz"))
    assert run(p, language="ta").results[0].name == "அருகு அரசு மருத்துவமனை"
    neuro = run(p, specialty="neurology").results
    assert [(r.name, r.specialty_status) for r in neuro] == [("Near GH", "listed_unverified")]


def test_snapshot_hospitals_only_by_default_and_clinics_only_if_in_the_copy(tmp_path):
    hospitals_only = SnapshotHospitalProvider(write(tmp_path / "a.json.gz"))
    assert "Small Clinic" not in [r.name for r in run(hospitals_only).results]
    with pytest.raises(HospitalProviderError) as info:
        run(hospitals_only, include_clinics=True)
    assert info.value.kind == "unavailable"  # never "no clinics" from a copy without clinics
    with_clinics = SnapshotHospitalProvider(write(tmp_path / "b.json.gz", clinics=True))
    assert "Small Clinic" in [r.name for r in run(with_clinics, include_clinics=True).results]
    assert "Small Clinic" not in [r.name for r in run(with_clinics).results]


def test_genuine_empty_area_is_empty(tmp_path):
    p = SnapshotHospitalProvider(write(tmp_path / "h.json.gz", elements=[]))
    assert run(p).total == 0


@pytest.mark.parametrize("make_file,kind", [
    (lambda p: None, "not_configured"),
    (lambda p: p.write_bytes(b"not gzip"), "unavailable"),
    (lambda p: write(p, fmt="other"), "unavailable"),
])
def test_snapshot_missing_or_broken(tmp_path, make_file, kind):
    path = tmp_path / "h.json.gz"
    make_file(path)
    with pytest.raises(HospitalProviderError) as info:
        run(SnapshotHospitalProvider(path))
    assert info.value.kind == kind


def test_snapshot_geocodes_through_the_live_geocoder(tmp_path):
    live = FakeLive()
    p = SnapshotHospitalProvider(write(tmp_path / "h.json.gz"), geocoder=live)
    assert p.geocode("Chennai", "en").label.startswith("Chennai") and live.geocode_calls == ["Chennai"]
    with pytest.raises(HospitalProviderError):
        SnapshotHospitalProvider(tmp_path / "h.json.gz").geocode("Chennai", "en")


# --- Fallback -------------------------------------------------------------------------------------------------


def test_primary_answers_without_touching_the_fallback(tmp_path):
    live = FakeLive()
    res = run(FallbackHospitalProvider(SnapshotHospitalProvider(write(tmp_path / "h.json.gz")), live))
    assert res.provider == "OpenStreetMap (offline copy)" and live.search_calls == 0


def test_missing_copy_falls_back_to_live_and_says_so(tmp_path, caplog):
    live = FakeLive()
    with caplog.at_level(logging.WARNING):
        res = run(FallbackHospitalProvider(SnapshotHospitalProvider(tmp_path / "missing.json.gz"), live))
    assert [r.name for r in res.results] == ["Live Hospital"]
    assert res.provider == "OpenStreetMap" and res.data_as_of is None and live.search_calls == 1
    assert "hospital_provider_fallback step=search primary=osm-snapshot kind=not_configured" in caplog.text
    assert "13.08" not in caplog.text and "80.27" not in caplog.text


def test_empty_primary_result_is_not_replaced_by_the_fallback(tmp_path):
    live = FakeLive()
    res = run(FallbackHospitalProvider(SnapshotHospitalProvider(write(tmp_path / "h.json.gz", elements=[])), live))
    assert res.total == 0 and live.search_calls == 0


def test_clinics_request_falls_back_when_the_copy_has_none(tmp_path):
    live = FakeLive()
    res = run(FallbackHospitalProvider(SnapshotHospitalProvider(write(tmp_path / "h.json.gz")), live), include_clinics=True)
    assert res.provider == "OpenStreetMap" and live.search_calls == 1


def test_when_both_fail_the_fallback_error_is_reported(tmp_path):
    live = FakeLive(error=HospitalProviderError("overloaded", "test"))
    with pytest.raises(HospitalProviderError) as info:
        run(FallbackHospitalProvider(SnapshotHospitalProvider(tmp_path / "missing.json.gz"), live))
    assert info.value.kind == "overloaded"


def test_shared_geocoder_is_called_once(tmp_path):
    live = FakeLive()
    p = FallbackHospitalProvider(SnapshotHospitalProvider(tmp_path / "x", geocoder=live), live, geocoder=live)
    p.geocode("Chennai", "en")
    assert live.geocode_calls == ["Chennai"]


# --- Provider selection -----------------------------------------------------------------------------------


def test_provider_selection(settings, tmp_path):
    assert isinstance(build_hospital_provider(settings.model_copy(update={"hospital_provider": "none"})), DisabledHospitalProvider)
    assert isinstance(build_hospital_provider(settings.model_copy(update={"hospital_provider": "osm"})), OSMHospitalProvider)
    snap = settings.model_copy(update={"hospital_provider": "snapshot", "hospital_snapshot_path": str(tmp_path / "h.json.gz")})
    combined = build_hospital_provider(snap)
    assert isinstance(combined, FallbackHospitalProvider)
    assert isinstance(combined.primary, SnapshotHospitalProvider) and isinstance(combined.fallback, OSMHospitalProvider)
    alone = build_hospital_provider(snap.model_copy(update={"hospital_fallback_provider": "none"}))
    assert isinstance(alone, SnapshotHospitalProvider)


def test_relative_snapshot_path_is_inside_the_backend_folder(settings):
    p = snapshot_path(settings.model_copy(update={"hospital_snapshot_path": "data/hospitals-india.json.gz"}))
    assert p.parts[-3:] == ("backend", "data", "hospitals-india.json.gz") or p.parts[-2:] == ("data", "hospitals-india.json.gz")


def test_missing_copy_is_reported_once_at_startup(settings, tmp_path, caplog):
    # On a server the copy was not deployed to, every search would otherwise fail over to live Overpass silently.
    missing = settings.model_copy(update={"hospital_provider": "snapshot", "hospital_snapshot_path": str(tmp_path / "absent.json.gz")})
    with caplog.at_level(logging.WARNING, logger="healthsakhi"):
        build_hospital_provider(missing)
    assert "hospital_snapshot_missing" in caplog.text and "fallback=osm" in caplog.text

    caplog.clear()
    present = missing.model_copy(update={"hospital_snapshot_path": str(write(tmp_path / "present.json.gz"))})
    with caplog.at_level(logging.WARNING, logger="healthsakhi"):
        build_hospital_provider(present)
        build_hospital_provider(settings.model_copy(update={"hospital_provider": "osm"}))  # live only: no copy expected
    assert "hospital_snapshot_missing" not in caplog.text


def test_deployed_india_copy_answers_when_present(settings):
    """The copy that ships with the backend (backend/data/hospitals-india.json.gz) must load and find real hospitals."""
    path = snapshot_path(settings.model_copy(update={"hospital_snapshot_path": "data/hospitals-india.json.gz"}))
    if not path.is_file():
        pytest.skip("offline India copy not present in this checkout")
    facilities, source = SnapshotHospitalProvider(path).search_with_source(LAT, LON, 10_000, False, "en")  # central Chennai
    assert len(facilities) > 0
    assert source.data_as_of and source.license == "ODbL 1.0"


def test_default_provider_is_still_live_osm():
    from app.core.config import Settings

    assert Settings.model_fields["hospital_provider"].default == "osm"


def test_api_reports_offline_source_and_date(settings, engine, tmp_path):
    provider = FallbackHospitalProvider(SnapshotHospitalProvider(write(tmp_path / "h.json.gz")), FakeLive())
    with TestClient(create_app(settings, engine, hospital_provider=provider), headers=CLIENT_HEADERS) as c:
        body = c.post("/api/v1/hospitals/search", json={"lat": LAT, "lon": LON}).json()
    assert body["provider"] == "OpenStreetMap (offline copy)" and body["data_as_of"] == "2026-10-26"
    assert body["results"][0]["source"]["name"] == "OpenStreetMap (offline copy)"


# --- Snapshot builder (mocked Overpass) -----------------------------------------------------------------------


def test_tiles_cover_india():
    t = builder.tiles(4.0)
    assert len(t) == 64
    assert min(x[0] for x in t) == 6.0 and max(x[2] for x in t) == 37.5
    assert min(x[1] for x in t) == 68.0 and max(x[3] for x in t) == 97.6


def test_slim_keeps_only_displayed_tags_and_drops_unnamed():
    el = hosp(1, 13.0, 80.0, "A", phone="+91 44 1234 5678", **{"addr:city": "Chennai", "note": "x", "fixme": "y", "source": "survey"})
    assert builder.slim(el)["tags"] == {"amenity": "hospital", "name": "A", "phone": "+91 44 1234 5678", "addr:city": "Chennai"}
    assert builder.slim({"type": "node", "id": 2, "lat": 1, "lon": 1, "tags": {"amenity": "hospital"}}) is None
    assert builder.slim({"type": "way", "id": 3, "tags": {"amenity": "hospital", "name": "B"}}) is None


def test_tile_query_is_polite():
    q = builder.tile_query((6.0, 68.0, 10.0, 72.0), False)
    assert q.startswith("[out:json][timeout:180][maxsize:") and "(6.0000,68.0000,10.0000,72.0000)" in q and "clinic" not in q


def _overpass(calls, fail=lambda n: None):
    """Mock Overpass: call n returns fail(n) if that is a response/exception, else a good tile answer."""

    def handler(req):
        calls.append(req)
        n = len(calls)
        bad = fail(n)
        if isinstance(bad, Exception):
            raise bad
        if bad is not None:
            return bad
        return httpx.Response(200, json={"osm3s": {"timestamp_osm_base": f"2026-10-{20 + n % 5:02d}T10:00:00Z"},
                                         "elements": [hosp(1, 13.08, 80.27, "Shared"), hosp(1000 + n, 13.0, 80.0, f"H{n}")]})
    return handler


def _build(out, calls, fail=lambda n: None, waits=None, **kw):
    waits = waits if waits is not None else []
    with httpx.Client(transport=httpx.MockTransport(_overpass(calls, fail))) as client:
        return builder.build(out, client, "https://overpass.test/api/interpreter", 4.0, False, 0, sleep=waits.append, **kw)


def _doc(out):
    with gzip.open(out, "rt", encoding="utf-8") as fh:
        return json.load(fh)


def test_build_writes_a_deduplicated_dated_copy(tmp_path):
    calls = []
    out = tmp_path / "h.json.gz"
    assert _build(out, calls)
    assert len(calls) == 64
    doc = _doc(out)
    assert doc["format"] == FORMAT and doc["include_clinics"] is False and doc["data_as_of"] == "2026-10-20"
    assert len(doc["elements"]) == 65  # one shared building + 64 distinct
    assert sum(1 for e in doc["elements"] if e["id"] == 1) == 1
    assert not (tmp_path / "h.json.gz.partial.json").exists()
    assert SnapshotHospitalProvider(out).search(13.08, 80.27, 5000, False, "en")


def test_missing_output_folder_is_created_before_any_progress_is_written(tmp_path):
    out = tmp_path / "does" / "not" / "exist" / "h.json.gz"
    calls = []
    # Fail permanently on the first tile so the very first write is the progress file.
    assert not _build(out, calls, fail=lambda n: httpx.Response(503), max_retries=0)
    assert (out.parent / "h.json.gz.partial.json").exists()
    assert json.loads((out.parent / "h.json.gz.partial.json").read_text(encoding="utf-8"))["done"] == {}


@pytest.mark.parametrize("bad", [httpx.Response(429), httpx.Response(502), httpx.Response(503), httpx.Response(504),
                                 httpx.ReadTimeout("slow"), httpx.ConnectError("reset"), httpx.Response(200, content=b"<html>")])
def test_transient_failures_are_retried_with_growing_waits(tmp_path, bad):
    calls, waits = [], []
    out = tmp_path / "h.json.gz"
    assert _build(out, calls, fail=lambda n: bad if n in (5, 6) else None, waits=waits)  # tile 5 fails twice
    assert len(calls) == 66
    retry_waits = [w for w in waits if w > 0]
    expected = [30.0, 30.0] if isinstance(bad, httpx.Response) and bad.status_code == 429 else [15.0, 30.0]
    assert retry_waits == expected  # 429: at least 30 s (Overpass policy); otherwise 15 s, then doubled
    assert len(_doc(out)["elements"]) == 65


def test_retry_after_header_is_respected(tmp_path):
    calls, waits = [], []
    assert _build(tmp_path / "h.json.gz", calls, fail=lambda n: httpx.Response(429, headers={"retry-after": "90"}) if n == 1 else None, waits=waits)
    assert [w for w in waits if w > 0] == [90.0]


def test_stops_safely_when_still_overloaded_and_resumes_later(tmp_path):
    out = tmp_path / "h.json.gz"
    progress = tmp_path / "h.json.gz.partial.json"
    calls, waits = [], []
    # Tiles 1–9 succeed, then the server stays busy: 1 try + 3 retries for tile 10, then stop.
    assert not _build(out, calls, fail=lambda n: httpx.Response(502, text="at capacity") if n >= 10 else None, waits=waits)
    assert len(calls) == 9 + 4 and [w for w in waits if w > 0] == [15.0, 30.0, 60.0]
    assert not out.exists() and len(json.loads(progress.read_text(encoding="utf-8"))["done"]) == 9

    calls2 = []
    assert _build(out, calls2)  # same command again: resumes
    assert len(calls2) == 64 - 9  # only the tiles not yet downloaded
    elements = _doc(out)["elements"]
    ids = [f"{e['type']}/{e['id']}" for e in elements]
    assert len(ids) == len(set(ids))  # no duplicate records across the two runs
    assert not progress.exists()


def test_interrupted_progress_write_leaves_the_old_checkpoint_intact(tmp_path, monkeypatch):
    out = tmp_path / "h.json.gz"
    progress = tmp_path / "h.json.gz.partial.json"
    assert not _build(out, [], fail=lambda n: httpx.Response(503) if n >= 4 else None, max_retries=0)
    saved = progress.read_text(encoding="utf-8")

    real_replace = builder.os.replace

    def crash(src, dst):  # power cut just before the rename
        if str(dst).endswith(".partial.json"):
            raise KeyboardInterrupt
        return real_replace(src, dst)

    monkeypatch.setattr(builder.os, "replace", crash)
    with pytest.raises(KeyboardInterrupt):
        _build(out, [])
    monkeypatch.setattr(builder.os, "replace", real_replace)
    assert progress.read_text(encoding="utf-8") == saved  # still the last complete checkpoint
    json.loads(saved)


def test_unreadable_checkpoint_is_set_aside_not_trusted(tmp_path):
    out = tmp_path / "h.json.gz"
    (tmp_path / "h.json.gz.partial.json").write_text("{not json", encoding="utf-8")
    calls = []
    assert _build(out, calls)
    assert len(calls) == 64 and (tmp_path / "h.json.gz.partial.json.corrupt").exists()


def test_checkpoint_from_other_options_is_not_mixed_in(tmp_path):
    out = tmp_path / "h.json.gz"
    (tmp_path / "h.json.gz.partial.json").write_text(json.dumps({"deg": 2.0, "with_clinics": False, "done": {"x": []}, "timestamps": []}), encoding="utf-8")
    calls = []
    assert not _build(out, calls)  # refuses to resume with different tiles
    assert calls == []
    assert _build(out, calls, restart=True) and len(calls) == 64


def test_too_big_tile_stops_without_retrying(tmp_path):
    calls, waits = [], []
    bad = httpx.Response(200, json={"remark": "runtime error: Query run out of memory", "elements": []})
    assert not _build(tmp_path / "h.json.gz", calls, fail=lambda n: bad, waits=waits)
    assert len(calls) == 1 and waits == []


def test_console_messages_work_on_a_cp1252_windows_console(tmp_path, monkeypatch):
    """Regression: the final DONE line used '→', which a cp1252 PowerShell console cannot encode."""
    import io
    import sys

    raw = io.BytesIO()
    console = io.TextIOWrapper(raw, encoding="cp1252", errors="strict", write_through=True)
    monkeypatch.setattr(sys, "stdout", console)
    out = tmp_path / "h.json.gz"
    # Every kind of message: retry wait, STOPPED, Resuming, DONE.
    assert not _build(out, [], fail=lambda n: httpx.Response(502) if n >= 3 else None, max_retries=1)
    assert _build(out, [], fail=lambda n: httpx.Response(429) if n == 1 else None)
    console.flush()
    text = raw.getvalue().decode("cp1252")
    assert "waiting 15 s before retry" in text and "STOPPED:" in text and "Resuming: 2 tiles" in text
    # Run 1 saved H1001-H1002; run 2 downloaded H1002-H1063 (call 1 was the 429): 63 distinct + 1 shared building.
    assert "DONE: 64 listings, data as of 2026-10-20 -> " in text
    assert len(_doc(out)["elements"]) == 64  # the copy itself is unaffected (written as UTF-8)


def test_every_console_message_in_the_builder_is_ascii():
    import inspect

    src = inspect.getsource(builder)
    lines = [ln for ln in src.splitlines() if any(k in ln for k in ("print(", "Stop(", "Transient("))]
    assert lines and all(ln.isascii() for ln in lines), [ln for ln in lines if not ln.isascii()]
