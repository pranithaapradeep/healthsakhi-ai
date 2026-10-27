"""Build the offline OpenStreetMap hospital copy used by HOSPITAL_PROVIDER=snapshot.

Downloads hospital listings for India from Overpass tile by tile (4° x 4° by default), ONE query at a time with a
pause between tiles. If a tile fails for a temporary reason (HTTP 429/502/503/504, timeout, dropped connection) it
waits and retries a few times with growing pauses (15 s, 30 s, 60 s; at least 30 s after a 429), then stops safely.
Progress is saved (atomically) after every tile: running the same command again RESUMES with the tiles not yet
downloaded. Use --restart to throw the saved progress away. Keeps only the tags the app shows.

About 64 tile queries for hospitals (more if --with-clinics). That is well inside Overpass's fair-use guidance for
an occasional download, but don't run it more than about once a week. Data © OpenStreetMap contributors (ODbL).

Run from the backend folder:
    .venv\\Scripts\\python.exe -m scripts.build_hospital_snapshot
Options: --with-clinics, --tile-deg 2 (smaller tiles if large ones time out), --pause 10, --out PATH,
         --max-retries 3 (per tile, 0–5), --restart (discard saved progress)
"""
from __future__ import annotations

import argparse
import gzip
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from app.core.config import Settings
from app.hospitals.factory import snapshot_path, user_agent
from app.hospitals.osm import _CLINIC, _HOSPITAL, MAXSIZE_BYTES
from app.hospitals.schemas import INDIA_LAT, INDIA_LON
from app.hospitals.snapshot import FORMAT, element_point

KEEP_PREFIXES = ("name", "official_name", "amenity", "healthcare", "emergency", "phone", "contact:", "website", "url",
                 "addr:", "opening_hours", "operator:type")
QUERY_TIMEOUT_S = 180
BACKOFF_START_S = 15.0
MIN_WAIT_AFTER_429_S = 30.0  # Overpass policy: pause after HTTP 429


class Stop(Exception):
    """Give up on this run: progress is saved and the next run continues from here."""


class Transient(Exception):
    """A temporary failure worth a (bounded) retry."""

    def __init__(self, reason: str, wait_at_least: float = 0.0) -> None:
        super().__init__(reason)
        self.wait_at_least = wait_at_least


