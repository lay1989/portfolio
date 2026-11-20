from copy import deepcopy

import pytest
from conftest import token
from test_pages_and_collections import page_form, page_state
from test_publishing import homepage_form
from werkzeug.datastructures import MultiDict

from app.extensions import db
from app.models import Entry, ManagedPage, PageRevision
from app.services.content import ContentError
from app.services.home_sections import SECTION_TYPES, sections_for, validate_sections
from app.services.import_content import import_content
from app.services.pages import clean_inline, defaults

PAGE = "/admin/pages/homepage"


def sections_state(app):
    with app.app_context():
        page = db.session.get(ManagedPage, "homepage")
        return sections_for(page.draft, defaults("homepage"))


def sections_form(owner, app, rows=None, action="draft", **overrides):
    fields = MultiDict(
        {
            name: value
            for name, value in page_form(owner, app, action=action).items()
            if not isinstance(value, (list, dict))
        }
    )
    for kind, items in (rows if rows is not None else sections_state(app)).items():
        fields[f"{kind}.present"] = "1"
        for row in items:
            fields.add(f"{kind}.id", row["id"])
            for name in SECTION_TYPES[kind]["fields"]:
                value = row.get(name, [] if name == "tags" else "")
                fields[f"item.{kind}.{row['id']}.{name}"] = (
                    ", ".join(value) if isinstance(value, list) else value
                )
    for name, value in overrides.items():
        fields[name] = value
    return fields


def test_existing_copy_and_tags_adapt_without_content_writes(owner, app):
    before = page_state(app)
    rows = sections_state(app)
    assert rows["services"][0]["title"] == before[0]["service.0.title"]
    assert rows["services"][0]["tags"] == ["HTML/CSS", "Tailwind", "GSAP"]
    response = owner.get(PAGE)
    text = response.get_data(as_text=True)
    assert 'name="services.present" value="1"' in text
    assert "item.services.legacy-service-0.title" in text
    assert 'name="service.0.title"' not in text
    assert page_state(app) == before
    assert (
        owner.get("/").get_data(as_text=True).count('data-home-item="legacy-service-0"')
        == 1
    )


def test_order_add_remove_tags_preview_draft_and_publish(owner, app):
    rows = sections_state(app)
    rows["services"] = [
        rows["services"][2],
        rows["services"][0],
        {
            "id": "new-service",
            "title": "A custom service",
            "description": "A useful outcome.",
            "tags": ["Python", "Flask"],
        },
    ]
    rows["process"] = list(reversed(rows["process"]))
    rows["reviews"] = [rows["reviews"][1], rows["reviews"][0]]
    before = page_state(app)
    fields = sections_form(
        owner,
        app,
        rows,
        action="preview",
        **{"services.heading.line1": "{serviceCount} services."},
    )
    preview = owner.post(PAGE, data=fields)
    assert preview.status_code == 200
    text = preview.get_data(as_text=True)
    assert (
        text.index('data-home-item="legacy-service-2"')
        < text.index('data-home-item="legacy-service-0"')
        < text.index('data-home-item="new-service"')
    )
    assert "Three services." in text and "A custom service" in text
    assert text.index("legacy-process-3") < text.index("legacy-process-0")
    assert text.index("legacy-review-1") < text.index("legacy-review-0")
    assert "Flask" in text
    assert page_state(app) == before
    assert "A custom service" not in owner.get("/").get_data(as_text=True)
    fields["action"] = "draft"
    assert owner.post(PAGE, data=fields).status_code == 302
    draft = page_state(app)[0]
    assert draft["sections_version"] == 1
    assert "service.0.title" not in draft
    assert [row["id"] for row in draft["services"]] == [
        "legacy-service-2",
        "legacy-service-0",
        "new-service",
    ]
    assert "A custom service" not in owner.get("/").get_data(as_text=True)
    fields = sections_form(owner, app, action="publish")
    assert owner.post(PAGE, data=fields).status_code == 302
    assert "A custom service" in owner.get("/").get_data(as_text=True)
    with app.app_context():
        assert import_content() == 0
        db.session.remove()
    assert "A custom service" in owner.get("/").get_data(as_text=True)


