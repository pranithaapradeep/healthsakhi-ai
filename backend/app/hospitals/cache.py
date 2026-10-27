from __future__ import annotations

import hashlib
import time
from collections import OrderedDict
from threading import Lock
from typing import Any


class TTLCache:
    """Small in-memory LRU cache with expiry. Keys are SHA-256 hashed so raw queries/coordinates are not kept."""

    def __init__(self, ttl_seconds: float, max_entries: int = 512, clock=time.monotonic) -> None:  # type: ignore[no-untyped-def]
        self.ttl = ttl_seconds
        self.max = max_entries
        self._clock = clock
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = Lock()

    @staticmethod
    def key(*parts: object) -> str:
        return hashlib.sha256("|".join(map(str, parts)).encode("utf-8")).hexdigest()

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            expires, value = item
            if expires < self._clock():
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = (self._clock() + self.ttl, value)
            self._data.move_to_end(key)
            while len(self._data) > self.max:
                self._data.popitem(last=False)
