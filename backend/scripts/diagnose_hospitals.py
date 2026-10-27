"""Diagnose slow hospital searches against the REAL public OpenStreetMap services, step by step. Read-only.

Searches a public place name only ("Chennai") — never your device location. Sends 4 requests in total, one at
a time, with pauses between them (Nominatim max 1/s; Overpass: no parallel queries). Prints HTTP status, timing,
result counts and server remarks. Does not print your OSM_CONTACT value, IP address or any secret.

It also checks that the app's bounding-box query finds the same hospitals within the radius as the older
`around` query (both answers are filtered by distance exactly as the app does, then compared by OSM id).

Run from the backend folder:
    .venv\\Scripts\\python.exe -m scripts.diagnose_hospitals
Connect over IPv4 only for this run (to compare with step 0):
    .venv\\Scripts\\python.exe -m scripts.diagnose_hospitals --ipv4
Optionally test another Overpass server once (does not change .env):
    .venv\\Scripts\\python.exe -m scripts.diagnose_hospitals --overpass-url <URL of another Overpass interpreter>
"""
from __future__ import annotations

import argparse
import socket
import time
from urllib.parse import urlparse

import httpx

from app.core.config import Settings
from app.hospitals.osm import build_overpass_query
from app.hospitals.service import haversine_km

PLACE = "Chennai"
RADIUS_M = 10_000
QUERY_TIMEOUT_S = 37  # the [timeout:] the app sends with the default 40 s budget
HTTP_TIMEOUT_S = 45  # how long this script waits for an answer


def around_query(lat: float, lon: float, radius_m: int, timeout_s: int) -> str:
    """The query the app used before (kept here only for comparison)."""
    a = f"(around:{radius_m},{lat:.3f},{lon:.3f})"
    return f'[out:json][timeout:{timeout_s}];(nwr{a}["amenity"="hospital"];nwr{a}["healthcare"="hospital"];);out center tags;'


def within_radius(data: dict, lat: float, lon: float, radius_m: int) -> dict[str, str]:
    """{osm id: name} of named hospitals whose centre is within the radius — the same rule the app applies."""
    out = {}
    for e in data.get("elements", []):
        c = e if e.get("type") == "node" else (e.get("center") or {})
        name = (e.get("tags") or {}).get("name")
        if name and c.get("lat") is not None and haversine_km(lat, lon, c["lat"], c["lon"]) <= radius_m / 1000:
            out[f"{e['type']}/{e['id']}"] = name
    return out


def connection_check(url: str) -> None:
    """Time DNS and a bare TCP connect per address family. No HTTP request; prints no IP addresses."""
    host = urlparse(url).hostname or ""
    print(f"\n--- 0. Connection to {host}:443 (no query is sent)")
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        print(f"    DNS failed: {exc}")
        return
    order = [("IPv6" if fam == socket.AF_INET6 else "IPv4") for fam, *_ in infos]
    print(f"    address order the system tries: {list(dict.fromkeys(order))}")
    for fam, label in ((socket.AF_INET, "IPv4"), (socket.AF_INET6, "IPv6")):
        addr = next((i[4] for i in infos if i[0] == fam), None)
        if addr is None:
            print(f"    {label}: no address")
            continue
        t0 = time.monotonic()
        sock = socket.socket(fam, socket.SOCK_STREAM)
        sock.settimeout(10)
        try:
            sock.connect(addr)
            print(f"    {label}: connected in {time.monotonic() - t0:.2f}s")
        except OSError as exc:
            print(f"    {label}: FAILED after {time.monotonic() - t0:.1f}s ({type(exc).__name__})")
        finally:
            sock.close()


def timed(label: str, fn):  # type: ignore[no-untyped-def]
    print(f"\n--- {label}")
    t0 = time.monotonic()
    try:
        res = fn()
    except httpx.TimeoutException as exc:
        print(f"    RESULT: timeout after {time.monotonic() - t0:.1f}s ({type(exc).__name__})")
        return None
    except httpx.HTTPError as exc:
        print(f"    RESULT: network error after {time.monotonic() - t0:.1f}s ({type(exc).__name__}: {str(exc)[:200]})")
        return None
    print(f"    http_status={res.status_code} time={time.monotonic() - t0:.1f}s bytes={len(res.content)}")
    if res.headers.get("retry-after"):
        print(f"    retry-after={res.headers['retry-after']}")
    return res


