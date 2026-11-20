import json
import re
from copy import deepcopy
from datetime import datetime
from xml.etree import ElementTree

import pytest
from conftest import token
from test_pages_and_collections import page_form, page_state
from test_publishing import entry_info, rename

from app import create_app
from app.extensions import db
from app.models import Entry, ManagedPage, PageRevision
from app.services.import_content import import_content


def graph(response):
    text = response.get_data(as_text=True)
    raw = re.search(
        r'<script type="application/ld\+json">(.*?)</script>', text, re.DOTALL
    ).group(1)
    return json.loads(raw)["@graph"]


def node(response, kind):
    return next(item for item in graph(response) if item["@type"] == kind)


def sitemap(client):
    root = ElementTree.fromstring(client.get("/sitemap.xml").data)
    return {
        item.find("{*}loc").text: item.findtext("{*}lastmod")
        for item in root.findall("{*}url")
    }


def production_client(app):
    return create_app(
        {
            "TESTING": True,
            "ENVIRONMENT": "production",
            "SECRET_KEY": "test-production-key-long-enough-for-isolated-tests-only",
            "SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
            "MEDIA_ROOT": app.config["MEDIA_ROOT"],
        }
    ).test_client()


@pytest.mark.parametrize("key", ["projects", "blog", "tools"])
def test_collection_preview_publish_recovery_and_stale_tabs(owner, app, key):
    path = "/admin/pages/" + key
    public_path = f"/{key}.html"
    before = page_state(app, key)
    assert owner.get(path).status_code == 200
    with app.app_context():
        first_revision = db.session.scalar(
            db.select(PageRevision.id)
            .where(PageRevision.page_key == key)
            .order_by(PageRevision.id)
        )
        assert import_content() == 0
    assert page_state(app, key) == before
    fields = page_form(
        owner,
        app,
        key,
        intro="A private collection introduction.",
        seo_title="A collection preview title",
        seo_description="A current search description.",
        action="preview",
    )
    response = owner.post(path, data=fields)
    text = response.get_data(as_text=True)
    assert response.status_code == 200
    assert "A private collection introduction." in text
    assert "<title>A collection preview title</title>" in text
    assert f'href="https://layshahdev.com{public_path}"' in text
    assert (
        node(response, "CollectionPage")["url"]
        == "https://layshahdev.com" + public_path
    )
    assert response.headers["Cache-Control"] == "private, no-store"
    assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
    assert page_state(app, key) == before
    assert "A private collection introduction." not in owner.get(public_path).get_data(
        as_text=True
    )
    fields["action"] = "draft"
    assert owner.post(path, data=fields).status_code == 302
    assert owner.post(path, data=fields).status_code == 409
    assert "A private collection introduction." not in owner.get(public_path).get_data(
        as_text=True
    )
    assert (
        owner.post(path, data=page_form(owner, app, key, action="publish")).status_code
        == 302
    )
    assert "A private collection introduction." in owner.get(public_path).get_data(
        as_text=True
    )
    if key == "tools":
        assert '<h1 class="site-heading type-title mb-8">Tools</h1>' in owner.get(
            public_path
        ).get_data(as_text=True)
    assert (
        owner.post(
            f"{path}/history/{first_revision}/restore",
            data={
                "csrf_token": token(owner.get(path)),
                "version": str(page_state(app, key)[2]),
            },
        ).status_code
        == 302
    )
    state = page_state(app, key)
    assert state[0] == before[0]
    assert state[1]["intro"] == "A private collection introduction."
    assert owner.get(f"{path}/history/{first_revision}").status_code == 200
    assert app.test_client().get(path).status_code == 302


@pytest.mark.parametrize("key", ["homepage", "projects", "blog", "tools"])
def test_search_visibility_excludes_only_published_settings(owner, app, key):
    public_path = "/" if key == "homepage" else f"/{key}.html"
    path = "/admin/pages/" + key
    fields = page_form(owner, app, key, search_visibility="noindex", action="draft")
    assert owner.post(path, data=fields).status_code == 302
    assert "https://layshahdev.com" + public_path in sitemap(owner)
    assert (
        owner.post(path, data=page_form(owner, app, key, action="publish")).status_code
        == 302
    )
    locations = sitemap(owner)
    assert "https://layshahdev.com" + public_path not in locations
    if key == "projects":
        assert "https://layshahdev.com/projects.html?page=2" not in locations
    response = production_client(app).get(public_path)
    assert (
        response.status_code == 200
        and 'content="noindex, follow"' in response.get_data(as_text=True)
    )
    assert (
        owner.post(
            path,
            data=page_form(
                owner, app, key, search_visibility="index", action="publish"
            ),
        ).status_code
        == 302
    )
    assert "https://layshahdev.com" + public_path in sitemap(owner)


