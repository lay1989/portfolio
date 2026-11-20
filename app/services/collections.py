"""Server-rendered collection filtering shared by public and owner views."""

import hashlib
from urllib.parse import urlencode

from flask import abort, current_app, request, url_for

from ..extensions import db
from ..models import Entry

PUBLIC_PAGE_SIZE = 6


def public_page_size(kind):
    """Keep current work on one page; bound larger archives."""
    return 12 if kind == "project" else PUBLIC_PAGE_SIZE


def order_snapshot(kind):
    rows = db.session.execute(
        db.select(Entry.id, Entry.version, Entry.position)
        .where(Entry.kind == kind)
        .order_by(Entry.position, Entry.id)
    )
    return hashlib.sha256(
        "|".join(
            f"{identity}:{version}:{position}" for identity, version, position in rows
        ).encode()
    ).hexdigest()


def collection(kind, *, owner=False, endpoint=None):
    view_endpoint = endpoint or request.endpoint
    query = request.args.get("q", "").strip()
    category = request.args.get("category", "").strip()
    sort = request.args.get("sort", "manual")
    state = request.args.get("status", "all") if owner else "published"
    sorts = {"manual": "Selected order", "title": "Title A–Z"}
    if kind == "post":
        sorts["newest"] = "Newest article date"
    if (
        len(query) > 160
        or len(category) > 100
        or sort not in sorts
        or state not in ("all", "draft", "published")
    ):
        abort(400)
    page_number = request.args.get("page", "1")
    if (
        not page_number.isascii()
        or not page_number.isdigit()
        or len(page_number) > 8
        or int(page_number) < 1
    ):
        abort(404)
    payload = Entry.draft if owner else Entry.published
    statement = db.select(Entry).where(Entry.kind == kind)
    if state != "all":
        statement = statement.where(
            Entry.published.is_(None)
            if state == "draft"
            else Entry.published.is_not(None)
        )
    categories_query = db.select(payload["category"].as_string()).where(
        Entry.kind == kind
    )
    if not owner:
        categories_query = categories_query.where(Entry.published.is_not(None))
    categories = sorted(
        {value for value in db.session.scalars(categories_query.distinct()) if value}
    )
    if query:
        statement = statement.where(
            db.or_(
                *(
                    payload[key].as_string().icontains(query, autoescape=True)
                    for key in ("title", "summary", "category")
                )
            )
        )
    if category:
        statement = statement.where(payload["category"].as_string() == category)
    if sort == "title":
        statement = statement.order_by(
            db.func.lower(payload["title"].as_string()), Entry.id
        )
    elif sort == "newest":
        statement = statement.order_by(payload["date"].as_string().desc(), Entry.id)
    else:
        statement = statement.order_by(Entry.position, Entry.id)
    pages = db.paginate(
        statement,
        page=int(page_number),
        per_page=12 if owner else public_page_size(kind),
        max_per_page=12 if owner else public_page_size(kind),
    )
    filters = {
        key: value
        for key, value in {
            "q": query,
            "category": category,
            "sort": sort if sort != "manual" else "",
            "status": state if owner and state != "all" else "",
        }.items()
        if value
    }

    def page_url(number):
        return url_for(
            view_endpoint,
            **({"kind": kind} if owner else {}),
            **filters,
            **({"page": number} if number > 1 else {}),
        )

    canonical_args = {**filters, **({"page": pages.page} if pages.page > 1 else {})}
    return {
        "pagination": pages,
        "query": query,
        "category": category,
        "sort": sort,
        "sorts": sorts,
        "state": state,
        "categories": categories,
        "owner_collection": owner,
        "collection_url": url_for(view_endpoint, **({"kind": kind} if owner else {})),
        "page_url": page_url,
        "collection_canonical": current_app.config["SITE_URL"]
        + url_for(view_endpoint, **({"kind": kind} if owner else {}))
        + ("?" + urlencode(canonical_args) if canonical_args else ""),
        "filtered": bool(filters),
    }
