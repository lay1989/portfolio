from copy import deepcopy

import pytest
from conftest import token
from werkzeug.datastructures import MultiDict

from app.extensions import db
from app.models import Entry, Revision
from app.services.content import BLOCK_FIELDS, initial_blocks


def create_draft(owner, kind, slug="a-useful-build"):
    response = owner.post(
        f"/admin/new/{kind}",
        data={
            "csrf_token": token(owner.get(f"/admin/new/{kind}")),
            "title": "A useful build",
            "slug": slug,
            "summary": "What this makes easier.",
            "category": "Engineering",
        },
    )
    assert response.status_code == 302
    return response.headers["Location"]


def section_form(owner, path, blocks, **overrides):
    fields = MultiDict(
        {
            "csrf_token": token(owner.get(path)),
            "version": "1",
            "blocks_present": "1",
            "action": "draft",
        }
    )
    for block in blocks:
        fields.add("block_id", block["id"])
        prefix = f"block.{block['id']}."
        fields[prefix + "type"] = block["type"]
        for name in BLOCK_FIELDS.get(block["type"], ()):
            value = block.get(name, "")
            fields[prefix + name] = (
                "\n".join(value) if isinstance(value, list) else value
            )
    for key, value in overrides.items():
        fields[key] = value
    return fields


def snapshot(app, identity):
    with app.app_context():
        entry = db.session.get(Entry, identity)
        return deepcopy(entry.draft), deepcopy(entry.published), entry.version


@pytest.mark.parametrize("kind,prefix", [("project", "/projects/"), ("post", "/blog-")])
def test_create_write_preview_publish_and_preserve_public_address(
    owner, app, kind, prefix
):
    path = create_draft(owner, kind)
    identity = path.rsplit("/", 1)[-1]
    public_path = prefix + "a-useful-build.html"
    assert owner.get(public_path).status_code == 404
    assert public_path not in owner.get("/sitemap.xml").get_data(as_text=True)
    blocks = [
        {"id": "intro", "type": "heading", "level": "h2", "text": "The brief"},
        {
            "id": "story",
            "type": "rich_text",
            "html": '<p>A <strong>careful</strong> build with <a href="https://example.com/">context</a>.</p>',
        },
        {
            "id": "steps",
            "type": "list",
            "style": "ordered",
            "items": ["Talk", "Build", "Review"],
        },
        {
            "id": "quote",
            "type": "quote",
            "text": "Useful work.",
            "attribution": "A client",
        },
        {
            "id": "code",
            "type": "code",
            "language": "HTML",
            "text": '    <script>alert("escaped")</script>\n',
        },
        {
            "id": "link",
            "type": "link",
            "text": "Read the docs",
            "url": "https://example.com/docs",
        },
        {"id": "rule", "type": "divider"},
    ]
    fields = section_form(owner, path, blocks)
    assert owner.post(path, data=fields).status_code == 302
    assert owner.get(public_path).status_code == 404
    draft, published, version = snapshot(app, identity)
    assert published is None and version == 2
    assert [b["id"] for b in draft["blocks"]] == [b["id"] for b in blocks]
    assert draft["blocks"][4]["text"] == blocks[4]["text"]
    preview = owner.get("/admin/preview/" + identity)
    assert preview.status_code == 200
    fields = section_form(owner, path, blocks)
    fields["action"] = "publish"
    fields["version"] = "2"
    assert owner.post(path, data=fields).status_code == 302
    html = owner.get(public_path).get_data(as_text=True)
    assert '<h2 class="site-heading">The brief</h2>' in html
    assert "<strong>careful</strong>" in html
    assert 'href="https://example.com/docs"' in html
    assert "&lt;script&gt;" in html and '<script>alert("escaped")' not in html
    assert public_path in owner.get("/sitemap.xml").get_data(as_text=True)


def test_preview_unsaved_content_never_changes_draft_or_revision(owner, app):
    path = create_draft(owner, "post")
    identity = path.rsplit("/", 1)[-1]
    before = snapshot(app, identity)
    fields = section_form(
        owner,
        path,
        [
            {
                "id": "p",
                "type": "rich_text",
                "html": '<p onclick="bad()">Unsaved story <script>bad()</script></p>',
            }
        ],
    )
    fields["title"] = "Unsaved headline"
    response = owner.post(path + "/preview", data=fields)
    assert response.status_code == 200
    assert "Unsaved headline" in response.get_data(as_text=True)
    assert "onclick=" not in response.get_data(as_text=True)
    assert "<script>bad()" not in response.get_data(as_text=True)
    assert response.headers["Cache-Control"] == "private, no-store"
    assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
    assert snapshot(app, identity) == before
    with app.app_context():
        assert (
            db.session.scalar(
                db.select(db.func.count())
                .select_from(Revision)
                .where(Revision.entry_id == identity)
            )
            == 1
        )
    fields["version"] = "999"
    assert owner.post(path + "/preview", data=fields).status_code == 409


