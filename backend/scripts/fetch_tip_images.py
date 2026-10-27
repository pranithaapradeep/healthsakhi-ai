"""Download freely licensed photos for the Health Tips page from Wikimedia Commons and record their credits.

For each image slot (7 categories + 35 tips) this searches Commons with a specific query (or uses a PINNED file),
keeps only photos under CC0, public domain, CC BY or CC BY-SA, downloads Commons' 500-px thumbnail into
frontend/public/tips/, and writes frontend/src/data/tipImages.generated.ts with each photo's author, licence and
source page so the app can credit it (CC BY / BY-SA require attribution; the photos are resized, not edited).

Polite to Wikimedia: identifying User-Agent (OSM_CONTACT), one request at a time with a pause, no retries.
Slots without a suitable photo keep the app's illustrated fallback. Review the photos afterwards: a search result
can be wrong — pin the right file in PINNED and run again with --only.

Run from the backend folder:
    .venv\\Scripts\\python.exe -m scripts.fetch_tip_images
    .venv\\Scripts\\python.exe -m scripts.fetch_tip_images --only tulsi,ginger      (redo some slots)
    .venv\\Scripts\\python.exe -m scripts.fetch_tip_images --only pinned            (install the reviewed PINNED files)
    .venv\\Scripts\\python.exe -m scripts.fetch_tip_images --candidates tulsi        (list choices, download nothing)
    .venv\\Scripts\\python.exe -m scripts.fetch_tip_images --review prunes,tulsi     (download small candidates
        for visual review into tip-image-review/, with candidates.json; nothing in the app changes)
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import Settings

API = "https://commons.wikimedia.org/w/api.php"
WIDTH = 500  # a standard Wikimedia thumbnail width
FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
IMG_DIR = FRONTEND / "public" / "tips"
MANIFEST = FRONTEND / "src" / "data" / "tipImages.generated.ts"
PAUSE_S = 1.0
ALLOWED_LICENSE = re.compile(r"^(cc0|public domain|pd\b|cc by(-sa)? \d(\.\d)?)", re.I)
SKIP_TITLE = re.compile(r"(logo|map|diagram|chart|stamp|coat of arms|\.svg|\.gif|\.tif)", re.I)

# slot -> Commons search query. Chosen to show the food, ingredient or habit itself (no faces where avoidable).
QUERIES: dict[str, str] = {
    "cat:nutrition": "fresh vegetables fruits market India",
    "cat:heartBrain": "oatmeal walnuts berries bowl",
    "cat:ayurveda": "Ocimum tenuiflorum leaves",
    "cat:coldFever": "ginger lemon honey",
    "cat:digestion": "papaya fruit cut",
    "cat:hairSkin": "Hibiscus rosa-sinensis red flower",
    "cat:liverKidney": "glass of drinking water",
    "fruits-vegetables": "vegetable market stall India colourful",
    "whole-grains-lentils": "lentils pulses beans variety",
    "nuts-seeds": "mixed nuts almonds cashews",
    "hydration": "glass of water",
    "balanced-plate": "South Indian thali meal",
    "oats-whole-grains": "oatmeal porridge bowl",
    "leafy-greens": "spinach leaves bunch",
    "walnuts-nuts": "walnut kernels",
    "physical-activity": "walking shoes path",
    "sleep-brain": "bed pillow bedroom",
    "tulsi": "Ocimum tenuiflorum plant",
    "ginger": "ginger rhizome",
    "turmeric": "turmeric rhizome powder",
    "amla": "Phyllanthus emblica fruit",
    "keezhanelli-herb": "Phyllanthus niruri",
    "warm-fluids": "rasam soup",
    "rest-hydration-fever": "tender coconut water",
    "honey-cough": "honey jar spoon",
    "saline-nasal": "nasal spray bottle",
    "papaya-leaf-dengue": "Carica papaya leaves",
    "prunes": "prunes dried plums",
    "fibre-foods": "whole grain bread",
    "fluids-digestion": "buttermilk glass",
    "gentle-activity": "yoga mat",
    "warm-lemon-ginger-water": "lemon water glass",
    "scalp-massage": "coconut oil",
    "hibiscus-hair": "Hibiscus rosa-sinensis leaves",
    "aloe-vera": "Aloe vera leaves",
    "gentle-skin-care": "moisturizing cream",
    "hair-skin-doctor": "dermatoscope",
    "liver-kidney-diet": "vegetable salad bowl",
    "kidney-fluids": "drinking water bottle",
    "hepatitis-prevention": "washing hands soap",
    "keezhanelli-liver": "Phyllanthus amarus",
    "alcohol-detox": "herbal tea cup",
}

# slot -> exact Commons file, chosen by eye from the --review candidates (see docs/tip-image-selection.md).
# Overrides the search. Some slots share a file on purpose (each slot still gets its own copy).
PINNED: dict[str, str] = {
    "cat:nutrition": "File:Fruits and Vegetables (20170526-AMS-LSC-0022).jpg",
    "cat:heartBrain": "File:Bowl of Cashews and Almonds (48140118636).jpg",
    "cat:coldFever": "File:Tea P1000274a.jpg",
    "cat:liverKidney": "File:Glass-of-water.jpg",
    "fruits-vegetables": "File:DFC 2197 A colorful assortment of fresh fruits and vegetables - apples mango dragon fruit kiwis limes bananas and more - arranged on a wooden crate.jpg",
    "nuts-seeds": "File:Walnuts pistachios cashew almonds.jpg",
    "hydration": "File:Glass-of-water.jpg",
    "physical-activity": "File:Niepołomickie Błonia Park, walking path, Niepołomice, Poland.jpg",
    "sleep-brain": "File:Pillows on a hotel bed.jpg",
    "tulsi": "File:Ocimum tenuiflorum 24 08 2012.JPG",
    "ginger": "File:Ginger Tea .jpg",
    "honey-cough": "File:Honey dripper load.jpg",
    "saline-nasal": "File:A teddy bear wearing a mask sits on a wooden table next to a blue nasal spray bottle.jpg",
    "prunes": "File:Rosales - Dried Prunus domestica d.jpg",
    "gentle-activity": "File:Etowah River Park walking path, Canton GA.jpg",
    "warm-lemon-ginger-water": "File:Ginger tea-01.jpg",
    "scalp-massage": "File:Coconut oil bottle in the background of coconuts from Kaleeswari Farm.jpg",
    "hibiscus-hair": "File:Hibiscus rosa-sinensis 22.jpg",
    "aloe-vera": "File:Cut Aloe Vera Leaf.jpg",
    "gentle-skin-care": "File:Lotion 02.jpg",
    "kidney-fluids": "File:Glass of water ouside.jpg",
    "alcohol-detox": "File:Blue glass with carbonated water.jpg",
}
# The licence and credit Commons reported for each pinned file when it was reviewed. If Commons now reports
# something different, that slot is NOT installed (its current photo is kept) so the change can be checked.
PINNED_EXPECT: dict[str, tuple[str, str]] = {
    "cat:nutrition": ("Public domain", "USDAgov"),
    "cat:heartBrain": ("CC BY 2.0", "NIAID"),
    "cat:coldFever": ("CC BY-SA 4.0", "E.mil.mil"),
    "cat:liverKidney": ("Public domain", "Derek Jensen ( Tysto )"),
    "fruits-vegetables": ("CC BY-SA 4.0", "PattayaPatrol"),
    "nuts-seeds": ("CC0", "piviso.com"),
    "hydration": ("Public domain", "Derek Jensen ( Tysto )"),
    "physical-activity": ("CC BY 4.0", "Igor123121"),
    "sleep-brain": ("CC BY-SA 4.0", "Amin"),
    "tulsi": ("CC BY-SA 3.0", "Joydeep"),
    "ginger": ("CC BY-SA 4.0", "Trupti.gauns"),
    "honey-cough": ("CC0", "Matankic"),
    "saline-nasal": ("CC BY 2.0", "Shixart1985"),
    "prunes": ("CC BY-SA 4.0", "Emőke Dénes"),
    "gentle-activity": ("CC BY 4.0", "John Phelan"),
    "warm-lemon-ginger-water": ("CC BY 2.0", "Gleb from St.Petersburg, Russia"),
    "scalp-massage": ("CC BY-SA 4.0", "deadrat"),
    "hibiscus-hair": ("CC BY-SA 3.0", "Vengolis"),
    "aloe-vera": ("CC BY 2.0", "Rae Allen"),
    "gentle-skin-care": ("CC BY-SA 4.0", "Benff"),
    "kidney-fluids": ("CC0", "Kurt Kaiser"),
    "alcohol-detox": ("CC0", "W.carter"),
}

# Extra searches used by --review to collect several candidates per slot for a visual choice.
REVIEW_QUERIES: dict[str, list[str]] = {
    "cat:nutrition": ["fruits and vegetables assortment", "fresh fruit basket", "Indian vegetables basket"],
    "cat:heartBrain": ["oatmeal walnuts blueberries", "almonds walnuts bowl", "healthy breakfast oats fruit"],
    "cat:coldFever": ["ginger tea cup", "lemon ginger tea", "honey lemon tea"],
    "cat:liverKidney": ["glass of water", "water jug and glass", "drinking water glass"],
    "fruits-vegetables": ["fresh fruit basket", "fruits and vegetables still life", "colorful vegetables"],
    "whole-grains-lentils": ["lentils pulses variety", "dried pulses legumes", "millets grains"],
    "nuts-seeds": ["almonds walnuts seeds", "nuts and seeds", "almonds cashews walnuts"],
    "hydration": ["glass of water", "glass of water on table", "water glass"],
    "physical-activity": ["walking path park", "running shoes", "cycling park path"],
    "sleep-brain": ["bed with white pillows", "made bed bedroom", "bedroom bed"],
    "tulsi": ["Ocimum tenuiflorum", "Tulasi leaves", "holy basil"],
    "ginger": ["ginger tea", "ginger root", "fresh ginger slices"],
    "honey-cough": ["honey dipper", "honey wooden spoon", "honey jar"],
    "rest-hydration-fever": ["glass of water bedside table", "bedside table", "clinical thermometer"],
    "saline-nasal": ["saline nasal spray", "nasal spray bottle", "nose drops"],
    "prunes": ["prunes", "dried plums", "prunes in a bowl"],
    "gentle-activity": ["walking path", "yoga mat", "walking shoes grass"],
    "warm-lemon-ginger-water": ["lemon ginger tea", "hot lemon water", "lemon tea cup"],
    "scalp-massage": ["coconut oil coconut", "coconut oil", "hair oil"],
    "hibiscus-hair": ["Hibiscus rosa-sinensis", "red hibiscus flower", "hibiscus flower leaves"],
    "aloe-vera": ["aloe vera leaf", "aloe vera gel", "Aloe vera close-up"],
    "gentle-skin-care": ["moisturizer cream jar", "hand cream", "skin cream"],
    "hair-skin-doctor": ["dermatoscope", "dermatology", "stethoscope"],
    "leafy-greens": ["spinach bunch", "spinach leaves", "amaranth leaves"],
    "kidney-fluids": ["water jug glass", "glass of water", "water pitcher"],
    "alcohol-detox": ["glass of water", "water pitcher glass", "glass of water lemon slice"],
}
REVIEW_DIR = FRONTEND.parent / "tip-image-review"
REVIEW_WIDTH = 330  # a standard Wikimedia thumbnail width; small files for checking by eye


def strip_html(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value or "")).split())


def meta(info: dict[str, Any], key: str) -> str:
    return strip_html(str(((info.get("extmetadata") or {}).get(key) or {}).get("value", "")))


def describe(page: dict[str, Any]) -> dict[str, Any] | None:
    """A usable photo with its credit, or None (wrong type, too small, or a licence we cannot use)."""
    title = str(page.get("title", ""))
    infos = page.get("imageinfo") or []
    if not infos or SKIP_TITLE.search(title):
        return None
    info = infos[0]
    # Photos only (JPEG), from a large enough original for a crisp thumbnail.
    if info.get("mime") != "image/jpeg" or int(info.get("width", 0)) < 1000:
        return None
    license_name = meta(info, "LicenseShortName")
    if not ALLOWED_LICENSE.match(license_name):
        return None
    credit = meta(info, "Attribution") or meta(info, "Artist") or "Unknown author"
    if not info.get("thumburl"):
        return None
    return {
        "title": title,
        "thumb": info["thumburl"],
        "width": int(info.get("thumbwidth") or WIDTH),
        "height": int(info.get("thumbheight") or WIDTH),
        "credit": credit[:120],
        "license": license_name,
        "licenseUrl": meta(info, "LicenseUrl") or None,
        "sourceUrl": info.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}",
    }


def query(client: httpx.Client, params: dict[str, Any], width: int = WIDTH) -> list[dict[str, Any]]:
    base = {"action": "query", "format": "json", "formatversion": 2, "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata", "iiurlwidth": width, "maxlag": 5}
    res = client.get(API, params=base | params, timeout=30)
    res.raise_for_status()
    data = res.json()
    if "error" in data:
        raise RuntimeError(f"Commons API error: {data['error'].get('code')}")
    pages = (data.get("query") or {}).get("pages") or []
    return sorted(pages, key=lambda p: p.get("index", 0))


def candidates(client: httpx.Client, slot: str) -> list[dict[str, Any]]:
    if slot in PINNED:
        pages = query(client, {"titles": PINNED[slot]})
    else:
        pages = query(client, {"generator": "search", "gsrnamespace": 6, "gsrlimit": 15,
                               "gsrsearch": f"{QUERIES[slot]} filetype:bitmap"})
    return [d for p in pages if (d := describe(p))]


def pinned_mismatch(slot: str, found: dict[str, Any]) -> str | None:
    """Why a pinned slot's photo should not be installed (a different file, licence or credit), or None."""
    if slot not in PINNED:
        return None
    if found["title"] != PINNED[slot]:
        return f"Commons returned {found['title']!r} instead of {PINNED[slot]!r}"
    expected = PINNED_EXPECT.get(slot)
    if expected is None:
        return "no reviewed licence/credit recorded in PINNED_EXPECT"
    if (found["license"], found["credit"]) != expected:
        return f"licence/credit is now {found['license']!r} / {found['credit']!r}, reviewed as {expected[0]!r} / {expected[1]!r}"
    return None


