"""Construct bounded, same-origin content addresses from owner URL names."""

import re

from ..extensions import db
from ..models import EntryAddress
from .content import ContentError


def content_address(kind, name):
    if len(name) > 100 or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ContentError(
            "Use up to 100 lowercase letters, numbers, and single hyphens."
        )
    slug = ("blog-" if kind == "post" else "") + name
    prefix = {
        "project": "/projects/",
        "post": "/",
        "tool": "/tools/",
        "guide": "/guides/",
    }[kind]
    return slug, f"{prefix}{slug}.html"


def address_available(path, entry_id=None):
    reservation = db.session.get(EntryAddress, path)
    return reservation is None or reservation.entry_id == entry_id
