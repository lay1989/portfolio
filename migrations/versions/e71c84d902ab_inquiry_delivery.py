"""Add durable inquiry notifications and privacy-preserving contact limits."""

import sqlalchemy as sa
from alembic import op

revision = "e71c84d902ab"
down_revision = "d94f7e6a210b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "inquiry_delivery",
        sa.Column("inquiry_id", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(24), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True)),
        sa.Column("claim_token", sa.String(36)),
        sa.Column("error_code", sa.String(32)),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("message_id", sa.String(100), nullable=False),
        sa.CheckConstraint("attempts >= 0", name="delivery_attempts"),
        sa.CheckConstraint(
            "state IN ('queued','sending','retry','accepted','failed','uncertain')",
            name="delivery_state",
        ),
        sa.ForeignKeyConstraint(["inquiry_id"], ["inquiry.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("inquiry_id"),
        sa.UniqueConstraint("message_id"),
    )
    op.create_index(
        "inquiry_delivery_due", "inquiry_delivery", ["state", "next_attempt_at"]
    )
    op.create_table(
        "contact_rate_bucket",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("window", sa.Integer(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False),
    )
    op.create_index(
        "ix_contact_rate_bucket_expires_at", "contact_rate_bucket", ["expires_at"]
    )


def downgrade():
    op.drop_table("contact_rate_bucket")
    op.drop_table("inquiry_delivery")
