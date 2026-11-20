import hmac
import json
import os
import secrets
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, render_template, request
from jinja2 import ChoiceLoader, FileSystemLoader, StrictUndefined
from sqlalchemy import event
from sqlalchemy.engine import Engine

from .config import Config
from .extensions import csrf, db, login, migrate

ROOT = Path(__file__).resolve().parents[1]


@event.listens_for(Engine, "connect")
def configure_sqlite(connection, _):
    if isinstance(connection, sqlite3.Connection):
        previous = connection.autocommit
        connection.autocommit = True
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA busy_timeout=10000")
        connection.execute("PRAGMA journal_mode=WAL")
        connection.autocommit = previous


def create_app(test_config=None):
    app = Flask(__name__, static_folder=None, instance_path=str(ROOT / "instance"))
    app.config.from_object(Config)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", f"sqlite:///{Path(app.instance_path) / 'portfolio.sqlite3'}"
    )
    app.config["MEDIA_ROOT"] = os.getenv(
        "MEDIA_ROOT", str(Path(app.instance_path) / "media")
    )
    if test_config:
        app.config.update(test_config)
    app.config["IMAGE_MANIFEST"] = json.loads(
        (ROOT / ".cache/image-manifest.json").read_text()
    )
    app.config["LEGACY_PAGES"] = json.loads((ROOT / "pages.json").read_text())
    app.config["DESIGN_CONTENT"] = json.loads((ROOT / "design/system.json").read_text())
    app.config["SITE_CONTENT"] = json.loads((ROOT / "data/site.json").read_text())
    app.config["HOMEPAGE_FIELDS"] = json.loads(
        (ROOT / ".cache/flask-templates/homepage-fields.json").read_text()
    )
    app.config["BRANDING_SCHEMA"] = json.loads(
        (ROOT / ".cache/flask-templates/branding-fields.json").read_text()
    )
    app.config["COLLECTION_FIELDS"] = json.loads(
        (ROOT / ".cache/flask-templates/collection-fields.json").read_text()
    )
    production = app.config["ENVIRONMENT"] == "production"
    if production:
        app.config["LOCAL_OWNER_SETUP"] = False
        if not app.config.get("SECRET_KEY") or len(app.config["SECRET_KEY"]) < 32:
            raise RuntimeError(
                "Production requires a strong SECRET_KEY from the environment."
            )
        if not app.config["SITE_URL"].startswith("https://"):
            raise RuntimeError("Production SITE_URL must use HTTPS.")
        app.config["SESSION_COOKIE_SECURE"] = True
    elif not app.config.get("SECRET_KEY"):
        Path(app.instance_path).mkdir(parents=True, exist_ok=True)
        keyfile = Path(app.instance_path) / ".session-key"
        try:
            fd = os.open(keyfile, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(fd, "w") as stream:
                stream.write(secrets.token_hex(32))
        app.config["SECRET_KEY"] = keyfile.read_text().strip()
    app.jinja_env.undefined = StrictUndefined
    app.jinja_loader = ChoiceLoader(
        [app.jinja_loader, FileSystemLoader(ROOT / ".cache/flask-templates")]
    )
    db.init_app(app)
    migrate.init_app(app, db, directory=str(ROOT / "migrations"))

    @app.before_request
    def request_limits():
        # Runs before CSRF parses multipart form data. Ordinary content stays at 2 MB.
        if request.endpoint == "media.upload":
            request.max_content_length = app.config["MEDIA_MAX_BYTES"] + 256 * 1024

    csrf.init_app(app)
    login.init_app(app)
    login.login_view = "admin.sign_in"
    from . import models
    from .admin import admin
    from .media import asset_option, media
    from .page_admin import page_admin
    from .public import public
    from .publishing import publishing
    from .services.content import ENTRY_FIELDS

    PROJECT_GLYPHS = json.loads((ROOT / 'app/templates/drawings/projects.json').read_text())
    from .services.import_content import register_commands
    from .services.media import placement_info, register_media_commands

    app.register_blueprint(admin)
    app.register_blueprint(public)
    app.register_blueprint(media)
    app.register_blueprint(publishing)
    app.register_blueprint(page_admin)
    app.jinja_env.globals.update(
        placement_info=placement_info,
        entry_fields=ENTRY_FIELDS,
        project_glyph=lambda slug: PROJECT_GLYPHS.get(slug, 'generic'),
        asset_option=asset_option,
        media_asset=lambda identity: db.session.get(models.MediaAsset, identity),
    )
    from .services.seo_audit import register_seo_commands

    register_seo_commands(app)
    register_media_commands(app)
    register_commands(app)
    from .services.operations import register_operations

    register_operations(app)
    from .services.inquiries import register_inquiry_commands

    register_inquiry_commands(app)
    from .services.runtime import register_runtime

    register_runtime(app, ROOT)

    @login.user_loader
    def load_owner(identity):
        owner = db.session.get(models.Owner, 1)
        return (
            owner
            if owner
            and hmac.compare_digest(str(identity).encode(), owner.get_id().encode())
            else None
        )

    @app.after_request
    def response_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if (
            not production
            or not app.config["SEARCH_INDEXING_ENABLED"]
            or response.headers.get("X-Private-Page")
            or request.path.startswith("/admin")
            or request.endpoint in {"public.health", "public.ready", "public.contact"}
        ):
            response.headers["X-Robots-Tag"] = "noindex, nofollow"
        from .services.runtime import cache_policy

        return cache_policy(response)

    @app.errorhandler(413)
    def upload_too_large(_):
        if (
            request.endpoint == "media.upload"
            and request.accept_mimetypes.best == "application/json"
        ):
            return jsonify(error="Choose an image smaller than 8 MB."), 413
        return render_template(
            "public/error.html",
            page={
                "title": "File too large | Lay Shah",
                "description": "The submitted file is too large.",
            },
            message="This file is too large. Images must be smaller than 8 MB.",
        ), 413

    @app.errorhandler(404)
    def missing(_):
        return render_template(
            "public/error.html",
            page={
                "title": "Page not found | Lay Shah",
                "description": "This page could not be found.",
            },
            message="This page could not be found.",
        ), 404

    return app
