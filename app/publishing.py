"""Owner-only revision recovery, permanent addresses, and homepage curation."""

import hashlib
from copy import deepcopy

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import login_required
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import StaleDataError

from .admin import private
from .extensions import db
from .models import Entry, EntryAddress, Homepage, Revision
from .public import render_entry
from .services.addresses import address_available, content_address
from .services.content import ContentError, validate_content
from .services.media import MediaError, prepare_media, sync_references

publishing = Blueprint("publishing", __name__, url_prefix="/admin")
publishing.after_request(private)


def conflict():
    return render_template("admin/conflict.html"), 409


def revision_for(entry_id, revision_id):
    return db.first_or_404(
        db.select(Revision).where(
            Revision.entry_id == entry_id, Revision.id == revision_id
        )
    )


@publishing.get("/entry/<entry_id>/history")
@login_required
def history(entry_id):
    entry = db.get_or_404(Entry, entry_id)
    revisions = db.paginate(
        db.select(Revision)
        .where(Revision.entry_id == entry.id)
        .order_by(Revision.id.desc()),
        per_page=20,
        max_per_page=20,
    )
    return render_template("admin/history.html", entry=entry, revisions=revisions)


@publishing.get("/entry/<entry_id>/history/<int:revision_id>")
@login_required
def revision_preview(entry_id, revision_id):
    entry = db.get_or_404(Entry, entry_id)
    revision = revision_for(entry.id, revision_id)
    return render_entry(
        entry, preview=True, payload=revision.payload, revision=revision
    )


@publishing.post("/entry/<entry_id>/history/<int:revision_id>/restore")
@login_required
def restore(entry_id, revision_id):
    entry = db.get_or_404(Entry, entry_id)
    revision = revision_for(entry.id, revision_id)
    if request.form.get("version") != str(entry.version):
        return conflict()
    data = deepcopy(revision.payload)
    try:
        validate_content(data, entry.kind)
        prepare_media(data)
    except (ContentError, MediaError) as exc:
        flash(f"This revision could not be restored: {exc}", "error")
        return redirect(url_for("publishing.history", entry_id=entry.id))
    # Checkpoint even legacy drafts that predate automatic revision recording.
    checkpoint = Revision(
        entry_id=entry.id, payload=deepcopy(entry.draft), action="checkpoint"
    )
    restored = Revision(entry_id=entry.id, payload=deepcopy(data), action="restore")
    db.session.add_all([checkpoint, restored])
    entry.draft = data
    entry.version += (
        1  # Restoring identical content must still invalidate stale editors.
    )
    try:
        db.session.flush()
        sync_references(entry, checkpoint)
        sync_references(entry, restored)
        db.session.commit()
    except StaleDataError:
        db.session.rollback()
        return conflict()
    flash(
        "Revision restored to your draft. Your previous draft is in history. Preview, then publish when ready."
    )
    return redirect(url_for("admin.edit_entry", entry_id=entry.id))


@publishing.route("/entry/<entry_id>/address", methods=["GET", "POST"])
@login_required
def address(entry_id):
    entry = db.get_or_404(Entry, entry_id)
    name = request.form.get(
        "slug", entry.slug.removeprefix("blog-") if entry.kind == "post" else entry.slug
    ).strip()
    status = 200
    if request.method == "POST":
        if request.form.get("version") != str(entry.version):
            return conflict()
        try:
            slug, path = content_address(entry.kind, name)
            if not address_available(path, entry.id):
                raise ContentError(
                    "This address belongs to another page or one of its old links. Choose another name."
                )
        except ContentError as exc:
            flash(str(exc), "error")
            status = 422
        else:
            if path != entry.path:
                if db.session.get(EntryAddress, path) is None:
                    db.session.add(EntryAddress(path=path, entry_id=entry.id))
                entry.slug, entry.path = slug, path
                # Legacy payload slugs are not routing authorities; Entry is.
                try:
                    db.session.commit()
                except IntegrityError:
                    db.session.rollback()
                    flash("That address was just taken. Choose another name.", "error")
                    status = 422
                except StaleDataError:
                    db.session.rollback()
                    return conflict()
                else:
                    flash(
                        "Address updated. All previous addresses lead directly to the published page."
                    )
                    return redirect(url_for("publishing.address", entry_id=entry.id))
            else:
                return redirect(url_for("admin.edit_entry", entry_id=entry.id))
    aliases = db.session.scalars(
        db.select(EntryAddress)
        .where(EntryAddress.entry_id == entry.id, EntryAddress.path != entry.path)
        .order_by(EntryAddress.created_at, EntryAddress.path)
    ).all()
    return render_template(
        "admin/address.html", entry=entry, name=name, aliases=aliases
    ), status


def selection_snapshot(entries):
    return hashlib.sha256(
        "|".join(f"{e.id}:{e.version}" for e in entries).encode()
    ).hexdigest()


@publishing.route("/homepage", methods=["GET", "POST"])
@login_required
def homepage():
    settings = db.get_or_404(Homepage, 1)
    entries = db.session.scalars(
        db.select(Entry)
        .where(Entry.kind.in_(("project", "post", "tool")))
        .order_by(Entry.kind, Entry.position, Entry.id)
    ).all()
    selected = {kind: ["", "", ""] for kind in ("project", "post", "tool")}
    for kind, slots in selected.items():
        featured = sorted(
            (e for e in entries if e.kind == kind and e.featured_position is not None),
            key=lambda e: (e.featured_position, e.id),
        )[:3]
        for i, entry in enumerate(featured):
            slots[i] = entry.id
    status = 200
    if request.method == "POST":
        if request.form.get("version") != str(settings.version) or request.form.get(
            "snapshot"
        ) != selection_snapshot(entries):
            return conflict()
        proposed = {
            kind: [request.form.get(f"{kind}.{i}", "") for i in range(3)]
            for kind in selected
        }
        try:
            for kind, slots in proposed.items():
                nonempty = [identity for identity in slots if identity]
                allowed = {
                    e.id
                    for e in entries
                    if e.kind == kind
                    and (e.published is not None or e.id in selected[kind])
                }
                if len(nonempty) != len(set(nonempty)) or not set(nonempty) <= allowed:
                    raise ContentError(
                        "Choose each entry once, from the available options in its collection."
                    )
        except ContentError as exc:
            flash(str(exc), "error")
            selected = proposed
            status = 422
        else:
            for entry in entries:
                slots = proposed[entry.kind]
                entry.featured_position = (
                    slots.index(entry.id) if entry.id in slots else None
                )
                if entry.id in slots:
                    entry.version += 1  # Detect a concurrent publication change too.
            settings.version += 1
            try:
                db.session.commit()
            except StaleDataError:
                db.session.rollback()
                return conflict()
            flash("Homepage selections updated. Collection order has not changed.")
            return redirect(url_for("publishing.homepage"))
    return render_template(
        "admin/homepage.html",
        entries=entries,
        selected=selected,
        settings=settings,
        snapshot=selection_snapshot(entries),
    ), status
