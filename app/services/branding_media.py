"""Shared brand images use immutable recipes and publication-scoped references."""

from copy import deepcopy

from flask import current_app, url_for

from ..extensions import db
from ..models import MediaAsset, PageMediaReference
from .media import (
    MediaError,
    generate_rendition,
    new_placement,
    read_placement,
    rendition,
    validate_placement,
)

SLOTS = {"logo": "original", "icon": "square", "sharing": "social"}


def media_for(payload):
    stored = payload.get("brand_media", {})
    if not isinstance(stored, dict) or set(stored) - set(SLOTS):
        raise MediaError("Invalid branding image settings.")
    result = {}
    for slot, ratio in SLOTS.items():
        value = stored.get(slot, {})
        if not isinstance(value, dict):
            raise MediaError("Invalid branding image placement.")
        result[slot] = {
            **new_placement(),
            **deepcopy(value),
            "ratio": ratio,
            "mobile_ratio": "same",
            "width": "full",
            "align": "center",
            "caption": "",
            "decorative": slot != "sharing",
        }
        if slot != "sharing":
            result[slot]["alt"] = ""
    return result


def read_brand_media(payload, form):
    if form.get("brand_media_present") != "1":
        return
    payload["brand_media"] = {
        slot: read_placement(form, f"brand.{slot}") for slot in SLOTS
    }
    payload["brand_media"] = media_for(payload)


def brand_rendition(asset, slot, placement):
    return rendition(
        asset,
        SLOTS[slot],
        placement["x"],
        placement["y"],
        widths=current_app.config["DESIGN_CONTENT"]["media"]["brandWidths"][slot],
        format="webp" if slot == "logo" else "png",
    )


def prepare_brand_media(payload, publishing=False):
    values = media_for(payload)
    for slot, placement in values.items():
        validate_placement(placement, publishing)
        if placement["asset_id"]:
            asset = db.session.get(MediaAsset, placement["asset_id"])
            minimum = max(
                current_app.config["DESIGN_CONTENT"]["media"]["brandWidths"]["icon"]
            )
            if slot == "icon" and min(asset.width, asset.height) < minimum:
                raise MediaError(
                    f"Choose a favicon source at least {minimum} pixels on each side."
                )
            generate_rendition(asset, brand_rendition(asset, slot, placement))
    if "brand_media" in payload:
        payload["brand_media"] = values
    return payload


def references_for(payload):
    for slot, placement in media_for(payload).items():
        if placement["asset_id"]:
            asset = db.session.get(MediaAsset, placement["asset_id"])
            if asset:
                yield asset.id, brand_rendition(asset, slot, placement)["recipe"]


def sync_page_references(page, revision=None, *, current=True):
    if current:
        db.session.execute(
            db.delete(PageMediaReference).where(
                PageMediaReference.page_key == page.key,
                PageMediaReference.state.in_(("draft", "published")),
            )
        )
        for state, payload in (("draft", page.draft), ("published", page.published)):
            for asset_id, recipe in set(references_for(payload)):
                db.session.add(
                    PageMediaReference(
                        asset_id=asset_id, page_key=page.key, state=state, recipe=recipe
                    )
                )
    if revision:
        for asset_id, recipe in set(references_for(revision.payload)):
            db.session.add(
                PageMediaReference(
                    asset_id=asset_id,
                    page_key=page.key,
                    revision_id=revision.id,
                    state="revision",
                    recipe=recipe,
                )
            )


def brand_image_info(payload, private=False):
    result = dict.fromkeys(SLOTS)
    for slot, placement in media_for(payload).items():
        if not placement["asset_id"]:
            continue
        asset = db.session.get(MediaAsset, placement["asset_id"])
        if not asset:
            continue
        info = brand_rendition(asset, slot, placement)
        for variant in info["variants"]:
            variant["url"] = url_for(
                "media.private_file" if private else "media.public_file",
                asset_id=asset.id,
                recipe=info["recipe"],
                filename=variant["filename"],
            )
        result[slot] = {
            **info,
            "url": info["variants"][-1]["url"],
            "alt": placement["alt"],
            "type": "image/webp" if slot == "logo" else "image/png",
        }
    return result
