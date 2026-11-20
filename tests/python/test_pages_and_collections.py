import html
import re
from copy import deepcopy

import pytest
from conftest import token

from app import create_app
from app.extensions import db
from app.models import Entry, ManagedPage, PageRevision
from app.services.import_content import import_content


def page_state(app, key="homepage"):
    with app.app_context():
        page = db.session.get(ManagedPage, key)
        return (
            deepcopy(page.draft),
            deepcopy(page.published),
            page.version,
            db.session.scalar(db.select(db.func.count()).select_from(PageRevision)),
        )


def page_form(owner, app, key="homepage", **values):
    draft, _, version, _ = page_state(app, key)
    return {
        **draft,
        **values,
        "version": str(version),
        "csrf_token": token(owner.get(f"/admin/pages/{key}")),
    }


def canonical(response):
    return html.unescape(
        re.search(
            r'<link rel="canonical" href="([^"]+)"', response.get_data(as_text=True)
        ).group(1)
    )


def test_defaults_seed_current_copy_and_opening_editor_writes_nothing(owner, app):
    before = page_state(app)
    assert before[0]["service.0.tags"] == "HTML/CSS, Tailwind, GSAP"
    assert before[0]["hero.heading.line1"] == "Less busywork."
    assert before[0]["hero.heading.accent"] == "More of your actual business."
    assert "<em>" in before[0]["review.0.quote"]
    response = owner.get("/admin/pages/homepage")
    assert response.status_code == 200
    assert "Introduction" in response.get_data(as_text=True)
    assert response.headers["Cache-Control"] == "private, no-store"
    assert page_state(app) == before
    with app.app_context():
        assert import_content() == 0
    assert page_state(app) == before
    assert "Less busywork." in owner.get("/").get_data(as_text=True)


