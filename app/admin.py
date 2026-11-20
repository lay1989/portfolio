import hashlib
import json
import re
from copy import deepcopy
from datetime import timedelta
from ipaddress import ip_address

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import StaleDataError
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db
from .models import (
    Entry,
    EntryAddress,
    Inquiry,
    LoginAttempt,
    MediaAsset,
    Owner,
    Revision,
    now,
)
from .services.addresses import address_available, content_address
from .services.collections import collection, order_snapshot
from .services.content import (
    BLOCK_TYPES,
    ContentError,
    create_payload,
    initial_blocks,
    new_block,
    read_form,
    validate_content,
)
from .services.media import (
    MediaError,
    change_gallery,
    entry_placements,
    new_placement,
    prepare_media,
    sync_references,
)
from .services.project_details import (
    blank_figure,
    change_figure,
    feedback_for,
    figures_for,
)
from .services.seo import same_content

admin = Blueprint("admin", __name__, url_prefix="/admin")


@admin.after_request
def private(response):
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Private-Page"] = "1"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    )
    return response


@admin.route("/setup", methods=["GET", "POST"])
def setup():
    try:
        loopback = ip_address(request.remote_addr).is_loopback
    except ValueError:
        loopback = False
    if (
        not current_app.config["LOCAL_OWNER_SETUP"]
        or not loopback
        or db.session.get(Owner, 1)
    ):
        abort(404)
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        if (
            not username
            or len(username) > 120
            or len(password) < 14
            or len(password) > 256
        ):
            flash(
                "Choose a username and a password between 14 and 256 characters.",
                "error",
            )
        else:
            owner = Owner(
                id=1, username=username, password_hash=generate_password_hash(password)
            )
            db.session.add(owner)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                abort(409)
            session.clear()
            login_user(owner)
            session.permanent = True
            return redirect(url_for("admin.dashboard"))
    return render_template("admin/login.html", setup=True)


@admin.route("/login", methods=["GET", "POST"])
def sign_in():
    if current_user.is_authenticated:
        return redirect(url_for("admin.dashboard"))
    if request.method == "POST":
        cutoff = now() - timedelta(minutes=15)
        key = hashlib.sha256((request.remote_addr or "").encode()).hexdigest()
        db.session.execute(
            db.delete(LoginAttempt).where(LoginAttempt.created_at < cutoff)
        )
        attempts = db.session.scalar(
            db.select(db.func.count())
            .select_from(LoginAttempt)
            .where(LoginAttempt.key == key)
        )
        if attempts >= 5:
            db.session.commit()
            return render_template(
                "admin/login.html",
                setup=False,
                error="Too many attempts. Try again in 15 minutes.",
            ), 429
        owner = db.session.get(Owner, 1)
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        if (
            owner
            and len(password) <= 256
            and check_password_hash(owner.password_hash, password)
            and username == owner.username
        ):
            db.session.execute(db.delete(LoginAttempt).where(LoginAttempt.key == key))
            db.session.commit()
            session.clear()
            login_user(owner)
            session.permanent = True
            return redirect(url_for("admin.dashboard"))
        db.session.add(LoginAttempt(key=key))
        db.session.commit()
        return render_template(
            "admin/login.html",
            setup=False,
            error="The username or password is incorrect.",
        ), 401
    return render_template("admin/login.html", setup=False)


@admin.post("/logout")
@login_required
def sign_out():
    logout_user()
    session.clear()
    return redirect(url_for("admin.sign_in"))


