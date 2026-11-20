import html
import re
from copy import deepcopy

import pytest
from conftest import token
from test_pages_and_collections import page_form, page_state
from werkzeug.datastructures import MultiDict

from app.extensions import db
from app.models import Entry, PageRevision, Revision
from app.services.import_content import import_content
from app.services.project_details import feedback_for, figures_for


def project_state(app):
    with app.app_context():
        entry = db.session.scalar(
            db.select(Entry)
            .where(Entry.kind == "project")
            .order_by(Entry.position, Entry.id)
        )
        return (
            entry.id,
            entry.path,
            deepcopy(entry.draft),
            deepcopy(entry.published),
            entry.version,
        )


def project_form(owner, app, rows=None, feedback=None, **values):
    identity, _, draft, _, version = project_state(app)
    result = MultiDict(
        {
            "csrf_token": token(owner.get(f"/admin/entry/{identity}")),
            "version": str(version),
            "action": "draft",
            "figures_present": "1",
            "feedback_present": "1",
        }
    )
    for row in figures_for(draft) if rows is None else rows:
        result.add("figure_id", row["id"])
        for key in ("label", "value", "note"):
            result[f"figure.{row['id']}.{key}"] = row.get(key, "")
    for key, value in (feedback_for(draft) if feedback is None else feedback).items():
        result[f"feedback.{key}"] = value
    for key, value in values.items():
        result[key] = value
    return result


def primary_links(response, mobile=False):
    text = response.get_data(as_text=True)
    start = text.index('id="mobile-menu"' if mobile else "nav-links-desktop")
    end = text.index("</div>" if mobile else "<button", start)
    return re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', text[start:end], re.DOTALL)


def test_imported_project_details_adapt_without_writes_and_keep_client_job_title(
    owner, app
):
    before = project_state(app)
    identity, path, draft, _, _ = before
    response = owner.get(f"/admin/entry/{identity}")
    assert response.status_code == 200
    assert 'name="figures_present"' in response.get_data(as_text=True)
    assert html.escape(feedback_for(draft)["role"], quote=False) in owner.get(
        path
    ).get_data(as_text=True)
    assert project_state(app) == before