def test_entry_noindex_remains_public_and_in_collections_but_leaves_sitemap(owner, app):
    identity, path, version = entry_info(app)
    editor = f"/admin/entry/{identity}"
    assert (
        owner.post(
            editor,
            data={
                "csrf_token": token(owner.get(editor)),
                "version": str(version),
                "search_visibility": "noindex",
                "action": "publish",
            },
        ).status_code
        == 302
    )
    assert "https://layshahdev.com" + path not in sitemap(owner)
    assert owner.get(path).status_code == 200
    assert path in owner.get("/projects.html").get_data(as_text=True)
    assert 'content="noindex, follow"' in production_client(app).get(path).get_data(
        as_text=True
    )
    with app.app_context():
        before = deepcopy(db.session.get(Entry, identity).published)
        version = db.session.get(Entry, identity).version
    assert (
        owner.post(
            editor,
            data={
                "csrf_token": token(owner.get(editor)),
                "version": str(version),
                "search_visibility": "invalid",
                "action": "publish",
            },
        ).status_code
        == 422
    )
    with app.app_context():
        assert db.session.get(Entry, identity).published == before


def test_schema_matches_published_content_current_addresses_and_visible_breadcrumbs(
    owner, app
):
    identity, path, _ = entry_info(app)
    html = owner.get(path)
    article = node(html, "Article")
    assert "datePublished" not in article and "dateModified" not in article
    assert "image" in article
    assert (
        node(html, "BreadcrumbList")["itemListElement"][-1]["item"]
        == "https://layshahdev.com" + path
    )
    assert 'aria-current="page"' in html.get_data(as_text=True)
    assert rename(owner, app, identity, "a-new-case-study").status_code == 302
    new_path = "/projects/a-new-case-study.html"
    changed = owner.get(new_path)
    assert (
        node(changed, "Article")["mainEntityOfPage"]["@id"]
        == "https://layshahdev.com" + new_path + "#webpage"
    )
    assert (
        node(changed, "BreadcrumbList")["itemListElement"][-1]["item"]
        == "https://layshahdev.com" + new_path
    )
    assert "https://layshahdev.com" + path not in sitemap(owner)
    assert owner.get(path).headers["Location"] == new_path
    post_id, post_path, _ = entry_info(app, "post")
    response = owner.get(post_path)
    blog = node(response, "BlogPosting")
    with app.app_context():
        data = db.session.get(Entry, post_id).published
        assert (
            blog["headline"] == data["title"] and blog["datePublished"] == data["date"]
        )
    assert blog["author"]["name"] == "Lay Shah"
    assert "By Lay Shah" in response.get_data(as_text=True)
    assert node(owner.get("/"), "ProfilePage")["mainEntity"]["@id"].endswith("/#person")


def test_collection_schema_contains_only_the_rendered_published_page(
    owner, app, project_archive
):
    response = owner.get("/projects.html?page=2")
    listing = node(response, "ItemList")
    assert listing["numberOfItems"] == 2
    assert [item["position"] for item in listing["itemListElement"]] == [1, 2]
    assert (
        node(response, "CollectionPage")["url"]
        == "https://layshahdev.com/projects.html?page=2"
    )
    for item in listing["itemListElement"]:
        assert item["url"].removeprefix("https://layshahdev.com") in response.get_data(
            as_text=True
        )
    assert node(owner.get("/tools.html"), "ItemList")["itemListElement"] == []
    response = owner.get("/projects.html?q=not-a-real-project")
    assert node(response, "ItemList")["itemListElement"] == []
    assert "https://layshahdev.com/projects.html?page=2" in sitemap(owner)
    assert all("q=" not in url for url in sitemap(owner))


