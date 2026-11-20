"""Disposable real-Gunicorn HTTP rehearsal; never opens the owner's database."""

import http.client
import json
import os
import secrets
import signal
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from flask_migrate import upgrade
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Owner
from app.services.import_content import import_content


def check():
    gunicorn = Path(sys.executable).parent / "gunicorn"
    if not gunicorn.is_file():
        raise RuntimeError(
            "Install requirements-production.txt in the current environment."
        )
    with tempfile.TemporaryDirectory(prefix="portfolio-production-") as folder:
        scratch = Path(folder)
        media = scratch / "media"
        media.mkdir(mode=0o700)
        database_uri = f"sqlite:///{scratch / 'test.sqlite3'}"
        secret = secrets.token_hex(32)
        application = create_app(
            {
                "ENVIRONMENT": "production",
                "SECRET_KEY": secret,
                "SITE_URL": "https://localhost",
                "TRUSTED_HOSTS": ["localhost"],
                "SQLALCHEMY_DATABASE_URI": database_uri,
                "MEDIA_ROOT": str(media),
                "INQUIRY_EMAIL_ENABLED": False,
                "TRUST_LOCAL_PROXY": False,
                "SEARCH_INDEXING_ENABLED": True,
            }
        )
        with application.app_context():
            upgrade()
            import_content()
            db.session.add(
                Owner(
                    id=1,
                    username="smoke-test-owner",
                    password_hash=generate_password_hash(secrets.token_urlsafe(32)),
                )
            )
            db.session.commit()
            db.session.remove()
            db.engine.dispose()
        environment = {
            **os.environ,
            "PORTFOLIO_ENV": "production",
            "SECRET_KEY": secret,
            "SITE_URL": "https://localhost",
            "TRUSTED_HOSTS": "localhost",
            "DATABASE_URL": database_uri,
            "MEDIA_ROOT": str(media),
            "INQUIRY_EMAIL_ENABLED": "false",
            "TRUST_LOCAL_PROXY": "false",
            "SEARCH_INDEXING_ENABLED": "true",
        }
        # Pass an already-bound loopback socket to avoid port-selection races.
        with socket.socket() as listener, (scratch / "server.log").open("wb") as log:
            listener.bind(("127.0.0.1", 0))
            listener.listen(64)
            port = listener.getsockname()[1]
            process = subprocess.Popen(
                [
                    str(gunicorn),
                    "--config",
                    "deploy/gunicorn.conf.py",
                    "--workers",
                    "1",
                    "--bind",
                    f"fd://{listener.fileno()}",
                    "app:create_app()",
                ],
                cwd=ROOT,
                env=environment,
                pass_fds=(listener.fileno(),),
                stdout=log,
                stderr=log,
                start_new_session=True,
            )

            def get(path, headers=None):
                connection = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
                try:
                    connection.request(
                        "GET", path, headers={"Host": "localhost", **(headers or {})}
                    )
                    response = connection.getresponse()
                    return response.status, dict(response.getheaders()), response.read()
                finally:
                    connection.close()

            try:
                deadline = time.monotonic() + 20
                while True:
                    try:
                        if get("/readyz")[0] == 200:
                            break
                    except (OSError, http.client.HTTPException):
                        pass
                    if process.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError(
                            "Isolated Gunicorn startup failed; owner data was not used."
                        )
                    time.sleep(0.1)
                status, headers, body = get("/")
                assert status == 200 and b"Lay Shah" in body
                assert headers["Cache-Control"] == "no-store"
                status, headers, _ = get("/admin/inquiries")
                assert status == 302 and headers["Cache-Control"] == "private, no-store"
                status, headers, body = get("/bundle.js")
                assert status == 200 and body
                assert headers["Cache-Control"] == "public, max-age=0, must-revalidate"
                status, revalidated, body = get(
                    "/bundle.js", {"If-None-Match": headers["ETag"]}
                )
                assert status == 304 and body == b""
                assert revalidated["Cache-Control"] == headers["Cache-Control"]
                assert get("/healthz")[0] == 200
                assert get("/public/missing.js")[1]["Cache-Control"] == "no-store"
                report = {
                    "server": "gunicorn",
                    "environment": "isolated production",
                    "startup_readiness": "passed",
                    "public_page": "200 no-store",
                    "private_inquiries": "302 private/no-store",
                    "asset_revalidation": "200 then 304 with zero body",
                    "health": "passed",
                    "email": "disabled",
                    "main_database_used": False,
                    "limits": "No nginx/systemd/TLS/VM or browser-speed measurement in this rehearsal.",
                }
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)
    output = ROOT / "artifacts/production-runtime"
    output.mkdir(parents=True, exist_ok=True)
    (output / "smoke.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    check()
