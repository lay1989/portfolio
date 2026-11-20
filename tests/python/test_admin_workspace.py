import re

import pytest

from app.extensions import db
from app.models import Entry


def active_links(text):
    text = text.split('<aside class="admin-sidebar"', 1)[-1].split("</aside>", 1)[0]
    return set(re.findall(r'<a href="([^"]+)"[^>]* aria-current="page"', text))


def test_sign_in_has_independent_appearance_without_owner_navigation(client):
    response = client.get("/admin/login")
    text = response.get_data(as_text=True)
    assert response.status_code == 200
    assert "data-admin-theme" in text
    assert all(f'value="{choice}"' in text for choice in ("light", "dark", "system"))
    assert text.index("/public/js/admin-theme.js") < text.index("/tailwind.css")
    assert "/src/theme-init.js" not in text
    assert "data-owner-workspace" not in text
    assert "Workspace sidebar" not in text
    assert "no-store" in response.headers["Cache-Control"]


@pytest.mark.parametrize(
    "path,current",
    [
        ("/admin/", "/admin/"),
        ("/admin/inquiries", "/admin/inquiries"),
        ("/admin/collection/project", "/admin/collection/project"),
        ("/admin/collection/post", "/admin/collection/post"),
        ("/admin/new/project", "/admin/collection/project"),
        ("/admin/media", "/admin/media"),
        ("/admin/homepage", "/admin/homepage"),
        ("/admin/pages/homepage", "/admin/homepage"),
        ("/admin/pages/projects", "/admin/collection/project"),
        ("/admin/pages/branding", "/admin/pages/branding"),
        ("/admin/pages/branding/history", "/admin/pages/branding"),
        ("/admin/pages/contact", "/admin/pages/contact"),
        ("/admin/design", "/admin/design"),
        ("/admin/lab/publishing", "/admin/lab/publishing"),
        ("/admin/lab/identity", "/admin/lab/identity"),
    ],
)
def test_navigation_marks_the_current_section_and_keeps_ordinary_links(
    owner, path, current
):
    response = owner.get(path)
    text = response.get_data(as_text=True)
    assert response.status_code == 200
    assert active_links(text) == {current}
    assert "data-admin-nav-fallback" in text
    assert 'href="/admin/inquiries"' in text
    assert 'id="admin-drawer"' in text
    assert 'name="csrf_token"' in text
    assert "noindex" in response.headers["X-Robots-Tag"]


def test_entry_and_history_keep_collection_selected_without_changing_saved_content(
    owner, app
):
    with app.app_context():
        entry = db.session.scalar(db.select(Entry).where(Entry.kind == "project"))
        identity, version, draft = entry.id, entry.version, entry.draft
    for path in (
        f"/admin/entry/{identity}",
        f"/admin/entry/{identity}/history",
        f"/admin/entry/{identity}/address",
    ):
        response = owner.get(path)
        assert response.status_code == 200
        assert active_links(response.get_data(as_text=True)) == {
            "/admin/collection/project"
        }
    with app.app_context():
        entry = db.session.get(Entry, identity)
        assert entry.version == version and entry.draft == draft
