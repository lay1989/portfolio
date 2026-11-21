"""Draft/publish/recovery workflow for layout-bound homepage and shared settings."""

from copy import deepcopy

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import login_required
from sqlalchemy.orm.exc import StaleDataError

from .admin import private
from .extensions import db
from .models import ManagedPage, MediaAsset, PageRevision
from .public import render_collection, render_home
from .services.branding import navigation_spec
from .services.branding_media import media_for, read_brand_media, sync_page_references
from .services.content import ContentError
from .services.home_sections import (
    MAX_ITEMS,
    SECTION_TYPES,
    blank_section,
    change_section,
    read_sections,
    repeat_field,
    sections_for,
)
from .services.media import MediaError
from .services.pages import defaults, fields_for, validate_page

page_admin = Blueprint("page_admin", __name__, url_prefix="/admin/pages")
page_admin.after_request(private)
LABELS = {
    "homepage": "Homepage content",
    "contact": "Shared contact details",
    "branding": "Branding and navigation",
    "projects": "Projects page",
    "blog": "Blog page",
    "tools": "Tools page",
    "guides": "Guides page",
}


def get_page(key):
    if key not in LABELS:
        abort(404)
    return db.get_or_404(ManagedPage, key)


def conflict():
    return render_template("admin/conflict.html"), 409


def preview(key, payload, notice):
    if key in ("projects", "blog", "tools", "guides"):
        kind = {"projects": "project", "blog": "post", "tools": "tool", "guides": "guide"}[
            key
        ]
        return render_collection(
            kind,
            f"public/{key}.html" if key in ("tools", "guides") else key + ".html",
            payload=payload,
            notice=notice,
        )
    return render_home(
        payload if key == "homepage" else None,
        contact_override=payload if key == "contact" else None,
        branding_override=payload if key == "branding" else None,
        notice=notice,
    )


def editor_response(page, data, status=200, *, unsaved=False, open_kind=None):
    groups = {}
    for field in fields_for(page.key):
        if page.key == "homepage" and repeat_field(field["key"]):
            continue
        if page.key == "branding" and field["group"] == "Navigation":
            continue
        groups.setdefault(field["group"], []).append(field)
    return render_template(
        "admin/page-edit.html",
        managed_page=page,
        data=data,
        field_groups=groups,
        navigation_spec=navigation_spec(),
        brand_media=media_for(data) if page.key == "branding" else {},
        media_assets=list(
            db.session.scalars(
                db.select(MediaAsset)
                .where(MediaAsset.archived_at.is_(None))
                .order_by(MediaAsset.title, MediaAsset.id)
            )
        )
        if page.key == "branding"
        else [],
        media_ratios=current_app.config["DESIGN_CONTENT"]["media"],
        label=LABELS[page.key],
        unsaved=unsaved or status == 422,
        home_rows=sections_for(data, defaults("homepage"))
        if page.key == "homepage"
        else {},
        section_types=SECTION_TYPES,
        max_home_items=MAX_ITEMS,
        blank_home_row=lambda kind: {**blank_section(kind), "id": "__id__"},
        open_kind=open_kind,
    ), status


@page_admin.route("/<key>", methods=["GET", "POST"])
@login_required
def edit(key):
    page = get_page(key)
    fields = fields_for(key)
    data = deepcopy(page.draft)
    data = {
        name: value.replace("{{CALL_MINUTES}}", "{callMinutes}")
        if isinstance(value, str)
        else value
        for name, value in data.items()
    }
    status = 200
    if request.method == "POST":
        if request.form.get("version") != str(page.version):
            return conflict()
        data.update(
            {
                field["key"]: request.form[field["key"]]
                for field in fields
                if field["key"] in request.form
            }
        )
        action = request.form.get("action", "draft")
        if action not in ("draft", "publish", "preview"):
            abort(400)
        try:
            if key == "branding":
                read_brand_media(data, request.form)
            if key == "homepage":
                read_sections(data, request.form, defaults("homepage"))
                if request.form.get("row_action"):
                    kind = change_section(
                        data, request.form["row_action"], defaults("homepage")
                    )
                    flash(
                        "Section layout updated. Save your draft to keep these changes."
                    )
                    return editor_response(page, data, unsaved=True, open_kind=kind)
            validated = validate_page(key, data, publishing=action == "publish")
        except (ContentError, MediaError) as exc:
            flash(str(exc), "error")
            status = 422
        else:
            if action == "preview":
                return preview(
                    key,
                    validated,
                    "Preview of unsaved changes. This has not saved or published anything.",
                )
            page.draft = validated
            if action == "publish":
                page.published = deepcopy(validated)
            page.version += 1
            revision = PageRevision(
                page_key=key, payload=deepcopy(validated), action=action
            )
            db.session.add(revision)
            try:
                db.session.flush()
                if key == "branding":
                    sync_page_references(page, revision)
                db.session.commit()
            except StaleDataError:
                db.session.rollback()
                return conflict()
            flash(
                "Published."
                if action == "publish"
                else "Draft saved. The public website has not changed."
            )
            return redirect(url_for("page_admin.edit", key=key))
    return editor_response(page, data, status)


@page_admin.get("/<key>/history")
@login_required
def history(key):
    page = get_page(key)
    revisions = db.paginate(
        db.select(PageRevision)
        .where(PageRevision.page_key == key)
        .order_by(PageRevision.id.desc()),
        per_page=20,
        max_per_page=20,
    )
    return render_template(
        "admin/page-history.html",
        managed_page=page,
        label=LABELS[key],
        revisions=revisions,
    )


@page_admin.get("/<key>/history/<int:revision_id>")
@login_required
def historical_preview(key, revision_id):
    get_page(key)
    revision = db.first_or_404(
        db.select(PageRevision).where(
            PageRevision.page_key == key, PageRevision.id == revision_id
        )
    )
    return preview(
        key,
        revision.payload,
        f"Private historical preview of {LABELS[key].lower()}, revision #{revision.id}. The public website is unchanged.",
    )


@page_admin.post("/<key>/history/<int:revision_id>/restore")
@login_required
def restore(key, revision_id):
    page = get_page(key)
    if request.form.get("version") != str(page.version):
        return conflict()
    revision = db.first_or_404(
        db.select(PageRevision).where(
            PageRevision.page_key == key, PageRevision.id == revision_id
        )
    )
    try:
        data = validate_page(key, revision.payload)
    except (ContentError, MediaError) as exc:
        flash(f"This revision could not be restored: {exc}", "error")
        return redirect(url_for("page_admin.history", key=key))
    checkpoint = PageRevision(
        page_key=key, payload=deepcopy(page.draft), action="checkpoint"
    )
    revision = PageRevision(page_key=key, payload=deepcopy(data), action="restore")
    db.session.add_all([checkpoint, revision])
    page.draft = data
    page.version += 1
    try:
        db.session.flush()
        if key == "branding":
            sync_page_references(page, checkpoint, current=False)
            sync_page_references(page, revision)
        db.session.commit()
    except StaleDataError:
        db.session.rollback()
        return conflict()
    flash(
        "Restored to draft. Your previous draft is in history. Preview, then publish when ready."
    )
    return redirect(url_for("page_admin.edit", key=key))
