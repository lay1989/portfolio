"""Public presentation uses published content and keeps management private."""

from copy import deepcopy
from html.parser import HTMLParser

import pytest
from test_media import image_bytes, upload

from app.extensions import db
from app.models import Entry
from app.services.media import new_placement, prepare_media, sync_references


class CollectionHTML(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def test_public_controls_removed_owner_controls_retained_and_all_current_work_shown(
    client, owner, app
):
    for path in ("/projects.html", "/blog.html", "/tools.html"):
        markup = client.get(path).get_data(as_text=True)
        tags = CollectionHTML(markup).tags
        assert not any(tag in ("form", "select") for tag, _ in tags)
        assert not any(attrs.get("type") == "search" for _, attrs in tags)
        assert "Apply filters" not in markup and 'id="category-filters"' not in markup
    for kind in ("project", "post", "tool"):
        assert "Apply filters" in owner.get(f"/admin/collection/{kind}").get_data(
            as_text=True
        )
    with app.app_context():
        published = list(
            db.session.scalars(
                db.select(Entry).where(Entry.kind == "project").order_by(Entry.position)
            )
        )
        paths = [entry.path for entry in published]
    text = client.get("/projects.html").get_data(as_text=True)
    assert text.count("data-work-slide data-title=") == len(paths) == 10
    assert [text.index(path) for path in paths] == sorted(
        text.index(path) for path in paths
    )
    assert "Next page" not in text


def test_blog_listing_has_one_image_for_each_article_and_one_lead(client):
    text = client.get("/blog.html").get_data(as_text=True)
    assert text.count('<article class="journal-entry') == 6
    assert text.count("journal-entry--lead") == 1
    assert text.count("journal-entry__image") == 6
    images = [
        attrs
        for tag, attrs in CollectionHTML(text).tags
        if tag == "img" and "/assets/blog/" in attrs.get("src", "")
    ]
    assert len(images) == 6
    assert all(
        img.get("alt") and int(img["width"]) > 0 and int(img["height"]) > 0
        for img in images
    )
    assert "loading" not in images[0]
    assert all(img.get("loading") == "lazy" for img in images[1:])


@pytest.mark.parametrize(
    "kind,path",
    [("post", "/blog.html"), ("project", "/projects.html"), ("tool", "/tools.html")],
)
def test_collection_media_uses_published_thumbnail_crop_then_cover_and_respects_clear(
    owner, app, kind, path
):
    cover_id = upload(owner).json["asset"]["id"]
    thumbnail_id = upload(owner, raw=image_bytes(size=(300, 200))).json["asset"]["id"]
    with app.app_context():
        if kind == "tool":
            db.session.add(
                Entry(
                    kind="tool",
                    slug="image-tool",
                    path="/tools/image-tool.html",
                    position=0,
                    draft={
                        "title": "Image tool",
                        "summary": "A tool with a managed preview",
                        "category": "Utilities",
                        "launch_url": "https://example.com/tool",
                        "seo_title": "Image tool",
                        "seo_description": "A tool with a managed preview",
                    },
                )
            )
            db.session.flush()
        entry = db.session.scalar(
            db.select(Entry).where(Entry.kind == kind).order_by(Entry.position)
        )
        identity = entry.id
        cover = {**new_placement(), "asset_id": cover_id, "alt": "Published cover"}
        thumbnail = {
            **new_placement(),
            "asset_id": thumbnail_id,
            "alt": "Published thumbnail",
            "ratio": "square",
            "mobile_ratio": "portrait",
            "mobile_x": 100,
        }
        data = {
            **deepcopy(entry.published or entry.draft),
            "cover_media": cover,
            "thumbnail_media": thumbnail,
        }
        prepare_media(data, publishing=True)
        entry.published = data
        entry.draft = {
            **deepcopy(data),
            "title": "Hidden private draft",
            "thumbnail_media": cover,
        }
        sync_references(entry)
        db.session.commit()
    text = owner.get(path).get_data(as_text=True)
    # The image link contains only the current published crop, including its mobile source.
    snippet = text.split(
        'aria-label="'
        + {"post": "Read ", "project": "Open case study: ", "tool": "About "}[kind],
        1,
    )[1].split("</a>", 1)[0]
    assert 'alt="Published thumbnail"' in snippet
    assert f"/media/{thumbnail_id}/" in snippet and f"/media/{cover_id}/" not in snippet
    assert 'width="160" height="200"' in snippet
    assert "Hidden private draft" not in text
    with app.app_context():
        entry = db.session.get(Entry, identity)
        entry.published = {**entry.published, "thumbnail_media": new_placement()}
        sync_references(entry)
        db.session.commit()
    assert 'alt="Published cover"' in owner.get(path).get_data(as_text=True)
    with app.app_context():
        entry = db.session.get(Entry, identity)
        entry.published = {**entry.published, "cover_media": new_placement()}
        sync_references(entry)
        db.session.commit()
    text = owner.get(path).get_data(as_text=True)
    assert (
        'alt="Published cover"' not in text and 'alt="Published thumbnail"' not in text
    )
    legacy_marker = (
        "cover-custom-web" if kind == "post" else "ASH%20clipping%20-%20hero"
    )
    assert legacy_marker not in text
