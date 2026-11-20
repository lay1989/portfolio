import io
from copy import deepcopy
from pathlib import Path

import pytest
from conftest import token
from PIL import Image
from werkzeug.datastructures import MultiDict

from app.extensions import db
from app.models import Entry, MediaAsset, MediaReference, Revision
from app.services.media import new_placement, placement_renditions


def image_bytes(format="PNG", size=(400, 200), exif=None):
    image = Image.new("RGB", size, "red")
    image.paste("blue", (size[0] // 2, 0, size[0], size[1]))
    output = io.BytesIO()
    image.save(output, format=format, **({"exif": exif} if exif else {}))
    image.close()
    return output.getvalue()


def upload(owner, raw=None, filename="test.png"):
    return owner.post(
        "/admin/media/upload",
        data={"image": (io.BytesIO(raw or image_bytes()), filename)},
        headers={
            "X-CSRFToken": token(owner.get("/admin/media")),
            "Accept": "application/json",
        },
    )


def entry_form(
    owner,
    app,
    asset_id,
    ratio="square",
    x=0,
    alt="Red and blue test image",
    action="draft",
):
    with app.app_context():
        entry = db.session.scalar(
            db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
        )
        path, identity, version = "/admin/entry/" + entry.id, entry.id, entry.version
    fields = MultiDict(
        {
            "csrf_token": token(owner.get(path)),
            "version": str(version),
            "action": action,
            "media_present": "1",
        }
    )
    placement = new_placement()
    placement.update(
        asset_id=asset_id,
        ratio=ratio,
        x=x,
        alt=alt,
        mobile_ratio="portrait",
        mobile_x=100,
    )
    for name, value in placement.items():
        if name != "id":
            fields["cover." + name] = (
                str(value) if not isinstance(value, bool) else "1" if value else "0"
            )
    return path, identity, fields


def image_urls(app, asset_id, placement):
    with app.app_context():
        asset = db.session.get(MediaAsset, asset_id)
        desktop, mobile = placement_renditions(asset, placement)

        def url(info, private=False):
            return f"{'/admin/media/file' if private else '/media'}/{asset_id}/{info['recipe']}/{info['variants'][-1]['filename']}"

        return url(desktop), url(mobile), url(desktop, True)


def test_upload_is_private_deduplicated_and_contains_real_variants(owner, app):
    response = upload(owner, filename="../../test.png")
    assert response.status_code == 201
    option = response.json["asset"]
    assert option["width"] == 400 and option["height"] == 200
    assert owner.get(option["url"]).status_code == 200
    assert app.test_client().get(option["url"]).status_code == 302
    with app.app_context():
        asset = db.session.get(MediaAsset, option["id"])
        assert asset.original_name == "test.png"
        assert Path(app.config["MEDIA_ROOT"], asset.id, "master.webp").is_file()
    assert upload(owner).json["asset"]["id"] == option["id"]
    with app.app_context():
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(MediaAsset)) == 1
        )
    guessed = option["url"].replace("/admin/media/file/", "/media/")
    assert app.test_client().get(guessed).status_code == 404
    assert owner.get("/media/" + option["id"] + "/master.webp").status_code == 404


def test_orientation_is_applied_and_exif_is_removed(owner, app):
    exif = Image.Exif()
    exif[274] = 6
    exif[315] = "Private camera owner"
    response = upload(owner, image_bytes("JPEG", exif=exif), "camera.jpg")
    assert response.status_code == 201
    asset = response.json["asset"]
    assert (asset["width"], asset["height"]) == (200, 400)
    with Image.open(
        Path(app.config["MEDIA_ROOT"], asset["id"], "master.webp")
    ) as image:
        assert not image.getexif()
        assert "exif" not in image.info and "xmp" not in image.info


@pytest.mark.parametrize(
    "raw,filename",
    [
        (b'<svg onload="bad()"/>', "image.svg"),
        (b"not an image", "fake.png"),
        (image_bytes("JPEG"), "disguised.png"),
        (image_bytes()[:50], "truncated.png"),
    ],
)
def test_invalid_uploads_leave_no_asset_or_files(owner, app, raw, filename):
    assert upload(owner, raw, filename).status_code == 422
    with app.app_context():
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(MediaAsset)) == 0
        )
    root = Path(app.config["MEDIA_ROOT"])
    assert not root.exists() or not list(root.iterdir())