def test_project_evidence_preview_publish_remove_and_restore(owner, app):
    identity, public_path, draft, _, _ = project_state(app)
    path = f"/admin/entry/{identity}"
    with app.app_context():
        original_revision = db.session.scalar(
            db.select(Revision.id)
            .where(Revision.entry_id == identity)
            .order_by(Revision.id)
        )
    original = project_state(app)
    rows = [
        {
            "id": "second",
            "label": "Requests",
            "value": "250",
            "note": "Measured in a controlled test, October 2026.",
        },
        {"id": "first", "label": "Load time", "value": "1.2 s", "note": ""},
    ]
    feedback = {
        "quote": "A clear result <script>alert(1)</script>",
        "author": "Test client",
        "role": "Engineering lead",
    }
    fields = project_form(owner, app, rows, feedback)
    response = owner.post(path + "/preview", data=fields)
    preview = response.get_data(as_text=True)
    assert response.status_code == 200
    assert preview.index("Requests") < preview.index("Load time")
    assert "Measured in a controlled test" in preview and "Engineering lead" in preview
    assert "<script>alert(1)</script>" not in preview
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in preview
    assert response.headers["Cache-Control"] == "private, no-store"
    assert project_state(app) == original
    assert owner.post(path, data=fields).status_code == 302
    assert "Measured in a controlled test" not in owner.get(public_path).get_data(
        as_text=True
    )
    assert owner.post(path, data=fields).status_code == 409
    fields = project_form(owner, app, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    assert "Measured in a controlled test" in owner.get(public_path).get_data(
        as_text=True
    )
    fields = project_form(owner, app, [], {}, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    public = owner.get(public_path).get_data(as_text=True)
    assert "Project figures" not in public and "Test client" not in public
    version = project_state(app)[4]
    assert (
        owner.post(
            f"{path}/history/{original_revision}/restore",
            data={"csrf_token": token(owner.get(path)), "version": str(version)},
        ).status_code
        == 302
    )
    state = project_state(app)
    assert state[2] == draft
    assert state[3]["project_figures"] == [] and state[3]["testimonial"] is None
    with app.app_context():
        checkpoint = db.session.scalar(
            db.select(Revision).where(
                Revision.entry_id == identity, Revision.action == "checkpoint"
            )
        )
        assert checkpoint.payload["project_figures"] == []


def test_figure_controls_work_without_javascript_and_do_not_save(owner, app):
    before = project_state(app)
    identity = before[0]
    rows = [
        {"id": "a", "label": "A", "value": "1"},
        {"id": "b", "label": "B", "value": "2"},
    ]
    response = owner.post(
        f"/admin/entry/{identity}",
        data=project_form(owner, app, rows, figure_action="up:b"),
    )
    text = response.get_data(as_text=True)
    assert response.status_code == 200
    assert text.index('name="figure.b.label"') < text.index('name="figure.a.label"')
    assert project_state(app) == before
    assert (
        owner.post(
            f"/admin/entry/{identity}",
            data=project_form(owner, app, rows, figure_action="add"),
        ).status_code
        == 200
    )
    assert project_state(app) == before


@pytest.mark.parametrize(
    "change,publishing",
    [
        ({"figure.legacy-figure-0.label": ""}, True),
        ({"figure.legacy-figure-0.note": "x" * 501}, False),
        ({"feedback.quote": "", "feedback.author": "A client"}, True),
        ({"feedback.author": "x" * 181}, False),
    ],
)
def test_invalid_project_details_keep_form_and_do_not_save(
    owner, app, change, publishing
):
    before = project_state(app)
    fields = project_form(
        owner, app, action="publish" if publishing else "draft", **change
    )
    response = owner.post(f"/admin/entry/{before[0]}", data=fields)
    assert response.status_code == 422
    assert 'name="figures_present"' in response.get_data(as_text=True)
    assert project_state(app) == before


def test_duplicate_figure_ids_are_rejected(owner, app):
    before = project_state(app)
    fields = project_form(owner, app, [{"id": "same", "label": "A", "value": "1"}] * 2)
    assert owner.post(f"/admin/entry/{before[0]}", data=fields).status_code == 422
    assert project_state(app) == before


def test_branding_defaults_opening_and_reimport_preserve_existing_content(owner, app):
    before = page_state(app, "branding")
    assert before[0]["displayName"] == "LAY SHAH"
    assert owner.get("/admin/pages/branding").status_code == 200
    with app.app_context():
        assert import_content() == 0
    assert page_state(app, "branding") == before
    home = owner.get("/").get_data(as_text=True)
    assert home.lstrip().startswith("<!DOCTYPE html>")
    assert "</head>" in home and "<body class=" in home
    assert "googletagmanager" not in home
    assert "Freelance full-stack developer. Fast, considered" in home


def test_branding_preview_draft_publish_history_restore_and_navigation(owner, app):
    key = "branding"
    path = "/admin/pages/branding"
    before = page_state(app, key)
    with app.app_context():
        revision_id = db.session.scalar(
            db.select(PageRevision.id)
            .where(PageRevision.page_key == key)
            .order_by(PageRevision.id)
        )
    fields = page_form(
        owner,
        app,
        key,
        displayName="A NEW LABEL",
        ownerName="Owner Preview",
        footerDescription="An intentional footer.",
        location="New location",
        **{
            "nav.about.position": "0",
            "nav.tools.position": "1",
            "nav.blog.position": "6",
            "nav.projects.label": "Selected work",
            "action": "preview",
        },
    )
    response = owner.post(path, data=fields)
    assert response.status_code == 200
    preview = response.get_data(as_text=True)
    assert "A NEW LABEL" in preview and "An intentional footer." in preview
    assert 'name="author" content="Owner Preview"' in preview
    assert primary_links(response)[0] == ("/tools.html", "Tools")
    assert primary_links(response, True)[0] == ("/tools.html", "Tools")
    assert "/index.html#about" not in [href for href, _ in primary_links(response)]
    assert "Selected work" in preview
    assert "noindex, nofollow" in response.headers["X-Robots-Tag"]
    assert page_state(app, key) == before
    assert "A NEW LABEL" not in owner.get("/").get_data(as_text=True)
    fields["action"] = "draft"
    assert owner.post(path, data=fields).status_code == 302
    assert "A NEW LABEL" not in owner.get("/").get_data(as_text=True)
    assert owner.post(path, data=fields).status_code == 409
    assert (
        owner.post(path, data=page_form(owner, app, key, action="publish")).status_code
        == 302
    )
    for public_path in (
        "/",
        "/projects.html",
        "/blog.html",
        "/tools.html",
        project_state(app)[1],
    ):
        response = owner.get(public_path)
        assert response.status_code == 200
        text = response.get_data(as_text=True)
        assert text.count('data-branding="displayName">A NEW LABEL') == 2
        assert "An intentional footer." in text and "New location" in text
        assert primary_links(response)[0] == ("/tools.html", "Tools")
    assert owner.get("/projects.html").status_code == 200  # hiding never deletes routes
    assert (
        owner.post(
            f"{path}/history/{revision_id}/restore",
            data={
                "csrf_token": token(owner.get(path)),
                "version": str(page_state(app, key)[2]),
            },
        ).status_code
        == 302
    )
    restored = page_state(app, key)
    assert restored[0] == before[0]
    assert restored[1]["displayName"] == "A NEW LABEL"
    with app.app_context():
        assert db.session.scalar(
            db.select(PageRevision).where(
                PageRevision.page_key == key, PageRevision.action == "checkpoint"
            )
        )


@pytest.mark.parametrize(
    "changes",
    [
        {"nav.about.position": "2"},
        {"nav.tools.label": "Applications"},
        {"nav.projects.position": "javascript:alert(1)"},
        {"nav.about.label": ""},
        {"footerDescription": "x" * 501},
    ],
)
def test_invalid_branding_does_not_save(owner, app, changes):
    before = page_state(app, "branding")
    response = owner.post(
        "/admin/pages/branding",
        data=page_form(owner, app, "branding", action="publish", **changes),
    )
    assert response.status_code == 422
    assert page_state(app, "branding") == before


def test_private_branding_routes_and_escaped_public_text(owner, app):
    anonymous = app.test_client()
    assert anonymous.get("/admin/pages/branding").status_code == 302
    assert anonymous.get("/admin/pages/branding/history").status_code == 302
    fields = page_form(
        owner,
        app,
        "branding",
        displayName="<script>alert(1)</script>",
        action="preview",
    )
    response = owner.post("/admin/pages/branding", data=fields)
    text = response.get_data(as_text=True)
    assert "<script>alert(1)</script>" not in text
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in text
    assert (
        owner.post("/admin/pages/branding", data={"action": "publish"}).status_code
        == 400
    )
