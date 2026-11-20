"""Bounded copy fields; layout, design values and code remain authored sources."""

import re
from copy import deepcopy

import nh3
from flask import current_app, g

from ..extensions import db
from ..models import ManagedPage, PageRevision
from .content import ContentError, safe_web_url
from .home_sections import repeat_field, sections_for, validate_sections
from .seo import VISIBILITY_FIELD


def clean_inline(value):
    return nh3.clean(
        value, tags={"strong", "em", "br"}, attributes={}, strip_comments=True
    )


def fields_for(key):
    if key == "homepage":
        return [*current_app.config["HOMEPAGE_FIELDS"], VISIBILITY_FIELD]
    if key in current_app.config["COLLECTION_FIELDS"]:
        return [*current_app.config["COLLECTION_FIELDS"][key], VISIBILITY_FIELD]
    if key == "branding":
        from .branding import fields

        return fields()
    if key == "contact":
        site = current_app.config["SITE_CONTENT"]
        return [
            {
                "key": name,
                "label": label,
                "group": "Shared contact details",
                "type": kind,
                "limit": limit,
                "default": str(site[name]),
                "multiline": name == "replyNote",
            }
            for name, label, kind, limit in (
                ("email", "Contact email", "email", 254),
                ("bookingUrl", "Booking link", "url", 1000),
                ("callMinutes", "Call length in minutes", "number", 3),
                ("availability", "Availability message", "text", 240),
                ("replyNote", "Reply time and contact note", "text", 500),
            )
        ]
    raise ContentError("Unknown page.")


def defaults(key):
    return {
        field["key"]: clean_inline(field["default"])
        if field["type"] == "inline"
        else field["default"]
        for field in fields_for(key)
    }


def seed_pages():
    for key in ("homepage", "contact", "branding", "projects", "blog", "tools"):
        if db.session.get(ManagedPage, key) is None:
            payload = defaults(key)
            db.session.add(
                ManagedPage(key=key, draft=payload, published=deepcopy(payload))
            )
            db.session.flush()
            db.session.add(
                PageRevision(page_key=key, payload=deepcopy(payload), action="import")
            )


def published_page(key):
    # Per-request cache only; publishing is visible on the next request.
    cache = g.setdefault("published_pages", {})
    if key not in cache:
        page = db.session.get(ManagedPage, key)
        cache[key] = {**defaults(key), **(page.published if page else {})}
    return cache[key]


def site_values(override=None):
    site = {
        **current_app.config["SITE_CONTENT"],
        **(override if override is not None else published_page("contact")),
    }
    site["callMinutes"] = int(site["callMinutes"])
    return site


def validate_page(key, payload, publishing=False):
    result = defaults(key)
    sections = sections_for(payload, result) if key == "homepage" else {}
    hidden_groups = {
        label
        for label, kind in (
            ("Services", "services"),
            ("How I work", "process"),
            ("Reviews", "reviews"),
        )
        if key == "homepage" and not sections[kind]
    }
    for field in fields_for(key):
        name = field["key"]
        value = str(payload.get(name, result[name])).strip()
        if len(value) > field["limit"]:
            raise ContentError(
                f"{field['label']}: use at most {field['limit']} characters."
            )
        if field["type"] == "inline":
            value = clean_inline(value)
        if (
            key == "contact"
            or publishing
            and not repeat_field(name)
            and not (key == "branding" and field["group"] == "Navigation")
            and field["group"] not in hidden_groups
        ) and not re.sub(r"<[^>]*>", "", value).strip():
            raise ContentError(f"{field['label']}: add text before publishing.")
        if field["type"] == "visibility" and value not in ("index", "noindex"):
            raise ContentError("Choose whether search engines should index this page.")
        if field["type"] == "email" and not re.fullmatch(
            r"[^\s@]+@[^\s@]+\.[^\s@]+", value
        ):
            raise ContentError("Add a valid contact email.")
        if field["type"] == "url" and not safe_web_url(value):
            raise ContentError(
                "Add a complete HTTP(S) booking link without login details."
            )
        if field["type"] == "number" and (
            not value.isascii() or not value.isdigit() or not 1 <= int(value) <= 180
        ):
            raise ContentError("Choose a call length between 1 and 180 minutes.")
        result[name] = value
    if key == "branding":
        from .branding import validate_navigation

        validate_navigation(result)
        if "brand_media" in payload:
            result["brand_media"] = deepcopy(payload["brand_media"])
        from .branding_media import prepare_brand_media

        prepare_brand_media(result, publishing)
    if key == "homepage":
        if payload.get("sections_version", 1) != 1:
            raise ContentError("This homepage section format is not supported.")
        sections = validate_sections(sections, publishing, clean_inline)
        if any(name in payload for name in ("services", "process", "reviews")):
            result = {
                name: value for name, value in result.items() if not repeat_field(name)
            }
            result.update(sections, sections_version=1)
    return result