def write_atomic(path: Path, text: str) -> None:
    """Write to a temporary file next to the target, then rename: an interruption never leaves a half-written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(text)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, path)


def tiles(deg: float) -> list[tuple[float, float, float, float]]:
    out = []
    lat = INDIA_LAT[0]
    while lat < INDIA_LAT[1]:
        lon = INDIA_LON[0]
        while lon < INDIA_LON[1]:
            out.append((round(lat, 4), round(lon, 4), round(min(lat + deg, INDIA_LAT[1]), 4), round(min(lon + deg, INDIA_LON[1]), 4)))
            lon += deg
        lat += deg
    return out


def tile_query(tile: tuple[float, float, float, float], with_clinics: bool) -> str:
    box = "({:.4f},{:.4f},{:.4f},{:.4f})".format(*tile)
    sels = _HOSPITAL + (_CLINIC if with_clinics else ())
    body = "".join(f"nwr{box}{sel};" for sel in sels)
    return f"[out:json][timeout:{QUERY_TIMEOUT_S}][maxsize:{MAXSIZE_BYTES * 4}];({body});out center tags;"


def slim(el: dict[str, Any]) -> dict[str, Any] | None:
    """Keep only what the app displays; drop unnamed or unlocatable listings (the app skips those too)."""
    tags = {k: v for k, v in (el.get("tags") or {}).items() if k.startswith(KEEP_PREFIXES)}
    if not any(k.startswith("name") or k == "official_name" for k in tags) or element_point(el) is None:
        return None
    out: dict[str, Any] = {"type": el.get("type"), "id": el.get("id"), "tags": tags}
    if el.get("type") == "node":
        out["lat"], out["lon"] = el["lat"], el["lon"]
    else:
        out["center"] = el["center"]
    return out


def fetch_tile(client: httpx.Client, url: str, tile: tuple[float, float, float, float], with_clinics: bool) -> tuple[list[dict[str, Any]], str | None]:
    try:
        res = client.post(url, data={"data": tile_query(tile, with_clinics)}, timeout=QUERY_TIMEOUT_S + 15)
    except httpx.TimeoutException as exc:
        raise Transient("timed out") from exc
    except httpx.TransportError as exc:
        raise Transient(f"network error ({type(exc).__name__})") from exc
    if res.status_code == 429:
        retry = res.headers.get("retry-after", "")
        raise Transient("rate limited (HTTP 429)", max(MIN_WAIT_AFTER_429_S, float(retry) if retry.isdigit() else 0.0))
    if res.status_code in (502, 503, 504):
        raise Transient(f"server busy (HTTP {res.status_code})")
    if res.status_code != 200:
        raise Stop(f"HTTP {res.status_code}")
    try:
        data = res.json()
    except ValueError as exc:
        raise Transient("answer was not JSON") from exc
    if "runtime error" in str(data.get("remark", "")).lower():
        # The tile is too big for the server's limits: retrying the same query will not help.
        raise Stop("Overpass stopped the query (runtime error) - run again with --tile-deg 2 --restart")
    elements = [s for el in data.get("elements", []) if isinstance(el, dict) and (s := slim(el))]
    return elements, (data.get("osm3s") or {}).get("timestamp_osm_base")


def fetch_with_retries(client, url, tile, with_clinics, max_retries, sleep):  # type: ignore[no-untyped-def]
    """Bounded exponential backoff: 15 s, 30 s, 60 s … (at least 30 s after a 429), then give up for this run."""
    for attempt in range(max_retries + 1):
        try:
            return fetch_tile(client, url, tile, with_clinics)
        except Transient as exc:
            if attempt == max_retries:
                raise Stop(f"{exc} - still failing after {max_retries} retries; try again later") from exc
            wait = max(BACKOFF_START_S * 2**attempt, exc.wait_at_least)
            print(f"{exc}; waiting {wait:.0f} s before retry {attempt + 1}/{max_retries} ... ", end="", flush=True)
            sleep(wait)
    raise AssertionError("unreachable")


def load_progress(progress_path: Path, deg: float, with_clinics: bool, restart: bool) -> dict[str, Any]:
    fresh: dict[str, Any] = {"deg": deg, "with_clinics": with_clinics, "done": {}, "timestamps": []}
    if restart or not progress_path.exists():
        if restart and progress_path.exists():
            print("--restart: discarding saved progress.")
        return fresh
    try:
        saved = json.loads(progress_path.read_text(encoding="utf-8"))
        if not isinstance(saved.get("done"), dict) or not isinstance(saved.get("timestamps"), list):
            raise ValueError("unexpected structure")
    except (OSError, ValueError, AttributeError) as exc:
        aside = progress_path.with_name(progress_path.name + ".corrupt")
        os.replace(progress_path, aside)
        print(f"Saved progress was unreadable ({type(exc).__name__}); moved it to {aside.name} and starting over.")
        return fresh
    if saved.get("deg") != deg or saved.get("with_clinics") != with_clinics:
        raise Stop(
            f"saved progress was made with --tile-deg {saved.get('deg')}"
            f"{' --with-clinics' if saved.get('with_clinics') else ''}. Use the same options to resume, or add --restart"
        )
    print(f"Resuming: {len(saved['done'])} tiles already downloaded.")
    return saved


def build(out: Path, client: httpx.Client, url: str, deg: float, with_clinics: bool, pause: float,  # type: ignore[no-untyped-def]
          sleep=time.sleep, max_retries: int = 3, restart: bool = False) -> bool:
    out.parent.mkdir(parents=True, exist_ok=True)  # before anything is written
    progress_path = out.with_name(out.name + ".partial.json")
    try:
        progress = load_progress(progress_path, deg, with_clinics, restart)
    except Stop as exc:
        print(f"STOPPED: {exc}.")
        return False
    all_tiles = tiles(deg)
    for n, tile in enumerate(all_tiles, 1):
        key = ",".join(map(str, tile))
        if key in progress["done"]:
            continue
        print(f"[{n}/{len(all_tiles)}] tile {key} ... ", end="", flush=True)
        try:
            elements, stamp = fetch_with_retries(client, url, tile, with_clinics, max_retries, sleep)
        except Stop as exc:
            write_atomic(progress_path, json.dumps(progress))
            print(f"STOPPED: {exc}. {len(progress['done'])}/{len(all_tiles)} tiles saved; run the same command again to resume.")
            return False
        progress["done"][key] = elements
        if stamp:
            progress["timestamps"].append(stamp)
        write_atomic(progress_path, json.dumps(progress))
        print(f"{len(elements)} listings")
        sleep(pause)

    merged: dict[str, dict[str, Any]] = {}
    for elements in progress["done"].values():
        for el in elements:
            merged[f"{el['type']}/{el['id']}"] = el  # a building on a tile edge appears in two tiles: keep it once
    stamps = sorted(progress["timestamps"])
    data_as_of = (stamps[0][:10] if stamps else datetime.now(timezone.utc).date().isoformat())  # oldest tile's data
    doc = {
        "format": FORMAT,
        "source": "OpenStreetMap via Overpass API",
        "license": "ODbL 1.0 — © OpenStreetMap contributors",
        "data_as_of": data_as_of,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "include_clinics": with_clinics,
        "elements": list(merged.values()),
    }
    tmp = out.with_name(out.name + ".tmp")
    with gzip.open(tmp, "wt", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, out)
    progress_path.unlink(missing_ok=True)
    print(f"DONE: {len(merged)} listings, data as of {data_as_of} -> {out}")
    return True


def main() -> int:
    # Console messages are plain ASCII; this also keeps a non-ASCII folder name in a path from crashing the
    # script on Windows consoles (cp1252/cp437) — such a character is shown as "?" instead.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", help="output file (default: HOSPITAL_SNAPSHOT_PATH)")
    ap.add_argument("--with-clinics", action="store_true", help="also include clinics, dentists and physiotherapy (much larger)")
    ap.add_argument("--tile-deg", type=float, default=4.0, choices=[1.0, 2.0, 4.0])
    ap.add_argument("--pause", type=float, default=5.0, help="seconds to wait between tiles (min 2)")
    ap.add_argument("--max-retries", type=int, default=3, choices=range(0, 6), help="retries per tile for temporary failures")
    ap.add_argument("--restart", action="store_true", help="discard saved progress and start from the first tile")
    args = ap.parse_args()
    settings = Settings()  # type: ignore[call-arg]
    out = Path(args.out) if args.out else snapshot_path(settings)
    with httpx.Client(headers={"User-Agent": user_agent(settings)}, follow_redirects=False) as client:
        ok = build(out, client, settings.overpass_url, args.tile_deg, args.with_clinics, max(args.pause, 2.0),
                   max_retries=args.max_retries, restart=args.restart)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
