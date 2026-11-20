"""Track shared-page image publication and revision retention."""

import sqlalchemy as sa
from alembic import op

revision = "a6e7d913c052"
down_revision = "f4b1d6c298ad"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "page_media_reference",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "asset_id", sa.String(36), sa.ForeignKey("media_asset.id"), nullable=False
        ),
        sa.Column(
            "page_key",
            sa.String(32),
            sa.ForeignKey("managed_page.key", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "revision_id",
            sa.Integer(),
            sa.ForeignKey("page_revision.id", ondelete="CASCADE"),
        ),
        sa.Column("state", sa.String(12), nullable=False),
        sa.Column("recipe", sa.String(24), nullable=False),
        sa.CheckConstraint(
            "state IN ('draft','published','revision')",
            name="page_media_reference_state",
        ),
    )
    op.create_index(
        "page_media_visibility", "page_media_reference", ["asset_id", "recipe", "state"]
    )
    op.create_index(
        "page_media_references", "page_media_reference", ["page_key", "state"]
    )


def downgrade():
    op.drop_index("page_media_references", table_name="page_media_reference")
    op.drop_index("page_media_visibility", table_name="page_media_reference")
    op.drop_table("page_media_reference")
