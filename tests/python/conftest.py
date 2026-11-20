import re

import pytest
from flask_migrate import upgrade

from app import create_app
from app.extensions import db
from app.services.import_content import import_content


@pytest.fixture
def app(tmp_path):
    application = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-key-never-used-in-development-or-production",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'test.sqlite3'}",
            "LOCAL_OWNER_SETUP": True,
            "MEDIA_ROOT": str(tmp_path / "media"),
            "INQUIRY_EMAIL_ENABLED": False,
        }
    )
    with application.app_context():
        upgrade()
        import_content()
    yield application
    with application.app_context():
        db.session.remove()
        db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def project_archive(app):
    """A temporary archive large enough to exercise the public collection's next page."""
    from copy import deepcopy

    from app.models import Entry

    with app.app_context():
        original = db.session.scalar(db.select(Entry).where(Entry.kind == "project"))
        for index in range(4):
            payload = {
                **deepcopy(original.published),
                "title": f"Archive project {index}",
            }
            db.session.add(
                Entry(
                    kind="project",
                    slug=f"archive-{index}",
                    path=f"/projects/archive-{index}.html",
                    position=10 + index,
                    draft=deepcopy(payload),
                    published=payload,
                )
            )
        db.session.commit()


def token(response):
    return re.search(
        r'name="csrf_token" value="([^"]+)"', response.get_data(as_text=True)
    ).group(1)


def create_owner(client):
    csrf = token(client.get("/admin/setup"))
    response = client.post(
        "/admin/setup",
        data={
            "csrf_token": csrf,
            "username": "test-owner",
            "password": "test-only-password-for-isolated-database",
        },
    )
    assert response.status_code == 302


@pytest.fixture
def owner(client):
    create_owner(client)
    return client
