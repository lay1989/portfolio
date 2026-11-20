"""Production response policy and proxy/startup checks with disposable data."""

from copy import deepcopy
from pathlib import Path

import pytest
from conftest import token
from sqlalchemy.exc import OperationalError
from test_media import entry_form, image_urls, upload

from app import create_app
from app.extensions import db
from app.models import Entry, Inquiry, InquiryDelivery, Owner


@pytest.fixture
def production(app, owner):
    application = create_app(
        {
            "TESTING": True,
            "ENVIRONMENT": "production",
            "SECRET_KEY": app.config["SECRET_KEY"],
            "SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
            "MEDIA_ROOT": app.config["MEDIA_ROOT"],
            "INQUIRY_EMAIL_ENABLED": False,
            "TRUST_LOCAL_PROXY": False,
        }
    )
    Path(application.config["MEDIA_ROOT"]).mkdir(exist_ok=True)
    yield application
    with application.app_context():
        db.session.remove()
        db.engine.dispose()


@pytest.mark.parametrize(
    "path",
    [
        "/bundle.js",
        "/tailwind.css",
        "/src/theme-init.js",
        "/public/favicon.svg",
        "/public/js/admin-theme.js",
        "/assets/blog/cover-custom-web.webp",
    ],
)
def test_production_assets_have_validators_and_zero_body_on_revalidation(
    production, path
):
    client = production.test_client()
    initial = client.get(path)
    assert initial.status_code == 200
    assert initial.headers["Cache-Control"] == "public, max-age=0, must-revalidate"
    assert initial.headers["ETag"] and initial.headers["Last-Modified"]
    cached = client.get(path, headers={"If-None-Match": initial.headers["ETag"]})
    assert cached.status_code == 304 and cached.data == b""
    assert cached.headers["Cache-Control"] == initial.headers["Cache-Control"]
    assert cached.headers["ETag"] == initial.headers["ETag"]
    head = client.head(path)
    assert head.status_code == 200 and head.data == b""
    assert head.headers["Content-Length"] == initial.headers["Content-Length"]


@pytest.mark.parametrize(
    "path",
    [
        "/",
        "/projects.html",
        "/blog.html",
        "/tools.html",
        "/sitemap.xml",
        "/robots.txt",
        "/healthz",
        "/readyz",
        "/missing",
        "/public/missing.js",
    ],
)
def test_public_dynamic_health_and_error_responses_never_store(production, path):
    response = production.test_client().get(path)
    assert response.headers["Cache-Control"] == "no-store"
    assert "immutable" not in response.headers["Cache-Control"]


@pytest.mark.parametrize(
    "path", ["/admin/", "/admin/inquiries", "/admin/login", "/admin/missing"]
)
def test_private_pages_and_login_redirects_never_store(production, path):
    response = production.test_client().get(path)
    assert response.headers["Cache-Control"] == "private, no-store"
    assert "noindex" in response.headers["X-Robots-Tag"]


def test_development_assets_remain_fresh(client):
    assert client.get("/bundle.js").headers["Cache-Control"] == "no-store"


def test_asset_that_touches_a_session_never_becomes_publicly_cacheable(production):
    from flask import session

    original = production.view_functions["public.generated_asset"]

    def session_asset():
        session["isolated_test"] = "a private value"
        return original()

    production.view_functions["public.generated_asset"] = session_asset
    response = production.test_client().get("/bundle.js")
    assert response.status_code == 200 and response.headers.get("Set-Cookie")
    assert response.headers["Cache-Control"] == "no-store"


def test_asset_that_renews_a_permanent_cookie_never_enters_a_shared_cache(production):
    client = production.test_client()
    with client.session_transaction() as session:
        session.permanent = True
    response = client.get("/bundle.js")
    assert response.status_code == 200 and response.headers.get("Set-Cookie")
    assert response.headers["Cache-Control"] == "no-store"


def test_dashboard_only_contact_persists_without_mail_or_redirect(production):
    client = production.test_client()
    response = client.post(
        "/contact",
        data={
            "csrf_token": token(client.get("/")),
            "name": "Isolated visitor",
            "email": "visitor@example.test",
            "message": "A website request.",
        },
    )
    assert response.status_code == 201 and response.json["ok"]
    assert "Location" not in response.headers
    assert response.headers["Cache-Control"] == "no-store"
    with production.app_context():
        assert db.session.scalar(db.select(Inquiry)).message == "A website request."
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(InquiryDelivery))
            == 0
        )
        identity = db.session.get(Owner, 1).get_id()
    with client.session_transaction() as session:
        session["_user_id"] = identity
        session["_fresh"] = True
    inbox = client.get("/admin/inquiries")
    assert inbox.status_code == 200
    assert "A website request." in inbox.text
    assert (
        "Email not enabled" not in inbox.text
        and "Email notifications" not in inbox.text
    )


def test_media_revalidation_checks_publication_before_returning304(
    production, app, owner
):
    asset_id = upload(owner).json["asset"]["id"]
    path, identity, fields = entry_form(owner, app, asset_id, action="publish")
    assert owner.post(path, data=fields).status_code == 302
    with app.app_context():
        placement = deepcopy(db.session.get(Entry, identity).published["cover_media"])
    url, _, private_url = image_urls(app, asset_id, placement)
    client = production.test_client()
    original = client.get(url)
    assert original.status_code == 200
    validator = {"If-None-Match": original.headers["ETag"]}
    assert client.get(url, headers=validator).status_code == 304
    assert client.get(private_url, headers=validator).status_code == 302
    assert (
        client.get(private_url, headers=validator).headers["Cache-Control"]
        == "private, no-store"
    )
    path, _, fields = entry_form(owner, app, asset_id, action="unpublish")
    assert owner.post(path, data=fields).status_code == 302
    revoked = client.get(url, headers=validator)
    assert revoked.status_code == 404 and revoked.headers["Cache-Control"] == "no-store"