def test_empty_lists_hide_sections_and_matching_navigation_without_reappearing(
    owner, app
):
    rows = {kind: [] for kind in SECTION_TYPES}
    assert (
        owner.post(
            PAGE,
            data=sections_form(
                owner,
                app,
                rows,
                action="publish",
                **{
                    "services.heading.line1": "",
                    "process.heading.line1": "",
                    "reviews.heading.accent": "",
                },
            ),
        ).status_code
        == 302
    )
    text = owner.get("/").get_data(as_text=True)
    for name in ("services", "principles", "reviews"):
        assert f'<section id="{name}"' not in text
        assert f"index.html#{name}" not in text
    assert "Business websites" not in text
    assert '<section id="tools"' not in text
    assert sections_state(app) == rows
    assert owner.get(PAGE).status_code == 200
    with app.app_context():
        assert import_content() == 0
    assert '<section id="services"' not in owner.get("/").get_data(as_text=True)


def test_restore_legacy_history_after_structured_publish_keeps_old_content_complete(
    owner, app
):
    before = page_state(app)
    with app.app_context():
        revision_id = db.session.scalar(
            db.select(PageRevision.id)
            .where(PageRevision.page_key == "homepage")
            .order_by(PageRevision.id)
        )
    rows = {kind: [] for kind in SECTION_TYPES}
    assert (
        owner.post(
            PAGE, data=sections_form(owner, app, rows, action="publish")
        ).status_code
        == 302
    )
    historical = owner.get(f"{PAGE}/history/{revision_id}").get_data(as_text=True)
    assert 'data-home-item="legacy-service-0"' in historical
    assert "HTML/CSS" in historical
    assert "private historical preview" in historical.lower()
    version = page_state(app)[2]
    assert (
        owner.post(
            f"{PAGE}/history/{revision_id}/restore",
            data={"csrf_token": token(owner.get(PAGE)), "version": str(version)},
        ).status_code
        == 302
    )
    assert page_state(app)[0] == before[0]
    assert page_state(app)[1]["services"] == []
    assert "legacy-service-0" not in owner.get("/").get_data(as_text=True)
    assert (
        owner.post(PAGE, data=sections_form(owner, app, action="publish")).status_code
        == 302
    )
    assert "legacy-service-0" in owner.get("/").get_data(as_text=True)


@pytest.mark.parametrize("kind", ["services", "process", "reviews"])
def test_progressive_add_move_remove_preserves_unsaved_copy_and_never_writes(
    owner, app, kind
):
    before = page_state(app)
    fields = sections_form(
        owner,
        app,
        **{"hero.heading.line1": "Unsaved heading", "row_action": f"add:{kind}"},
    )
    response = owner.post(PAGE, data=fields)
    assert response.status_code == 200 and "Unsaved heading" in response.get_data(
        as_text=True
    )
    assert "Section layout updated" in response.get_data(as_text=True)
    assert page_state(app) == before
    rows = sections_state(app)
    first = rows[kind][0]["id"]
    response = owner.post(
        PAGE, data=sections_form(owner, app, row_action=f"down:{kind}:{first}")
    )
    text = response.get_data(as_text=True)
    assert text.index(f'name="{kind}.id" value="{rows[kind][1]["id"]}"') < text.index(
        f'name="{kind}.id" value="{first}"'
    )
    response = owner.post(
        PAGE, data=sections_form(owner, app, row_action=f"remove:{kind}:{first}")
    )
    assert f'name="{kind}.id" value="{first}"' not in response.get_data(as_text=True)
    assert page_state(app) == before


def test_incomplete_rows_are_drafts_and_correctable_publication_errors(owner, app):
    rows = sections_state(app)
    rows["reviews"].append({"id": "empty-review", "quote": "", "name": "", "role": ""})
    assert owner.post(PAGE, data=sections_form(owner, app, rows)).status_code == 302
    before = page_state(app)
    response = owner.post(PAGE, data=sections_form(owner, app, action="publish"))
    assert response.status_code == 422
    assert "complete each quote" in response.get_data(as_text=True)
    assert page_state(app) == before
    assert "empty-review" not in owner.get("/").get_data(as_text=True)


def test_plain_text_escapes_and_review_inline_is_sanitized(owner, app):
    rows = sections_state(app)
    rows["services"][0]["title"] = "<img src=x onerror=bad()>"
    rows["services"][0]["tags"] = ["<script>bad()</script>"]
    rows["reviews"][0]["quote"] = (
        '<strong onclick="bad()">A supported quote</strong><script>bad()</script><img src=x>'
    )
    assert (
        owner.post(
            PAGE, data=sections_form(owner, app, rows, action="publish")
        ).status_code
        == 302
    )
    text = owner.get("/").get_data(as_text=True)
    assert "&lt;img src=x onerror=bad()&gt;" in text
    assert "<strong>A supported quote</strong>" in text
    assert "<script>bad()" not in text and "<img src=x>" not in text


