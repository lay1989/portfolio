import json
import re
from io import BytesIO

import pytest
from PIL import Image

from app import ROOT
from app.extensions import db
from app.models import ManagedPage, PageRevision


def branding_state(app):
    with app.app_context():
        branding = db.session.get(ManagedPage, "branding")
        return (
            branding.version,
            branding.draft,
            branding.published,
            db.session.scalar(db.select(db.func.count()).select_from(PageRevision)),
        )


def test_identity_review_and_captures_require_owner_login(client):
    for path in [
        "/admin/lab/identity",
        "/admin/lab/identity/reference/mubi.png",
        "/admin/lab/identity/reference/josh-comeau.png",
        "/admin/lab/identity/sheet/comparison.png",
        "/admin/lab/identity/kit/lay-shah-evergreen-kit.zip",
        "/admin/lab/identity/kit/horizontal-evergreen.svg",
        "/admin/lab/identity/development/lockup-green.svg",
        "/admin/lab/identity/development/icon-black-16.png",
        "/admin/lab/identity/open-letter/sketch.svg",
        "/admin/lab/identity/the-aside/reversed.svg",
    ]:
        response = client.get(path)
        assert response.status_code == 302 and "/admin/login" in response.location


def test_sketch_board_is_readonly_and_preserves_public_branding(owner, app):
    before = branding_state(app)
    public_before = owner.get("/").get_data(as_text=True)
    response = owner.get("/admin/lab/identity")
    text = response.get_data(as_text=True)
    assert response.status_code == 200
    assert "Evergreen, now on your website." in text
    assert "Download Evergreen kit" in text
    assert "Stage 5 / Evergreen applied locally" in text
    assert "Evergreen is applied to the local website and admin." in text
    assert "editable paths" in text
    assert 'variant="sketch.svg"' not in text
    assert "Understood and confident." in text
    assert "six identities" in text.lower()
    for anchor in [
        "identity-sketches",
        "identity-guide",
        "identity-brief",
        "identity-sharing",
        "identity-small",
    ]:
        assert f'id="{anchor}"' in text and f'href="#{anchor}"' in text
    assert text.count('<article class="identity-reference"') == 6
    assert "Name-led identity" in text and "Published browser symbol" in text
    assert (
        'src="https://' not in text
    )  # Captures are local; external resources are not loaded.
    assert 'value="publish"' not in text and "formaction=" not in text
    assert response.headers["Cache-Control"] == "private, no-store"
    assert "noindex" in response.headers["X-Robots-Tag"]
    assert re.search(
        r'<a href="/admin/lab/identity" aria-current="page">Logo concepts</a>', text
    )
    assert branding_state(app) == before
    public_after = owner.get("/").get_data(as_text=True)
    without_csrf = lambda html: re.sub(
        r'(name="csrf_token"[^>]*value=")[^"]+', r"\1<token>", html
    )
    assert without_csrf(public_before) == without_csrf(public_after)
    assert "/public/css/identity-review.css" not in public_after
    assert "/admin/lab/identity" not in public_after


def test_all_seven_source_captures_are_private_and_have_recorded_sizes(owner):
    identity = json.loads((ROOT / "design/identity-concepts.json").read_text())
    for item in [identity["muse"], *identity["references"]]:
        response = owner.get(f"/admin/lab/identity/reference/{item['id']}.png")
        assert response.status_code == 200 and response.mimetype == "image/png"
        assert response.headers["Cache-Control"] == "private, no-store"
        assert "noindex" in response.headers["X-Robots-Tag"]
        with Image.open(BytesIO(response.data)) as image:
            assert image.size == (item["width"], item["height"])
    assert owner.get("/design/identity-references/mubi.png").status_code == 404


@pytest.mark.parametrize(
    "concept", ["join", "span", "relay", "signature", "whole", "clear"]
)
def test_withdrawn_concepts_and_cached_exports_are_not_served(owner, concept):
    assert owner.get(f"/admin/lab/identity?concept={concept}").status_code == 404
    for variant in ["light.svg", "wordmark-light.svg", "icon-16.png"]:
        assert owner.get(f"/admin/lab/identity/{concept}/{variant}").status_code == 404


@pytest.mark.parametrize(
    "path",
    [
        "/admin/lab/identity?concept=unknown",
        "/admin/lab/identity?concept=../branding",
        "/admin/lab/identity/reference/unknown.png",
        "/admin/lab/identity/reference/mubi.svg",
        "/admin/lab/identity/reference/identity-skills.lock.json",
        "/admin/lab/identity/unknown/mubi.png",
    ],
)
def test_unapproved_reference_files_are_not_served(owner, path):
    assert owner.get(path).status_code == 404


def test_raster_studies_do_not_expose_vector_exports_or_retired_drawings(owner):
    identity = json.loads((ROOT / "design/identity-concepts.json").read_text())
    retired = json.loads(
        (ROOT / "design/archive/identity-round-3-rejected.json").read_text()
    )
    for item in [*identity["concepts"], *retired["concepts"]]:
        for variant in ["sketch.svg", "reversed.svg", "icon-16.png"]:
            assert (
                owner.get(f"/admin/lab/identity/{item['id']}/{variant}").status_code
                == 404
            )
    for path in [
        "/.cache/identity/current-sketches/comparison.png",
        "/.cache/identity/round-3-sketches/open-letter.svg",
        "/design/identity-studies/round-4/comparison.png",
        "/design/archive/identity-round-3-rejected.json",
        "/design/identity-type/instrument-sans.ttf",
    ]:
        assert owner.get(path).status_code == 404


