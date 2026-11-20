"""Private image storage, immutable crops, and publication-scoped references."""

import hashlib
import io
import json
import math
import re
import shutil
import tempfile
import time
import warnings
from copy import deepcopy
from pathlib import Path, PurePosixPath
from uuid import uuid4

import click
from flask import current_app, url_for
from PIL import Image, ImageCms, ImageOps, UnidentifiedImageError
from werkzeug.utils import secure_filename

from .. import ROOT
from ..extensions import db
from ..models import (
    Entry,
    ManagedPage,
    MediaAsset,
    MediaReference,
    PageMediaReference,
    PageRevision,
    Revision,
)


class MediaError(ValueError):
    pass


def storage_root():
    return Path(current_app.config["MEDIA_ROOT"])


def ratios():
    return current_app.config["DESIGN_CONTENT"]["media"]["ratios"]


def new_placement():
    return {
        "id": uuid4().hex,
        "asset_id": "",
        "alt": "",
        "caption": "",
        "decorative": False,
        "ratio": "original",
        "x": 50,
        "y": 50,
        "mobile_ratio": "same",
        "mobile_x": 50,
        "mobile_y": 50,
        "width": "full",
        "align": "center",
    }


def legacy_placement(source, alt="", identity=None):
    placement = new_placement()
    if identity:
        placement["id"] = identity
    source = str(PurePosixPath(str(source).removeprefix("./").lstrip("/")))
    asset = db.session.scalar(
        db.select(MediaAsset).where(MediaAsset.legacy_path == source)
    )
    if asset:
        placement.update(asset_id=asset.id, alt=alt or asset.default_alt)
    return placement


def entry_placements(data, kind):
    cover = data.get("cover_media")
    if cover is None:
        cover = legacy_placement(
            data.get("heroImg" if kind == "project" else "cover", ""),
            data.get("title", ""),
            "cover",
        )
    gallery = data.get("gallery_media")
    if gallery is None:
        gallery = [
            legacy_placement(
                source,
                f"{data.get('title', '')} — screenshot {index + 1}",
                f"gallery-{index}",
            )
            for index, source in enumerate(data.get("screenshots", []))
        ]
    return {
        "cover": deepcopy(cover),
        "thumbnail": deepcopy(data.get("thumbnail_media", new_placement())),
        "social": deepcopy(data.get("social_media", new_placement())),
        "gallery": deepcopy(gallery),
    }


def crop_box(width, height, ratio, x, y):
    target = ratios()[ratio]
    if target is None:
        return (0, 0, width, height)
    aspect = target[0] / target[1]
    crop_width = min(width, max(1, round(height * aspect)))
    crop_height = min(height, max(1, round(width / aspect)))
    left = max(0, min(width - crop_width, round(width * x / 100 - crop_width / 2)))
    top = max(0, min(height - crop_height, round(height * y / 100 - crop_height / 2)))
    return (left, top, left + crop_width, top + crop_height)


def rendition(asset, ratio, x, y, *, widths=None, format="webp"):
    custom_widths = widths is not None
    box = crop_box(asset.width, asset.height, ratio, x, y)
    width, height = box[2] - box[0], box[3] - box[1]
    widths = sorted(
        {
            min(width, size)
            for size in (widths or current_app.config["MEDIA_VARIANT_WIDTHS"])
        }
    )
    spec = {
        "v": 1,
        "box": box,
        "widths": widths,
        "quality": current_app.config["MEDIA_QUALITY"],
    }
    if custom_widths or format != "webp":
        spec["format"] = format
    recipe = hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:24]
    variants = [
        {
            "filename": f"w{w}.{format}",
            "width": w,
            "height": max(1, round(w * height / width)),
        }
        for w in widths
    ]
    return {
        "recipe": recipe,
        "format": format,
        "variants": variants,
        "width": variants[-1]["width"],
        "height": variants[-1]["height"],
        "box": box,
    }


def placement_renditions(asset, placement):
    desktop = rendition(asset, placement["ratio"], placement["x"], placement["y"])
    mobile_ratio = (
        placement["ratio"]
        if placement["mobile_ratio"] == "same"
        else placement["mobile_ratio"]
    )
    mobile = rendition(
        asset, mobile_ratio, placement["mobile_x"], placement["mobile_y"]
    )
    return desktop, mobile