@admin.get("/")
@login_required
def dashboard():
    counts = {
        kind: (total, published)
        for kind, total, published in db.session.execute(
            db.select(
                Entry.kind, db.func.count(Entry.id), db.func.count(Entry.published)
            ).group_by(Entry.kind)
        )
    }
    totals = []
    for kind, label in (("project", "Projects"), ("post", "Blog"), ("tool", "Tools")):
        total, published = counts.get(kind, (0, 0))
        totals.append(
            {
                "kind": kind,
                "label": label,
                "total": total,
                "published": published,
                "drafts": total - published,
            }
        )
    recent = db.session.scalars(
        db.select(Entry).order_by(Entry.updated_at.desc(), Entry.id.desc()).limit(8)
    ).all()
    inquiry_count = db.session.scalar(db.select(db.func.count()).select_from(Inquiry))
    return render_template(
        "admin/dashboard.html",
        totals=totals,
        recent=recent,
        inquiry_count=inquiry_count,
    )


@admin.get("/inquiries")
@login_required
def inquiries():
    from .models import InquiryDelivery
    from .services.inquiries import ERROR_LABELS, STATUS_LABELS

    page = request.args.get("page", "1")
    if not page.isascii() or not page.isdigit() or len(page) > 8 or int(page) < 1:
        abort(404)
    pagination = db.paginate(
        db.select(Inquiry).order_by(Inquiry.created_at.desc(), Inquiry.id.desc()),
        page=int(page),
        per_page=20,
        max_per_page=20,
    )
    return render_template(
        "admin/inquiries.html",
        pagination=pagination,
        notification_labels=STATUS_LABELS,
        delivery_errors=ERROR_LABELS,
        deliveries={
            row.inquiry_id: row
            for row in db.session.scalars(
                db.select(InquiryDelivery).where(
                    InquiryDelivery.inquiry_id.in_([row.id for row in pagination.items])
                )
            )
        },
        email_enabled=current_app.config["INQUIRY_EMAIL_ENABLED"],
        page_url=lambda number: url_for(
            "admin.inquiries", **({"page": number} if number > 1 else {})
        ),
    )


@admin.get("/collection/<kind>")
@login_required
def manage_collection(kind):
    if kind not in ("project", "post", "tool"):
        abort(404)
    return render_template(
        "admin/collection.html",
        kind=kind,
        entry_ranks={
            identity: index
            for index, identity in enumerate(
                db.session.scalars(
                    db.select(Entry.id)
                    .where(Entry.kind == kind)
                    .order_by(Entry.position, Entry.id)
                ),
                1,
            )
        },
        order_snapshot=order_snapshot(kind),
        total_entries=db.session.scalar(
            db.select(db.func.count()).select_from(Entry).where(Entry.kind == kind)
        ),
        **collection(kind, owner=True),
    )


@admin.post("/entry/<entry_id>/place")
@login_required
def place_entry(entry_id):
    entry = db.get_or_404(Entry, entry_id)
    if request.form.get("version") != str(entry.version) or request.form.get(
        "snapshot"
    ) != order_snapshot(entry.kind):
        return render_template("admin/conflict.html"), 409
    rows = list(
        db.session.scalars(
            db.select(Entry)
            .where(Entry.kind == entry.kind)
            .order_by(Entry.position, Entry.id)
        )
    )
    value = request.form.get("position", "")
    if (
        not value.isascii()
        or not value.isdigit()
        or len(value) > 8
        or not 1 <= int(value) <= len(rows)
    ):
        abort(422)
    rows.remove(entry)
    rows.insert(int(value) - 1, entry)
    for position, row in enumerate(rows):
        row.position = position
    try:
        db.session.commit()
    except StaleDataError:
        db.session.rollback()
        return render_template("admin/conflict.html"), 409
    flash("Collection order updated. Homepage selections keep their own order.")
    page = (int(value) - 1) // 12 + 1
    return redirect(
        url_for(
            "admin.manage_collection",
            kind=entry.kind,
            **({"page": page} if page > 1 else {}),
        )
    )


