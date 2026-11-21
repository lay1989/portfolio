"""Versioned, framework-free content sections shared by editing and publishing."""

import math
import re
from copy import deepcopy
from datetime import date
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit
from uuid import uuid4

import nh3

from .media import new_placement, read_gallery, read_placement

BLOCK_TYPES = {
    "rich_text": "Formatted text",
    "heading": "Heading",
    "list": "List",
    "quote": "Quote",
    "code": "Code",
    "link": "Link",
    "divider": "Divider",
    "image": "Image",
    "gallery": "Gallery",
}
BLOCK_FIELDS = {
    "rich_text": ("html",),
    "heading": ("text", "level"),
    "list": ("items", "style"),
    "quote": ("text", "attribution"),
    "code": ("text", "language"),
    "link": ("text", "url"),
    "divider": (),
    "image": (),
    "gallery": ("layout",),
}


# One record of what an entry holds: the editor's field lengths and the
# server's checks read the same label and limit.
ENTRY_FIELDS = {
    "title": ("Title", 180),
    "summary": ("Summary", 1000),
    "category": ("Category", 100),
    "seo_title": ("Search title", 200),
    "seo_description": ("Search description", 500),
    "launch_url": ("Tool website", 2048),
    "github_url": ("Source repository", 2048),
    "docs_url": ("Documentation", 2048),
    "license": ("License", 60),
    "pricing": ("Pricing", 60),
    "role": ("Your role", 180),
    "timeline": ("Timeline", 100),
    "clientType": ("Client or project type", 180),
    "tools": ("Technologies", 500),
    "year": ("Year", 4),
    "liveUrl": ("Live website", 2048),
    "githubUrl": ("Source repository", 2048),
    "date": ("Article date", 10),
    "format": ("Format", 60),
    "audience": ("Who it's for", 120),
    "checked": ("Last checked", 60),
    "source_note": ("Where it comes from", 300),
}


class ContentError(ValueError):
    """A correctable error shown without discarding the submitted form."""


def clean_rich_text(value):
    return nh3.clean(
        value,
        tags={
            "p",
            "div",
            "h2",
            "h3",
            "h4",
            "ul",
            "ol",
            "li",
            "blockquote",
            "pre",
            "code",
            "strong",
            "em",
            "b",
            "i",
            "br",
            "hr",
            "a",
            "figure",
            "figcaption",
        },
        attributes={"a": {"href", "title"}},
        url_schemes={"https", "http", "mailto"},
        strip_comments=True,
    )


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def plain_text(html):
    parser = TextExtractor()
    parser.feed(html)
    return " ".join(parser.parts)


def safe_web_url(value):
    try:
        parsed = urlsplit(value)
        return bool(
            parsed.scheme in ("http", "https")
            and parsed.hostname
            and not parsed.username
            and not parsed.password
            and not re.search(r"[\s\\\x00-\x1f\x7f]", value)
            and parsed.port != 0
        )
    except ValueError:
        return False


def new_block(kind):
    if kind not in BLOCK_TYPES:
        raise ContentError("Choose a supported section type.")
    block = {"id": uuid4().hex, "type": kind}
    block.update(dict.fromkeys(BLOCK_FIELDS[kind], ""))
    if kind == "heading":
        block["level"] = "h2"
    elif kind == "list":
        block["style"] = "unordered"
        block["items"] = []
    elif kind == "image":
        block["media"] = new_placement()
    elif kind == "gallery":
        block.update(images=[], layout="stack")
    return block


def initial_blocks(data, kind):
    """Adapt legacy content for editing; no database writes or silent replacement."""
    if "blocks" in data:
        blocks = deepcopy(data["blocks"])
        for block in blocks:
            if block["type"] == "rich_text":
                block["html"] = clean_rich_text(block["html"])
        return blocks
    if kind == "post":
        return [
            {
                "id": "legacy-body",
                "type": "rich_text",
                "html": clean_rich_text(data.get("body", "")),
            }
        ]
    blocks = []
    if kind == "project":
        for key, label in [
            ("overview", "Overview"),
            ("challenge", "The challenge"),
            ("solution", "What I built"),
            ("results", "Results"),
            ("lessonsLearned", "What I learned"),
        ]:
            if data.get(key):
                blocks.extend(
                    [
                        {
                            "id": key + "-heading",
                            "type": "heading",
                            "text": label,
                            "level": "h2",
                        },
                        {
                            "id": key,
                            "type": "rich_text",
                            "html": "<p>" + escape(data[key]) + "</p>",
                        },
                    ]
                )
        for key, label, style in [
            ("process", "The process", "ordered"),
            ("keyFeatures", "What shipped", "unordered"),
        ]:
            if data.get(key):
                blocks.extend(
                    [
                        {
                            "id": key + "-heading",
                            "type": "heading",
                            "text": label,
                            "level": "h2",
                        },
                        {
                            "id": key,
                            "type": "list",
                            "items": deepcopy(data[key]),
                            "style": style,
                        },
                    ]
                )
    return blocks


