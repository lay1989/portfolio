import re
from copy import deepcopy

import pytest
from conftest import token
from test_editor import create_draft
from test_media import entry_form, upload

from app.extensions import db
from app.models import Entry, EntryAddress, Homepage, MediaReference, Revision
from app.services.import_content import import_content
from app.services.media import new_placement


def entry_info(app, kind="project"):
    with app.app_context():
        entry = db.session.scalar(
            db.select(Entry).where(Entry.kind == kind).order_by(Entry.position)
        )
        return entry.id, entry.path, entry.version


def rename(owner, app, identity, name, version=None):
    path = f"/admin/entry/{identity}/address"
    if version is None:
        with app.app_context():
            version = db.session.get(Entry, identity).version
    return owner.post(
        path,
        data={
            "csrf_token": token(owner.get(path)),
            "version": str(version),
            "slug": name,
        },
    )


def homepage_form(owner):
    response = owner.get("/admin/homepage")
    html = response.get_data(as_text=True)
    values = {
        name: re.search(rf'name="{name}" value="([^"]+)"', html).group(1)
        for name in ("version", "snapshot")
    }
    values["csrf_token"] = token(response)
    return values


@pytest.mark.parametrize(
    "kind,prefix", [("project", "/projects/"), ("post", "/blog-"), ("tool", "/tools/")]
)
def test_addresses_redirect_directly_after_repeated_rename_and_revert(
    owner, app, kind, prefix
):
    if kind == "tool":
        response = owner.post(
            "/admin/tools/new", data={"csrf_token": token(owner.get("/admin/"))}
        )
        identity = response.headers["Location"].rsplit("/", 1)[-1]
        with app.app_context():
            entry = db.session.get(Entry, identity)
            old = entry.path
            entry.published = {
                **entry.draft,
                "summary": "Useful.",
                "launch_url": "https://example.com/",
            }
            db.session.commit()
    else:
        identity, old, _ = entry_info(app, kind)
    assert rename(owner, app, identity, "first-name").status_code == 302
    assert rename(owner, app, identity, "second-name").status_code == 302
    second = prefix + "second-name.html"
    for address in (old, prefix + "first-name.html"):
        response = app.test_client().get(address + "?utm_source=old-link")
        assert response.status_code == 301
        assert response.headers["Location"] == second
        assert app.test_client().head(address).status_code == 301
    html = owner.get(second).get_data(as_text=True)
    assert f'<link rel="canonical" href="https://layshahdev.com{second}"' in html
    assert f'content="https://layshahdev.com{second}"' in html
    assert owner.get(second).status_code == 200
    sitemap = owner.get("/sitemap.xml").get_data(as_text=True)
    assert second in sitemap and old not in sitemap
    original_name = old.rsplit("/", 1)[-1].removesuffix(".html")
    if kind == "post":
        original_name = original_name.removeprefix("blog-")
    assert rename(owner, app, identity, original_name).status_code == 302
    assert owner.get(old).status_code == 200
    assert owner.get(second).headers["Location"] == old
    with app.app_context():
        entry = db.session.get(Entry, identity)
        entry.published = None
        db.session.commit()
    for address in (old, second, prefix + "first-name.html"):
        assert app.test_client().get(address).status_code == 404


def test_renamed_import_survives_repeat_import_without_duplicate(owner, app):
    identity, old, _ = entry_info(app)
    assert rename(owner, app, identity, "renamed-import").status_code == 302
    with app.app_context():
        assert import_content() == 0
        db.session.remove()
        assert import_content() == 0
        assert db.session.get(EntryAddress, old).entry_id == identity
        assert db.session.scalar(db.select(db.func.count()).select_from(Entry)) == 16


def test_address_validation_collisions_stale_tabs_and_reserved_aliases(owner, app):
    identity, old, version = entry_info(app)
    assert rename(owner, app, identity, "safe-name").status_code == 302
    assert rename(owner, app, identity, "stale", version).status_code == 409
    other = create_draft(owner, "project", "different-page").rsplit("/", 1)[-1]
    original_name = old.rsplit("/", 1)[-1].removesuffix(".html")
    assert rename(owner, app, other, original_name).status_code == 422
    assert rename(owner, app, other, "safe-name").status_code == 422
    response = owner.post(
        "/admin/new/project",
        data={
            "csrf_token": token(owner.get("/admin/new/project")),
            "title": "Duplicate old address",
            "slug": original_name,
        },
    )
    assert response.status_code == 422
    for name in (
        "../admin",
        "https://evil.example",
        "a--b",
        "a/b",
        "UPPER",
        "x" * 101,
        "",
    ):
        assert rename(owner, app, identity, name).status_code == 422
    assert owner.get(old).headers["Location"] == "/projects/safe-name.html"


