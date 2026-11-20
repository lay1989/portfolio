"""Cache boundaries, explicit local-proxy trust and non-disclosing readiness."""

import os
import tempfile
from pathlib import Path

import click
from alembic.script import ScriptDirectory
from flask import current_app, request, session
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.middleware.proxy_fix import ProxyFix

from ..extensions import db
from ..models import Owner

ASSET_ENDPOINTS = {
    "public.public_asset",
    "public.blog_asset",
    "public.generated_asset",
    "media.public_file",
}


class LocalProxy:
    """Only a loopback TCP peer can supply the one trusted nginx hop.

    nginx must OVERWRITE forwarding headers and Gunicorn must bind loopback.
    Host/port/prefix forwarding is deliberately not trusted.
    """

    def __init__(self, application):
        self.application = application
        self.forwarded = ProxyFix(
            application, x_for=1, x_proto=1, x_host=0, x_port=0, x_prefix=0
        )

    def __call__(self, environ, start_response):
        application = (
            self.forwarded
            if environ.get("REMOTE_ADDR") in {"127.0.0.1", "::1"}
            else self.application
        )
        return application(environ, start_response)


def cache_policy(response):
    """Mutable assets revalidate on every reuse; private/error/form data never store.

    Do not cache HTML: it can contain a CSRF token, session state and live content.
    Uploaded-image authorization must run again after unpublishing, even on304.
    """
    private = response.headers.get("X-Private-Page") or request.path.startswith(
        "/admin"
    )
    if private:
        response.headers["Cache-Control"] = "private, no-store"
    elif (
        current_app.config["ENVIRONMENT"] == "production"
        and current_app.config["SEARCH_INDEXING_ENABLED"]
        and request.method in {"GET", "HEAD"}
        and response.status_code in {200, 206, 304}
        and request.endpoint in ASSET_ENDPOINTS
        and response.mimetype != "text/html"
        and not response.headers.getlist("Set-Cookie")
        # Flask saves its session cookie after after_request handlers have run.
        and not current_app.session_interface.should_set_cookie(current_app, session)
    ):
        # Build outputs have stable filenames, so immutable/long freshness is unsafe.
        response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    else:
        response.headers["Cache-Control"] = "no-store"
    return response


def readiness():
    """Return a category only; never disclose paths, credentials or DB errors."""
    try:
        revisions = set(
            db.session.scalars(db.text("SELECT version_num FROM alembic_version"))
        )
        if revisions != {current_app.config["MIGRATION_HEAD"]}:
            return "schema"
        # Query all mapped tables so a damaged/missing table cannot pass SELECT1.
        for table in db.metadata.sorted_tables:
            db.session.execute(db.select(table).limit(0))
        if db.session.get(Owner, 1) is None:
            return "owner"
    except SQLAlchemyError:
        db.session.rollback()
        return "database"
    media = Path(current_app.config["MEDIA_ROOT"])
    database = Path(db.engine.url.database)
    if not database.is_file() or not os.access(database, os.R_OK | os.W_OK):
        return "storage"
    for directory in (media, database.parent):
        if not directory.is_dir() or not os.access(
            directory, os.R_OK | os.W_OK | os.X_OK
        ):
            return "storage"
    return None


def register_runtime(app, root):
    app.config["MIGRATION_HEAD"] = ScriptDirectory(
        str(root / "migrations")
    ).get_current_head()
    if app.config["TRUST_LOCAL_PROXY"]:
        app.wsgi_app = LocalProxy(app.wsgi_app)

    @app.cli.command("check-runtime")
    def check_runtime():
        """Readiness + actual storage write probe. No migration, account setup or send."""
        issue = readiness()
        if issue:
            raise click.ClickException(f"Runtime is not ready ({issue}).")
        directories = {
            Path(current_app.config["MEDIA_ROOT"]),
            Path(db.engine.url.database).parent,
        }
        try:
            for directory in directories:
                with tempfile.TemporaryFile(dir=directory) as probe:
                    probe.write(b"portfolio readiness\n")
                    probe.flush()
                    os.fsync(probe.fileno())
        except OSError as exc:
            raise click.ClickException("Runtime is not ready (storage write).") from exc
        click.echo(
            "Runtime ready: schema, owner and writable database/media storage checked."
        )