def editor_response(entry, data, status=200, unsaved=False):
    return render_template(
        "admin/edit.html",
        entry=entry,
        data=data,
        project_figures=figures_for(data) if entry.kind == "project" else [],
        project_feedback=feedback_for(data),
        blank_figure=lambda: {**blank_figure(), "id": "__id__"},
        blocks=initial_blocks(data, entry.kind),
        block_types=BLOCK_TYPES,
        blank_block=lambda kind: {**new_block(kind), "id": "__id__"},
        unsaved=unsaved or status == 422,
        media_assets=list(
            db.session.scalars(
                db.select(MediaAsset)
                .where(MediaAsset.archived_at.is_(None))
                .order_by(MediaAsset.title, MediaAsset.id)
            )
        ),
        media_values=entry_placements(data, entry.kind),
        blank_placement=new_placement,
        media_ratios=current_app.config["DESIGN_CONTENT"]["media"],
    ), status


@admin.route("/new/<kind>", methods=["GET", "POST"])
@login_required
def new_entry(kind):
    if kind not in ("project", "post"):
        abort(404)
    values = {
        key: request.form.get(key, "").strip()
        for key in ("title", "slug", "summary", "category")
    }
    if request.method == "POST":
        if not values["title"] or len(values["title"]) > 180:
            flash("Add a title of up to 180 characters.", "error")
        elif (
            not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", values["slug"])
            or len(values["slug"]) > 100
        ):
            flash(
                "Use a URL name of up to 100 lowercase letters, numbers, and single hyphens.",
                "error",
            )
        elif len(values["summary"]) > 1000 or len(values["category"]) > 100:
            flash(
                "Keep the summary under 1,000 characters and the category under 100.",
                "error",
            )
        else:
            slug, path = content_address(kind, values["slug"])
            if not address_available(path):
                flash("That URL is already in use. Choose another URL name.", "error")
            else:
                last = db.session.scalar(
                    db.select(db.func.max(Entry.position)).where(Entry.kind == kind)
                )
                payload = create_payload(
                    kind, values["title"], values["summary"], values["category"]
                )
                entry = Entry(
                    kind=kind,
                    slug=slug,
                    path=path,
                    position=last + 1 if last is not None else 0,
                    draft=payload,
                )
                db.session.add(entry)
                try:
                    db.session.flush()
                    db.session.add(EntryAddress(path=path, entry_id=entry.id))
                    db.session.add(
                        Revision(
                            entry_id=entry.id,
                            payload=deepcopy(payload),
                            action="create",
                        )
                    )
                    db.session.commit()
                except IntegrityError:
                    db.session.rollback()
                    flash("That URL was just taken. Choose another URL name.", "error")
                else:
                    flash(
                        "Draft created. Add your content, then preview it before publishing."
                    )
                    return redirect(url_for("admin.edit_entry", entry_id=entry.id))
        return render_template("admin/new.html", kind=kind, values=values), 422
    return render_template("admin/new.html", kind=kind, values=values)


