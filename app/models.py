import hashlib
from datetime import UTC, datetime
from typing import ClassVar
from uuid import uuid4

from flask_login import UserMixin

from .extensions import db


def now():
    return datetime.now(UTC)


class Owner(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    __table_args__ = (db.CheckConstraint("id = 1", name="single_owner"),)

    def get_id(self):
        """Invalidate signed login sessions when the password hash changes."""
        fingerprint = hashlib.sha256(self.password_hash.encode()).hexdigest()
        return f"1:{fingerprint}"


class Entry(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    kind = db.Column(db.String(20), nullable=False, index=True)
    slug = db.Column(db.String(180), nullable=False)
    path = db.Column(db.String(240), unique=True, nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
    featured_position = db.Column(db.Integer)
    draft = db.Column(db.JSON, nullable=False)
    published = db.Column(db.JSON(none_as_null=True))
    version = db.Column(db.Integer, nullable=False, default=1)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=now, onupdate=now
    )
    published_modified_at = db.Column(db.DateTime(timezone=True))
    __mapper_args__: ClassVar[dict] = {"version_id_col": version}
    __table_args__ = (
        db.UniqueConstraint("kind", "slug", name="unique_collection_slug"),
        db.CheckConstraint("kind IN ('project', 'post', 'tool')", name="entry_kind"),
        db.CheckConstraint("position >= 0", name="nonnegative_position"),
        db.Index("entry_collection_order", "kind", "position", "id"),
    )


class Revision(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(
        db.String(36),
        db.ForeignKey("entry.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payload = db.Column(db.JSON, nullable=False)
    action = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)


class EntryAddress(db.Model):
    """Reserve both current and former addresses for one stable entry identity."""

    path = db.Column(db.String(240), primary_key=True)
    entry_id = db.Column(
        db.String(36),
        db.ForeignKey("entry.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)


class Homepage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    version = db.Column(db.Integer, nullable=False, default=1)
    __mapper_args__: ClassVar[dict] = {"version_id_col": version}
    __table_args__ = (db.CheckConstraint("id = 1", name="single_homepage"),)


class ManagedPage(db.Model):
    key = db.Column(db.String(32), primary_key=True)
    draft = db.Column(db.JSON, nullable=False)
    published = db.Column(db.JSON, nullable=False)
    version = db.Column(db.Integer, nullable=False, default=1)
    __mapper_args__: ClassVar[dict] = {"version_id_col": version}


class PageRevision(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    page_key = db.Column(
        db.String(32),
        db.ForeignKey("managed_page.key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payload = db.Column(db.JSON, nullable=False)
    action = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)


class Inquiry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(254), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_state = db.Column(
        db.String(24), nullable=False, default="not_configured"
    )
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)


class LoginAttempt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(64), nullable=False, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=now, index=True
    )


class InquiryDelivery(db.Model):
    """One durable owner notification per inquiry; never a visitor mailing list."""

    inquiry_id = db.Column(
        db.Integer, db.ForeignKey("inquiry.id", ondelete="CASCADE"), primary_key=True
    )
    state = db.Column(db.String(24), nullable=False, default="queued")
    attempts = db.Column(db.Integer, nullable=False, default=0)
    next_attempt_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)
    claimed_at = db.Column(db.DateTime(timezone=True))
    claim_token = db.Column(db.String(36))
    error_code = db.Column(db.String(32))
    accepted_at = db.Column(db.DateTime(timezone=True))
    message_id = db.Column(db.String(100), nullable=False, unique=True)
    __table_args__ = (
        db.CheckConstraint("attempts >= 0", name="delivery_attempts"),
        db.CheckConstraint(
            "state IN ('queued','sending','retry','accepted','failed','uncertain')",
            name="delivery_state",
        ),
        db.Index("inquiry_delivery_due", "state", "next_attempt_at"),
    )


class ContactRateBucket(db.Model):
    key = db.Column(db.String(64), primary_key=True)
    window = db.Column(db.Integer, primary_key=True)
    count = db.Column(db.Integer, nullable=False)
    expires_at = db.Column(db.Integer, nullable=False, index=True)


class MediaAsset(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: uuid4().hex)
    title = db.Column(db.String(180), nullable=False)
    original_name = db.Column(db.String(180), nullable=False)
    default_alt = db.Column(db.String(500), nullable=False, default="")
    digest = db.Column(db.String(64), nullable=False, index=True)
    legacy_path = db.Column(db.String(300), unique=True)
    width = db.Column(db.Integer, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    byte_size = db.Column(db.Integer, nullable=False)
    archived_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)
    __table_args__ = (
        db.CheckConstraint("width > 0 AND height > 0", name="media_dimensions"),
    )


class MediaReference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(36), db.ForeignKey("media_asset.id"), nullable=False)
    entry_id = db.Column(
        db.String(36), db.ForeignKey("entry.id", ondelete="CASCADE"), nullable=False
    )
    revision_id = db.Column(
        db.Integer, db.ForeignKey("revision.id", ondelete="CASCADE")
    )
    state = db.Column(db.String(12), nullable=False)
    recipe = db.Column(db.String(24), nullable=False)
    __table_args__ = (
        db.CheckConstraint(
            "state IN ('draft','published','revision')", name="media_reference_state"
        ),
        db.Index("media_visibility", "asset_id", "recipe", "state"),
        db.Index("media_entry_references", "entry_id", "state"),
    )


class PageMediaReference(db.Model):
    """Image visibility and retention for shared-page snapshots."""

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(36), db.ForeignKey("media_asset.id"), nullable=False)
    page_key = db.Column(
        db.String(32),
        db.ForeignKey("managed_page.key", ondelete="CASCADE"),
        nullable=False,
    )
    revision_id = db.Column(
        db.Integer, db.ForeignKey("page_revision.id", ondelete="CASCADE")
    )
    state = db.Column(db.String(12), nullable=False)
    recipe = db.Column(db.String(24), nullable=False)
    __table_args__ = (
        db.CheckConstraint(
            "state IN ('draft','published','revision')",
            name="page_media_reference_state",
        ),
        db.Index("page_media_visibility", "asset_id", "recipe", "state"),
        db.Index("page_media_references", "page_key", "state"),
    )