def test_homepage_unsaved_preview_draft_publish_restore_and_stale_tabs(owner, app):
    path = "/admin/pages/homepage"
    before = page_state(app)
    fields = page_form(
        owner,
        app,
        **{
            "hero.heading.line1": "A draft homepage headline",
            "seo.title": "Preview title",
            "action": "preview",
        },
    )
    response = owner.post(path, data=fields)
    assert response.status_code == 200
    assert "A draft homepage headline" in response.get_data(as_text=True)
    assert "Preview of unsaved changes" in response.get_data(as_text=True)
    assert 'href="/projects.html"' in response.get_data(as_text=True)
    assert "<fieldset disabled>" in response.get_data(as_text=True)
    assert "Six services.<br><span" in response.get_data(as_text=True)
    assert "<fieldset disabled>" not in owner.get("/").get_data(as_text=True)
    assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
    assert response.headers["Cache-Control"] == "private, no-store"
    assert page_state(app) == before
    assert "A draft homepage headline" not in owner.get("/").get_data(as_text=True)
    fields["action"] = "draft"
    assert owner.post(path, data=fields).status_code == 302
    assert "A draft homepage headline" not in owner.get("/").get_data(as_text=True)
    assert owner.post(path, data=fields).status_code == 409
    fields = page_form(owner, app, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    public = owner.get("/").get_data(as_text=True)
    assert (
        "A draft homepage headline" in public
        and "<title>Preview title</title>" in public
    )
    assert canonical(owner.get("/index.html")) == "https://layshahdev.com/"
    with app.app_context():
        revision_id = db.session.scalar(
            db.select(PageRevision.id)
            .where(PageRevision.page_key == "homepage")
            .order_by(PageRevision.id)
        )
    history = path + "/history"
    response = owner.get(f"{history}/{revision_id}")
    assert "historical preview" in response.get_data(as_text=True)
    live_before = deepcopy(page_state(app)[1])
    version = page_state(app)[2]
    restore_fields = {"csrf_token": token(owner.get(history)), "version": str(version)}
    assert (
        owner.post(f"{history}/{revision_id}/restore", data=restore_fields).status_code
        == 302
    )
    assert page_state(app)[0] == before[0]
    assert page_state(app)[1] == live_before
    with app.app_context():
        checkpoint = db.session.scalar(
            db.select(PageRevision).where(
                PageRevision.page_key == "homepage", PageRevision.action == "checkpoint"
            )
        )
        assert checkpoint.payload["hero.heading.line1"] == "A draft homepage headline"
    assert (
        owner.post(f"{history}/{revision_id}/restore", data=restore_fields).status_code
        == 409
    )


def test_homepage_escaping_inline_sanitization_and_template_literals(owner, app):
    fields = page_form(
        owner,
        app,
        action="publish",
        **{
            "hero.heading.line1": "<img src=x onerror=bad()> {{ 7*7 }}",
            "review.0.quote": '<strong onclick="bad()">Real feedback</strong><em>Emphasis</em><script>bad()</script><img src=x>',
        },
    )
    assert owner.post("/admin/pages/homepage", data=fields).status_code == 302
    html_text = owner.get("/").get_data(as_text=True)
    assert "&lt;img src=x onerror=bad()&gt; {{ 7*7 }}" in html_text
    assert "<strong>Real feedback</strong><em>Emphasis</em>" in html_text
    assert 'onclick="bad()"' not in html_text and "<script>bad()" not in html_text
    assert "<img src=x>" not in html_text


def test_validation_preserves_input_and_incomplete_home_drafts_can_save(owner, app):
    fields = page_form(owner, app, action="draft", **{"hero.heading.line1": ""})
    assert owner.post("/admin/pages/homepage", data=fields).status_code == 302
    fields = page_form(owner, app, action="publish")
    before = page_state(app)
    response = owner.post("/admin/pages/homepage", data=fields)
    assert response.status_code == 422
    assert "add text before publishing" in response.get_data(as_text=True)
    assert page_state(app) == before
    fields["hero.heading.line1"] = "A retained edit"
    fields["hero.summary"] = "x" * 1601
    response = owner.post("/admin/pages/homepage", data=fields)
    assert response.status_code == 422
    assert "A retained edit" in response.get_data(as_text=True)
    assert page_state(app) == before


def test_contact_preview_and_publication_propagates_without_rebuilding(owner, app):
    fields = page_form(
        owner,
        app,
        "contact",
        email="public-test@example.com",
        bookingUrl="https://example.com/book",
        callMinutes="45",
        action="preview",
    )
    before = page_state(app, "contact")
    response = owner.post("/admin/pages/contact", data=fields)
    preview = response.get_data(as_text=True)
    assert "public-test@example.com" in preview
    assert "A 45-minute conversation" in preview and "Book a 45-min call" in preview
    assert page_state(app, "contact") == before
    assert "public-test@example.com" not in owner.get("/").get_data(as_text=True)
    fields["action"] = "draft"
    assert owner.post("/admin/pages/contact", data=fields).status_code == 302
    assert "public-test@example.com" not in owner.get("/blog.html").get_data(
        as_text=True
    )
    fields = page_form(owner, app, "contact", action="publish")
    assert owner.post("/admin/pages/contact", data=fields).status_code == 302
    for path in ("/", "/projects.html", "/blog.html", "/tools.html"):
        public = owner.get(path).get_data(as_text=True)
        assert "public-test@example.com" in public
        if path != "/tools.html":
            assert "https://example.com/book" in public
    assert "A 45-minute conversation" in owner.get("/").get_data(as_text=True)
    assert (
        page_state(app)[0] == page_state(app)[1]
    )  # Contact edits do not rewrite homepage snapshots.
    with app.app_context():
        original_id = db.session.scalar(
            db.select(PageRevision.id)
            .where(PageRevision.page_key == "contact")
            .order_by(PageRevision.id)
        )
    version = page_state(app, "contact")[2]
    assert (
        owner.post(
            f"/admin/pages/contact/history/{original_id}/restore",
            data={
                "csrf_token": token(owner.get("/admin/pages/contact/history")),
                "version": str(version),
            },
        ).status_code
        == 302
    )
    assert page_state(app, "contact")[0]["email"] != "public-test@example.com"
    assert "public-test@example.com" in owner.get("/").get_data(as_text=True)


@pytest.mark.parametrize(
    "field,value",
    [
        ("email", "bad"),
        ("bookingUrl", "javascript:bad()"),
        ("bookingUrl", "https://user:pass@example.com/"),
        ("callMinutes", "0"),
        ("callMinutes", "181"),
        ("callMinutes", "٤٥"),
    ],
)
def test_invalid_contact_settings_do_not_save(owner, app, field, value):
    fields = page_form(owner, app, "contact", action="publish", **{field: value})
    before = page_state(app, "contact")
    assert owner.post("/admin/pages/contact", data=fields).status_code == 422
    assert page_state(app, "contact") == before


def test_page_auth_csrf_history_boundaries_and_pagination(owner, app):
    paths = [
        "/admin/pages/homepage",
        "/admin/pages/contact",
        "/admin/pages/homepage/history",
    ]
    for path in paths:
        assert app.test_client().get(path).status_code == 302
        assert owner.get(path).headers["X-Robots-Tag"] == "noindex, nofollow"
    assert owner.post(paths[0], data={"version": "1"}).status_code == 400
    assert owner.get("/admin/pages/unknown").status_code == 404
    with app.app_context():
        page = db.session.get(ManagedPage, "homepage")
        for _ in range(22):
            db.session.add(
                PageRevision(
                    page_key="homepage", payload=deepcopy(page.draft), action="draft"
                )
            )
        db.session.commit()
        other_id = db.session.scalar(
            db.select(PageRevision.id).where(PageRevision.page_key == "contact")
        )
    assert "Older revisions" in owner.get(paths[2]).get_data(as_text=True)
    assert "Page 2 of 2" in owner.get(paths[2] + "?page=2").get_data(as_text=True)
    assert owner.get(f"{paths[2]}/{other_id}").status_code == 404
    assert (
        owner.post(
            f"{paths[2]}/{other_id}/restore",
            data={"csrf_token": token(owner.get(paths[2])), "version": "1"},
        ).status_code
        == 404
    )


def test_public_pagination_search_filter_and_private_draft_exclusion(
    owner, app, project_archive
):
    with app.app_context():
        rows = list(
            db.session.scalars(
                db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
            )
        )
        paths = [e.path for e in rows]
        last = rows[-1]
        last.published = {
            **last.published,
            "title": "A search beyond page one",
            "category": "Special category",
        }
        last.draft = {
            **last.draft,
            "title": "Owner-only secret phrase",
            "category": "Private category",
        }
        db.session.commit()
    page_one = owner.get("/projects.html?per_page=100").get_data(as_text=True)
    assert all(path in page_one for path in paths[:12]) and paths[12] not in page_one
    assert "Next page" in page_one
    page_two = owner.get("/projects.html?page=2")
    assert canonical(page_two) == "https://layshahdev.com/projects.html?page=2"
    assert paths[-1] in page_two.get_data(as_text=True)
    response = owner.get("/projects.html?q=beyond")
    assert paths[-1] in response.get_data(as_text=True)
    assert response.get_data(as_text=True).count("data-work-slide data-title=") == 1
    assert paths[0] not in response.get_data(as_text=True)
    assert "No projects to show" in owner.get("/projects.html?q=Owner-only").get_data(
        as_text=True
    )
    assert "Private category" not in owner.get("/projects.html").get_data(as_text=True)
    assert paths[-1] in owner.get("/projects.html?category=Special+category").get_data(
        as_text=True
    )
    for value in ("%", "_", "' OR 1=1 --"):
        assert "No projects to show" in owner.get(
            "/projects.html", query_string={"q": value}
        ).get_data(as_text=True)
    assert owner.get("/projects.html?page=3").status_code == 404


def test_collection_sort_dates_stable_pages_and_crawlable_filtered_links(owner, app):
    with app.app_context():
        original = db.session.scalar(
            db.select(Entry).where(Entry.kind == "post").order_by(Entry.position)
        )
        for i in range(9):
            payload = {
                **original.published,
                "title": f"Extra article {i}",
                "summary": "Searchable extra",
                "category": "Test category",
                "date": f"2026-10-{i + 1:02}",
            }
            db.session.add(
                Entry(
                    kind="post",
                    slug=f"blog-test-{i}",
                    path=f"/blog-test-{i}.html",
                    position=6 + i,
                    draft=deepcopy(payload),
                    published=payload,
                )
            )
        db.session.commit()
    response = owner.get("/blog.html?q=extra&category=Test+category&sort=newest")
    text = response.get_data(as_text=True)
    assert text.index("/blog-test-8.html") < text.index("/blog-test-7.html")
    assert (
        text.count('<article class="journal-entry') == 6
        and "page=2" in text
        and "sort=newest" in text
    )
    assert (
        "Featured article" not in text
    )  # No duplicate first article outside pagination.
    second = owner.get("/blog.html?q=extra&category=Test+category&sort=newest&page=2")
    assert "/blog-test-0.html" in second.get_data(as_text=True)
    alphabetical = owner.get("/blog.html?q=extra&sort=title").get_data(as_text=True)
    assert alphabetical.index("/blog-test-0.html") < alphabetical.index(
        "/blog-test-1.html"
    )
    assert '<form class="ui-panel ui-stack" method="get"' not in text


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page=-1",
        "page=abc",
        "page=9999999999",
        "sort=arbitrary",
        "q=" + "x" * 161,
        "category=" + "x" * 101,
    ],
)
def test_bad_collection_parameters_are_bounded(client, query):
    assert client.get("/projects.html?" + query).status_code in (400, 404)