def read_form(data, kind, form):
    """Read explicit fields only. The caller retains this payload on validation errors."""
    for key, (label, limit) in ENTRY_FIELDS.items():
        if key in form:
            data[key] = form[key].strip()
            if len(data[key]) > limit:
                raise ContentError(f"{label}: use at most {limit} characters.")
    if "search_visibility" in form:
        data["search_visibility"] = form["search_visibility"]
    if "tags" in form:
        data["tags"] = list(
            dict.fromkeys(t.strip() for t in form["tags"].split(",") if t.strip())
        )
        if len(data["tags"]) > 12 or any(len(tag) > 60 for tag in data["tags"]):
            raise ContentError("Use up to 12 tags, with at most 60 characters each.")
    if form.get("blocks_present") == "1":
        identifiers = form.getlist("block_id")
        if len(identifiers) > 64 or len(set(identifiers)) != len(identifiers):
            raise ContentError("Use at most 64 sections, each with a unique identity.")
        blocks = []
        for identity in identifiers:
            if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", identity):
                raise ContentError("A section identity is invalid. Reload the editor.")
            prefix = f"block.{identity}."
            block_type = form.get(prefix + "type")
            if block_type not in BLOCK_TYPES:
                raise ContentError("A section type is not supported.")
            block = {"id": identity, "type": block_type}
            for field in BLOCK_FIELDS[block_type]:
                value = form.get(prefix + field, "")
                if block_type != "code" or field != "text":
                    value = value.strip()
                if len(value) > 50000:
                    raise ContentError(
                        "A section exceeds 50,000 characters. Split it into smaller sections."
                    )
                block[field] = value
            if block_type == "rich_text":
                block["html"] = clean_rich_text(block["html"])
            elif block_type == "list":
                block["items"] = [
                    line.strip() for line in block["items"].splitlines() if line.strip()
                ]
            if block_type == "image":
                block["media"] = read_placement(form, prefix + "media")
            elif block_type == "gallery":
                block["images"] = read_gallery(form, prefix + "gallery")
            blocks.append(block)
        data["blocks"] = blocks
        data["content_version"] = 1
    if form.get("media_present") == "1":
        for slot in ("cover", "thumbnail", "social"):
            data[slot + "_media"] = read_placement(form, slot)
        data["gallery_media"] = read_gallery(form, "gallery")
    if kind == "project":
        from .project_details import read_details

        read_details(data, form)
    data["shortDesc" if kind == "project" else "dek"] = data.get("summary", "")


def validate_content(data, kind, publishing=False):
    if data.get("search_visibility", "index") not in ("index", "noindex"):
        raise ContentError("Choose a valid search visibility setting.")
    if not data.get("title"):
        raise ContentError("Add a title before saving.")
    if publishing and not data.get("summary"):
        raise ContentError("Add a summary before publishing.")
    if kind == "post":
        try:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", data.get("date", "")):
                raise ValueError("Use the YYYY-MM-DD format.")
            date.fromisoformat(data.get("date", ""))
        except ValueError as exc:
            raise ContentError("Choose a valid article date.") from exc
    if (
        kind == "project"
        and data.get("year")
        and not re.fullmatch(r"\d{4}", data["year"])
    ):
        raise ContentError("Use a four-digit project year.")
    for key, label in [
        ("launch_url", "Tool website"),
        ("liveUrl", "Live website"),
        ("githubUrl", "Repository"),
        ("github_url", "Repository"),
        ("docs_url", "Documentation"),
    ]:
        value = data.get(key, "")
        required = publishing and kind == "tool" and key == "launch_url"
        if ((value and value != "#") or required) and not safe_web_url(value):
            raise ContentError(
                f"{label}: add a complete HTTPS or HTTP URL without login details."
            )
    if kind == "project":
        from .project_details import validate_details

        validate_details(data, publishing)
    if kind == "guide":
        from .guide_files import validate_file

        validate_file(data.get("file"), publishing)
    blocks = initial_blocks(data, kind)
    for block in blocks:
        block_type = block["type"]
        if block_type == "heading" and block["level"] not in ("h2", "h3"):
            raise ContentError("Headings must use level H2 or H3.")
        if block_type == "list" and block["style"] not in ("ordered", "unordered"):
            raise ContentError("Choose a numbered or bulleted list.")
        if block_type == "link" and block["url"] and not safe_web_url(block["url"]):
            raise ContentError("Section links must use a complete HTTPS or HTTP URL.")
        if block_type == "gallery" and block["layout"] not in ("stack", "grid"):
            raise ContentError("Choose a stacked or grid gallery layout.")
        if publishing and block_type not in ("divider", "image", "gallery"):
            value = (
                block.get("html", "")
                if block_type == "rich_text"
                else block.get("text", "")
            )
            if block_type == "list":
                value = " ".join(block["items"])
            visible = plain_text(value) if block_type == "rich_text" else value
            if not visible.strip():
                raise ContentError(
                    "Fill in or remove empty sections before publishing."
                )
            if block_type == "link" and not block["url"]:
                raise ContentError("Add a destination for every link section.")
    if (
        publishing
        and kind in ("project", "post", "guide")
        and not any(b["type"] != "divider" for b in blocks)
    ):
        raise ContentError("Add at least one content section before publishing.")
    if kind == "post":
        text = " ".join(
            plain_text(b.get("html", ""))
            if b["type"] == "rich_text"
            else " ".join(b.get("items", []))
            if b["type"] == "list"
            else b.get("text", "")
            for b in blocks
        )
        data["readMinutes"] = max(1, math.ceil(len(text.split()) / 200))


def create_payload(kind, title, summary, category):
    data = {
        "title": title,
        "summary": summary,
        "category": category,
        "seo_title": "",
        "seo_description": "",
        "tags": [],
        "content_version": 1,
        "blocks": [],
    }
    if kind == "post":
        data.update(date=date.today().isoformat(), cover="", readMinutes=1, dek=summary)
    elif kind == "guide":
        data.update(format="PDF", audience="", checked="", source_note="", file=None)
    elif kind == "project":
        data.update(
            year=str(date.today().year),
            heroImg="",
            screenshots=[],
            shortDesc=summary,
            role="",
            timeline="",
            clientType="",
            tools="",
            liveUrl="",
            githubUrl="",
        )
    return data
