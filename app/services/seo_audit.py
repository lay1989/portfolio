"""Read-only checks of rendered public HTML, schema, images, sitemap and redirects."""

import json
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

import click
from flask import current_app

from ..extensions import db
from ..models import Entry, EntryAddress
from .collections import public_page_size
from .seo import COLLECTION_PAGES, indexed


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonicals = []
        self.titles = []
        self.headings = []
        self.schemas = []
        self.capture = None
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            key = attrs.get("name", attrs.get("property", ""))
            self.meta.setdefault(key, []).append(attrs.get("content", ""))
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href", ""))
        if (
            tag in ("title", "h1")
            or tag == "script"
            and attrs.get("type") == "application/ld+json"
        ):
            self.capture = tag
            self.parts = []

    def handle_data(self, data):
        if self.capture:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag != self.capture:
            return
        value = "".join(self.parts).strip()
        {"title": self.titles, "h1": self.headings, "script": self.schemas}[tag].append(
            value
        )
        self.capture = None


def audit():
    app = current_app._get_current_object()
    origin = app.config["SITE_URL"]
    indexing_enabled = app.config["SEARCH_INDEXING_ENABLED"]
    public_indexing = app.config["ENVIRONMENT"] == "production" and indexing_enabled
    entries = list(
        db.session.scalars(
            db.select(Entry).where(Entry.published.is_not(None)).order_by(Entry.path)
        )
    )
    with app.test_request_context("/"):
        from .pages import published_page

        routes = {"/": indexed(published_page("homepage"))}
        for kind, (key, _, path) in COLLECTION_PAGES.items():
            count = sum(entry.kind == kind for entry in entries)
            for number in range(
                1,
                max(1, (count + public_page_size(kind) - 1) // public_page_size(kind))
                + 1,
            ):
                route = path + (f"?page={number}" if number > 1 else "")
                routes[route] = indexed(published_page(key))
        routes.update({entry.path: indexed(entry.published) for entry in entries})
    report = {
        "environment": app.config["ENVIRONMENT"],
        "search_indexing_enabled": indexing_enabled,
        "pages_checked": 0,
        "images_checked": 0,
        "redirects_checked": 0,
        "errors": [],
        "warnings": [],
        "scope": "Server-rendered metadata/schema/HTTP checks. No Lighthouse, external crawler, ranking, or Core Web Vitals measurement.",
    }
    titles = []
    images = set()
    client = app.test_client()
    for route, eligible in routes.items():
        response = client.get(route)
        report["pages_checked"] += 1
        if response.status_code != 200:
            report["errors"].append(
                f"{route}: expected HTTP 200, got {response.status_code}."
            )
            continue
        document = Document()
        document.feed(response.get_data(as_text=True))
        failures = []
        if len(document.titles) != 1 or not document.titles[0]:
            failures.append("one nonempty title required")
        else:
            titles.append(document.titles[0])
        if document.canonicals != [origin + route]:
            failures.append("canonical does not match its public address")
        if not document.headings or not all(document.headings):
            failures.append("missing primary heading")
        for name in (
            "description",
            "robots",
            "og:title",
            "og:description",
            "og:url",
            "og:image",
            "og:image:alt",
            "twitter:title",
            "twitter:description",
            "twitter:image",
            "twitter:image:alt",
        ):
            values = document.meta.get(name, [])
            if len(values) != 1 or not values[0]:
                failures.append(f"one nonempty {name} value required")
        if document.meta.get("og:url") != [origin + route]:
            failures.append("sharing URL disagrees with canonical")
        robots = document.meta.get("robots", [""])[0]
        if (not eligible or not public_indexing) and "noindex" not in robots:
            failures.append("missing noindex protection")
        if eligible and public_indexing and "noindex" in robots:
            failures.append("indexable publication has noindex")
        if len(document.schemas) != 1:
            failures.append("one JSON-LD graph required")
        else:
            try:
                schema = json.loads(document.schemas[0])
                assert schema["@context"] == "https://schema.org" and schema["@graph"]
                assert any(
                    node.get("url") == origin + route for node in schema["@graph"]
                )
                assert all(
                    node.get("@id") and node.get("@type") for node in schema["@graph"]
                )
                if "/admin/media/file/" in document.schemas[0]:
                    failures.append("private media address in public schema")
            except (ValueError, KeyError, TypeError, AssertionError):
                failures.append("invalid or incomplete JSON-LD graph")
        image = document.meta.get("og:image", [""])[0]
        if "/admin/media/file/" in image:
            failures.append("private media address in public sharing metadata")
        if image.startswith(origin + "/"):
            images.add(urlsplit(image).path)
        report["errors"].extend(f"{route}: {failure}." for failure in failures)
    for image in sorted(images):
        response = client.get(image)
        report["images_checked"] += 1
        if response.status_code != 200 or not response.mimetype.startswith("image/"):
            report["errors"].append(f"{image}: public sharing image is unavailable.")
    sitemap = client.get("/sitemap.xml")
    try:
        root = ElementTree.fromstring(sitemap.data)
        locations = [node.text for node in root.findall("{*}url/{*}loc")]
        expected = {
            origin + route
            for route, eligible in routes.items()
            if eligible and indexing_enabled
        }
        if (
            sitemap.status_code != 200
            or set(locations) != expected
            or len(locations) != len(set(locations))
        ):
            report["errors"].append(
                "Sitemap differs from current indexable public pages."
            )
    except ElementTree.ParseError:
        report["errors"].append("Sitemap is not valid XML.")
    for old_path, current in db.session.execute(
        db.select(EntryAddress.path, Entry.path)
        .join(Entry, EntryAddress.entry_id == Entry.id)
        .where(Entry.published.is_not(None), EntryAddress.path != Entry.path)
    ):
        response = client.get(old_path)
        report["redirects_checked"] += 1
        if response.status_code != 301 or response.headers.get("Location") != current:
            report["errors"].append(
                f"{old_path}: alias must redirect directly to {current}."
            )
    report["warnings"].extend(
        f"Repeated search title: {title}"
        for title, count in Counter(titles).items()
        if count > 1
    )
    report["ok"] = not report["errors"]
    return report


def register_seo_commands(app):
    @app.cli.command("audit-seo")
    @click.option(
        "--output",
        type=click.Path(dir_okay=False),
        help="Write a JSON report without changing website content.",
    )
    def audit_command(output):
        report = audit()
        data = json.dumps(report, indent=2) + "\n"
        if output:
            Path(output).write_text(data)
        click.echo(data)
        if not report["ok"]:
            raise click.ClickException("Rendered SEO checks found errors.")
