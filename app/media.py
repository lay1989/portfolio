"""Owner media library and publication-gated immutable image derivatives."""

import re
import shutil

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from flask_login import login_required
from sqlalchemy.exc import SQLAlchemyError

from .extensions import db
from .models import MediaAsset, MediaReference, PageMediaReference, now
from .services.media import MediaError, create_asset, rendition, storage_root

media = Blueprint("media", __name__)


def asset_option(asset):
    info = rendition(asset, "original", 50, 50)
    return {
        "id": asset.id,
        "title": asset.title,
        "alt": asset.default_alt,
        "width": asset.width,
        "height": asset.height,
        "url": url_for(
            "media.private_file",
            asset_id=asset.id,
            recipe=info["recipe"],
            filename=info["variants"][0]["filename"],
        ),
    }


@media.after_request
def headers(response):
    if request.path.startswith("/admin/"):
        from .admin import private

        return private(response)
    response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    return response


@media.get("/admin/media")
@login_required
def library():
    query = db.select(MediaAsset)
    archived = request.args.get("archived") == "1"
    query = query.where(
        MediaAsset.archived_at.is_not(None)
        if archived
        else MediaAsset.archived_at.is_(None)
    )
    search = request.args.get("q", "").strip()[:120]
    if search:
        query = query.where(
            MediaAsset.title.contains(search, autoescape=True)
            | MediaAsset.original_name.contains(search, autoescape=True)
        )
    pagination = db.paginate(
        query.order_by(MediaAsset.created_at.desc(), MediaAsset.id),
        per_page=24,
        max_per_page=24,
    )
    return render_template(
        "admin/media.html", pagination=pagination, search=search, archived=archived
    )


@media.post("/admin/media/upload")
@login_required
def upload():
    asset = None
    created = False
    try:
        file = request.files.get("image")
        if not file or not file.filename:
            raise MediaError("Choose an image to upload.")
        title = request.form.get("title", "").strip()
        alt = request.form.get("alt", "").strip()
        if len(title) > 180 or len(alt) > 500:
            raise MediaError(
                "Keep the image title under 180 characters and its default description under 500."
            )
        raw = file.stream.read(current_app.config["MEDIA_MAX_BYTES"] + 1)
        asset, created = create_asset(raw, file.filename, title, alt)
        db.session.commit()
    except MediaError as exc:
        if request.accept_mimetypes.best == "application/json":
            return jsonify(error=str(exc)), 422
        flash(str(exc), "error")
        return redirect(url_for("media.library"))
    except SQLAlchemyError:
        db.session.rollback()
        if created and asset:
            shutil.rmtree(storage_root() / asset.id, ignore_errors=True)
        raise
    if request.accept_mimetypes.best == "application/json":
        return jsonify(
            asset=asset_option(asset), reused=not created
        ), 201 if created else 200
    flash(
        "Image uploaded. It stays private until used in published content."
        if created
        else "That image is already in your library; its existing copy is ready to use."
    )
    return redirect(url_for("media.edit_asset", asset_id=asset.id))


@media.route("/admin/media/<asset_id>", methods=["GET", "POST"])
@login_required
def edit_asset(asset_id):
    asset = db.get_or_404(MediaAsset, asset_id)
    uses = db.union_all(
        db.select(MediaReference.state).where(MediaReference.asset_id == asset.id),
        db.select(PageMediaReference.state).where(
            PageMediaReference.asset_id == asset.id
        ),
    ).subquery()
    references = list(
        db.session.execute(
            db.select(uses.c.state, db.func.count()).group_by(uses.c.state)
        )
    )
    if request.method == "POST":
        action = request.form.get("action", "save")
        if action == "archive":
            if references:
                flash(
                    "This image is used by content or saved revisions. Keep it available so those versions remain intact.",
                    "error",
                )
                return redirect(url_for("media.edit_asset", asset_id=asset.id))
            asset.archived_at = now()
            flash("Image moved to the archive. You can restore it there.")
        elif action == "restore":
            asset.archived_at = None
            flash("Image restored.")
        elif action == "save":
            title = request.form.get("title", "").strip()
            alt = request.form.get("alt", "").strip()
            if not title or len(title) > 180 or len(alt) > 500:
                flash(
                    "Add a title up to 180 characters and a default description up to 500.",
                    "error",
                )
                return render_template(
                    "admin/media-detail.html", asset=asset, references=references
                ), 422
            asset.title, asset.default_alt = title, alt
            flash(
                "Library details saved. Existing image placements keep their own descriptions and crops."
            )
        else:
            abort(400)
        db.session.commit()
        return redirect(url_for("media.edit_asset", asset_id=asset.id))
    return render_template(
        "admin/media-detail.html", asset=asset, references=references
    )


def serve_file(asset_id, recipe, filename):
    if (
        not re.fullmatch(r"[a-f0-9]{32}", asset_id)
        or not re.fullmatch(r"[a-f0-9]{24}", recipe)
        or not re.fullmatch(r"w[0-9]{1,5}\.(webp|png)", filename)
    ):
        abort(404)
    db.get_or_404(MediaAsset, asset_id)
    return send_from_directory(
        storage_root() / asset_id / recipe,
        filename,
        mimetype="image/png" if filename.endswith(".png") else "image/webp",
        conditional=True,
    )


@media.get("/admin/media/file/<asset_id>/<recipe>/<filename>")
@login_required
def private_file(asset_id, recipe, filename):
    return serve_file(asset_id, recipe, filename)


@media.get("/media/<asset_id>/<recipe>/<filename>")
def public_file(asset_id, recipe, filename):
    visible = any(
        db.session.scalar(
            db.select(model.id)
            .where(
                model.asset_id == asset_id,
                model.recipe == recipe,
                model.state == "published",
            )
            .limit(1)
        )
        for model in (MediaReference, PageMediaReference)
    )
    if not visible:
        abort(404)
    return serve_file(asset_id, recipe, filename)
