"""Downloadable guide files (PDF): validated, content-addressed and publication-gated.

Files live in MEDIA_ROOT/documents/<sha256>.pdf, so the existing media backups
include them and the image cache pruner (which only removes hex-named folders)
leaves them alone. A file is public only while a published guide points at it.
"""

import hashlib
import os
import re
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from flask import current_app
from werkzeug.utils import secure_filename

from ..extensions import db
from ..models import Entry
from .content import ContentError

DIGEST = re.compile(r"[a-f0-9]{64}")


def folder():
    return Path(current_app.config["MEDIA_ROOT"]) / "documents"


def file_path(digest):
    if not DIGEST.fullmatch(digest or ""):
        raise ContentError("This guide file reference is invalid.")
    return folder() / f"{digest}.pdf"


def store_pdf(upload):
    """Validate and store an uploaded PDF; return the record kept on the guide."""
    name = upload.filename or ""
    if not name.lower().endswith(".pdf"):
        raise ContentError("Upload the guide as a PDF file.")
    limit = current_app.config["GUIDE_FILE_MAX_BYTES"]
    raw = upload.stream.read(limit + 1)
    if not raw:
        raise ContentError("The chosen PDF is empty.")
    if len(raw) > limit:
        raise ContentError(
            f"Keep the PDF under {limit // (1024 * 1024)} MB. Compress it or split it into parts."
        )
    if not raw.startswith(b"%PDF-") or b"%%EOF" not in raw[-2048:]:
        raise ContentError("That file isn't a complete PDF. Export it again and retry.")
    digest = hashlib.sha256(raw).hexdigest()
    target = file_path(digest)
    if not target.is_file():
        target.parent.mkdir(parents=True, exist_ok=True)
        handle, temporary = tempfile.mkstemp(dir=target.parent, suffix=".upload")
        try:
            with os.fdopen(handle, "wb") as stream:
                stream.write(raw)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, target)
        except BaseException:
            Path(temporary).unlink(missing_ok=True)
            raise
    download = secure_filename(name)[:120] or "guide.pdf"
    if not download.lower().endswith(".pdf"):
        download += ".pdf"
    return {
        "sha256": digest,
        "size": len(raw),
        "download_name": download,
        "uploaded_at": datetime.now(UTC).isoformat(timespec="seconds"),
    }


def validate_file(record, publishing=False):
    if not record:
        if publishing:
            raise ContentError("Upload the guide's PDF before publishing.")
        return
    if not isinstance(record, dict) or not file_path(record.get("sha256")).is_file():
        raise ContentError("The guide's PDF is missing. Upload it again.")


def published_record(digest):
    """The published guide file with this digest, or None."""
    if not DIGEST.fullmatch(digest or ""):
        return None
    for data in db.session.scalars(
        db.select(Entry.published).where(
            Entry.kind == "guide", Entry.published.is_not(None)
        )
    ):
        record = (data or {}).get("file") or {}
        if record.get("sha256") == digest:
            return record
    return None


def draft_record(digest):
    if not DIGEST.fullmatch(digest or ""):
        return None
    for data in db.session.scalars(
        db.select(Entry.draft).where(Entry.kind == "guide")
    ):
        record = (data or {}).get("file") or {}
        if record.get("sha256") == digest:
            return record
    return None


def file_url(record):
    return f"/guides/files/{record['sha256']}.pdf" if record else ""


def size_label(record):
    size = (record or {}).get("size") or 0
    return f"{max(1, round(size / 1024))} KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.1f} MB"