def test_upload_rejects_animation_and_excessive_pixels(owner, app):
    output = io.BytesIO()
    first = Image.new("RGB", (20, 20), "red")
    second = Image.new("RGB", (20, 20), "blue")
    first.save(
        output, "WEBP", save_all=True, append_images=[second], duration=100, loop=0
    )
    assert upload(owner, output.getvalue(), "moving.webp").status_code == 422
    app.config["MEDIA_MAX_PIXELS"] = 100
    assert upload(owner, image_bytes(size=(20, 20))).status_code == 422


def test_upload_limits_and_csrf_are_enforced_before_storage(owner, app):
    assert (
        owner.post(
            "/admin/media/upload",
            data={"image": (io.BytesIO(image_bytes()), "test.png")},
        ).status_code
        == 400
    )
    oversized = image_bytes() + b"x" * app.config["MEDIA_MAX_BYTES"]
    assert upload(owner, oversized).status_code == 422
    assert upload(owner, b"x" * (9 * 1024 * 1024)).status_code == 413
    with app.app_context():
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(MediaAsset)) == 0
        )


def test_crops_publish_atomically_and_draft_recipes_are_never_public(owner, app):
    asset_id = upload(owner).json["asset"]["id"]
    path, identity, fields = entry_form(owner, app, asset_id)
    assert owner.post(path, data=fields).status_code == 302
    with app.app_context():
        placement = deepcopy(db.session.get(Entry, identity).draft["cover_media"])
    left, mobile, private_left = image_urls(app, asset_id, placement)
    assert owner.get(private_left).status_code == 200
    assert app.test_client().get(left).status_code == 404
    html = owner.get("/admin/preview/" + identity).get_data(as_text=True)
    assert private_left in html and 'width="160" height="200"' in html
    path, identity, fields = entry_form(owner, app, asset_id, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    response = app.test_client().get(left)
    assert response.status_code == 200 and response.mimetype == "image/webp"
    with Image.open(io.BytesIO(response.data)) as image:
        assert image.width == image.height
        red, _, blue = image.getpixel((image.width // 2, image.height // 2))[:3]
        assert red > blue + 100
    assert app.test_client().get(mobile).status_code == 200
    public_html = owner.get("/projects/ash-clipping.html").get_data(as_text=True)
    assert left in public_html and 'property="og:image:width"' in public_html
    path, identity, fields = entry_form(owner, app, asset_id, x=100)
    assert owner.post(path, data=fields).status_code == 302
    with app.app_context():
        right_placement = deepcopy(db.session.get(Entry, identity).draft["cover_media"])
    right, _, _ = image_urls(app, asset_id, right_placement)
    assert right != left and app.test_client().get(right).status_code == 404
    assert app.test_client().get(left).status_code == 200
    path, identity, fields = entry_form(owner, app, asset_id, x=100, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    assert app.test_client().get(left).status_code == 404
    assert app.test_client().get(right).status_code == 200
    path, identity, fields = entry_form(owner, app, asset_id, x=100, action="unpublish")
    assert owner.post(path, data=fields).status_code == 302
    assert app.test_client().get(right).status_code == 404
    owner.post(
        f"/admin/media/{asset_id}",
        data={
            "csrf_token": token(owner.get(f"/admin/media/{asset_id}")),
            "action": "archive",
        },
    )
    with app.app_context():
        assert db.session.get(MediaAsset, asset_id).archived_at is None
        assert db.session.scalar(
            db.select(MediaReference.id).where(
                MediaReference.asset_id == asset_id, MediaReference.state == "revision"
            )
        )


def test_unsaved_image_preview_has_no_content_or_reference_writes(owner, app):
    asset_id = upload(owner).json["asset"]["id"]
    path, identity, fields = entry_form(owner, app, asset_id)
    with app.app_context():
        entry = db.session.get(Entry, identity)
        before = deepcopy(entry.draft), deepcopy(entry.published), entry.version
        revisions = db.session.scalar(db.select(db.func.count()).select_from(Revision))
    response = owner.post(path + "/preview", data=fields)
    assert response.status_code == 200
    assert "/admin/media/file/" in response.get_data(as_text=True)
    with app.app_context():
        entry = db.session.get(Entry, identity)
        assert (entry.draft, entry.published, entry.version) == before
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(Revision))
            == revisions
        )
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(MediaReference))
            == 0
        )