@pytest.mark.parametrize(
    "invalid",
    ["duplicate", "too-many", "long-title", "long-tag", "many-tags", "unsafe-id"],
)
def test_invalid_rows_do_not_change_saved_state(owner, app, invalid):
    rows = sections_state(app)
    if invalid == "duplicate":
        rows["services"].append(deepcopy(rows["services"][0]))
    elif invalid == "too-many":
        rows["services"] = [
            {**rows["services"][0], "id": f"row-{i}"} for i in range(13)
        ]
    elif invalid == "long-title":
        rows["services"][0]["title"] = "x" * 181
    elif invalid == "long-tag":
        rows["services"][0]["tags"] = ["x" * 41]
    elif invalid == "many-tags":
        rows["services"][0]["tags"] = [str(i) for i in range(13)]
    else:
        rows["services"][0]["id"] = "../invalid"
    before = page_state(app)
    assert owner.post(PAGE, data=sections_form(owner, app, rows)).status_code == 422
    assert page_state(app) == before


def test_malformed_persisted_schema_is_rejected_on_restore(app):
    with app.app_context():
        rows = sections_for(defaults("homepage"), defaults("homepage"))
        rows["services"][0]["id"] = {}
        with pytest.raises(ContentError):
            validate_sections(rows, False, clean_inline)


def test_section_changes_reject_stale_forms_and_unknown_schema(owner, app):
    fields = sections_form(owner, app)
    assert owner.post(PAGE, data=fields).status_code == 302
    before = page_state(app)
    assert owner.post(PAGE, data=fields).status_code == 409
    fields = sections_form(owner, app, row_action="remove:unknown:missing")
    assert owner.post(PAGE, data=fields).status_code == 422
    assert page_state(app) == before
    with app.app_context():
        payload = {**before[0], "sections_version": 2}
        from app.services.pages import validate_page

        with pytest.raises(ContentError, match="not supported"):
            validate_page("homepage", payload)


def create_tool(owner, app, title, published=True):
    response = owner.post(
        "/admin/tools/new", data={"csrf_token": token(owner.get("/admin/"))}
    )
    identity = response.headers["Location"].rsplit("/", 1)[-1]
    with app.app_context():
        entry = db.session.get(Entry, identity)
        entry.draft = {
            **entry.draft,
            "title": title,
            "summary": "A tool for a useful task.",
            "category": "Developer tools",
            "launch_url": "https://example.com/tool",
        }
        if published:
            entry.published = deepcopy(entry.draft)
        db.session.commit()
        return identity, entry.path, entry.position


def test_homepage_tools_are_published_only_ordered_and_independent_from_catalog(
    owner, app
):
    first, first_path, first_position = create_tool(owner, app, "First tool")
    second, second_path, second_position = create_tool(owner, app, "Second tool")
    private, _, _ = create_tool(owner, app, "Private tool", published=False)
    form = homepage_form(owner)
    form.update({"tool.0": second, "tool.1": first})
    assert owner.post("/admin/homepage", data=form).status_code == 302
    text = owner.get("/").get_data(as_text=True)
    assert '<section id="tools"' in text
    assert ">Tools</h2>" in text
    assert text.index(second_path) < text.index(first_path)
    assert "Private tool" not in text
    assert 'rel="noopener noreferrer"' in text
    with app.app_context():
        assert db.session.get(Entry, first).position == first_position
        assert db.session.get(Entry, second).position == second_position
        entry = db.session.get(Entry, second)
        entry.published = None
        db.session.commit()
    assert second_path not in owner.get("/").get_data(as_text=True)
    form = homepage_form(owner)
    form["tool.0"] = private
    assert owner.post("/admin/homepage", data=form).status_code == 422
    form = homepage_form(owner)
    form.update({"tool.0": first, "tool.1": first})
    assert owner.post("/admin/homepage", data=form).status_code == 422
    assert owner.post("/admin/homepage", data=homepage_form(owner)).status_code == 302
    assert '<section id="tools"' not in owner.get("/").get_data(as_text=True)
