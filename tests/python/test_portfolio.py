import json
from copy import deepcopy

from conftest import token

from app import ROOT, create_app
from app.extensions import db
from app.models import Entry, Inquiry, Owner, Revision
from app.services.import_content import import_content


def test_all_preserved_routes_render_and_private_files_are_not_served(client):
    for path in json.loads((ROOT / "pages.json").read_text()):
        response = client.get("/" + path)
        if path in ("404.html", "503.html"):
            assert response.status_code == int(path[:3])
        else:
            assert response.status_code == 200, path
            assert "<title>" in response.get_data(as_text=True)
            assert "noindex" in response.headers["X-Robots-Tag"]
    for path in [
        "/data/projects.json",
        "/.env",
        "/instance/portfolio.sqlite3",
        "/app/config.py",
    ]:
        assert client.get(path).status_code == 404


def test_owner_setup_csrf_singleton_and_private_access(client, app):
    assert client.get("/admin/").status_code == 302
    assert (
        client.post(
            "/admin/setup", data={"username": "bad", "password": "a" * 20}
        ).status_code
        == 400
    )
    response = client.get("/admin/setup")
    assert (
        client.post(
            "/admin/setup",
            data={
                "csrf_token": token(response),
                "username": "owner",
                "password": "owner-test-only-password",
            },
        ).status_code
        == 302
    )
    assert client.get("/admin/setup").status_code == 404
    assert client.get("/admin/").headers["Cache-Control"] == "private, no-store"
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(Owner)) == 1


def test_setup_not_available_to_remote_address(client):
    assert (
        client.get(
            "/admin/setup", environ_overrides={"REMOTE_ADDR": "192.0.2.10"}
        ).status_code
        == 404
    )


def test_drafts_preview_publish_and_stale_tabs(owner, app):
    with app.app_context():
        entry = db.session.scalar(
            db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
        )
        identity, path, old_title = entry.id, entry.path, entry.published["title"]
    response = owner.get("/admin/entry/" + identity)
    version = 1
    data = {
        "csrf_token": token(response),
        "version": str(version),
        "title": "Private draft title",
        "summary": "A new summary.",
        "action": "draft",
    }
    assert owner.post("/admin/entry/" + identity, data=data).status_code == 302
    assert old_title in owner.get(path).get_data(as_text=True)
    assert "Private draft title" not in owner.get(path).get_data(as_text=True)
    preview = owner.get("/admin/preview/" + identity)
    assert "Private draft title" in preview.get_data(as_text=True)
    assert preview.headers["Cache-Control"] == "private, no-store"
    assert app.test_client().get("/admin/preview/" + identity).status_code == 302
    assert owner.post("/admin/entry/" + identity, data=data).status_code == 409
    data.update(
        version="2",
        action="publish",
        csrf_token=token(owner.get("/admin/entry/" + identity)),
    )
    assert owner.post("/admin/entry/" + identity, data=data).status_code == 302
    assert "Private draft title" in owner.get(path).get_data(as_text=True)
    with app.app_context():
        assert (
            db.session.scalar(
                db.select(db.func.count())
                .select_from(Revision)
                .where(Revision.entry_id == identity)
            )
            == 3
        )


def test_ordering_persists_across_app_instances(owner, app):
    with app.app_context():
        rows = list(
            db.session.scalars(
                db.select(Entry).where(Entry.kind == "post").order_by(Entry.position)
            )
        )
        entry = rows[1]
        identity, version = entry.id, entry.version
        featured = entry.featured_position
    csrf = token(owner.get("/admin/"))
    assert (
        owner.post(
            "/admin/entry/" + identity + "/move",
            data={"csrf_token": csrf, "version": version, "direction": "up"},
        ).status_code
        == 302
    )
    another = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only",
            "SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
        }
    )
    with another.app_context():
        first = db.session.scalar(
            db.select(Entry)
            .where(Entry.kind == "post")
            .order_by(Entry.position, Entry.id)
        )
        assert first.id == identity
        assert first.featured_position == featured


def test_tools_remain_private_until_published_and_reject_script_urls(owner, app):
    response = owner.post(
        "/admin/tools/new", data={"csrf_token": token(owner.get("/admin/"))}
    )
    edit_path = response.headers["Location"]
    with app.app_context():
        entry = db.session.scalar(db.select(Entry).where(Entry.kind == "tool"))
        path = entry.path
    assert owner.get(path).status_code == 404
    assert path not in owner.get("/sitemap.xml").get_data(as_text=True)
    fields = {
        "csrf_token": token(owner.get(edit_path)),
        "version": "1",
        "title": "Test Tool",
        "summary": "A useful tool.",
        "launch_url": "javascript:alert(1)",
        "action": "publish",
    }
    assert owner.post(edit_path, data=fields).status_code == 422
    fields["launch_url"] = "https://example.com/tool"
    assert owner.post(edit_path, data=fields).status_code == 302
    assert "Test Tool" in owner.get("/tools.html").get_data(as_text=True)
    assert owner.get(path).status_code == 200
    fields.update(
        version="2", action="unpublish", csrf_token=token(owner.get(edit_path))
    )
    assert owner.post(edit_path, data=fields).status_code == 302
    assert owner.get(path).status_code == 404
    assert "Test Tool" not in owner.get("/tools.html").get_data(as_text=True)


def test_import_does_not_overwrite_database_edits(app):
    with app.app_context():
        entry = db.session.scalar(db.select(Entry).order_by(Entry.id))
        payload = deepcopy(entry.draft)
        payload["title"] = "Keep my edit"
        entry.draft = payload
        db.session.commit()
        assert import_content() == 0
        assert db.session.get(Entry, entry.id).draft["title"] == "Keep my edit"


def test_inquiry_is_saved_before_success_and_requires_csrf(client, app):
    fields = {
        "name": "Test visitor",
        "email": "visitor@example.com",
        "message": "A test inquiry.",
    }
    assert client.post("/contact", data=fields).status_code == 400
    fields["csrf_token"] = token(client.get("/"))
    assert client.post("/contact", data=fields).status_code == 201
    with app.app_context():
        inquiry = db.session.scalar(db.select(Inquiry))
        assert inquiry.message == fields["message"]
        assert inquiry.notification_state == "not_configured"


def test_unsafe_article_html_is_sanitized(app):
    with app.app_context():
        result = str(
            app.jinja_env.filters["safe_content"](
                '<script>alert(1)</script><p onclick="bad()">Fine</p><a href="javascript:bad()">link</a>'
            )
        )
        assert (
            "<script" not in result
            and "onclick" not in result
            and "javascript:" not in result
        )
        assert "Fine" in result


def test_login_rate_limit_survives_sessions(owner):
    owner.post("/admin/logout", data={"csrf_token": token(owner.get("/admin/"))})
    for _ in range(5):
        assert (
            owner.post(
                "/admin/login",
                data={
                    "csrf_token": token(owner.get("/admin/login")),
                    "username": "bad",
                    "password": "bad",
                },
            ).status_code
            == 401
        )
    assert (
        owner.post(
            "/admin/login",
            data={
                "csrf_token": token(owner.get("/admin/login")),
                "username": "bad",
                "password": "bad",
            },
        ).status_code
        == 429
    )
