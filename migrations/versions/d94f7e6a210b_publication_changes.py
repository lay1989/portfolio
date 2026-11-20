"""Track actual future content publications without inventing imported update dates."""

import sqlalchemy as sa
from alembic import op

revision = "d94f7e6a210b"
down_revision = "a6e7d913c052"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "entry", sa.Column("published_modified_at", sa.DateTime(timezone=True))
    )


def downgrade():
    op.drop_column("entry", "published_modified_at")
