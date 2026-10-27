"""Offline copy of OpenStreetMap hospital listings, searched locally (no network, answers in milliseconds).

Built by `scripts/build_hospital_snapshot.py`. The file holds the same Overpass elements the live provider receives
(only the tags we display), so parsing, names per language, departments and radius filtering are identical to the
live search. Its date is reported with every answer ("data as of"), because a copy ages.
Typed places are still resolved by the live geocoder (Nominatim), passed in as `geocoder`.
"""
from __future__ import annotations

import gzip
import json
import math
import threading
from pathlib import Path
from typing import Any

from .osm import bbox_around, parse_element
from .provider import Facility, HospitalProvider, HospitalProviderError, Place, SourceInfo

FORMAT = "healthsakhi-hospitals-v1"
CELL_DEG = 0.25  # grid cell size for the in-memory index


def element_point(el: dict[str, Any]) -> tuple[float, float] | None:
    if el.get("type") == "node":
        lat, lon = el.get("lat"), el.get("lon")
    else:
        c = el.get("center") or {}
        lat, lon = c.get("lat"), c.get("lon")
    try:
        return (float(lat), float(lon))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


class SnapshotHospitalProvider:
    name = "osm-snapshot"
    source_name = "OpenStreetMap (offline copy)"
    attribution = "© OpenStreetMap contributors"
    license = "ODbL 1.0"

    def __init__(self, path: Path, geocoder: HospitalProvider | None = None) -> None:
        self.path = Path(path)
        self._geocoder = geocoder
        self._lock = threading.Lock()
        self._loaded = False
        self._index: dict[tuple[int, int], list[dict[str, Any]]] = {}
        self.data_as_of: str | None = None
        self.include_clinics = False
        self.count = 0

    # Loaded on first use so a missing file never stops the app from starting (the fallback can answer).
    def _load(self) -> None:
        with self._lock:
            if self._loaded:
                return
            if not self.path.is_file():
                raise HospitalProviderError("not_configured", "offline hospital copy not found")
            try:
                with gzip.open(self.path, "rt", encoding="utf-8") as fh:
                    data = json.load(fh)
            except (OSError, ValueError, EOFError) as exc:
                raise HospitalProviderError("unavailable", f"offline hospital copy unreadable ({type(exc).__name__})") from exc
            if not isinstance(data, dict) or data.get("format") != FORMAT or not isinstance(data.get("elements"), list):
                raise HospitalProviderError("unavailable", "offline hospital copy has an unknown format")
            index: dict[tuple[int, int], list[dict[str, Any]]] = {}
            for el in data["elements"]:
                if not isinstance(el, dict) or (pt := element_point(el)) is None:
                    continue
                index.setdefault((math.floor(pt[0] / CELL_DEG), math.floor(pt[1] / CELL_DEG)), []).append(el)
            self._index = index
            self.count = sum(len(v) for v in index.values())
            self.data_as_of = str(data.get("data_as_of") or "") or None
            self.include_clinics = bool(data.get("include_clinics"))
            self._loaded = True

    def geocode(self, query: str, language: str) -> Place | None:
        if self._geocoder is None:
            raise HospitalProviderError("not_configured", "no geocoder for typed places")
        return self._geocoder.geocode(query, language)

    def search_with_source(
        self, lat: float, lon: float, radius_m: int, include_clinics: bool, language: str
    ) -> tuple[list[Facility], SourceInfo]:
        self._load()
        if include_clinics and not self.include_clinics:
            # Never answer "no clinics" from a copy that simply doesn't contain clinics.
            raise HospitalProviderError("unavailable", "offline copy has hospitals only")
        s, w, n, e = bbox_around(round(lat, 3), round(lon, 3), radius_m)
        out: list[Facility] = []
        for i in range(math.floor(s / CELL_DEG), math.floor(n / CELL_DEG) + 1):
            for j in range(math.floor(w / CELL_DEG), math.floor(e / CELL_DEG) + 1):
                for el in self._index.get((i, j), ()):
                    if not include_clinics and not _is_hospital(el):
                        continue
                    if (f := parse_element(el, language)) is not None:
                        out.append(f)  # the service then keeps only those within the radius
        return out, SourceInfo(self.source_name, self.attribution, self.license, self.data_as_of)

    def search(self, lat: float, lon: float, radius_m: int, include_clinics: bool, language: str) -> list[Facility]:
        return self.search_with_source(lat, lon, radius_m, include_clinics, language)[0]


def _is_hospital(el: dict[str, Any]) -> bool:
    tags = el.get("tags") or {}
    return tags.get("amenity") == "hospital" or tags.get("healthcare") == "hospital"