def test_revision_preview_and_restore_are_private_keep_live_content_and_checkpoint(
    owner, app
):
    identity, public_path, version = entry_info(app)
    editor = f"/admin/entry/{identity}"
    with app.app_context():
        entry = db.session.get(Entry, identity)
        original = deepcopy(entry.draft)
        original_revision = db.session.scalar(
            db.select(Revision).where(Revision.entry_id == identity)
        )
        revision_id = original_revision.id
        position, featured = entry.position, entry.featured_position
    fields = {
        "csrf_token": token(owner.get(editor)),
        "version": str(version),
        "title": "My newer private draft",
        "action": "draft",
    }
    assert owner.post(editor, data=fields).status_code == 302
    assert rename(owner, app, identity, "current-address").status_code == 302
    history = editor + "/history"
    preview = f"{history}/{revision_id}"
    response = owner.get(preview)
    assert response.status_code == 200
    assert "historical preview" in response.get_data(as_text=True)
    assert response.headers["Cache-Control"] == "private, no-store"
    assert "noindex" in response.headers["X-Robots-Tag"]
    assert app.test_client().get(preview).status_code == 302
    with app.app_context():
        current = db.session.get(Entry, identity)
        current_version = current.version
        published = deepcopy(current.published)
        revision_count = db.session.scalar(
            db.select(db.func.count()).select_from(Revision)
        )
    assert (
        owner.post(
            preview + "/restore",
            data={"csrf_token": token(owner.get(history)), "version": str(version)},
        ).status_code
        == 409
    )
    assert (
        owner.post(
            preview + "/restore",
            data={
                "csrf_token": token(owner.get(history)),
                "version": str(current_version),
            },
        ).status_code
        == 302
    )
    with app.app_context():
        entry = db.session.get(Entry, identity)
        assert entry.draft["title"] == original["title"]
        assert entry.published == published
        assert (entry.position, entry.featured_position) == (position, featured)
        assert entry.path == "/projects/current-address.html"
        assert entry.version > current_version
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(Revision))
            == revision_count + 2
        )
        checkpoint = db.session.scalar(
            db.select(Revision).where(
                Revision.entry_id == identity, Revision.action == "checkpoint"
            )
        )
        assert checkpoint.payload["title"] == "My newer private draft"
        assert db.session.get(Revision, revision_id).payload == original
    assert owner.get(public_path).status_code == 301
    assert "My newer private draft" not in owner.get(
        "/projects/current-address.html"
    ).get_data(as_text=True)


def test_restore_media_retains_both_drafts_and_published_visibility(owner, app):
    first = upload(owner).json["asset"]["id"]
    path, identity, fields = entry_form(owner, app, first)
    assert owner.post(path, data=fields).status_code == 302
    with app.app_context():
        revision_id = db.session.scalar(
            db.select(Revision.id)
            .where(Revision.entry_id == identity)
            .order_by(Revision.id.desc())
        )
    fields["version"] = "2"
    fields["title"] = "Later draft"
    fields["cover.asset_id"] = ""
    assert owner.post(path, data=fields).status_code == 302
    response = owner.post(
        f"{path}/history/{revision_id}/restore",
        data={"csrf_token": token(owner.get(path)), "version": "3"},
    )
    assert response.status_code == 302
    with app.app_context():
        entry = db.session.get(Entry, identity)
        assert entry.draft["cover_media"]["asset_id"] == first
        references = db.session.scalars(
            db.select(MediaReference).where(MediaReference.asset_id == first)
        ).all()
        assert {r.state for r in references} == {"draft", "revision"}
        assert not any(r.state == "published" for r in references)


def test_history_pagination_and_revision_cannot_cross_entry(owner, app):
    identity, _, _ = entry_info(app)
    other, _, _ = entry_info(app, "post")
    with app.app_context():
        entry = db.session.get(Entry, identity)
        for _ in range(24):
            db.session.add(
                Revision(
                    entry_id=identity, payload=deepcopy(entry.draft), action="draft"
                )
            )
        db.session.commit()
        revision_id = db.session.scalar(
            db.select(Revision.id).where(Revision.entry_id == other)
        )
    path = f"/admin/entry/{identity}/history"
    assert "Older revisions" in owner.get(path).get_data(as_text=True)
    assert "Page 2 of 2" in owner.get(path + "?page=2").get_data(as_text=True)
    assert owner.get(path + "?page=999").status_code == 404
    assert owner.get(f"{path}/{revision_id}").status_code == 404
    assert (
        owner.post(
            f"{path}/{revision_id}/restore",
            data={"csrf_token": token(owner.get(path)), "version": "1"},
        ).status_code
        == 404
    )


