from copy import deepcopy
from datetime import timedelta

import pytest

from app.extensions import db
from app.models import Entry, Inquiry, Revision, now


def test_overview_totals_and_eight_latest_edits_use_all_entries_without_reordering(
    owner, app
):
    with app.app_context():
        source = db.session.scalar(db.select(Entry).where(Entry.kind == "project"))
        start = now() + timedelta(days=1)
        ids = []
        for index in range(10):
            published = deepcopy(source.published) if index % 2 else None
            draft = {**deepcopy(source.draft), "title": f"Recent edit {index:02}"}
            entry = Entry(
                kind="project",
                slug=f"recent-{index}",
                path=f"/projects/recent-{index}.html",
                position=10 + index,
                draft=draft,
                published=published,
                updated_at=start + timedelta(minutes=index),
            )
            db.session.add(entry)
            db.session.flush()
            ids.append(entry.id)
        db.session.commit()
        order_before = list(
            db.session.scalars(
                db.select(Entry.id).order_by(Entry.kind, Entry.position, Entry.id)
            )
        )
        revisions = db.session.scalar(db.select(db.func.count()).select_from(Revision))
    text = owner.get("/admin/").get_data(as_text=True)
    assert text.count("data-recent-entry=") == 8
    assert all(f'data-recent-entry="{identity}"' in text for identity in ids[2:])
    assert all(f'data-recent-entry="{identity}"' not in text for identity in ids[:2])
    assert [
        text.index(f'data-recent-entry="{identity}"') for identity in reversed(ids[2:])
    ] == sorted(text.index(f'data-recent-entry="{identity}"') for identity in ids[2:])
    summary = text.split('data-collection="project"', 1)[1].split("</li>", 1)[0]
    assert "<strong>20</strong>" in summary
    assert "15 published · 5 drafts" in summary
    assert 'data-state="draft"' in text and "Published · Unpublished changes" in text
    assert '/move"' not in text and 'name="position"' not in text
    with app.app_context():
        assert order_before == list(
            db.session.scalars(
                db.select(Entry.id).order_by(Entry.kind, Entry.position, Entry.id)
            )
        )
        assert revisions == db.session.scalar(
            db.select(db.func.count()).select_from(Revision)
        )


def test_empty_overview_has_zero_totals_and_useful_creation_links(owner, app):
    with app.app_context():
        db.session.execute(db.delete(Entry))
        db.session.commit()
    text = owner.get("/admin/").get_data(as_text=True)
    assert text.count("<strong>0</strong>") == 3
    assert "Create your first project" in text
    assert "/admin/new/project" in text and "/admin/new/post" in text
    assert 'action="/admin/tools/new"' in text
    assert "data-recent-entry=" not in text


@pytest.mark.parametrize(
    "kind,key", [("project", "projects"), ("post", "blog"), ("tool", "tools")]
)
def test_collection_and_page_settings_have_reciprocal_active_navigation(
    owner, kind, key
):
    collection = owner.get(f"/admin/collection/{kind}").get_data(as_text=True)
    page = owner.get(f"/admin/pages/{key}").get_data(as_text=True)
    entries_nav = collection.split('aria-label="Collection management"', 1)[1].split(
        "</nav>", 1
    )[0]
    page_nav = page.split('aria-label="Collection management"', 1)[1].split(
        "</nav>", 1
    )[0]
    assert f'href="/admin/collection/{kind}" aria-current="page"' in entries_nav
    assert f'href="/admin/pages/{key}" aria-current="page"' in page_nav
    assert "Page introduction &amp; SEO" in entries_nav


@pytest.mark.parametrize("kind", ["project", "post"])
def test_editor_sections_share_one_save_region_and_keep_media_inside_the_form(
    owner, app, kind
):
    with app.app_context():
        entry = db.session.scalar(db.select(Entry).where(Entry.kind == kind))
        identity = entry.id
    text = owner.get(f"/admin/entry/{identity}").get_data(as_text=True)
    for section in (
        "essentials",
        "story",
        "images",
        "details",
        "search",
        "publication",
    ):
        assert f'href="#editor-{section}"' in text and f'id="editor-{section}"' in text
    form = text.split("data-content-editor", 1)[1].split("</form>", 1)[0]
    assert form.count('aria-label="Save and publish"') == 1
    assert all(
        f'value="{action}"' in form for action in ("draft", "preview", "publish")
    )
    images = form.split('id="editor-images"', 1)[1].split("</section>", 1)[0]
    assert (
        "Cover image" in images
        and "Listing thumbnail" in images
        and "gallery" in images
    )
    assert 'name="media_present"' in images
    assert f'formaction="/admin/entry/{identity}/preview"' in form


def test_inquiries_are_private_paginated_deterministic_escaped_and_read_only(
    owner, app
):
    with app.app_context():
        timestamp = now()
        for index in range(21):
            db.session.add(
                Inquiry(
                    name=f"Sender {index:02}",
                    email=f"person{index}@example.test",
                    message="<script>unsafe()</script>\nSecond line",
                    created_at=timestamp,
                )
            )
        db.session.commit()
        ids = list(
            db.session.scalars(db.select(Inquiry.id).order_by(Inquiry.id.desc()))
        )
        before = [
            (row.id, row.notification_state, row.message)
            for row in db.session.scalars(db.select(Inquiry).order_by(Inquiry.id))
        ]
    anonymous = app.test_client().get("/admin/inquiries")
    assert anonymous.status_code == 302 and "/admin/login" in anonymous.location
    first = owner.get("/admin/inquiries?per_page=1000")
    text = first.get_data(as_text=True)
    assert first.status_code == 200 and text.count("data-inquiry=") == 20
    assert all(f'data-inquiry="{identity}"' in text for identity in ids[:20])
    assert f'data-inquiry="{ids[-1]}"' not in text
    assert (
        "&lt;script&gt;unsafe()&lt;/script&gt;" in text
        and "<script>unsafe()" not in text
    )
    assert "Second line" in text
    assert 'href="/admin/inquiries?page=2"' in text
    assert "private, no-store" == first.headers["Cache-Control"]
    assert "noindex" in first.headers["X-Robots-Tag"]
    second = owner.get("/admin/inquiries?page=2").get_data(as_text=True)
    assert second.count("data-inquiry=") == 1 and f'data-inquiry="{ids[-1]}"' in second
    assert owner.get("/admin/inquiries?page=3").status_code == 404
    assert owner.post("/admin/inquiries").status_code == 405
    with app.app_context():
        after = [
            (row.id, row.notification_state, row.message)
            for row in db.session.scalars(db.select(Inquiry).order_by(Inquiry.id))
        ]
        assert after == before


@pytest.mark.parametrize("page", ["0", "-1", "1.5", "abc", "١", "999999999"])
def test_inquiries_reject_invalid_page_numbers(owner, page):
    assert owner.get("/admin/inquiries", query_string={"page": page}).status_code == 404


def test_empty_inquiries_explains_where_messages_appear(owner):
    text = owner.get("/admin/inquiries").get_data(as_text=True)
    assert "No inquiries yet." in text and "contact form" in text
    assert "data-inquiry=" not in text and "Next page" not in text
