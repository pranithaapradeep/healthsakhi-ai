"""Heuristic check that a reply is written in the expected script. Used to retry once and to evaluate outputs.

This checks the writing system, not grammar or meaning: Tamil → Tamil script, Hindi → Devanagari, English → Latin.
English medical terms inside Tamil/Hindi replies are allowed, so the thresholds are deliberately tolerant.
"""
from __future__ import annotations

from dataclasses import dataclass

TAMIL = (0x0B80, 0x0BFF)
DEVANAGARI = (0x0900, 0x097F)

MIN_NATIVE_SHARE = 0.6  # ta/hi: share of letters in the native script
MIN_LATIN_SHARE = 0.85  # en: share of letters that are Latin


@dataclass(frozen=True)
class ScriptStats:
    tamil: int
    devanagari: int
    latin: int

    @property
    def total(self) -> int:
        return self.tamil + self.devanagari + self.latin


def script_stats(text: str) -> ScriptStats:
    ta = dv = la = 0
    for ch in text:
        cp = ord(ch)
        if TAMIL[0] <= cp <= TAMIL[1]:
            ta += 1  # includes vowel signs, which are not 'alpha' in Unicode
        elif DEVANAGARI[0] <= cp <= DEVANAGARI[1]:
            dv += 1
        elif ch.isascii() and ch.isalpha():
            la += 1
    return ScriptStats(ta, dv, la)


def matches_language(text: str, language: str) -> bool:
    s = script_stats(text)
    if s.total == 0:
        return True  # nothing to judge (e.g. only digits); don't trigger retries
    if language == "ta":
        return s.tamil / s.total >= MIN_NATIVE_SHARE
    if language == "hi":
        return s.devanagari / s.total >= MIN_NATIVE_SHARE
    return s.latin / s.total >= MIN_LATIN_SHARE
