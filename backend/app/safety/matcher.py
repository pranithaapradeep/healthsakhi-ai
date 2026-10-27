"""Normalisation and matching for the deterministic safety rules. Pure functions — no I/O, no AI, no logging."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Literal

from .rules import RULES, Rule

SafetyLevel = Literal["emergency", "urgent", "none"]

_LATIN_WORD = "a-z0-9"
# Devanagari: ignore nukta (़), chandrabindu (ँ) and anusvara (ं) so common spelling variants match
# (e.g. साँस / सांस / सास, में / मे, ज़हर / जहर).
_DEVANAGARI_IGNORED = dict.fromkeys(map(ord, "़ँं"))
_APOSTROPHES = str.maketrans({"’": "'", "‘": "'", "`": "'"})
_CONTRACTIONS = (("can't", ("cant", "cannot", "can not")), ("won't", ("wont", "will not")), ("haven't", ("havent", "have not")))


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFC", text).translate(_APOSTROPHES).casefold()
    t = unicodedata.normalize("NFD", t).translate(_DEVANAGARI_IGNORED)  # NFD splits precomposed nukta letters
    t = unicodedata.normalize("NFC", t)
    # Replace punctuation with spaces; keep letters, digits, apostrophes and Indic combining marks.
    t = "".join(ch if (ch.isalnum() or ch == "'" or unicodedata.category(ch).startswith("M")) else " " for ch in t)
    return re.sub(r"\s+", " ", t).strip()


def _latin_variants(phrase: str) -> set[str]:
    variants = {phrase}
    for word, alternatives in _CONTRACTIONS:
        for v in list(variants):
            if word in v:
                variants.update(v.replace(word, alt) for alt in alternatives)
    return variants


@dataclass(frozen=True)
class _Compiled:
    rule: Rule
    latin: re.Pattern[str] | None
    indic: tuple[str, ...]


@lru_cache(maxsize=1)
def _compiled() -> tuple[_Compiled, ...]:
    out = []
    for rule in RULES:
        latin = sorted({normalize(v) for p in (*rule.en, *rule.lat) for v in _latin_variants(p.casefold())}, key=len, reverse=True)
        pattern = (
            re.compile(rf"(?<![{_LATIN_WORD}])(?:{'|'.join(map(re.escape, latin))})(?![{_LATIN_WORD}])") if latin else None
        )
        indic = tuple(sorted({normalize(p) for p in (*rule.ta, *rule.hi)}, key=len, reverse=True))
        out.append(_Compiled(rule, pattern, indic))
    return tuple(out)


@dataclass(frozen=True)
class SafetyResult:
    level: SafetyLevel = "none"
    categories: tuple[str, ...] = field(default_factory=tuple)
    rule_ids: tuple[str, ...] = field(default_factory=tuple)

    @property
    def is_emergency(self) -> bool:
        return self.level == "emergency"

    def to_dict(self) -> dict:
        return {"level": self.level, "categories": list(self.categories), "rule_ids": list(self.rule_ids)}


def check_text(*texts: str | None) -> SafetyResult:
    """Return the most serious level matched across all texts, with the matched categories (in rule order)."""
    joined = normalize(" \n ".join(t for t in texts if t))
    if not joined:
        return SafetyResult()
    matched = [c.rule for c in _compiled() if (c.latin and c.latin.search(joined)) or any(p in joined for p in c.indic)]
    return from_rules(matched)


def from_rules(rules: list[Rule]) -> SafetyResult:
    if not rules:
        return SafetyResult()
    level: SafetyLevel = "emergency" if any(r.level == "emergency" for r in rules) else "urgent"
    ordered = sorted(rules, key=lambda r: (r.level != "emergency", RULES.index(r)))
    categories = tuple(dict.fromkeys(r.category for r in ordered))
    return SafetyResult(level=level, categories=categories, rule_ids=tuple(r.id for r in ordered))


def merge(*results: SafetyResult) -> SafetyResult:
    rank = {"none": 0, "urgent": 1, "emergency": 2}
    level = max((r.level for r in results), key=rank.__getitem__, default="none")
    emergency_first = sorted(results, key=lambda r: -rank[r.level])
    return SafetyResult(
        level=level,
        categories=tuple(dict.fromkeys(c for r in emergency_first for c in r.categories)),
        rule_ids=tuple(dict.fromkeys(i for r in emergency_first for i in r.rule_ids)),
    )
