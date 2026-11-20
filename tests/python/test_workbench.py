from conftest import token

from app.extensions import db
from app.models import Entry, ManagedPage, PageRevision, Revision


def snapshot(app):
    with app.app_context():
        return (
            [
                (entry.id, entry.version, entry.draft, entry.published)
                for entry in db.session.scalars(db.select(Entry).order_by(Entry.id))
            ],
            [
                (page.key, page.version, page.draft, page.published)
                for page in db.session.scalars(
                    db.select(ManagedPage).order_by(ManagedPage.key)
                )
            ],
            db.session.scalar(db.select(db.func.count()).select_from(Revision)),
            db.session.scalar(db.select(db.func.count()).select_from(PageRevision)),
        )


def test_prototype_requires_owner_and_has_no_public_integration(client):
    response = client.get("/admin/lab/publishing")
    assert response.status_code == 302
    assert "/admin/login" in response.location
    for path in ["/", "/projects.html", "/blog.html", "/tools.html"]:
        text = client.get(path).text
        assert "/public/js/publishing-workbench.js" not in text
        assert "/public/css/publishing-workbench.css" not in text
    assert "/admin/lab/publishing" not in client.get("/sitemap.xml").text


def test_prototype_renders_fallback_and_never_saves_content(owner, app):
    before = snapshot(app)
    response = owner.get("/admin/lab/publishing")
    assert response.status_code == 200
    text = response.text
    assert "noindex,nofollow" in text
    assert "data-sheet-release" in text
    assert 'role="img"' in text
    assert "data-workbench-controls hidden" in text
    assert "<noscript>" in text
    assert "Your portfolio content is untouched." in text
    assert "/public/js/publishing-workbench.js" in text
    assert (
        owner.post(
            "/admin/lab/publishing", data={"csrf_token": token(response)}
        ).status_code
        == 405
    )
    light = owner.get("/admin/lab/publishing?theme=light")
    assert 'data-theme="light"' in light.text
    unknown = owner.get("/admin/lab/publishing?theme=unknown")
    assert 'data-theme="auto"' in unknown.text
    assert snapshot(app) == before
