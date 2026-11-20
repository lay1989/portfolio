"""Reserve existing addresses and serialize homepage curation."""

import sqlalchemy as sa
from alembic import op

revision = "c81ad82029a1"
down_revision = "b6734b20ffb2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "entry_address",
        sa.Column("path", sa.String(240), primary_key=True),
        sa.Column(
            "entry_id",
            sa.String(36),
            sa.ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_entry_address_entry_id", "entry_address", ["entry_id"])
    op.execute(
        "INSERT INTO entry_address (path, entry_id, created_at) SELECT path, id, CURRENT_TIMESTAMP FROM entry"
    )
    op.create_table(
        "homepage",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("id = 1", name="single_homepage"),
    )
    op.execute("INSERT INTO homepage (id, version) VALUES (1, 1)")


def downgrade():
    op.drop_table("homepage")
    op.drop_index("ix_entry_address_entry_id", table_name="entry_address")
    op.drop_table("entry_address")