def review(client: httpx.Client, slots: list[str], per_slot: int = 6) -> None:
    """Download small candidates for each slot so a person can choose by eye. The app is not changed."""
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    report: dict[str, list[dict[str, Any]]] = {}
    for slot in slots:
        seen: set[str] = set()
        chosen: list[dict[str, Any]] = []
        for q in REVIEW_QUERIES.get(slot, [QUERIES[slot]]):
            pages = query(client, {"generator": "search", "gsrnamespace": 6, "gsrlimit": 12,
                                   "gsrsearch": f"{q} filetype:bitmap"}, width=REVIEW_WIDTH)
            time.sleep(PAUSE_S)
            for c in (d for p in pages if (d := describe(p))):
                if c["title"] not in seen and len(chosen) < per_slot:
                    seen.add(c["title"])
                    chosen.append(c)
            if len(chosen) >= per_slot:
                break
        for n, c in enumerate(chosen, 1):
            res = client.get(c["thumb"], timeout=60)
            res.raise_for_status()
            (REVIEW_DIR / f"{slot.replace('cat:', 'cat-')}--{n}.jpg").write_bytes(res.content)
            time.sleep(PAUSE_S)
        report[slot] = [{"n": n, **{k: c[k] for k in ("title", "license", "credit", "sourceUrl")}} for n, c in enumerate(chosen, 1)]
        print(f"{slot}: {len(chosen)} candidates")
    (REVIEW_DIR / "candidates.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"DONE: candidates in {REVIEW_DIR}")


def file_name(slot: str, thumb_url: str) -> str:
    ext = Path(urlparse(thumb_url).path).suffix.lower()
    ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"
    return slot.replace("cat:", "cat-") + (".jpg" if ext == ".jpeg" else ext)


def write_manifest(entries: dict[str, dict[str, Any]], path: Path = MANIFEST) -> None:
    lines = [
        "// GENERATED by backend/scripts/fetch_tip_images.py — do not edit by hand.",
        "// Photos from Wikimedia Commons (CC0 / public domain / CC BY / CC BY-SA), resized to 500 px wide.",
        "import type { TipImage } from './tipTypes'",
        "",
        "export const TIP_IMAGES: Record<string, TipImage> = {",
    ]
    for slot in sorted(entries):
        e = entries[slot]
        record = {k: e[k] for k in ("src", "width", "height", "credit", "license", "licenseUrl", "sourceUrl")}
        lines.append(f"  {json.dumps(slot)}: {json.dumps(record, ensure_ascii=False)},")
    lines.append("}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def load_manifest(path: Path = MANIFEST) -> dict[str, dict[str, Any]]:
    """Existing entries, so --only keeps the photos already chosen for other slots."""
    if not path.exists():
        return {}
    out = {}
    for m in re.finditer(r'^  ("(?:[^"\\]|\\.)*"): (\{.*\}),$', path.read_text(encoding="utf-8"), re.M):
        out[json.loads(m.group(1))] = json.loads(m.group(2))
    return out


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated slots to (re)fetch")
    ap.add_argument("--candidates", help="list usable photos for one slot and exit")
    ap.add_argument("--review", help="comma-separated slots (or 'flagged') to download candidates for visual review")
    args = ap.parse_args()
    settings = Settings()  # type: ignore[call-arg]
    contact = settings.osm_contact.strip() or "student project"
    headers = {"User-Agent": f"HealthSakhiAI/0.5 tip-images (+{contact})"}
    with httpx.Client(headers=headers, follow_redirects=True) as client:
        if args.review:
            slots = list(REVIEW_QUERIES) if args.review == "flagged" else args.review.split(",")
            bad = [s for s in slots if s not in QUERIES]
            if bad:
                print(f"Unknown slots: {', '.join(bad)}")
                return 2
            try:
                review(client, slots)
            except (httpx.HTTPError, RuntimeError) as exc:
                print(f"STOPPED: {type(exc).__name__}: {exc}")
                return 1
            return 0
        if args.candidates:
            for c in candidates(client, args.candidates)[:8]:
                print(f"{c['title']} | {c['license']} | {c['credit']}")
            return 0
        slots = list(PINNED) if args.only == "pinned" else args.only.split(",") if args.only else list(QUERIES)
        unknown = [s for s in slots if s not in QUERIES]
        if unknown:
            print(f"Unknown slots: {', '.join(unknown)}")
            return 2
        IMG_DIR.mkdir(parents=True, exist_ok=True)
        entries = load_manifest()
        missing: list[str] = []
        changed: list[str] = []
        for slot in slots:
            try:
                found = candidates(client, slot)
                time.sleep(PAUSE_S)
                if not found:
                    missing.append(slot)
                    print(f"{slot}: no suitable photo (illustration will be used)")
                    continue
                best = found[0]
                problem = pinned_mismatch(slot, best)
                if problem:
                    changed.append(slot)
                    print(f"{slot}: NOT installed, {problem}; current photo kept")
                    continue
                name = file_name(slot, best["thumb"])
                res = client.get(best["thumb"], timeout=60)
                res.raise_for_status()
                (IMG_DIR / name).write_bytes(res.content)
                time.sleep(PAUSE_S)
            except (httpx.HTTPError, RuntimeError) as exc:
                print(f"STOPPED at {slot}: {type(exc).__name__}: {exc}. Saved what was done; run again later.")
                write_manifest(entries)
                return 1
            entries[slot] = best | {"src": f"/tips/{name}"}
            print(f"{slot}: {best['title']} ({len(res.content) // 1024} KB, {best['license']})")
        write_manifest(entries)
    print(f"DONE: {len(entries)} photos in {IMG_DIR}; {len(missing)} without a photo: {', '.join(missing) or '-'}")
    if changed:
        print(f"CHECK: {len(changed)} pinned slot(s) not installed because Commons metadata changed: {', '.join(changed)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