def test_comparison_sheet_is_available_only_in_approved_formats(owner, app):
    assert owner.get("/admin/lab/identity/sheet/comparison.svg").status_code == 404
    image_response = owner.get("/admin/lab/identity/sheet/comparison.png")
    assert image_response.headers["Cache-Control"] == "private, no-store"
    assert "noindex" in image_response.headers["X-Robots-Tag"]
    with Image.open(BytesIO(image_response.data)) as image:
        artwork = json.loads((ROOT / "design/identity-concepts.json").read_text())[
            "artwork"
        ]
        assert image.size == (artwork["width"], artwork["height"])
        assert image_response.data == (ROOT / "design" / artwork["source"]).read_bytes()
    for path in [
        "sheet/comparison.html",
        "sheet/identity-skills.lock.json",
        "open-letter/comparison.png",
        "open-letter/light.svg",
    ]:
        assert owner.get("/admin/lab/identity/" + path).status_code == 404
    assert owner.post("/admin/lab/identity", data={}).status_code == 405


def test_development_assets_are_private_native_vectors_and_real_icon_sizes(owner):
    import xml.etree.ElementTree as ET

    for treatment in ["green", "blue", "black", "reversed"]:
        for kind in ["lockup", "symbol"]:
            response = owner.get(
                f"/admin/lab/identity/development/{kind}-{treatment}.svg"
            )
            assert response.status_code == 200
            assert response.headers["Cache-Control"] == "private, no-store"
            assert "noindex" in response.headers["X-Robots-Tag"]
            svg = ET.fromstring(response.data)
            tags = {node.tag.rsplit("}", 1)[-1] for node in svg.iter()}
            assert {"path", "title"} <= tags
            assert not tags.intersection({"text", "image", "script", "foreignObject"})
        for size in [16, 24, 32]:
            response = owner.get(
                f"/admin/lab/identity/development/icon-{treatment}-{size}.png"
            )
            assert response.status_code == 200
            with Image.open(BytesIO(response.data)) as image:
                assert image.size == (size, size)
    for treatment in ["green", "blue"]:
        for extension in ["svg", "png"]:
            assert (
                owner.get(
                    f"/admin/lab/identity/development/applications-{treatment}.{extension}"
                ).status_code
                == 200
            )
    for variant in [
        "unknown.svg",
        "lockup-red.svg",
        "icon-green-128.png",
        "applications-black.png",
    ]:
        assert (
            owner.get(f"/admin/lab/identity/development/{variant}").status_code == 404
        )
    assert owner.get("/.cache/identity/development/lockup-green.svg").status_code == 404


def test_evergreen_archive_has_valid_hashes_icons_and_only_allowlisted_assets(owner):
    import hashlib
    import zipfile

    response = owner.get("/admin/lab/identity/kit/lay-shah-evergreen-kit.zip")
    assert response.status_code == 200
    assert "attachment" in response.headers["Content-Disposition"]
    assert response.headers["Cache-Control"] == "private, no-store"
    with zipfile.ZipFile(BytesIO(response.data)) as bundle:
        assert bundle.testzip() is None
        manifest = json.loads(bundle.read("manifest.json"))
        assert set(bundle.namelist()) == set(manifest["files"]) | {"manifest.json"}
        for filename, metadata in manifest["files"].items():
            contents = bundle.read(filename)
            assert hashlib.sha256(contents).hexdigest() == metadata["sha256"]
            assert len(contents) == metadata["bytes"]
            asset = owner.get(f"/admin/lab/identity/kit/{filename}")
            assert asset.status_code == 200 and asset.data == contents
            assert asset.headers["Cache-Control"] == "private, no-store"
        for name, size in [
            ("apple-touch-icon.png", (180, 180)),
            ("app-icon-192.png", (192, 192)),
            ("app-icon-512.png", (512, 512)),
            ("social-avatar.png", (1024, 1024)),
            ("default-sharing.png", (1200, 630)),
        ]:
            with Image.open(BytesIO(bundle.read(name))) as image:
                assert image.size == size
        with Image.open(BytesIO(bundle.read("favicon.ico"))) as icon:
            assert icon.info["sizes"] == {(16, 16), (32, 32), (48, 48)}
            for size in icon.info["sizes"]:
                assert icon.ico.getimage(size).size == size
        with Image.open(BytesIO(bundle.read("horizontal-white-1024.png"))) as png:
            assert png.mode == "RGBA" and png.getpixel((0, 0))[3] == 0
    for filename in ["horizontal-blue.svg", "unknown.svg", "identity-concepts.json"]:
        assert owner.get(f"/admin/lab/identity/kit/{filename}").status_code == 404
    assert (
        owner.get(
            "/.cache/identity/evergreen-kit/lay-shah-evergreen-kit.zip"
        ).status_code
        == 404
    )