def generate_rendition(asset, info):
    destination = storage_root() / asset.id / info["recipe"]
    if all(
        (destination / variant["filename"]).is_file() for variant in info["variants"]
    ):
        destination.touch()  # Keep crops used by an active unsaved preview out of cleanup.
        return
    destination.mkdir(parents=True, exist_ok=True)
    with Image.open(storage_root() / asset.id / "master.webp") as master:
        cropped = master.crop(info["box"])
        for variant in info["variants"]:
            target = destination / variant["filename"]
            if target.exists():
                continue
            output = cropped.resize(
                (variant["width"], variant["height"]), Image.Resampling.LANCZOS
            )
            with tempfile.NamedTemporaryFile(
                dir=destination, suffix=".tmp", delete=False
            ) as stream:
                temporary = Path(stream.name)
            try:
                output.info.clear()
                if info.get("format") == "png":
                    output.save(temporary, format="PNG", compress_level=6)
                else:
                    output.save(
                        temporary,
                        format="WEBP",
                        quality=current_app.config["MEDIA_QUALITY"],
                        method=4,
                        exif=b"",
                        icc_profile=b"",
                    )
                temporary.replace(target)
            finally:
                temporary.unlink(missing_ok=True)
                output.close()
        cropped.close()


def create_asset(raw, filename, title="", alt="", legacy_path=None):
    if len(raw) > current_app.config["MEDIA_MAX_BYTES"]:
        raise MediaError(
            f"Choose an image smaller than {current_app.config['MEDIA_MAX_BYTES'] / 1024 / 1024:g} MB."
        )
    extension = Path(filename).suffix.lower()
    allowed = {".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".webp": "WEBP"}
    if extension not in allowed:
        raise MediaError("Use a static JPEG, PNG, or WebP image.")
    digest = hashlib.sha256(raw).hexdigest()
    if legacy_path is None:
        duplicate = db.session.scalar(
            db.select(MediaAsset).where(
                MediaAsset.digest == digest, MediaAsset.archived_at.is_(None)
            )
        )
        if duplicate:
            return duplicate, False
    root = storage_root()
    root.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".upload-", dir=root))
    asset_id = uuid4().hex
    destination = root / asset_id
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as probe:
                if (
                    probe.format not in allowed.values()
                    or (legacy_path is None and probe.format != allowed[extension])
                    or getattr(probe, "n_frames", 1) != 1
                ):
                    raise MediaError(
                        "Use a static JPEG, PNG, or WebP file matching its filename."
                    )
                if (
                    probe.width * probe.height > current_app.config["MEDIA_MAX_PIXELS"]
                    or max(probe.size) > current_app.config["MEDIA_MAX_INPUT_EDGE"]
                ):
                    raise MediaError(
                        "Use an image under 20 megapixels and 16,000 pixels per side."
                    )
                probe.verify()
            with Image.open(io.BytesIO(raw)) as source:
                source.load()
                image = ImageOps.exif_transpose(source)
                if "transparency" in image.info and "A" not in image.getbands():
                    image = image.convert("RGBA")
                if image.info.get("icc_profile"):
                    try:
                        profile = ImageCms.ImageCmsProfile(
                            io.BytesIO(image.info["icc_profile"])
                        )
                        image = ImageCms.profileToProfile(
                            image,
                            profile,
                            ImageCms.createProfile("sRGB"),
                            outputMode="RGBA" if "A" in image.getbands() else "RGB",
                        )
                    except (ImageCms.PyCMSError, OSError, ValueError) as exc:
                        raise MediaError(
                            "The image's color profile could not be read. Export it as sRGB and try again."
                        ) from exc
                image = image.convert(
                    "RGBA"
                    if "A" in image.getbands() or "transparency" in image.info
                    else "RGB"
                )
                image.thumbnail(
                    (current_app.config["MEDIA_MAX_EDGE"],) * 2,
                    Image.Resampling.LANCZOS,
                )
                image.info.clear()
                image.save(
                    stage / "master.webp",
                    "WEBP",
                    quality=current_app.config["MEDIA_MASTER_QUALITY"],
                    method=4,
                    exif=b"",
                    icc_profile=b"",
                )
                width, height = image.size
                image.close()
        asset = MediaAsset(
            id=asset_id,
            title=(title.strip() or Path(filename).stem)[:180],
            original_name=(secure_filename(filename) or "image")[:180],
            default_alt=alt.strip()[:500],
            digest=digest,
            legacy_path=legacy_path,
            width=width,
            height=height,
            byte_size=(stage / "master.webp").stat().st_size,
        )
        stage.rename(destination)
        db.session.add(asset)
        db.session.flush()
        generate_rendition(asset, rendition(asset, "original", 50, 50))
        return asset, True
    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        db.session.rollback()
        shutil.rmtree(destination, ignore_errors=True)
        if isinstance(exc, MediaError):
            raise
        raise MediaError(
            "This image could not be decoded safely. Export a fresh JPEG, PNG, or WebP file."
        ) from exc
    finally:
        shutil.rmtree(stage, ignore_errors=True)


