import hashlib
import io
import json
import re
import time
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from conftest import token
from PIL import Image
from test_media import image_bytes, upload
from test_pages_and_collections import page_state

from app.extensions import db
from app.models import Entry, MediaAsset, PageMediaReference, PageRevision
from app.services.branding_media import SLOTS, brand_image_info, media_for
from app.services.media import cache_candidates, rendition

PATH = "/admin/pages/branding"


def brand_form(owner, app, selections=None, **overrides):
    draft, _, version, _ = page_state(app, "branding")
    with app.app_context():
        images = media_for(draft)
    result = {k: v for k, v in draft.items() if isinstance(v, str)}
    result.update(
        csrf_token=token(owner.get(PATH)),
        version=str(version),
        action="draft",
        brand_media_present="1",
    )
    for slot, placement in images.items():
        if selections is not None:
            placement["asset_id"] = selections.get(slot, "")
            placement["alt"] = (
                "Red and blue portfolio image" if slot == "sharing" else ""
            )
        for name, value in placement.items():
            if name != "id":
                result[f"brand.{slot}.{name}"] = (
                    str(value) if not isinstance(value, bool) else "1" if value else "0"
                )
    result.update(overrides)
    return result


def images_for(app, payload, private=False):
    with app.test_request_context("/"):
        return brand_image_info(payload, private)


def meta(response, name):
    match = re.search(
        rf'<meta (?:property|name)="{name}" content="([^"]*)"',
        response.get_data(as_text=True),
    )
    return match.group(1)


def image_asset(owner):
    return upload(owner, image_bytes(size=(1400, 900)), "brand.png").json["asset"]["id"]


def test_brand_images_preview_draft_publish_and_clear_have_scoped_visibility(
    owner, app
):
    identity = image_asset(owner)
    before = page_state(app, "branding")
    fields = brand_form(owner, app, dict.fromkeys(SLOTS, identity), action="preview")
    response = owner.post(PATH, data=fields)
    assert response.status_code == 200
    text = response.get_data(as_text=True)
    assert "/admin/media/file/" in text
    assert page_state(app, "branding") == before
    assert identity not in owner.get("/").get_data(as_text=True)
    share_private = urlsplit(meta(response, "og:image")).path
    assert share_private.startswith("/admin/media/file/")
    assert owner.get(share_private).mimetype == "image/png"
    assert app.test_client().get(share_private).status_code == 302
    assert (
        app.test_client()
        .get(share_private.replace("/admin/media/file/", "/media/"))
        .status_code
        == 404
    )
    fields["action"] = "draft"
    assert owner.post(PATH, data=fields).status_code == 302
    draft = page_state(app, "branding")[0]
    images = images_for(app, draft)
    public_urls = [v["url"] for v in images.values()]
    assert all(app.test_client().get(url).status_code == 404 for url in public_urls)
    assert owner.post(PATH, data=fields).status_code == 409
    assert (
        owner.post(PATH, data=brand_form(owner, app, action="publish")).status_code
        == 302
    )
    for public_path in ("/", "/projects.html", "/blog.html", "/tools.html"):
        response = owner.get(public_path)
        assert response.status_code == 200
        text = response.get_data(as_text=True)
        assert text.count(f'src="{images["logo"]["url"]}"') == 2
        assert 'sizes="96x96"' in text and 'rel="apple-touch-icon"' in text
        assert (
            meta(response, "og:image")
            == "https://layshahdev.com" + images["sharing"]["url"]
        )
        assert meta(response, "og:image:width") == "1200"
        assert meta(response, "og:image:height") == "630"
        assert meta(response, "og:image:type") == "image/png"
        assert meta(response, "twitter:image:alt") == "Red and blue portfolio image"
    for url in public_urls:
        assert app.test_client().get(url).status_code == 200
    assert (
        owner.post(PATH, data=brand_form(owner, app, {}, action="publish")).status_code
        == 302
    )
    text = owner.get("/").get_data(as_text=True)
    assert 'href="/public/favicon.svg"' in text
    assert identity not in text
    assert all(app.test_client().get(url).status_code == 404 for url in public_urls)
    with app.app_context():
        assert db.session.scalar(
            db.select(PageMediaReference.id).where(
                PageMediaReference.asset_id == identity,
                PageMediaReference.state == "revision",
            )
        )
        assert not db.session.scalar(
            db.select(PageMediaReference.id).where(
                PageMediaReference.asset_id == identity,
                PageMediaReference.state == "published",
            )
        )