@admin.route("/entry/<entry_id>", methods=["GET", "POST"])
@login_required
def edit_entry(entry_id):
    entry = db.get_or_404(Entry, entry_id)
    data = deepcopy(entry.draft)
    if request.method == "POST":
        if request.form.get("version") != str(entry.version):
            return render_template("admin/conflict.html"), 409
        try:
            read_form(data, entry.kind, request.form)
            if entry.kind == "project" and request.form.get("figure_action"):
                change_figure(data, request.form["figure_action"])
                flash("Project figures updated. Save your draft to keep these changes.")
                return editor_response(entry, data, unsaved=True)
            if request.form.get("media_action"):
                change_gallery(data, request.form["media_action"])
                flash("Gallery layout updated. Save your draft to keep these changes.")
                return editor_response(entry, data, unsaved=True)
            section_action = request.form.get("section_action")
            if section_action:
                blocks = initial_blocks(data, entry.kind)
                if section_action == "add":
                    if len(blocks) >= 64:
                        raise ContentError("Use at most 64 sections.")
                    blocks.append(new_block(request.form.get("block_kind")))
                else:
                    direction, _, identity = section_action.partition(":")
                    index = next(
                        (
                            i
                            for i, block in enumerate(blocks)
                            if block["id"] == identity
                        ),
                        None,
                    )
                    if index is None or direction not in ("up", "down", "remove"):
                        abort(400)
                    if direction == "remove":
                        blocks.pop(index)
                    else:
                        target = index + (-1 if direction == "up" else 1)
                        if 0 <= target < len(blocks):
                            blocks[index], blocks[target] = (
                                blocks[target],
                                blocks[index],
                            )
                data["blocks"] = blocks
                flash("Section layout updated. Save your draft to keep these changes.")
                return editor_response(entry, data, unsaved=True)
            action = request.form.get("action", "draft")
            if action not in ("draft", "publish", "unpublish"):
                abort(400)
            validate_content(data, entry.kind, publishing=action == "publish")
            prepare_media(data, publishing=action == "publish")
        except (ContentError, MediaError) as exc:
            flash(str(exc), "error")
            return editor_response(entry, data, 422)
        entry.draft = data
        if action == "publish":
            if not same_content(entry.published, data):
                entry.published_modified_at = now()
            entry.published = deepcopy(data)
        elif action == "unpublish":
            entry.published = None
        revision = Revision(entry_id=entry.id, payload=deepcopy(data), action=action)
        db.session.add(revision)
        try:
            db.session.flush()
            sync_references(entry, revision)
            db.session.commit()
        except StaleDataError:
            db.session.rollback()
            return render_template("admin/conflict.html"), 409
        flash(
            {
                "draft": "Draft saved. The public page has not changed.",
                "publish": "Published.",
                "unpublish": "Unpublished.",
            }[action]
        )
        return redirect(url_for("admin.edit_entry", entry_id=entry.id))
    return editor_response(entry, data)


@admin.post("/entry/<entry_id>/preview")
@login_required
def preview_changes(entry_id):
    from .public import render_entry

    entry = db.get_or_404(Entry, entry_id)
    if request.form.get("version") != str(entry.version):
        return render_template("admin/conflict.html"), 409
    data = deepcopy(entry.draft)
    try:
        read_form(data, entry.kind, request.form)
        validate_content(data, entry.kind)
        prepare_media(data)
    except (ContentError, MediaError) as exc:
        flash(str(exc), "error")
        return editor_response(entry, data, 422)
    return render_entry(entry, preview=True, payload=data)


@admin.post("/tools/new")
@login_required
def new_tool():
    from uuid import uuid4

    slug = "tool-" + uuid4().hex[:10]
    position = db.session.scalar(
        db.select(db.func.max(Entry.position)).where(Entry.kind == "tool")
    )
    data = {
        "title": "Untitled tool",
        "summary": "",
        "category": "",
        "seo_title": "",
        "seo_description": "",
        "launch_url": "",
        "license": "MIT",
        "pricing": "Free & Open Source",
    }
    entry = Entry(
        kind="tool",
        slug=slug,
        path=f"/tools/{slug}.html",
        position=position + 1 if position is not None else 0,
        draft=data,
    )
    db.session.add(entry)
    db.session.flush()
    db.session.add(EntryAddress(path=entry.path, entry_id=entry.id))
    db.session.add(Revision(entry_id=entry.id, payload=deepcopy(data), action="create"))
    db.session.commit()
    return redirect(url_for("admin.edit_entry", entry_id=entry.id))