def overpass_result(res: httpx.Response | None) -> dict | None:
    if res is None:
        return None
    if res.status_code != 200:
        print(f"    body (start): {res.text[:300]!r}")
        return None
    try:
        data = res.json()
    except ValueError:
        print(f"    not JSON (start): {res.text[:300]!r}")
        return None
    elements = data.get("elements", [])
    named = sum(1 for e in elements if (e.get("tags") or {}).get("name"))
    print(f"    elements={len(elements)} named={named} remark={str(data.get('remark', ''))[:200]!r}")
    return data


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--overpass-url", help="try a different Overpass server for this run only")
    ap.add_argument("--ipv4", action="store_true", help="connect over IPv4 only for this run")
    args = ap.parse_args()
    s = Settings()
    if args.overpass_url:
        s = s.model_copy(update={"overpass_url": args.overpass_url})
    print("=== Settings (no secrets)")
    print(f"    HOSPITAL_PROVIDER={s.hospital_provider}")
    print(f"    NOMINATIM_URL={s.nominatim_url}")
    print(f"    OVERPASS_URL={s.overpass_url}")
    print(f"    OSM_CONTACT={'set' if s.osm_contact.strip() else 'MISSING'}")
    print(f"    HOSPITAL_TIMEOUT_SECONDS={s.hospital_timeout_seconds}")
    ua = f"HealthSakhiAI/0.5 (+{s.osm_contact.strip()})" if s.osm_contact.strip() else "HealthSakhiAI/0.5 (final-year student project)"
    print(f"    connections: {'IPv4 only' if args.ipv4 else 'system default'}")
    transport = httpx.HTTPTransport(local_address="0.0.0.0") if args.ipv4 else None
    client = httpx.Client(headers={"User-Agent": ua}, timeout=HTTP_TIMEOUT_S, transport=transport)
    connection_check(s.overpass_url)

    # 1. Overpass server status: free query slots for this connection (IP-identifying lines are not printed).
    status_url = s.overpass_url.replace("/interpreter", "/status")
    res = timed(f"1. Overpass status ({status_url})", lambda: client.get(status_url))
    if res is not None and res.status_code == 200:
        for line in res.text.splitlines():
            if any(w in line.lower() for w in ("rate limit", "slot", "currently running")):
                print(f"    {line.strip()}")

    # 2. Nominatim geocoding.
    time.sleep(1.5)
    res = timed(
        f"2. Nominatim geocode {PLACE!r}",
        lambda: client.get(f"{s.nominatim_url.rstrip('/')}/search", params={"q": PLACE, "format": "jsonv2", "countrycodes": "in", "limit": 1}),
    )
    if res is None or res.status_code != 200 or not res.json():
        print("    Geocoding failed — stopping here.")
        return
    top = res.json()[0]
    lat, lon = round(float(top["lat"]), 3), round(float(top["lon"]), 3)
    print(f"    found: {str(top.get('display_name'))[:120]}")

    # 3. The app's query now (bounding box; the app then keeps only hospitals within the radius).
    time.sleep(2)
    q_box = build_overpass_query(lat, lon, RADIUS_M, False, QUERY_TIMEOUT_S)
    box = overpass_result(timed("3. Overpass — app query (bounding box, 10 km, hospitals)", lambda: client.post(s.overpass_url, data={"data": q_box})))

    # 4. The previous `around` query, for comparison.
    time.sleep(5)
    q_around = around_query(lat, lon, RADIUS_M, QUERY_TIMEOUT_S)
    around = overpass_result(timed("4. Overpass — previous query (around, same radius)", lambda: client.post(s.overpass_url, data={"data": q_around})))

    print("\n--- 5. Same hospitals within 10 km?")
    if box is None or around is None:
        print("    Cannot compare: one of the queries failed.")
    else:
        a, b = within_radius(box, lat, lon, RADIUS_M), within_radius(around, lat, lon, RADIUS_M)
        print(f"    within radius: bbox={len(a)} around={len(b)} both={len(a.keys() & b.keys())}")
        for label, ids, src in (("only in bbox", a.keys() - b.keys(), a), ("only in around", b.keys() - a.keys(), b)):
            print(f"    {label}: {len(ids)}")
            for i in sorted(ids)[:10]:
                print(f"      {i} {src[i][:60]}")
        print("    RESULT: identical" if a.keys() == b.keys() else "    RESULT: DIFFERENT — see the lists above")
    print("\n=== DONE")


if __name__ == "__main__":
    main()