def test_png_sizes_crop_focus_and_alpha_are_real_and_metadata_is_removed(owner, app):
    output = io.BytesIO()
    image = Image.new("RGBA", (1400, 900), (255, 0, 0, 128))
    image.paste((0, 0, 255, 255), (700, 0, 1400, 900))
    image.save(output, "PNG")
    image.close()
    identity = upload(owner, output.getvalue(), "transparent.png").json["asset"]["id"]
    fields = brand_form(
        owner, app, {"icon": identity, "sharing": identity}, **{"brand.icon.x": "0"}
    )
    assert owner.post(PATH, data=fields).status_code == 302
    images = images_for(app, page_state(app, "branding")[0], True)
    assert [v["width"] for v in images["icon"]["variants"]] == [96, 180, 192]
    response = owner.get(images["icon"]["variants"][0]["url"])
    assert response.mimetype == "image/png"
    with Image.open(io.BytesIO(response.data)) as icon:
        assert icon.format == "PNG" and icon.size == (96, 96)
        assert icon.getpixel((0, 0))[3] < 255
        assert not icon.getexif() and not icon.info.get("icc_profile")
    with Image.open(io.BytesIO(owner.get(images["sharing"]["url"]).data)) as sharing:
        assert sharing.size == (1200, 630)
    original_recipe = images["icon"]["recipe"]
    assert (
        owner.post(
            PATH, data=brand_form(owner, app, **{"brand.icon.x": "100"})
        ).status_code
        == 302
    )
    assert (
        images_for(app, page_state(app, "branding")[0])["icon"]["recipe"]
        != original_recipe
    )


def test_brand_image_recovery_keeps_publication_and_history_protected(owner, app):
    identity = image_asset(owner)
    with app.app_context():
        imported = db.session.scalar(
            db.select(PageRevision.id)
            .where(PageRevision.page_key == "branding")
            .order_by(PageRevision.id)
        )
    assert (
        owner.post(
            PATH, data=brand_form(owner, app, {"sharing": identity}, action="publish")
        ).status_code
        == 302
    )
    published = page_state(app, "branding")[1]
    url = images_for(app, published)["sharing"]["url"]
    assert (
        owner.post(
            f"{PATH}/history/{imported}/restore",
            data={
                "csrf_token": token(owner.get(PATH)),
                "version": str(page_state(app, "branding")[2]),
            },
        ).status_code
        == 302
    )
    current = page_state(app, "branding")
    assert "brand_media" not in current[0]
    assert current[1] == published
    assert owner.get(url).status_code == 200
    with app.app_context():
        checkpoint = db.session.scalar(
            db.select(PageRevision).where(
                PageRevision.page_key == "branding", PageRevision.action == "checkpoint"
            )
        )
        assert checkpoint.payload["brand_media"]["sharing"]["asset_id"] == identity
        assert db.session.scalar(
            db.select(PageMediaReference.id).where(
                PageMediaReference.revision_id == checkpoint.id
            )
        )
    response = owner.post(
        f"/admin/media/{identity}",
        data={
            "csrf_token": token(owner.get(f"/admin/media/{identity}")),
            "action": "archive",
        },
        follow_redirects=True,
    )
    assert "saved revisions" in response.get_data(as_text=True)
    with app.app_context():
        assert db.session.get(MediaAsset, identity).archived_at is None
        directory = Path(
            app.config["MEDIA_ROOT"],
            identity,
            images_for(app, published)["sharing"]["recipe"],
        )
        import os

        os.utime(directory, (time.time() - 200000,) * 2)
        assert directory not in cache_candidates()
    assert (
        owner.post(PATH, data=brand_form(owner, app, {}, action="publish")).status_code
        == 302
    )
    assert owner.get(url).status_code == 404
    assert (
        owner.get(
            f"/admin/media/file/{identity}/{directory.name}/w1200.png"
        ).status_code
        == 200
    )