def test_alt_text_is_required_for_publishing_unless_decorative(owner, app):
    asset_id = upload(owner).json["asset"]["id"]
    path, _, fields = entry_form(owner, app, asset_id, alt="")
    assert owner.post(path, data=fields).status_code == 302
    path, _, fields = entry_form(owner, app, asset_id, alt="", action="publish")
    response = owner.post(path, data=fields)
    assert response.status_code == 422 and b"screen readers" in response.data
    fields["cover.decorative"] = "1"
    assert owner.post(path, data=fields).status_code == 302
    html = owner.get("/projects/ash-clipping.html").get_data(as_text=True)
    assert 'alt=""' in html


@pytest.mark.parametrize(
    "field,value",
    [
        ("x", "nan"),
        ("mobile_y", "101"),
        ("ratio", "custom-css"),
        ("asset_id", "missing"),
    ],
)
def test_invalid_placements_are_rejected_without_changing_the_draft(
    owner, app, field, value
):
    asset_id = upload(owner).json["asset"]["id"]
    path, identity, fields = entry_form(owner, app, asset_id)
    fields["cover." + field] = value
    assert owner.post(path, data=fields).status_code == 422
    with app.app_context():
        assert "cover_media" not in db.session.get(Entry, identity).draft


def test_image_and_gallery_blocks_render_in_the_chosen_order(owner, app):
    asset_id = upload(owner).json["asset"]["id"]
    path, _, fields = entry_form(owner, app, asset_id, action="publish")
    fields["blocks_present"] = "1"
    fields.add("block_id", "pictures")
    fields["block.pictures.type"] = "gallery"
    fields["block.pictures.layout"] = "grid"
    for identity, caption in [
        ("second", "Second moved first"),
        ("first", "First moved last"),
    ]:
        fields.add("block.pictures.gallery.image_id", identity)
        fields[f"block.pictures.gallery.{identity}.asset_id"] = asset_id
        fields[f"block.pictures.gallery.{identity}.alt"] = caption
        fields[f"block.pictures.gallery.{identity}.caption"] = caption
    fields.add("block_id", "solo")
    fields["block.solo.type"] = "image"
    fields["block.solo.media.asset_id"] = asset_id
    fields["block.solo.media.alt"] = "One more view"
    assert owner.post(path, data=fields).status_code == 302
    html = owner.get("/projects/ash-clipping.html").get_data(as_text=True)
    assert "media-gallery-grid" in html
    assert (
        html.index("Second moved first")
        < html.index("First moved last")
        < html.index("One more view")
    )


def test_unused_assets_can_be_archived_and_restored(owner, app):
    asset_id = upload(owner).json["asset"]["id"]
    path = "/admin/media/" + asset_id
    assert (
        owner.post(
            path, data={"csrf_token": token(owner.get(path)), "action": "archive"}
        ).status_code
        == 302
    )
    with app.app_context():
        assert db.session.get(MediaAsset, asset_id).archived_at
    assert (
        owner.post(
            path, data={"csrf_token": token(owner.get(path)), "action": "restore"}
        ).status_code
        == 302
    )
    with app.app_context():
        assert db.session.get(MediaAsset, asset_id).archived_at is None


