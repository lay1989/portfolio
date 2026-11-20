"""Add media assets and publication references without changing existing content."""

import sqlalchemy as sa
from alembic import op

revision = "b6734b20ffb2"
down_revision = "0fb1c5c63fbe"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "media_asset",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("original_name", sa.String(180), nullable=False),
        sa.Column("default_alt", sa.String(500), nullable=False),
        sa.Column("digest", sa.String(64), nullable=False),
        sa.Column("legacy_path", sa.String(300), unique=True),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("width > 0 AND height > 0", name="media_dimensions"),
    )
    op.create_index("ix_media_asset_digest", "media_asset", ["digest"])
    op.create_table(
        "media_reference",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "asset_id", sa.String(36), sa.ForeignKey("media_asset.id"), nullable=False
        ),
        sa.Column(
            "entry_id",
            sa.String(36),
            sa.ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "revision_id",
            sa.Integer(),
            sa.ForeignKey("revision.id", ondelete="CASCADE"),
        ),
        sa.Column("state", sa.String(12), nullable=False),
        sa.Column("recipe", sa.String(24), nullable=False),
        sa.CheckConstraint(
            "state IN ('draft','published','revision')", name="media_reference_state"
        ),
    )
    op.create_index(
        "media_visibility", "media_reference", ["asset_id", "recipe", "state"]
    )
    op.create_index("media_entry_references", "media_reference", ["entry_id", "state"])


def downgrade():
    op.drop_table("media_reference")
    op.drop_index("ix_media_asset_digest", table_name="media_asset")
    op.drop_table("media_asset")
