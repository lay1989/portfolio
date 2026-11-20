"""Operational recovery/backup rehearsal uses disposable DBs, keys and images only."""

import io
import json
import os
import sqlite3
import tarfile
from pathlib import Path

import pytest
from conftest import token
from test_media import upload
from werkzeug.security import check_password_hash

from app import create_app
from app.extensions import db
from app.models import Entry, LoginAttempt, Owner
from app.services.media import new_placement, prepare_media, sync_references
from app.services.operations import (
    OperationError,
    create_backup,
    encrypt,
    load_key,
    restore_backup,
)


@pytest.fixture
def ops(owner, app, tmp_path):
    key = tmp_path / "test.backup-key"
    key.write_bytes(os.urandom(32))
    key.chmod(0o600)
    asset = upload(owner).json["asset"]["id"]
    with app.app_context():
        entry = db.session.scalar(db.select(Entry).where(Entry.kind == "project"))
        data = {
            **entry.published,
            "cover_media": {
                **new_placement(),
                "asset_id": asset,
                "alt": "Restored published image",
            },
        }
        prepare_media(data, publishing=True)
        entry.published = data
        sync_references(entry)
        db.session.commit()
        database = Path(db.engine.url.database)
        project_path = entry.path
        counts = {
            table: db.session.execute(
                db.text(f'SELECT count(*) FROM "{table}"')
            ).scalar()
            for table in (
                "entry",
                "revision",
                "media_asset",
                "media_reference",
                "page_revision",
            )
        }
    return {
        "key": key,
        "db": database,
        "media": Path(app.config["MEDIA_ROOT"]),
        "backup": tmp_path / "test.backup",
        "destination": tmp_path / "restored",
        "asset": asset,
        "path": project_path,
        "counts": counts,
    }


def backup(ops):
    return create_backup(ops["db"], ops["media"], ops["backup"], ops["key"])


def test_clean_restore_keeps_content_revisions_media_and_renders_with_fresh_secret(ops):
    before = ops["db"].read_bytes()
    expected_master = (ops["media"] / ops["asset"] / "master.webp").read_bytes()
    report = backup(ops)
    assert ops["db"].read_bytes() == before
    assert ops["backup"].stat().st_mode & 0o777 == 0o600
    assert b"SQLite format 3" not in ops["backup"].read_bytes()
    assert restore_backup(ops["backup"], ops["destination"], ops["key"]) == report
    restored = ops["destination"]
    assert (
        restored / "media" / ops["asset"] / "master.webp"
    ).read_bytes() == expected_master
    with sqlite3.connect(restored / "database.sqlite3") as connection:
        for table, total in ops["counts"].items():
            assert (
                connection.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0]
                == total
            )
    assert not (restored / ".session-key").exists()
    isolated = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "a-new-secret-for-isolated-restore-only",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{restored / 'database.sqlite3'}",
            "MEDIA_ROOT": str(restored / "media"),
        }
    )
    client = isolated.test_client()
    response = client.get(ops["path"])
    assert response.status_code == 200 and "Restored published image" in response.text
    import re

    image_url = re.search(
        r'<img src="(/media/[^"]+)"[^>]*alt="Restored published image"', response.text
    ).group(1)
    assert client.get(image_url).status_code == 200
    login = client.get("/admin/login")
    assert (
        client.post(
            "/admin/login",
            data={
                "csrf_token": token(login),
                "username": "test-owner",
                "password": "test-only-password-for-isolated-database",
            },
        ).status_code
        == 302
    )
    assert client.get("/admin/").status_code == 200
    with isolated.app_context():
        db.session.remove()
        db.engine.dispose()


