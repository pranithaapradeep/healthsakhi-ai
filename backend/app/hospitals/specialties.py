"""Department filters and how they map onto OpenStreetMap `healthcare:speciality` values.

OSM values are documented at https://wiki.openstreetmap.org/wiki/Key:healthcare:speciality (semicolon-separated).
Common alternative spellings seen in the data are included. A match only means a contributor *listed* it.
"""
from __future__ import annotations

from typing import Literal

SpecialtyKey = Literal[
    "neurology", "paediatrics", "oncology", "cardiology", "emergency", "general_medicine", "obgyn",
    "orthopaedics", "dermatology", "psychiatry", "gastroenterology", "nephrology", "urology", "pulmonology",
    "ophthalmology", "ent", "endocrinology", "general_surgery", "dentistry", "physiotherapy",
]

OSM_VALUES: dict[str, frozenset[str]] = {
    "neurology": frozenset({"neurology", "neurosurgery"}),
    "paediatrics": frozenset({"paediatrics", "pediatrics", "neonatology", "paediatric_surgery", "pediatric_surgery"}),
    "oncology": frozenset({"oncology", "radiotherapy", "radiation_oncology", "surgical_oncology"}),
    "cardiology": frozenset({"cardiology", "cardiac_surgery", "cardiothoracic_surgery"}),
    "emergency": frozenset({"emergency", "trauma"}),
    "general_medicine": frozenset({"general", "internal", "internal_medicine"}),
    "obgyn": frozenset({"gynaecology", "gynecology", "obstetrics", "maternity"}),
    "orthopaedics": frozenset({"orthopaedics", "orthopedics", "orthopaedic_surgery"}),
    "dermatology": frozenset({"dermatology", "venereology"}),
    "psychiatry": frozenset({"psychiatry", "mental_health"}),
    "gastroenterology": frozenset({"gastroenterology", "hepatology"}),
    "nephrology": frozenset({"nephrology", "dialysis"}),
    "urology": frozenset({"urology"}),
    "pulmonology": frozenset({"pulmonology", "pneumology", "respiratory"}),
    "ophthalmology": frozenset({"ophthalmology"}),
    "ent": frozenset({"otolaryngology", "ent"}),
    "endocrinology": frozenset({"endocrinology", "diabetology"}),
    "general_surgery": frozenset({"surgery", "general_surgery"}),
    "dentistry": frozenset({"dentistry", "dental", "stomatology", "orthodontics", "oral_surgery"}),
    "physiotherapy": frozenset({"physiotherapy", "rehabilitation", "physiatry", "physical_medicine"}),
}
SPECIALTY_KEYS: tuple[str, ...] = tuple(OSM_VALUES)

# Facility types that by their nature provide one department (only used when clinics are included).
FACILITY_SPECIALTY = {"dentist": "dentistry", "physiotherapist": "physiotherapy"}


def specialties_from_osm(values: list[str], facility_type: str | None = None, emergency_tag: str | None = None) -> set[str]:
    raw = {v.strip().lower() for v in values if v.strip()}
    found = {key for key, osm in OSM_VALUES.items() if raw & osm}
    if facility_type in FACILITY_SPECIALTY:
        found.add(FACILITY_SPECIALTY[facility_type])
    if emergency_tag == "yes":
        found.add("emergency")
    if emergency_tag == "no":
        found.discard("emergency")
    return found
