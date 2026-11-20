"""Private staging keeps production protections without public indexing or email."""

import runpy
import stat
from xml.etree import ElementTree

import pytest

from app import ROOT, create_app
from app.extensions import db


@pytest.fixture
def staging(app):
    application = create_app(
        {
            "TESTING": True,
            "ENVIRONMENT": "production",
            "SECRET_KEY": app.config["SECRET_KEY"],
            "SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
            "MEDIA_ROOT": app.config["MEDIA_ROOT"],
            "SITE_URL": "https://preview.layshahdev.com",
            "TRUSTED_HOSTS": ["preview.layshahdev.com", "localhost"],
            "SEARCH_INDEXING_ENABLED": False,
            "INQUIRY_EMAIL_ENABLED": False,
        }
    )
    yield application
    with application.app_context():
        db.session.remove()
        db.engine.dispose()


@pytest.mark.parametrize(
    "path",
    [
        "/",
        "/projects.html",
        "/blog.html",
        "/tools.html",
        "/projects/ash-clipping.html",
        "/blog-custom-websites.html",
    ],
)
def test_production_mode_staging_uses_noindex_headers_and_metadata(staging, path):
    response = staging.test_client().get(
        path, base_url="https://preview.layshahdev.com"
    )
    assert response.status_code == 200
    assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
    assert response.headers["Cache-Control"] == "no-store"
    assert '<meta name="robots" content="noindex, nofollow">' in response.text
    assert 'rel="canonical" href="https://preview.layshahdev.com/' in response.text
    assert "googletagmanager.com" not in response.text


def test_staging_robots_sitemap_and_static_files_are_not_publicly_cacheable(staging):
    client = staging.test_client()
    origin = "https://preview.layshahdev.com"
    robots = client.get("/robots.txt", base_url=origin)
    assert robots.text == "User-agent: *\nDisallow: /\n"
    sitemap = client.get("/sitemap.xml", base_url=origin)
    assert len(ElementTree.fromstring(sitemap.data)) == 0
    asset = client.get("/bundle.js", base_url=origin)
    assert asset.status_code == 200 and asset.headers["Cache-Control"] == "no-store"
    assert asset.headers["X-Robots-Tag"] == "noindex, nofollow"
    assert staging.config["SESSION_COOKIE_SECURE"] is True
    assert staging.config["LOCAL_OWNER_SETUP"] is False
    assert staging.config["INQUIRY_EMAIL_ENABLED"] is False


def prepare(hostname, output):
    return runpy.run_path(str(ROOT / "scripts/prepare-staging.py"))["prepare"](
        hostname, output
    )


def test_rendered_audit_accepts_protected_staging_and_detects_missing_noindex(staging):
    from app.services.seo_audit import audit

    remove_protection = False

    @staging.after_request
    def remove_noindex(response):
        if remove_protection and response.mimetype == "text/html":
            response.set_data(
                response.get_data().replace(
                    b'<meta name="robots" content="noindex, nofollow">',
                    b'<meta name="robots" content="index, follow">',
                )
            )
        return response

    with staging.app_context():
        report = audit()
    assert report["ok"], report["errors"]
    assert report["search_indexing_enabled"] is False
    remove_protection = True
    with staging.app_context():
        report = audit()
    assert not report["ok"]
    assert any("missing noindex protection" in error for error in report["errors"])


def test_preparation_creates_private_files_without_credentials_or_external_changes(
    tmp_path,
):
    output = prepare("preview.layshahdev.com", tmp_path / "staging")
    assert stat.S_IMODE(output.stat().st_mode) == 0o700
    assert all(stat.S_IMODE(path.stat().st_mode) == 0o600 for path in output.iterdir())
    environment = (output / "portfolio.env.example").read_text()
    assert "SECRET_KEY=\n" in environment
    assert "SEARCH_INDEXING_ENABLED=false" in environment
    assert "INQUIRY_EMAIL_ENABLED=false" in environment
    assert "SITE_URL=https://preview.layshahdev.com" in environment
    nginx = (output / "portfolio.nginx.conf").read_text()
    assert "portfolio.example.invalid" not in nginx
    assert (
        nginx.count("include /etc/nginx/snippets/portfolio-staging-access.conf;") == 1
    )
    assert 'oracle_inventory_verified": false' in (output / "review.json").read_text()
    assert not (output / "staging.htpasswd").exists()


@pytest.mark.parametrize(
    "hostname",
    [
        "layshahdev.com",
        "www.layshahdev.com",
        "https://preview.layshahdev.com",
        "preview.layshahdev.com:443",
        "preview.layshahdev.com/path",
        "preview.layshahdev.com;\ninclude secret;",
        "*.layshahdev.com",
        "-bad.layshahdev.com",
        "preview..layshahdev.com",
        "x" * 64 + ".layshahdev.com",
    ],
)
def test_preparation_refuses_live_hosts_and_unsafe_names_before_writing(
    tmp_path, hostname
):
    output = tmp_path / "staging"
    with pytest.raises(ValueError):
        prepare(hostname, output)
    assert not output.exists()


def test_preparation_never_replaces_an_existing_bundle(tmp_path):
    output = prepare("preview.layshahdev.com", tmp_path / "staging")
    sentinel = output / "keep-my-work"
    sentinel.write_text("keep")
    with pytest.raises(FileExistsError):
        prepare("another.layshahdev.com", output)
    assert sentinel.read_text() == "keep"
