import json
from copy import deepcopy

import click
from werkzeug.security import generate_password_hash

from .. import ROOT
from ..extensions import db
from ..models import Entry, EntryAddress, Owner, Revision
from .pages import seed_pages


def import_content():
    """Insert missing legacy records only. Never overwrite database-authored content."""
    pages = json.loads((ROOT / "pages.json").read_text())
    count = 0
    for kind, filename, collection in [
        ("project", "projects.json", "projects"),
        ("post", "posts.json", "posts"),
        ("tool", "tools.json", "tools"),
    ]:
        records = json.loads((ROOT / "data" / filename).read_text())[collection]
        for position, record in enumerate(records):
            if kind == "project":
                path = f"/projects/{record['slug']}.html"
            elif kind == "tool":
                path = f"/tools/{record['slug']}.html"
            else:
                path = f"/{record['slug']}.html"
            if db.session.get(EntryAddress, path):
                continue
            payload = deepcopy(record)
            payload["summary"] = record.get("shortDesc", record.get("dek", record.get("summary", "")))
            meta = pages.get(path[1:], {})
            payload["seo_title"] = meta.get("title", f"{record['title']} | Curated Tool")
            payload["seo_description"] = meta.get("description", payload["summary"])
            entry = Entry(
                kind=kind,
                slug=record["slug"],
                path=path,
                position=position,
                featured_position=position if position < 3 else None,
                draft=payload,
                published=deepcopy(payload),
            )
            db.session.add(entry)
            db.session.flush()
            db.session.add(EntryAddress(path=path, entry_id=entry.id))
            db.session.add(
                Revision(entry_id=entry.id, payload=deepcopy(payload), action="import")
            )
            count += 1
    seed_pages()
    db.session.commit()
    return count


def register_commands(app):
    @app.cli.command("import-content")
    def import_command():
        click.echo(
            f"Imported {import_content()} missing entries. Existing edits preserved."
        )

    @app.cli.command("create-owner")
    @click.option("--username", prompt=True)
    @click.password_option(confirmation_prompt=True)
    def create_owner(username, password):
        if db.session.get(Owner, 1):
            raise click.ClickException("The owner account already exists.")
        if (
            not username.strip()
            or len(username.strip()) > 120
            or not 14 <= len(password) <= 256
        ):
            raise click.ClickException(
                "Use a username of 1–120 characters and a password of 14–256 characters."
            )
        db.session.add(
            Owner(
                id=1,
                username=username.strip().lower(),
                password_hash=generate_password_hash(password),
            )
        )
        db.session.commit()
        click.echo("Owner account created.")