def test_homepage_selection_independent_of_collection_order_and_snapshot_conflicts(
    owner, app
):
    with app.app_context():
        projects = db.session.scalars(
            db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
        ).all()
        identities = [e.id for e in projects]
        positions = {e.id: e.position for e in projects}
        paths = [e.path for e in projects]
    fields = homepage_form(owner)
    fields.update({"project.0": identities[5], "project.1": identities[4]})
    assert owner.post("/admin/homepage", data=fields).status_code == 302
    html = owner.get("/").get_data(as_text=True)
    assert html.index(paths[5]) < html.index(paths[4])
    assert paths[0] not in html
    collection = owner.get("/projects.html").get_data(as_text=True)
    assert collection.index(paths[0]) < collection.index(paths[5])
    with app.app_context():
        assert {
            e.id: e.position
            for e in db.session.scalars(db.select(Entry).where(Entry.kind == "project"))
        } == positions
    assert owner.post("/admin/homepage", data=fields).status_code == 409
    fields = homepage_form(owner)
    with app.app_context():
        entry = db.session.get(Entry, identities[5])
        entry.published = None
        db.session.commit()
    assert owner.post("/admin/homepage", data=fields).status_code == 409
    assert paths[5] not in owner.get("/").get_data(as_text=True)
    assert "unpublished; hidden" in owner.get("/admin/homepage").get_data(as_text=True)
    assert owner.post("/admin/homepage", data=homepage_form(owner)).status_code == 302
    with app.app_context():
        assert not any(
            e.featured_position is not None
            for e in db.session.scalars(db.select(Entry))
        )


@pytest.mark.parametrize(
    "bad_selection", ["duplicate", "wrong-kind", "missing", "draft"]
)
def test_invalid_homepage_choices_do_not_partially_save(owner, app, bad_selection):
    identity, _, _ = entry_info(app)
    post_id, _, _ = entry_info(app, "post")
    fields = homepage_form(owner)
    fields["project.0"] = identity
    fields["project.1"] = {
        "duplicate": identity,
        "wrong-kind": post_id,
        "missing": "does-not-exist",
        "draft": "",
    }[bad_selection]
    if bad_selection == "draft":
        fields["project.1"] = create_draft(owner, "project").rsplit("/", 1)[-1]
        fresh = homepage_form(owner)
        fields["snapshot"] = fresh["snapshot"]
    assert owner.post("/admin/homepage", data=fields).status_code == 422
    with app.app_context():
        assert db.session.get(Homepage, 1).version == 1
        assert db.session.get(Entry, identity).featured_position == 0


def test_publishing_controls_require_authentication_csrf_and_private_headers(
    owner, app
):
    identity, _, version = entry_info(app)
    with app.app_context():
        revision_id = db.session.scalar(
            db.select(Revision.id).where(Revision.entry_id == identity)
        )
    paths = [
        "/admin/homepage",
        f"/admin/entry/{identity}/address",
        f"/admin/entry/{identity}/history",
    ]
    for path in paths:
        assert app.test_client().get(path).status_code == 302
        response = owner.get(path)
        assert response.status_code == 200
        assert response.headers["Cache-Control"] == "private, no-store"
        assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
    for path in paths[:2] + [f"{paths[2]}/{revision_id}/restore"]:
        assert owner.post(path, data={"version": str(version)}).status_code == 400


def test_additive_migration_backfills_old_paths_without_editing_content(app):
    from flask_migrate import downgrade, upgrade

    with app.app_context():
        before = {
            e.id: (e.path, deepcopy(e.draft), deepcopy(e.published), e.version)
            for e in db.session.scalars(db.select(Entry))
        }
        db.session.remove()
        downgrade(revision="b6734b20ffb2")
        upgrade()
        after = {
            e.id: (e.path, e.draft, e.published, e.version)
            for e in db.session.scalars(db.select(Entry))
        }
        assert after == before
        assert {
            a.path: a.entry_id for a in db.session.scalars(db.select(EntryAddress))
        } == {value[0]: identity for identity, value in before.items()}
        assert db.session.get(Homepage, 1).version == 1


def test_unrestorable_revision_does_not_modify_current_content(owner, app):
    identity, _, version = entry_info(app)
    with app.app_context():
        entry = db.session.get(Entry, identity)
        before = deepcopy(entry.draft), deepcopy(entry.published), entry.version
        invalid = deepcopy(entry.draft)
        invalid["cover_media"] = {
            **new_placement(),
            "asset_id": "unavailable-asset",
            "alt": "Unavailable image",
        }
        revision = Revision(entry_id=identity, payload=invalid, action="draft")
        db.session.add(revision)
        db.session.commit()
        revision_id = revision.id
        count = db.session.scalar(db.select(db.func.count()).select_from(Revision))
    path = f"/admin/entry/{identity}/history"
    response = owner.post(
        f"{path}/{revision_id}/restore",
        data={"csrf_token": token(owner.get(path)), "version": str(version)},
        follow_redirects=True,
    )
    assert "could not be restored" in response.get_data(as_text=True)
    with app.app_context():
        entry = db.session.get(Entry, identity)
        assert (entry.draft, entry.published, entry.version) == before
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(Revision)) == count
        )
