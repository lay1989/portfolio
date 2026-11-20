"""Host-only recovery and authenticated, non-overwriting SQLite/media backups."""

import hashlib
import json
import os
import shutil
import sqlite3
import stat
import tarfile
import tempfile
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from urllib.parse import quote

import click

MAGIC = b"LAY-SHAH-BACKUP-1\n"
CHUNK = 1024 * 1024
MAX_FILES = 100_000
MAX_BYTES = 64 * 1024**3


class OperationError(ValueError):
    pass


def private_file(path):
    """Create an owner-only file, refusing existing paths and symlinks."""
    return os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb")


def load_key(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise OperationError("Choose a regular backup key file.")
    if stat.S_IMODE(path.stat().st_mode) & 0o077:
        raise OperationError("Backup key permissions must be owner-only (chmod 600).")
    key = path.read_bytes()
    if len(key) != 32:
        raise OperationError("The backup key must contain exactly 32 bytes.")
    return key


def crypto():
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    except ImportError as exc:
        raise OperationError(
            "Install requirements-ops.txt to use encrypted backups."
        ) from exc
    return Cipher, algorithms, modes


def encrypt(source, output, key):
    Cipher, algorithms, modes = crypto()
    nonce = os.urandom(12)
    header = MAGIC + nonce
    context = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
    context.authenticate_additional_data(header)
    created = False
    try:
        with private_file(output) as target:
            created = True
            with Path(source).open("rb") as plain:
                target.write(header)
                while chunk := plain.read(CHUNK):
                    target.write(context.update(chunk))
                target.write(context.finalize())
                target.write(context.tag)
                target.flush()
                os.fsync(target.fileno())
    except BaseException:
        if created:
            Path(output).unlink(missing_ok=True)
        raise


def decrypt(source, output, key):
    from cryptography.exceptions import InvalidTag

    Cipher, algorithms, modes = crypto()
    with Path(source).open("rb") as encrypted:
        header = encrypted.read(len(MAGIC) + 12)
        size = Path(source).stat().st_size
        remaining = size - len(header) - 16
        if (
            not header.startswith(MAGIC)
            or len(header) != len(MAGIC) + 12
            or remaining < 0
        ):
            raise OperationError("This is not a supported encrypted backup.")
        encrypted.seek(-16, os.SEEK_END)
        tag = encrypted.read(16)
        encrypted.seek(len(header))
        context = Cipher(algorithms.AES(key), modes.GCM(header[-12:], tag)).decryptor()
        context.authenticate_additional_data(header)
        try:
            with Path(output).open("wb") as target:
                while remaining:
                    chunk = encrypted.read(min(CHUNK, remaining))
                    if not chunk:
                        raise OperationError("The encrypted backup is truncated.")
                    remaining -= len(chunk)
                    target.write(context.update(chunk))
                target.write(context.finalize())
        except InvalidTag as exc:
            Path(output).unlink(missing_ok=True)
            raise OperationError(
                "Backup authentication failed: wrong key or damaged file."
            ) from exc


def file_info(path):
    digest = hashlib.sha256()
    size = 0
    with Path(path).open("rb") as stream:
        while chunk := stream.read(CHUNK):
            digest.update(chunk)
            size += len(chunk)
    return {"bytes": size, "sha256": digest.hexdigest()}


def readonly_db(path):
    return sqlite3.connect(
        "file:" + quote(str(Path(path).resolve())) + "?mode=ro", uri=True
    )


def inspect_database(path, files):
    with closing(readonly_db(path)) as connection:
        if connection.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise OperationError("Database integrity check failed.")
        if connection.execute("PRAGMA foreign_key_check").fetchone():
            raise OperationError("Database foreign-key check failed.")
        revision = connection.execute(
            "SELECT version_num FROM alembic_version"
        ).fetchall()
        for (identity,) in connection.execute("SELECT id FROM media_asset"):
            if f"media/{identity}/master.webp" not in files:
                raise OperationError(
                    "A media master required by the database is missing."
                )
        return {
            "schema": sorted(row[0] for row in revision),
            "entries": connection.execute("SELECT count(*) FROM entry").fetchone()[0],
            "media": connection.execute("SELECT count(*) FROM media_asset").fetchone()[
                0
            ],
        }


def create_backup(database, media, output, key_file):
    """Caller must stop app/background writers for a coherent database+media set."""
    database, media, output = map(Path, (database, media, output))
    key = load_key(key_file)
    if output.exists() or output.is_symlink():
        raise OperationError("The backup output already exists; choose a new filename.")
    if Path(key_file).resolve().is_relative_to(media.resolve()):
        raise OperationError("Store the backup key outside the media directory.")
    if output.resolve().is_relative_to(media.resolve()):
        raise OperationError("Store backups outside the media directory.")
    if media.is_symlink():
        raise OperationError("The media directory must not be a symlink.")
    if not database.is_file():
        raise OperationError("The SQLite database does not exist.")
    with tempfile.TemporaryDirectory(prefix="portfolio-backup-") as temporary:
        root = Path(temporary)
        snapshot = root / "database.sqlite3"
        source = readonly_db(database)
        target = sqlite3.connect(snapshot)
        try:
            source.backup(target)
            target.execute("PRAGMA journal_mode=DELETE")
        finally:
            target.close()
            source.close()
        sources = {"database.sqlite3": snapshot}
        if media.exists():
            for path in sorted(media.rglob("*")):
                if path.is_symlink():
                    raise OperationError("Media symlinks are not supported in backups.")
                if path.is_file():
                    sources["media/" + path.relative_to(media).as_posix()] = path
        if (
            len(sources) > MAX_FILES
            or sum(p.stat().st_size for p in sources.values()) > MAX_BYTES
        ):
            raise OperationError("Backup exceeds the supported file/size limits.")
        files = {name: file_info(path) for name, path in sources.items()}
        counts = inspect_database(snapshot, files)
        manifest = {
            "format": 1,
            "created_at": datetime.now(UTC).isoformat(),
            "database": counts,
            "files": files,
        }
        (root / "manifest.json").write_text(json.dumps(manifest, sort_keys=True))
        archive = root / "payload.tar.gz"
        with tarfile.open(archive, "w:gz") as bundle:
            for name, path in {
                **sources,
                "manifest.json": root / "manifest.json",
            }.items():
                bundle.add(path, arcname=name, recursive=False)
        encrypt(archive, output, key)
    return counts


def checked_archive(archive):
    members = archive.getmembers()
    if len(members) > MAX_FILES + 1 or sum(item.size for item in members) > MAX_BYTES:
        raise OperationError("Backup exceeds the supported file/size limits.")
    names = set()
    for item in members:
        path = PurePosixPath(item.name)
        if (
            not item.isfile()
            or item.name in names
            or path.is_absolute()
            or ".." in path.parts
            or "\\" in item.name
            or item.name != path.as_posix()
            or not (
                item.name in {"manifest.json", "database.sqlite3"}
                or item.name.startswith("media/")
            )
        ):
            raise OperationError("Backup contains an unsafe or duplicate archive path.")
        names.add(item.name)
    if not {"manifest.json", "database.sqlite3"} <= names:
        raise OperationError("Backup is missing its manifest or database.")
    manifest_member = archive.getmember("manifest.json")
    if manifest_member.size > 32 * 1024 * 1024:
        raise OperationError("Backup manifest is too large.")
    manifest = json.load(archive.extractfile(manifest_member))
    if not isinstance(manifest, dict) or not isinstance(manifest.get("files"), dict):
        raise OperationError("Invalid backup manifest.")
    if not isinstance(manifest.get("database"), dict):
        raise OperationError("Invalid backup database manifest.")
    if manifest.get("format") != 1 or set(manifest.get("files", {})) != names - {
        "manifest.json"
    }:
        raise OperationError("Backup manifest does not match the archive.")
    for name, expected in manifest["files"].items():
        digest, size = hashlib.sha256(), 0
        with archive.extractfile(name) as stream:
            while chunk := stream.read(CHUNK):
                digest.update(chunk)
                size += len(chunk)
        if expected != {"bytes": size, "sha256": digest.hexdigest()}:
            raise OperationError("Backup file verification failed.")
    return members, manifest


def restore_backup(source, destination, key_file):
    """Authenticate and verify before writing only into a newly created directory."""
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise OperationError(
            "Restore destination already exists; choose a new directory."
        )
    key = load_key(key_file)
    crypto()
    with tempfile.TemporaryDirectory(prefix="portfolio-restore-") as temporary:
        archive_path = Path(temporary) / "payload.tar.gz"
        decrypt(source, archive_path, key)
        with tarfile.open(archive_path, "r:gz") as archive:
            members, manifest = checked_archive(archive)
            destination.mkdir(mode=0o700)
            try:
                for item in members:
                    target = destination / item.name
                    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                    with (
                        archive.extractfile(item) as incoming,
                        private_file(target) as outgoing,
                    ):
                        shutil.copyfileobj(incoming, outgoing, CHUNK)
                counts = inspect_database(
                    destination / "database.sqlite3", manifest["files"]
                )
                if counts != manifest["database"]:
                    raise OperationError(
                        "Restored database does not match the manifest."
                    )
            except BaseException:
                shutil.rmtree(destination)
                raise
    return counts


def register_operations(app):
    from .. import ROOT
    from ..extensions import db
    from ..models import LoginAttempt, Owner

    def protected_path(value):
        path = Path(value).absolute()
        if any(
            path.resolve().is_relative_to(ROOT / folder)
            for folder in ("public", "assets")
        ):
            raise OperationError("Use a private location outside public assets.")
        return path

    def database_path():
        if (
            db.engine.dialect.name != "sqlite"
            or not db.engine.url.database
            or db.engine.url.database == ":memory:"
        ):
            raise OperationError(
                "These backup commands require a file-based SQLite database."
            )
        return Path(db.engine.url.database)

    @app.cli.command("recover-owner")
    @click.option("--username", prompt="Existing owner username")
    def recover_owner(username):
        """Reset an existing owner's password from trusted server access only."""
        from werkzeug.security import generate_password_hash

        owner = db.session.get(Owner, 1)
        if not owner or username.strip().lower() != owner.username:
            raise click.ClickException("The existing owner account was not found.")
        password = click.prompt(
            "New password", hide_input=True, confirmation_prompt=True
        )
        if not 14 <= len(password) <= 256:
            raise click.ClickException("Use a password between 14 and 256 characters.")
        result = db.session.execute(
            db.update(Owner)
            .where(Owner.id == 1, Owner.password_hash == owner.password_hash)
            .values(password_hash=generate_password_hash(password))
        )
        if result.rowcount != 1:
            db.session.rollback()
            raise click.ClickException("The account changed; start recovery again.")
        db.session.execute(db.delete(LoginAttempt))
        db.session.commit()
        click.echo(
            "Password reset. Previous owner sessions are invalid; sign in again."
        )

    @app.cli.command("backup-keygen")
    @click.option("--output", type=click.Path(path_type=Path), required=True)
    def keygen(output):
        """Create a new private encryption key. Keep an offline copy separately."""
        try:
            with private_file(protected_path(output)) as stream:
                stream.write(os.urandom(32))
        except (OperationError, OSError) as exc:
            raise click.ClickException(str(exc)) from exc
        click.echo("Backup key created. Store an offline copy separately from backups.")

    @app.cli.command("backup-create")
    @click.option("--output", type=click.Path(path_type=Path), required=True)
    @click.option(
        "--key-file", type=click.Path(exists=True, path_type=Path), required=True
    )
    @click.option(
        "--writers-stopped",
        is_flag=True,
        required=True,
        help="Confirm web and background writers are stopped.",
    )
    def backup_create(output, key_file, writers_stopped):
        """Create an encrypted database and full-media snapshot during maintenance."""
        if not writers_stopped:
            raise click.ClickException(
                "Stop all app/media writers and pass --writers-stopped."
            )
        try:
            counts = create_backup(
                database_path(),
                app.config["MEDIA_ROOT"],
                protected_path(output),
                protected_path(key_file),
            )
        except (
            OperationError,
            OSError,
            sqlite3.Error,
            tarfile.TarError,
            ValueError,
        ) as exc:
            raise click.ClickException(str(exc)) from exc
        click.echo(json.dumps({"backup": "created", **counts}))

    @app.cli.command("backup-restore")
    @click.option(
        "--source", type=click.Path(exists=True, path_type=Path), required=True
    )
    @click.option("--destination", type=click.Path(path_type=Path), required=True)
    @click.option(
        "--key-file", type=click.Path(exists=True, path_type=Path), required=True
    )
    def backup_restore(source, destination, key_file):
        """Restore to a NEW private directory; never overwrite the running app."""
        try:
            counts = restore_backup(
                source, protected_path(destination), protected_path(key_file)
            )
        except (
            OperationError,
            OSError,
            sqlite3.Error,
            tarfile.TarError,
            ValueError,
        ) as exc:
            raise click.ClickException(str(exc)) from exc
        click.echo(json.dumps({"restore": "verified", **counts}))