def test_publication_dates_change_for_published_edits_only(owner, app):
    identity, path, version = entry_info(app)
    editor = f"/admin/entry/{identity}"
    with app.app_context():
        assert db.session.get(Entry, identity).published_modified_at is None
    fields = {
        "csrf_token": token(owner.get(editor)),
        "version": str(version),
        "title": "An updated public case study",
        "action": "publish",
    }
    assert owner.post(editor, data=fields).status_code == 302
    first = node(owner.get(path), "Article")["dateModified"]
    assert datetime.fromisoformat(first)
    assert sitemap(owner)["https://layshahdev.com" + path] == first
    with app.app_context():
        fields["version"] = str(db.session.get(Entry, identity).version)
    assert owner.post(editor, data=fields).status_code == 302
    assert (
        node(owner.get(path), "Article")["dateModified"] == first
    )  # unchanged republish
    with app.app_context():
        fields["version"] = str(db.session.get(Entry, identity).version)
    fields.update(title="A private draft title", action="draft")
    assert owner.post(editor, data=fields).status_code == 302
    assert (
        node(owner.get(path), "Article")["headline"] == "An updated public case study"
    )
    assert node(owner.get(path), "Article")["dateModified"] == first
    with app.app_context():
        version = db.session.get(Entry, identity).version
    assert (
        owner.post(
            editor + "/move",
            data={
                "csrf_token": token(owner.get(editor)),
                "version": str(version),
                "direction": "down",
            },
        ).status_code
        == 302
    )
    assert node(owner.get(path), "Article")["dateModified"] == first
    assert "dateModified" not in node(
        owner.get("/admin/preview/" + identity), "Article"
    )


def test_tools_schema_is_application_without_invented_offers_or_reviews(owner, app):
    response = owner.post(
        "/admin/tools/new", data={"csrf_token": token(owner.get("/admin/"))}
    )
    editor = response.headers["Location"]
    assert (
        owner.post(
            editor,
            data={
                "csrf_token": token(owner.get(editor)),
                "version": "1",
                "title": "A real catalog tool",
                "summary": "A small useful tool.",
                "category": "Developer tool",
                "launch_url": "https://example.com/useful-tool",
                "action": "publish",
            },
        ).status_code
        == 302
    )
    with app.app_context():
        entry = db.session.get(Entry, editor.rsplit("/", 1)[-1])
        path = entry.path
    tool = node(owner.get(path), "SoftwareApplication")
    assert tool["url"] == "https://example.com/useful-tool"
    assert tool["name"] == "A real catalog tool"
    assert "offers" not in tool and "aggregateRating" not in tool


def test_collection_validation_and_rendered_audit_are_read_only(owner, app):
    before = page_state(app, "projects")
    response = owner.post(
        "/admin/pages/projects",
        data=page_form(owner, app, "projects", seo_title="", action="publish"),
    )
    assert response.status_code == 422
    assert page_state(app, "projects") == before
    response = owner.post(
        "/admin/pages/projects",
        data=page_form(
            owner, app, "projects", search_visibility="arbitrary", action="draft"
        ),
    )
    assert response.status_code == 422
    assert page_state(app, "projects") == before
    result = app.test_cli_runner().invoke(args=["audit-seo"])
    assert result.exit_code == 0, result.output
    report = json.loads(result.output)
    assert report["pages_checked"] == 20 and report["ok"]
    assert not report["errors"] and not report["warnings"]
    assert page_state(app, "projects") == before
    with app.app_context():
        page = db.session.get(ManagedPage, "projects")
        page.published = {**page.published, "seo_title": ""}
        db.session.commit()
    result = app.test_cli_runner().invoke(args=["audit-seo"])
    assert result.exit_code == 1
    assert "nonempty title" in result.output


def test_unchanged_image_forms_do_not_refresh_publication_dates(owner, app):
    from test_media import entry_form, upload

    identity = upload(owner).json["asset"]["id"]
    editor, _, fields = entry_form(owner, app, identity, action="publish")
    assert owner.post(editor, data=fields).status_code == 302
    with app.app_context():
        entry = db.session.get(Entry, editor.rsplit("/", 1)[-1])
        first = entry.published_modified_at
        old_cover_identity = entry.published["cover_media"]["id"]
    editor, _, fields = entry_form(owner, app, identity, action="publish")
    assert owner.post(editor, data=fields).status_code == 302
    with app.app_context():
        entry = db.session.get(Entry, editor.rsplit("/", 1)[-1])
        assert entry.published["cover_media"]["id"] != old_cover_identity
        assert entry.published_modified_at == first
