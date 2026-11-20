"""Store homepage text and shared contact settings with separate revisions."""

import sqlalchemy as sa
from alembic import op

revision = "f4b1d6c298ad"
down_revision = "c81ad82029a1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "managed_page",
        sa.Column("key", sa.String(32), primary_key=True),
        sa.Column("draft", sa.JSON(), nullable=False),
        sa.Column("published", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
    )
    op.create_table(
        "page_revision",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "page_key",
            sa.String(32),
            sa.ForeignKey("managed_page.key", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_page_revision_page_key", "page_revision", ["page_key"])


def downgrade():
    op.drop_index("ix_page_revision_page_key", table_name="page_revision")
    op.drop_table("page_revision")
    op.drop_table("managed_page")
