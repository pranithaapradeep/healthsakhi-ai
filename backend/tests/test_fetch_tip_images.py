"""Pure parts of scripts/fetch_tip_images.py — no network."""
import pytest

from scripts import fetch_tip_images as f


def page(title="File:Tulsi leaves.jpg", mime="image/jpeg", width=2000, license_name="CC BY-SA 4.0", artist="<a href='x'>Ravi K</a>"):
    return {"title": title, "imageinfo": [{
        "mime": mime, "width": width, "thumburl": "https://upload.wikimedia.org/thumb/x/500px-Tulsi.jpg", "thumbwidth": 500,
        "thumbheight": 375, "descriptionurl": "https://commons.wikimedia.org/wiki/File:Tulsi_leaves.jpg",
        "extmetadata": {"LicenseShortName": {"value": license_name}, "Artist": {"value": artist},
                        "LicenseUrl": {"value": "https://creativecommons.org/licenses/by-sa/4.0"}},
    }]}


def test_describe_keeps_credit_and_licence():
    d = f.describe(page())
    assert d["credit"] == "Ravi K" and d["license"] == "CC BY-SA 4.0" and (d["width"], d["height"]) == (500, 375)
    assert d["sourceUrl"].startswith("https://commons.wikimedia.org/wiki/File:")


@pytest.mark.parametrize("lic", ["CC0", "Public domain", "CC BY 2.0", "CC BY-SA 3.0", "PD-self"])
def test_free_licences_accepted(lic):
    assert f.describe(page(license_name=lic)) is not None


@pytest.mark.parametrize("kw", [dict(license_name="GFDL"), dict(license_name="Fair use"), dict(license_name=""),
                                dict(mime="image/svg+xml"), dict(mime="image/png"), dict(width=900),
                                dict(title="File:Hospital logo.jpg")])
def test_unusable_files_rejected(kw):
    assert f.describe(page(**kw)) is None


def test_manifest_round_trip(tmp_path):
    path = tmp_path / "m.ts"
    entry = {"src": "/tips/tulsi.jpg", "width": 500, "height": 375, "credit": 'A "quoted" name', "license": "CC0",
             "licenseUrl": None, "sourceUrl": "https://commons.wikimedia.org/wiki/File:T.jpg", "title": "ignored"}
    f.write_manifest({"tulsi": entry, "cat:ayurveda": entry}, path)
    text = path.read_text(encoding="utf-8")
    assert "GENERATED" in text and '"title"' not in text
    loaded = f.load_manifest(path)
    assert set(loaded) == {"tulsi", "cat:ayurveda"} and loaded["tulsi"]["credit"] == 'A "quoted" name'


def test_file_names():
    assert f.file_name("cat:ayurveda", "https://u/500px-X.JPEG") == "cat-ayurveda.jpg"
    assert f.file_name("tulsi", "https://u/500px-X.png") == "tulsi.png"


def test_every_tip_and_category_has_a_query():
    import re
    from pathlib import Path

    data = (Path(f.FRONTEND) / "src" / "data" / "healthTips.ts").read_text(encoding="utf-8")
    ids = re.findall(r'^    id: "([^"]+)",$', data, re.M)
    assert len(ids) == 35 and set(ids) <= set(f.QUERIES)
    assert {k for k in f.QUERIES if k.startswith("cat:")} == {f"cat:{c}" for c in
            ["nutrition", "heartBrain", "ayurveda", "coldFever", "digestion", "hairSkin", "liverKidney"]}


def test_review_slots_are_known_slots():
    assert set(f.REVIEW_QUERIES) <= set(f.QUERIES)
    assert all(len(q) >= 2 for q in f.REVIEW_QUERIES.values())


def test_pinned_slots_are_known_and_are_files():
    for slot, title in f.PINNED.items():
        assert slot in f.QUERIES and title.startswith("File:") and title.lower().endswith((".jpg", ".jpeg"))


def test_every_pinned_file_has_its_reviewed_licence_and_credit():
    assert set(f.PINNED_EXPECT) == set(f.PINNED)
    for licence, credit in f.PINNED_EXPECT.values():
        assert f.ALLOWED_LICENSE.match(licence) and credit.strip()


def test_pinned_photo_installs_only_when_commons_metadata_matches():
    slot = "honey-cough"
    licence, credit = f.PINNED_EXPECT[slot]
    found = {"title": f.PINNED[slot], "license": licence, "credit": credit}
    assert f.pinned_mismatch(slot, found) is None
    assert "instead of" in f.pinned_mismatch(slot, found | {"title": "File:Other.jpg"})
    assert "licence/credit" in f.pinned_mismatch(slot, found | {"license": "CC BY-SA 4.0"})
    assert "licence/credit" in f.pinned_mismatch(slot, found | {"credit": "Someone else"})
    assert f.pinned_mismatch("whole-grains-lentils", {"title": "File:Any.jpg", "license": "CC0", "credit": "x"}) is None