@pytest.mark.parametrize("kind", ["project", "post"])
def test_opening_legacy_content_is_read_only_and_save_preserves_content(
    owner, app, kind
):
    with app.app_context():
        entry = db.session.scalar(
            db.select(Entry).where(Entry.kind == kind).order_by(Entry.position)
        )
        identity = entry.id
        before = deepcopy(entry.draft)
        original_published = deepcopy(entry.published)
        blocks = initial_blocks(before, kind)
    path = "/admin/entry/" + identity
    assert owner.get(path).status_code == 200
    assert snapshot(app, identity)[0] == before
    fields = section_form(owner, path, blocks)
    assert owner.post(path, data=fields).status_code == 302
    draft, published, _ = snapshot(app, identity)
    assert published == original_published
    assert draft["blocks"] == blocks
    for key in ("heroImg", "screenshots", "metrics", "testimonial", "cover", "body"):
        if key in before:
            assert draft[key] == before[key]


def test_reordered_and_removed_sections_define_public_content(owner):
    path = create_draft(owner, "project")
    blocks = [
        {"id": "last", "type": "heading", "level": "h3", "text": "Last moved first"},
        {"id": "first", "type": "rich_text", "html": "<p>First moved last.</p>"},
    ]
    fields = section_form(owner, path, blocks)
    fields["action"] = "publish"
    assert owner.post(path, data=fields).status_code == 302
    html = owner.get("/projects/a-useful-build.html").get_data(as_text=True)
    assert html.index("Last moved first") < html.index("First moved last.")
    fields = section_form(owner, path, [blocks[1]])
    fields["version"] = "2"
    fields["action"] = "publish"
    assert owner.post(path, data=fields).status_code == 302
    html = owner.get("/projects/a-useful-build.html").get_data(as_text=True)
    assert "Last moved first" not in html
    assert "First moved last." in html


def test_incomplete_drafts_save_but_do_not_publish(owner, app):
    path = create_draft(owner, "post")
    identity = path.rsplit("/", 1)[-1]
    blocks = [{"id": "blank", "type": "heading", "level": "h2", "text": ""}]
    fields = section_form(owner, path, blocks)
    assert owner.post(path, data=fields).status_code == 302
    fields["version"] = "2"
    fields["action"] = "publish"
    fields["title"] = "Keep my input"
    response = owner.post(path, data=fields)
    assert response.status_code == 422
    assert "Keep my input" in response.get_data(as_text=True)
    assert 'data-unsaved="true"' in response.get_data(as_text=True)
    assert snapshot(app, identity)[1] is None


@pytest.mark.parametrize(
    "block",
    [
        {"id": "x", "type": "unknown"},
        {"id": "x", "type": "heading", "level": "h1", "text": "Wrong level"},
        {"id": "x", "type": "list", "style": "custom-css", "items": ["Wrong style"]},
        {"id": "x", "type": "link", "text": "Bad link", "url": "javascript:alert(1)"},
        {"id": "bad.id", "type": "divider"},
    ],
)
def test_invalid_section_schema_never_reaches_the_database(owner, app, block):
    path = create_draft(owner, "post")
    identity = path.rsplit("/", 1)[-1]
    before = snapshot(app, identity)
    assert owner.post(path, data=section_form(owner, path, [block])).status_code == 422
    assert snapshot(app, identity) == before


def test_unique_urls_and_invalid_dates_show_correctable_errors(owner, app):
    path = create_draft(owner, "post")
    identity = path.rsplit("/", 1)[-1]
    conflict = owner.post(
        "/admin/new/post",
        data={
            "csrf_token": token(owner.get("/admin/new/post")),
            "title": "Another draft",
            "slug": "a-useful-build",
        },
    )
    assert conflict.status_code == 422
    assert "already in use" in conflict.get_data(as_text=True)
    fields = section_form(owner, path, [])
    fields["date"] = "2026-02-30"
    assert owner.post(path, data=fields).status_code == 422
    assert snapshot(app, identity)[2] == 1


def test_article_details_and_reading_time_are_derived_from_saved_sections(owner, app):
    path = create_draft(owner, "post")
    identity = path.rsplit("/", 1)[-1]
    fields = section_form(
        owner,
        path,
        [{"id": "p", "type": "rich_text", "html": "<p>" + "word " * 450 + "</p>"}],
    )
    fields.update({"date": "2026-10-24", "tags": "Flask, Design, Flask"})
    fields["action"] = "publish"
    assert owner.post(path, data=fields).status_code == 302
    draft, published, _ = snapshot(app, identity)
    assert draft["readMinutes"] == 3
    assert published["tags"] == ["Flask", "Design"]
    html = owner.get("/blog-a-useful-build.html").get_data(as_text=True)
    assert 'datetime="2026-10-24"' in html and '"datePublished": "2026-10-24"' in html
    assert "3 min read" in html


def test_creation_and_preview_require_owner_and_csrf(client):
    assert client.get("/admin/new/project").status_code == 302
    assert client.post("/admin/new/post", data={"title": "Bad"}).status_code == 400
    csrf = token(client.get("/admin/login"))
    assert (
        client.post(
            "/admin/entry/missing/preview", data={"csrf_token": csrf}
        ).status_code
        == 302
    )


def test_no_javascript_section_controls_preserve_unsaved_edits(owner, app):
    path = create_draft(owner, "post")
    identity = path.rsplit("/", 1)[-1]
    fields = section_form(
        owner,
        path,
        [{"id": "p", "type": "rich_text", "html": "<p>Retain this text.</p>"}],
    )
    fields.update({"section_action": "add", "block_kind": "heading"})
    response = owner.post(path, data=fields)
    assert response.status_code == 200
    assert "Retain this text." in response.get_data(as_text=True)
    assert "Heading text" in response.get_data(as_text=True)
    assert snapshot(app, identity)[0]["blocks"] == []