def test_production_collection_canonicals_and_filter_index_controls(
    app, project_archive
):
    production = create_app(
        {
            "TESTING": True,
            "ENVIRONMENT": "production",
            "SECRET_KEY": "test-only-production-key-with-at-least-32-characters",
            "SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
            "MEDIA_ROOT": app.config["MEDIA_ROOT"],
        }
    )
    c = production.test_client()
    assert 'content="index, follow"' in c.get("/projects.html?page=2").get_data(
        as_text=True
    )
    assert 'content="noindex, follow"' in c.get("/projects.html?q=website").get_data(
        as_text=True
    )
    assert (
        canonical(c.get("/projects.html?page=2"))
        == "https://layshahdev.com/projects.html?page=2"
    )
    assert "Page 2" in c.get("/projects.html?page=2").get_data(as_text=True)


def test_owner_collections_search_drafts_and_move_across_pages_with_conflicts(
    owner, app
):
    with app.app_context():
        original = db.session.scalar(
            db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
        )
        for i in range(5):
            payload = {
                **original.draft,
                "title": f"Private managed project {i}",
                "summary": "Owner-only draft",
            }
            db.session.add(
                Entry(
                    kind="project",
                    slug=f"private-{i}",
                    path=f"/projects/private-{i}.html",
                    position=10 + i,
                    draft=payload,
                )
            )
        db.session.commit()
        row = db.session.scalar(db.select(Entry).where(Entry.slug == "private-4"))
        identity, version = row.id, row.version
        featured = {
            e.id: e.featured_position for e in db.session.scalars(db.select(Entry))
        }
    path = "/admin/collection/project"
    response = owner.get(path + "?status=draft&q=managed")
    assert "5 results" in response.get_data(as_text=True)
    assert "Private managed project 4" in response.get_data(as_text=True)
    assert "Private managed project 4" in owner.get(path + "?page=2").get_data(
        as_text=True
    )
    assert app.test_client().get(path).status_code == 302
    text = response.get_data(as_text=True)
    snapshot = re.search(r'name="snapshot" value="([^"]+)"', text).group(1)
    fields = {
        "csrf_token": token(response),
        "version": str(version),
        "snapshot": snapshot,
        "position": "1",
    }
    assert owner.post(f"/admin/entry/{identity}/place", data=fields).status_code == 302
    assert owner.post(f"/admin/entry/{identity}/place", data=fields).status_code == 409
    with app.app_context():
        rows = list(
            db.session.scalars(
                db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
            )
        )
        assert rows[0].id == identity
        assert [e.position for e in rows] == list(range(15))
        assert {
            e.id: e.featured_position for e in db.session.scalars(db.select(Entry))
        } == featured
    assert (
        owner.post(f"/admin/entry/{identity}/place", data={"position": "1"}).status_code
        == 400
    )