def test_import_normalizes_legacy_mislabeled_images_without_rewriting_snapshots(app):
    with app.app_context():
        entries = list(db.session.scalars(db.select(Entry)))
        before = {
            e.id: (deepcopy(e.draft), deepcopy(e.published), e.version) for e in entries
        }
    result = app.test_cli_runner().invoke(args=["import-media"])
    assert result.exit_code == 0, result.output
    again = app.test_cli_runner().invoke(args=["import-media"])
    assert again.exit_code == 0 and "Imported 0 missing images" in again.output
    with app.app_context():
        for identity, values in before.items():
            entry = db.session.get(Entry, identity)
            assert (entry.draft, entry.published, entry.version) == values
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(MediaAsset)) == 35
        )
        assert db.session.scalar(
            db.select(MediaReference.id).where(MediaReference.state == "published")
        )


def test_shared_crop_format_change_is_prepared_without_rewriting_content(owner, app):
    asset_id = upload(owner).json["asset"]["id"]
    path, identity, fields = entry_form(owner, app, asset_id, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    with app.app_context():
        before = deepcopy(db.session.get(Entry, identity).published)
        app.config["DESIGN_CONTENT"] = deepcopy(app.config["DESIGN_CONTENT"])
        app.config["DESIGN_CONTENT"]["media"]["ratios"]["square"] = [3, 2]
    result = app.test_cli_runner().invoke(args=["import-media"])
    assert result.exit_code == 0, result.output
    public_url, _, _ = image_urls(app, asset_id, before["cover_media"])
    response = app.test_client().get(public_url)
    assert response.status_code == 200
    with Image.open(io.BytesIO(response.data)) as image:
        assert abs(image.width / image.height - 1.5) < 0.01
    with app.app_context():
        assert db.session.get(Entry, identity).published == before


def test_cache_cleanup_dry_run_protects_all_referenced_versions_and_masters(owner, app):
    import os
    import time

    asset_id = upload(owner).json["asset"]["id"]
    path, _, fields = entry_form(owner, app, asset_id, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    root = Path(app.config["MEDIA_ROOT"])
    stale = root / asset_id / ("f" * 24)
    stale.mkdir()
    (stale / "w100.webp").write_bytes(b"obsolete crop cache")
    old = time.time() - 48 * 3600
    for folder in (root / asset_id).iterdir():
        if folder.is_dir():
            os.utime(folder, (old, old))
    dry_run = app.test_cli_runner().invoke(args=["media-prune-cache"])
    assert dry_run.exit_code == 0 and "Dry run: 1" in dry_run.output
    assert stale.exists()
    removed = app.test_cli_runner().invoke(args=["media-prune-cache", "--apply"])
    assert removed.exit_code == 0 and "Removed 1" in removed.output
    assert not stale.exists() and (root / asset_id / "master.webp").exists()
    assert len([p for p in (root / asset_id).iterdir() if p.is_dir()]) >= 2


def test_existing_optional_links_render_as_empty_fields_in_the_full_editor(owner, app):
    with app.app_context():
        entry = db.session.scalar(
            db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
        )
        path = "/admin/entry/" + entry.id
    html = owner.get(path).get_data(as_text=True)
    assert 'name="githubUrl" value="None"' not in html
    assert 'name="githubUrl" value=""' in html


def test_transparent_png_stays_transparent_after_normalization(owner, app):
    source = Image.new("RGBA", (40, 40), (255, 0, 0, 0))
    output = io.BytesIO()
    source.save(output, "PNG")
    response = upload(owner, output.getvalue(), "transparent.png")
    assert response.status_code == 201
    with Image.open(
        Path(app.config["MEDIA_ROOT"], response.json["asset"]["id"], "master.webp")
    ) as image:
        assert image.mode == "RGBA" and image.getpixel((0, 0))[3] == 0


def test_gallery_controls_without_javascript_keep_changes_unsaved(owner, app):
    asset_id = upload(owner).json["asset"]["id"]
    path, identity, fields = entry_form(owner, app, asset_id)
    fields["media_action"] = "add:gallery"
    response = owner.post(path, data=fields)
    assert response.status_code == 200
    assert 'data-unsaved="true"' in response.get_data(as_text=True)
    assert 'name="gallery.image_id"' in response.get_data(as_text=True)
    with app.app_context():
        assert "gallery_media" not in db.session.get(Entry, identity).draft