def read_placement(form, prefix, identity=None):
    placement = new_placement()
    placement["id"] = identity or placement["id"]
    for key in (
        "asset_id",
        "alt",
        "caption",
        "ratio",
        "mobile_ratio",
        "width",
        "align",
    ):
        if prefix + "." + key in form:
            placement[key] = form[prefix + "." + key].strip()
    placement["decorative"] = form.get(prefix + ".decorative") == "1"
    for key in ("x", "y", "mobile_x", "mobile_y"):
        try:
            value = float(form.get(prefix + "." + key, "50"))
            if not math.isfinite(value) or not 0 <= value <= 100:
                raise ValueError
            placement[key] = round(value, 2)
        except ValueError as exc:
            raise MediaError("Image positions must be between 0 and 100.") from exc
    validate_placement(placement)
    return placement


def read_gallery(form, prefix):
    ids = form.getlist(prefix + ".image_id")
    if len(ids) > 24 or len(set(ids)) != len(ids):
        raise MediaError(
            "Use up to 24 images in a gallery, each with a unique identity."
        )
    if any(not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", identity) for identity in ids):
        raise MediaError("A gallery image identity is invalid.")
    return [read_placement(form, prefix + "." + identity, identity) for identity in ids]


def validate_placement(placement, publishing=False):
    if placement["ratio"] not in ratios() or placement["mobile_ratio"] not in (
        *ratios(),
        "same",
    ):
        raise MediaError("Choose one of the shared image crop formats.")
    if placement["width"] not in ("reading", "full") or placement["align"] not in (
        "left",
        "center",
        "right",
    ):
        raise MediaError("Choose a supported image width and alignment.")
    if len(placement["alt"]) > 500 or len(placement["caption"]) > 1000:
        raise MediaError(
            "Keep image descriptions under 500 characters and captions under 1,000."
        )
    identity = placement["asset_id"]
    if not identity:
        return
    if not re.fullmatch(r"[a-f0-9]{32}", identity):
        raise MediaError("Choose an image from the library.")
    asset = db.session.get(MediaAsset, identity)
    if not asset or asset.archived_at:
        raise MediaError(
            "An image is missing or archived. Choose an image from the library."
        )
    if publishing and not placement["decorative"] and not placement["alt"].strip():
        raise MediaError(
            "Describe every image for screen readers, or mark it as decorative."
        )


def iter_placements(payload):
    if not payload:
        return
    for key in ("cover_media", "thumbnail_media", "social_media"):
        if payload.get(key):
            yield payload[key]
    yield from payload.get("gallery_media", [])
    for block in payload.get("blocks", []):
        if block["type"] == "image":
            yield block["media"]
        elif block["type"] == "gallery":
            yield from block["images"]


def prepare_media(payload, publishing=False):
    placements = list(iter_placements(payload))
    if len(placements) > 96:
        raise MediaError("Use at most 96 image placements per entry.")
    for placement in placements:
        validate_placement(placement, publishing)
        if placement["asset_id"]:
            asset = db.session.get(MediaAsset, placement["asset_id"])
            for info in placement_renditions(asset, placement):
                generate_rendition(asset, info)
    if publishing:
        for block in payload.get("blocks", []):
            if block["type"] == "image" and not block["media"]["asset_id"]:
                raise MediaError("Choose an image or remove the empty image section.")
            if block["type"] == "gallery" and (
                not block["images"] or any(not p["asset_id"] for p in block["images"])
            ):
                raise MediaError(
                    "Choose an image for each gallery item, or remove empty items."
                )


def payload_references(payload):
    refs = set()
    for placement in iter_placements(payload):
        if placement["asset_id"]:
            asset = db.session.get(MediaAsset, placement["asset_id"])
            if asset:
                refs.update(
                    (asset.id, info["recipe"])
                    for info in placement_renditions(asset, placement)
                )
    # Legacy snapshots retain their original image URLs until explicitly edited.
    legacy_sources = []
    if "cover_media" not in payload:
        legacy_sources.extend([payload.get("heroImg", ""), payload.get("cover", "")])
    if "gallery_media" not in payload:
        legacy_sources.extend(payload.get("screenshots", []))
    for source in legacy_sources:
        if source:
            placement = legacy_placement(source)
            if placement["asset_id"]:
                asset = db.session.get(MediaAsset, placement["asset_id"])
                refs.add((asset.id, rendition(asset, "original", 50, 50)["recipe"]))
    return refs


def sync_references(entry, revision=None):
    db.session.execute(
        db.delete(MediaReference).where(
            MediaReference.entry_id == entry.id,
            MediaReference.state.in_(("draft", "published")),
        )
    )
    for state, payload in (("draft", entry.draft), ("published", entry.published)):
        if payload:
            for asset_id, recipe in payload_references(payload):
                db.session.add(
                    MediaReference(
                        asset_id=asset_id, entry_id=entry.id, state=state, recipe=recipe
                    )
                )
    if revision:
        for asset_id, recipe in payload_references(revision.payload):
            db.session.add(
                MediaReference(
                    asset_id=asset_id,
                    entry_id=entry.id,
                    revision_id=revision.id,
                    state="revision",
                    recipe=recipe,
                )
            )


def placement_info(placement, private=False):
    if not placement or not placement.get("asset_id"):
        return None
    asset = db.session.get(MediaAsset, placement["asset_id"])
    if not asset:
        return None
    desktop, mobile = placement_renditions(asset, placement)
    endpoint = "media.private_file" if private else "media.public_file"
    for info in (desktop, mobile):
        for variant in info["variants"]:
            variant["url"] = url_for(
                endpoint,
                asset_id=asset.id,
                recipe=info["recipe"],
                filename=variant["filename"],
            )
        info["url"] = info["variants"][-1]["url"]
    return {
        "desktop": desktop,
        "mobile": mobile,
        "alt": "" if placement["decorative"] else placement["alt"],
        "caption": placement["caption"],
        "width": placement["width"],
        "align": placement["align"],
        "breakpoint": current_app.config["DESIGN_CONTENT"]["breakpoints"]["md"],
    }


def register_media_commands(app):
    @app.cli.command("import-media")
    def import_media():
        count = 0
        sources = {}
        for entry in db.session.scalars(db.select(Entry)):
            for payload in (entry.draft, entry.published):
                if payload:
                    for source in [
                        payload.get("heroImg", ""),
                        payload.get("cover", ""),
                        *payload.get("screenshots", []),
                    ]:
                        if source:
                            sources[source] = payload.get("title", "")
        for source, title in sources.items():
            normalized = str(PurePosixPath(source.removeprefix("./").lstrip("/")))
            if (
                normalized not in current_app.config["IMAGE_MANIFEST"]
                or ".." in PurePosixPath(normalized).parts
            ):
                raise click.ClickException(
                    "An existing image is outside the known asset manifest."
                )
            if db.session.scalar(
                db.select(MediaAsset.id).where(MediaAsset.legacy_path == normalized)
            ):
                continue
            try:
                create_asset(
                    (ROOT / normalized).read_bytes(),
                    Path(normalized).name,
                    title=Path(normalized).stem,
                    alt=title,
                    legacy_path=normalized,
                )
                db.session.commit()
            except MediaError as exc:
                raise click.ClickException(
                    f"Could not import {normalized}: {exc}"
                ) from exc
            count += 1
        # Derivatives are prepared during import/release, never on public requests.
        for asset in db.session.scalars(db.select(MediaAsset)):
            generate_rendition(asset, rendition(asset, "original", 50, 50))
        for entry in db.session.scalars(db.select(Entry)):
            for payload in (entry.draft, entry.published):
                if payload:
                    prepare_media(payload)
        for revision in db.session.scalars(db.select(Revision)):
            prepare_media(revision.payload)
        # Rebuild reference projections without changing a single content snapshot.
        db.session.execute(db.delete(MediaReference))
        for entry in db.session.scalars(db.select(Entry)):
            sync_references(entry)
        for revision in db.session.scalars(db.select(Revision)):
            for asset_id, recipe in payload_references(revision.payload):
                db.session.add(
                    MediaReference(
                        asset_id=asset_id,
                        entry_id=revision.entry_id,
                        revision_id=revision.id,
                        state="revision",
                        recipe=recipe,
                    )
                )
        from .branding_media import prepare_brand_media, sync_page_references

        db.session.execute(db.delete(PageMediaReference))
        for page in db.session.scalars(db.select(ManagedPage)):
            if page.key == "branding":
                for payload in (page.draft, page.published):
                    prepare_brand_media(payload)
                sync_page_references(page)
        for revision in db.session.scalars(
            db.select(PageRevision).where(PageRevision.page_key == "branding")
        ):
            prepare_brand_media(revision.payload)
            sync_page_references(
                db.session.get(ManagedPage, revision.page_key), revision, current=False
            )
        db.session.commit()
        click.echo(
            f"Imported {count} missing images. Existing content and publication preserved."
        )

    @app.cli.command("media-prune-cache")
    @click.option(
        "--apply",
        is_flag=True,
        help="Remove only old, unreferenced generated crops and orphan folders.",
    )
    def prune_cache(apply):
        candidates = cache_candidates()
        for path in candidates:
            click.echo(str(path.relative_to(storage_root())))
            if apply:
                shutil.rmtree(path)
        click.echo(
            f"{'Removed' if apply else 'Dry run:'} {len(candidates)} old unused folders. Masters and referenced versions are retained."
        )


def cache_candidates():
    root = storage_root()
    if not root.exists():
        return []
    protected = set(
        db.session.execute(db.select(MediaReference.asset_id, MediaReference.recipe))
    )
    protected.update(
        db.session.execute(
            db.select(PageMediaReference.asset_id, PageMediaReference.recipe)
        )
    )
    assets = {asset.id: asset for asset in db.session.scalars(db.select(MediaAsset))}
    for asset in assets.values():
        protected.add((asset.id, rendition(asset, "original", 50, 50)["recipe"]))
    cutoff = time.time() - 24 * 60 * 60
    candidates = []
    for folder in root.iterdir():
        if not folder.is_dir() or folder.is_symlink():
            continue
        if folder.name not in assets:
            if (
                re.fullmatch(r"[a-f0-9]{32}", folder.name)
                or folder.name.startswith(".upload-")
            ) and folder.stat().st_mtime < cutoff:
                candidates.append(folder)
            continue
        for crop in folder.iterdir():
            if (
                crop.is_dir()
                and not crop.is_symlink()
                and re.fullmatch(r"[a-f0-9]{24}", crop.name)
                and (folder.name, crop.name) not in protected
                and crop.stat().st_mtime < cutoff
            ):
                candidates.append(crop)
    return candidates


def change_gallery(payload, command):
    direction, _, rest = command.partition(":")
    prefix, _, identity = rest.partition(":")
    if prefix == "gallery":
        images = payload.setdefault("gallery_media", [])
    else:
        match = re.fullmatch(r"block\.([A-Za-z0-9_-]{1,64})\.gallery", prefix)
        block = next(
            (
                b
                for b in payload.get("blocks", [])
                if match and b["id"] == match[1] and b["type"] == "gallery"
            ),
            None,
        )
        if not block:
            raise MediaError("The gallery could not be found. Reload the editor.")
        images = block["images"]
    if direction == "add":
        if len(images) >= 24:
            raise MediaError("Use up to 24 images per gallery.")
        images.append(new_placement())
        return
    index = next((i for i, p in enumerate(images) if p["id"] == identity), None)
    if index is None or direction not in ("up", "down", "remove"):
        raise MediaError("The gallery action could not be applied.")
    if direction == "remove":
        images.pop(index)
    else:
        target = index + (-1 if direction == "up" else 1)
        if 0 <= target < len(images):
            images[index], images[target] = images[target], images[index]