@pytest.mark.parametrize(
    "slot,change",
    [
        ("sharing", {"brand.sharing.alt": ""}),
        ("logo", {"brand.logo.asset_id": "not-an-image"}),
        ("icon", {"brand.icon.x": "nan"}),
    ],
)
def test_invalid_branding_images_do_not_save(owner, app, slot, change):
    identity = image_asset(owner)
    before = page_state(app, "branding")
    response = owner.post(
        PATH, data=brand_form(owner, app, {slot: identity}, action="publish", **change)
    )
    assert response.status_code == 422
    assert page_state(app, "branding") == before


def test_small_favicon_source_is_rejected_without_upscaling(owner, app):
    identity = upload(owner, image_bytes(size=(100, 100)), "small.png").json["asset"][
        "id"
    ]
    before = page_state(app, "branding")
    response = owner.post(PATH, data=brand_form(owner, app, {"icon": identity}))
    assert response.status_code == 422
    assert "at least 192" in response.get_data(as_text=True)
    assert page_state(app, "branding") == before


def test_entries_keep_specific_images_and_draft_metadata_uses_private_urls(owner, app):
    shared = image_asset(owner)
    assert (
        owner.post(
            PATH, data=brand_form(owner, app, {"sharing": shared}, action="publish")
        ).status_code
        == 302
    )
    shared_url = meta(owner.get("/"), "og:image")
    with app.app_context():
        entry = db.session.scalar(
            db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
        )
        path, identity = entry.path, entry.id
    # Imported cover continues to win over the site's default card.
    assert meta(owner.get(path), "og:image") != shared_url
    from test_media import entry_form

    entry_image = upload(owner, image_bytes(size=(500, 300)), "entry.png").json[
        "asset"
    ]["id"]
    editor, _, fields = entry_form(owner, app, entry_image)
    preview = owner.post(editor + "/preview", data=fields)
    assert preview.status_code == 200
    private_url = urlsplit(meta(preview, "og:image")).path
    assert private_url.startswith("/admin/media/file/")
    assert owner.get(private_url).status_code == 200
    assert (
        app.test_client()
        .get(private_url.replace("/admin/media/file/", "/media/"))
        .status_code
        == 404
    )
    # Explicitly removing the entry cover permits the shared fallback.
    fields["cover.asset_id"] = ""
    assert owner.post(editor, data=fields).status_code == 302
    with app.app_context():
        entry = db.session.get(Entry, identity)
        fields["version"] = str(entry.version)
    fields["action"] = "publish"
    assert owner.post(editor, data=fields).status_code == 302
    assert meta(owner.get(path), "og:image") == shared_url


def test_import_media_rebuilds_shared_projections_and_retains_custom_files(owner, app):
    identity = image_asset(owner)
    assert (
        owner.post(
            PATH,
            data=brand_form(
                owner, app, dict.fromkeys(SLOTS, identity), action="publish"
            ),
        ).status_code
        == 302
    )
    before = page_state(app, "branding")
    with app.app_context():
        before_refs = set(
            db.session.execute(
                db.select(
                    PageMediaReference.asset_id,
                    PageMediaReference.state,
                    PageMediaReference.recipe,
                    PageMediaReference.revision_id,
                )
            )
        )
    result = app.test_cli_runner().invoke(args=["import-media"])
    assert result.exit_code == 0, result.output
    assert page_state(app, "branding") == before
    with app.app_context():
        assert (
            set(
                db.session.execute(
                    db.select(
                        PageMediaReference.asset_id,
                        PageMediaReference.state,
                        PageMediaReference.recipe,
                        PageMediaReference.revision_id,
                    )
                )
            )
            == before_refs
        )
    for info in images_for(app, before[1]).values():
        assert owner.get(info["url"]).status_code == 200


def test_existing_webp_recipe_hash_remains_compatible(app, owner):
    identity = image_asset(owner)
    with app.app_context():
        asset = db.session.get(MediaAsset, identity)
        expected = {
            "v": 1,
            "box": (0, 0, 1400, 900),
            "widths": [480, 960, 1400],
            "quality": app.config["MEDIA_QUALITY"],
        }
        digest = hashlib.sha256(
            json.dumps(expected, sort_keys=True).encode()
        ).hexdigest()[:24]
        assert rendition(asset, "original", 50, 50)["recipe"] == digest