@pytest.mark.parametrize("failure", ["wrong-key", "damaged", "truncated"])
def test_authentication_failure_never_creates_restore_directory(ops, failure, tmp_path):
    backup(ops)
    key = ops["key"]
    if failure == "wrong-key":
        key = tmp_path / "wrong.backup-key"
        key.write_bytes(os.urandom(32))
        key.chmod(0o600)
    else:
        payload = bytearray(ops["backup"].read_bytes())
        if failure == "damaged":
            payload[len(payload) // 2] ^= 1
        else:
            payload = payload[:10]
        ops["backup"].write_bytes(payload)
    with pytest.raises(OperationError):
        restore_backup(ops["backup"], ops["destination"], key)
    assert not ops["destination"].exists()


def test_existing_targets_are_never_overwritten(ops):
    backup(ops)
    expected = ops["backup"].read_bytes()
    with pytest.raises(OperationError, match="already exists"):
        backup(ops)
    assert ops["backup"].read_bytes() == expected
    ops["destination"].mkdir()
    marker = ops["destination"] / "keep.txt"
    marker.write_text("Keep existing files")
    with pytest.raises(OperationError, match="already exists"):
        restore_backup(ops["backup"], ops["destination"], ops["key"])
    assert marker.read_text() == "Keep existing files"


@pytest.mark.parametrize(
    "name", ["../outside.txt", "/outside.txt", "media/../../outside.txt"]
)
def test_authenticated_archive_with_unsafe_path_is_rejected(ops, tmp_path, name):
    archive = tmp_path / "malicious.tar.gz"
    with tarfile.open(archive, "w:gz") as target:
        member = tarfile.TarInfo(name)
        member.size = 4
        target.addfile(member, io.BytesIO(b"nope"))
    encrypt(archive, ops["backup"], load_key(ops["key"]))
    with pytest.raises(OperationError, match="unsafe"):
        restore_backup(ops["backup"], ops["destination"], ops["key"])
    assert not ops["destination"].exists()
    assert not (tmp_path / "outside.txt").exists()


@pytest.mark.parametrize(
    "files", [{}, {"database.sqlite3": {"bytes": 14, "sha256": "0" * 64}}]
)
def test_manifest_mismatch_and_missing_master_fail_closed(ops, tmp_path, files):
    archive = tmp_path / "bad.tar.gz"
    with tarfile.open(archive, "w:gz") as target:
        for name, data in {
            "database.sqlite3": b"not-a-database",
            "manifest.json": json.dumps(
                {"format": 1, "database": {}, "files": files}
            ).encode(),
        }.items():
            member = tarfile.TarInfo(name)
            member.size = len(data)
            target.addfile(member, io.BytesIO(data))
    encrypt(archive, ops["backup"], load_key(ops["key"]))
    with pytest.raises(OperationError, match="manifest|verification"):
        restore_backup(ops["backup"], ops["destination"], ops["key"])
    assert not ops["destination"].exists()
    ops["backup"].unlink()
    (ops["media"] / ops["asset"] / "master.webp").unlink()
    with pytest.raises(OperationError, match="master"):
        backup(ops)
    assert not ops["backup"].exists()


def test_private_key_and_media_symlinks_are_checked(ops, tmp_path):
    ops["key"].chmod(0o644)
    with pytest.raises(OperationError, match="owner-only"):
        backup(ops)
    ops["key"].chmod(0o600)
    (ops["media"] / "unexpected").symlink_to(ops["key"])
    with pytest.raises(OperationError, match="symlinks"):
        backup(ops)
    assert not ops["backup"].exists()


def test_commands_require_maintenance_and_refuse_public_keys(ops, app, tmp_path):
    runner = app.test_cli_runner()
    result = runner.invoke(
        args=[
            "backup-create",
            "--output",
            str(ops["backup"]),
            "--key-file",
            str(ops["key"]),
        ]
    )
    assert result.exit_code != 0 and not ops["backup"].exists()
    public_key = Path(app.root_path).parent / "public" / "never-create.backup-key"
    assert (
        runner.invoke(args=["backup-keygen", "--output", str(public_key)]).exit_code
        != 0
    )
    assert not public_key.exists()
    result = runner.invoke(
        args=[
            "backup-create",
            "--writers-stopped",
            "--output",
            str(ops["backup"]),
            "--key-file",
            str(ops["key"]),
        ]
    )
    assert result.exit_code == 0, result.output
    result = runner.invoke(
        args=[
            "backup-restore",
            "--source",
            str(ops["backup"]),
            "--destination",
            str(ops["destination"]),
            "--key-file",
            str(ops["key"]),
        ]
    )
    assert result.exit_code == 0 and "verified" in result.output
    generated = tmp_path / "new.backup-key"
    assert (
        runner.invoke(args=["backup-keygen", "--output", str(generated)]).exit_code == 0
    )
    assert (
        len(generated.read_bytes()) == 32 and generated.stat().st_mode & 0o777 == 0o600
    )
    assert (
        runner.invoke(args=["backup-keygen", "--output", str(generated)]).exit_code != 0
    )


def test_recovery_rejects_wrong_identity_weak_password_and_revokes_old_sessions(
    owner, app
):
    runner = app.test_cli_runner()
    assert owner.get("/admin/").status_code == 200
    assert runner.invoke(args=["recover-owner", "--username", "missing"]).exit_code != 0
    result = runner.invoke(
        args=["recover-owner", "--username", "test-owner"], input="short\nshort\n"
    )
    assert result.exit_code != 0 and owner.get("/admin/").status_code == 200
    new_password = "isolated-owner-recovery-password"
    result = runner.invoke(
        args=["recover-owner", "--username", "test-owner"],
        input=new_password + "\n" + new_password + "\n",
    )
    assert result.exit_code == 0 and new_password not in result.output
    assert owner.get("/admin/").status_code == 302
    with app.app_context():
        assert check_password_hash(db.session.get(Owner, 1).password_hash, new_password)
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(LoginAttempt)) == 0
        )
    client = app.test_client()
    for password, status in [
        ("test-only-password-for-isolated-database", 401),
        (new_password, 302),
    ]:
        response = client.get("/admin/login")
        assert (
            client.post(
                "/admin/login",
                data={
                    "csrf_token": token(response),
                    "username": "test-owner",
                    "password": password,
                },
            ).status_code
            == status
        )
    assert client.get("/admin/").status_code == 200
    assert app.test_client().get("/admin/recover-owner").status_code == 404