def test_next_request_sees_publication_without_a_cache_purge(production, app, owner):
    with app.app_context():
        entry = db.session.scalar(db.select(Entry).where(Entry.kind == "project"))
        identity, path, version = entry.id, entry.path, entry.version
    client = production.test_client()
    initial = client.get(path)
    assert initial.status_code == 200 and initial.headers["Cache-Control"] == "no-store"
    response = owner.post(
        f"/admin/entry/{identity}",
        data={
            "csrf_token": token(owner.get(f"/admin/entry/{identity}")),
            "version": str(version),
            "title": "New isolated publication",
            "summary": "Published in a temporary database.",
            "action": "publish",
        },
    )
    assert response.status_code == 302
    updated = client.get(path, headers={"If-None-Match": '"an-old-page"'})
    assert updated.status_code == 200 and "New isolated publication" in updated.text
    assert updated.headers["Cache-Control"] == "no-store"


def proxy_client(app, enabled):
    application = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": app.config["SECRET_KEY"],
            "SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
            "MEDIA_ROOT": app.config["MEDIA_ROOT"],
            "TRUST_LOCAL_PROXY": enabled,
            "INQUIRY_EMAIL_ENABLED": False,
        }
    )

    # Disposable test-only endpoint: the application never exposes this diagnostic.
    @application.get("/proxy-test")
    def inspect_request():
        from flask import request

        return {
            "ip": request.remote_addr,
            "scheme": request.scheme,
            "host": request.host,
        }

    return application.test_client()


@pytest.mark.parametrize(
    "enabled,peer,expected",
    [
        (False, "127.0.0.1", "127.0.0.1"),
        (True, "192.0.2.50", "192.0.2.50"),
        (True, "127.0.0.1", "198.51.100.10"),
        (True, "::1", "198.51.100.10"),
    ],
)
def test_proxy_trust_is_opt_in_and_loopback_only(app, enabled, peer, expected):
    response = proxy_client(app, enabled).get(
        "/proxy-test",
        headers={
            "X-Forwarded-For": "spoofed, 198.51.100.10",
            "X-Forwarded-Proto": "https",
            "X-Forwarded-Host": "evil.example",
            "X-Forwarded-Port": "9999",
            "X-Forwarded-Prefix": "/evil",
        },
        environ_overrides={"REMOTE_ADDR": peer},
    )
    assert response.json == {
        "ip": expected,
        "scheme": "https" if enabled and peer in {"127.0.0.1", "::1"} else "http",
        "host": "localhost",
    }


def test_readiness_success_and_host_probe_leave_no_data(production):
    client = production.test_client()
    assert client.get("/readyz").json == {"status": "ready"}
    before = set(Path(production.config["MEDIA_ROOT"]).iterdir())
    result = production.test_cli_runner().invoke(args=["check-runtime"])
    assert result.exit_code == 0 and "Runtime ready" in result.output
    assert set(Path(production.config["MEDIA_ROOT"]).iterdir()) == before


@pytest.mark.parametrize(
    "problem", ["owner", "schema", "table", "storage", "readonly_database"]
)
def test_unready_app_returns503_without_exposing_details(production, problem):
    database = None
    with production.app_context():
        if problem == "owner":
            db.session.execute(db.delete(Owner))
        elif problem == "schema":
            db.session.execute(
                db.text("UPDATE alembic_version SET version_num='outdated'")
            )
        elif problem == "table":
            db.session.execute(db.text("DROP TABLE contact_rate_bucket"))
        elif problem == "storage":
            Path(production.config["MEDIA_ROOT"]).rmdir()
        elif problem == "readonly_database":
            database = Path(db.engine.url.database)
            database.chmod(0o400)
        db.session.commit()
    try:
        response = production.test_client().get("/readyz")
        assert response.status_code == 503 and response.json == {
            "status": "unavailable"
        }
        assert response.headers["Cache-Control"] == "no-store"
        assert (
            "SELECT" not in response.text
            and production.config["MEDIA_ROOT"] not in response.text
        )
        result = production.test_cli_runner().invoke(args=["check-runtime"])
        assert result.exit_code == 1 and "not ready" in result.output
    finally:
        if database:
            database.chmod(0o600)


def test_database_failure_health_response_is_generic(client, monkeypatch):
    def unavailable(*args, **kwargs):
        raise OperationalError("private database path", {}, Exception("private"))

    monkeypatch.setattr(db.session, "execute", unavailable)
    response = client.get("/healthz")
    assert response.status_code == 503 and response.json == {"status": "unavailable"}
    assert response.headers["Cache-Control"] == "no-store"
    assert "private" not in response.text


def test_database_error_diagnostics_omit_bound_inquiry_content(app):
    with app.app_context():
        with pytest.raises(OperationalError) as failure:
            db.session.execute(
                db.text("SELECT * FROM missing_table WHERE message=:body"),
                {"body": "private-inquiry-body"},
            )
        assert "private-inquiry-body" not in str(failure.value)
        db.session.rollback()