@admin.post("/entry/<entry_id>/move")
@login_required
def move_entry(entry_id):
    entry = db.get_or_404(Entry, entry_id)
    if request.form.get("version") != str(entry.version):
        return render_template("admin/conflict.html"), 409
    direction = request.form.get("direction")
    if direction not in ("up", "down"):
        abort(400)
    entries = list(
        db.session.scalars(
            db.select(Entry)
            .where(Entry.kind == entry.kind)
            .order_by(Entry.position, Entry.id)
        )
    )
    index = next(i for i, value in enumerate(entries) if value.id == entry.id)
    target = index + (-1 if direction == "up" else 1)
    if 0 <= target < len(entries):
        entries[index], entries[target] = entries[target], entries[index]
        for position, value in enumerate(entries):
            value.position = position
        try:
            db.session.commit()
        except StaleDataError:
            db.session.rollback()
            return render_template("admin/conflict.html"), 409
    return redirect(url_for("admin.dashboard"))


@admin.get("/preview/<entry_id>")
@login_required
def preview(entry_id):
    from .public import render_entry

    return render_entry(db.get_or_404(Entry, entry_id), preview=True)


@admin.get("/design")
@login_required
def design_reference():
    return render_template("admin/design.html")


@admin.get("/lab/publishing")
@login_required
def publishing_workbench():
    theme = request.args.get("theme", "auto")
    return render_template(
        "admin/lab/publishing.html",
        example_theme=theme if theme in {"light", "dark"} else "auto",
    )


def identity_data():
    from . import ROOT

    return json.loads((ROOT / "design/identity-concepts.json").read_text())


@admin.get("/lab/identity")
@login_required
def identity_review():
    identity = identity_data()
    if identity["stage"] in {"brief", "sketches", "development", "kit-review"}:
        if request.args.get("concept"):
            abort(404)
        return render_template(
            "admin/lab/identity.html",
            identity=identity,
            sheet=current_app.config["DESIGN_CONTENT"]["details"],
        )
    abort(404)


@admin.get("/lab/identity/<concept>/<variant>")
@login_required
def identity_asset(concept, variant):
    from . import ROOT

    identity = identity_data()
    references = [identity["muse"], *identity["references"]]
    filenames = {f"{item['id']}.png" for item in references}
    if concept == "reference" and variant in filenames:
        return send_from_directory(ROOT / "design/identity-references", variant)
    if identity["stage"] == "kit-review" and concept == "kit":
        directory = ROOT / ".cache/identity/evergreen-kit"
        manifest = json.loads((directory / "manifest.json").read_text())
        allowed = set(manifest["files"]) | {
            "manifest.json",
            "lay-shah-evergreen-kit.zip",
        }
        if variant in allowed and re.fullmatch(r"[a-z0-9-]+\.[a-z0-9]+", variant):
            return send_from_directory(
                directory,
                variant,
                as_attachment=variant.endswith((".zip", ".md", ".json")),
            )
        abort(404)
    if identity["stage"] in {"development", "kit-review"} and concept == "development":
        treatments = {"green", "blue", "black", "reversed"}
        allowed = {
            f"{kind}-{treatment}.svg"
            for kind in ("symbol", "lockup")
            for treatment in treatments
        }
        allowed |= {
            f"icon-{treatment}-{size}.png"
            for treatment in treatments
            for size in (16, 24, 32)
        }
        allowed |= {
            f"applications-{treatment}.{extension}"
            for treatment in ("green", "blue")
            for extension in ("svg", "png")
        }
        if variant in allowed:
            return send_from_directory(ROOT / ".cache/identity/development", variant)
        abort(404)
    if identity["stage"] in {"sketches", "development", "kit-review"}:
        directory = ROOT / ".cache/identity/current-sketches"
        if identity.get("medium") == "raster-study":
            if concept == "sheet" and variant == "comparison.png":
                return send_from_directory(directory, variant)
            abort(404)
        if concept == "sheet" and variant in {"comparison.svg", "comparison.png"}:
            return send_from_directory(directory, variant)
        sketches = {item["id"] for item in identity["concepts"]}
        if concept in sketches and variant in {"sketch.svg", "reversed.svg"}:
            suffix = "-reversed" if variant == "reversed.svg" else ""
            return send_from_directory(directory, f"{concept}{suffix}.svg")
    abort(404)
