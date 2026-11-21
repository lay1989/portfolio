"""Add the Guides collection: allow guide entries and create its page settings.

SQLite can only change a CHECK constraint by rebuilding the table. Foreign keys
are switched off for the rebuild: with them on, dropping the old `entry` table
would cascade-delete every revision, address and media reference.
"""

import json
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision = "b3c9e2f4a7d1"
down_revision = "e71c84d902ab"
branch_labels = None
depends_on = None

GUIDES_PAGE = {
    "intro": (
        "Free, practical guides for small businesses: short checklists and "
        "walkthroughs you can use today, in plain words."
    ),
    "seo_title": "Free Guides for Small Businesses | Lay Shah",
    "seo_description": (
        "Free one-page checklists and practical guides for small businesses: "
        "websites, AI and the everyday tools that take work off your team."
    ),
    "search_visibility": "index",
}


def counts(connection):
    return {
        table: connection.execute(sa.text(f"SELECT COUNT(*) FROM {table}")).scalar()
        for table in ("entry", "revision", "entry_address", "media_reference")
    }


def rebuild_entry(kinds):
    connection = op.get_bind()
    before = counts(connection)
    with op.get_context().autocommit_block():
        op.execute("PRAGMA foreign_keys=OFF")
    with op.batch_alter_table("entry", recreate="always") as batch_op:
        batch_op.drop_constraint("entry_kind", type_="check")
        batch_op.create_check_constraint("entry_kind", f"kind IN ({kinds})")
    after = counts(connection)
    problems = connection.execute(sa.text("PRAGMA foreign_key_check")).fetchall()
    if before != after or problems:
        raise RuntimeError(
            f"Entry rebuild changed related rows ({before} -> {after}) or broke links ({problems[:3]})."
        )
    with op.get_context().autocommit_block():
        op.execute("PRAGMA foreign_keys=ON")


def upgrade():
    rebuild_entry("'project', 'post', 'tool', 'guide'")
    connection = op.get_bind()
    exists = connection.execute(
        sa.text("SELECT 1 FROM managed_page WHERE key = 'guides'")
    ).first()
    if not exists:
        payload = json.dumps(GUIDES_PAGE)
        connection.execute(
            sa.text(
                "INSERT INTO managed_page (key, draft, published, version) "
                "VALUES ('guides', :payload, :payload, 1)"
            ),
            {"payload": payload},
        )
        connection.execute(
            sa.text(
                "INSERT INTO page_revision (page_key, payload, action, created_at) "
                "VALUES ('guides', :payload, 'import', :created_at)"
            ),
            {
                "payload": payload,
                # Same text form SQLAlchemy writes for DateTime columns on SQLite.
                "created_at": str(datetime.now(UTC).replace(tzinfo=None)),
            },
        )


def downgrade():
    connection = op.get_bind()
    if connection.execute(
        sa.text("SELECT 1 FROM entry WHERE kind = 'guide'")
    ).first():
        raise RuntimeError("Delete or archive guide entries before downgrading.")
    connection.execute(sa.text("DELETE FROM managed_page WHERE key = 'guides'"))
    rebuild_entry("'project', 'post', 'tool'")
