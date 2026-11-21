import re
from copy import deepcopy
from pathlib import PurePosixPath
from urllib.parse import quote
from xml.etree.ElementTree import Element, SubElement, tostring

from flask import (
    Blueprint,
    abort,
    current_app,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
)
from markupsafe import Markup
from sqlalchemy.exc import SQLAlchemyError

from . import ROOT
from .extensions import db
from .models import Entry, EntryAddress, Inquiry
from .services.branding import navigation_for
from .services.branding_media import brand_image_info
from .services.collections import collection
from .services.content import clean_rich_text
from .services.guide_files import file_url as guide_file_url
from .services.guide_files import size_label as guide_file_size
from .services.home_sections import sections_for
from .services.inquiries import contact_limit, queue_notification
from .services.media import placement_info
from .services.pages import clean_inline, defaults, published_page, site_values
from .services.project_details import feedback_for, figures_for
from .services.seo import (
    COLLECTION_PAGES,
    collection_schema,
    entry_modified,
    entry_schema,
    home_schema,
    indexed,
    iso_time,
    sitemap_pages,
    social_metadata,
)

public = Blueprint("public", __name__)


def entries(kind):
    return list(
        db.session.scalars(
            db.select(Entry)
            .where(Entry.kind == kind, Entry.published.is_not(None))
            .order_by(Entry.position, Entry.id)
        )
    )


def image_info(source):
    asset = str(PurePosixPath(str(source).removeprefix("./").lstrip("/")))
    if (
        not asset.startswith(("public/images/", "assets/blog/"))
        or ".." in PurePosixPath(asset).parts
    ):
        return None
    manifest = current_app.config["IMAGE_MANIFEST"]
    size = manifest.get(asset)
    if not size:
        return None
    stem = asset.rsplit(".", 1)[0]
    candidates = []
    for candidate in (stem + "-small.webp", stem + ".webp"):
        variant = manifest.get(candidate)
        if variant and not any(
            item["width"] == variant["width"] for item in candidates
        ):
            candidates.append(
                {"url": "/" + quote(candidate), "width": variant["width"]}
            )
    return {
        "url": "/" + quote(asset),
        "width": size["width"],
        "height": size["height"],
        "variants": candidates,
        "breakpoint": current_app.config["DESIGN_CONTENT"]["breakpoints"]["md"],
    }


@public.app_context_processor
def shared_context():
    site = site_values(g.get("site_override"))
    branding = {**published_page("branding"), **g.get("branding_override", {})}
    navigation = navigation_for(branding, home_section_visible)
    brand_images = brand_image_info(
        branding, private=g.get("private_brand_images", False)
    )
    return {
        "branding": branding,
        "brand_images": brand_images,
        "social_metadata": lambda page: social_metadata(
            page, brand_images, image_info, g.get("private_brand_images", False)
        ),
        "navigation": navigation,
        "footer_navigation": [
            link
            for link in navigation
            if link["id"] in ("projects", "blog", "tools", "guides")
        ],
        "site": site,
        "BASE_PATH": "/",
        "CONTACT_EMAIL": site["email"],
        "BOOKING_URL": site["bookingUrl"],
        "CALL_MINUTES": site["callMinutes"],
        "AVAILABILITY": site["availability"],
        "REPLY_NOTE": site["replyNote"],
        "PROJECT_COUNT": db.session.scalar(
            db.select(db.func.count())
            .select_from(Entry)
            .where(Entry.kind == "project", Entry.published.is_not(None))
        ),
        "image_info": image_info,
        "guide_file_url": guide_file_url,
        "guide_file_size": guide_file_size,
        "production": current_app.config["ENVIRONMENT"] == "production",
        "is_preview": False,
        "home_section_visible": home_section_visible,
        "MEDIA_MAX_MB": current_app.config["MEDIA_MAX_BYTES"] // (1024 * 1024),
        "MEDIA_MAX_BYTES": current_app.config["MEDIA_MAX_BYTES"],
        "MEDIA_MAX_MPIXELS": current_app.config["MEDIA_MAX_PIXELS"] // 1_000_000,
        "MEDIA_LAYOUT_READING": current_app.config["DESIGN_CONTENT"]["layout"][
            "reading"
        ],
        "MEDIA_LAYOUT_PAGE": current_app.config["DESIGN_CONTENT"]["layout"]["page"],
        "FONT_STYLESHEET": current_app.config["DESIGN_CONTENT"]["details"][
            "fontStylesheet"
        ],
    }


def home_section_visible(kind):
    if "home_sections_override" not in g:
        g.home_sections_override = sections_for(
            published_page("homepage"), defaults("homepage")
        )
    return bool(g.home_sections_override[kind])


@public.app_template_filter("safe_content")
def safe_content(value):
    return Markup(clean_rich_text(value or ""))


@public.app_template_filter("tool_links")
def tool_links(data):
    """Imported Tools name their links differently from Tools made in the editor;
    templates read one shape. Only complete web addresses are passed through."""
    from .services.content import safe_web_url

    links = {}
    for name, legacy in (
        ("launch_url", "launchUrl"),
        ("github_url", "githubUrl"),
        ("docs_url", "docsUrl"),
    ):
        value = data.get(name) or data.get(legacy) or ""
        links[name] = value if value and safe_web_url(value) else ""
    return links


@public.app_template_filter("home_inline")
def home_inline(value):
    return Markup(clean_inline(value or ""))


def page_config(path):
    return deepcopy(current_app.config["LEGACY_PAGES"].get(path, {}))


@public.get("/")
@public.get("/index.html")
def home():
    return render_home()


COUNT_WORDS = "Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve".split()


def count_word(number):
    """Headline counts read as words ("Six services"); larger numbers stay numerals."""
    return COUNT_WORDS[number] if 0 <= number < len(COUNT_WORDS) else str(number)


def render_home(
    payload=None, *, contact_override=None, branding_override=None, notice=None
):
    g.private_brand_images = notice is not None
    if branding_override is not None:
        g.branding_override = branding_override
    if contact_override is not None:
        g.site_override = contact_override
    site = site_values(contact_override)
    data = {**published_page("homepage"), **(payload if payload is not None else {})}
    # A historical flat snapshot must not inherit repeating arrays from today's page.
    content = payload if payload is not None else published_page("homepage")
    sections = sections_for(content, defaults("homepage"))
    g.home_sections_override = sections

    def copy(key):
        return (
            data[key]
            .replace("{{CALL_MINUTES}}", str(site["callMinutes"]))
            .replace("{callMinutes}", str(site["callMinutes"]))
            .replace("{serviceCount}", count_word(len(sections["services"])))
        )

    def initials(name):
        return "".join(word[0] for word in name.split()[:2]).upper()

    def section_text(value):
        return value.replace("{{CALL_MINUTES}}", str(site["callMinutes"])).replace(
            "{callMinutes}", str(site["callMinutes"])
        )

    def featured(kind):
        return list(
            db.session.scalars(
                db.select(Entry)
                .where(
                    Entry.kind == kind,
                    Entry.published.is_not(None),
                    Entry.featured_position.is_not(None),
                )
                .order_by(Entry.featured_position, Entry.id)
                .limit(3)
            )
        )

    page = page_config("index.html")
    page.update(
        title=data["seo.title"],
        description=data["seo.description"],
        ogTitle=data["seo.title"],
        ogDescription=data["seo.description"],
        canonical=current_app.config["SITE_URL"] + "/",
    )
    page["noindex"] = not indexed(data)
    page["structuredData"] = home_schema(
        page, branding_override or published_page("branding"), site
    )
    return render_template(
        "home.html",
        page=page,
        home_copy=copy,
        name_initials=initials,
        section_text=section_text,
        home_sections=sections,
        projects=featured("project"),
        posts=featured("post"),
        tools=featured("tool"),
        is_preview=notice is not None,
        page_preview_notice=notice,
    )


@public.get("/projects.html")
def projects():
    return render_collection("project", "projects.html")


@public.get("/blog.html")
def blog():
    return render_collection("post", "blog.html")


@public.get("/tools.html")
def tools():
    return render_collection("tool", "public/tools.html")


@public.get("/guides.html")
def guides():
    return render_collection("guide", "public/guides.html")


def render_collection(kind, template, *, payload=None, notice=None):
    g.private_brand_images = notice is not None
    key, _, _ = COLLECTION_PAGES[kind]
    data = {**defaults(key), **(published_page(key) if payload is None else payload)}
    context = collection(kind, endpoint="public." + key)
    page = page_config(
        {
            "project": "projects.html",
            "post": "blog.html",
            "tool": "tools.html",
            "guide": "guides.html",
        }[kind]
    )
    page.update(
        title=data["seo_title"],
        description=data["seo_description"],
        canonical=context["collection_canonical"],
        noindex=context["filtered"] or not indexed(data),
    )
    if context["pagination"].page > 1:
        page["title"] += f" · Page {context['pagination'].page}"
    page.update(ogTitle=page["title"], ogDescription=page["description"])
    page["structuredData"] = collection_schema(
        page, published_page("branding"), context["pagination"].items
    )
    return render_template(
        template,
        page=page,
        collection_content=data,
        is_preview=notice is not None,
        page_preview_notice=notice,
        **context,
        **{
            {
                "project": "projects",
                "post": "posts",
                "tool": "tools",
                "guide": "guides",
            }[kind]: context[
                "pagination"
            ].items
        },
    )


def render_entry(entry, preview=False, payload=None, revision=None):
    g.private_brand_images = preview
    data = (
        payload if payload is not None else entry.draft if preview else entry.published
    )
    if data is None:
        abort(404)
    page = page_config(entry.path[1:])
    if not page:
        # Imported metadata remains available after renaming its original path.
        for old_path in db.session.scalars(
            db.select(EntryAddress.path)
            .where(EntryAddress.entry_id == entry.id)
            .order_by(EntryAddress.created_at, EntryAddress.path)
        ):
            page = page_config(old_path[1:])
            if page:
                break
    page.update(
        title=data.get("seo_title")
        or f"{data['title']} | {published_page('branding')['ownerName']}",
        description=data.get("seo_description") or data.get("summary", ""),
        canonical=current_app.config["SITE_URL"] + entry.path,
    )
    page["ogUrl"] = page["canonical"]
    social = data.get("social_media")
    if not social or not social.get("asset_id"):
        social = data.get("cover_media")
    if social and social.get("asset_id"):
        info = placement_info(social, private=preview)
        if info:
            origin = (
                request.host_url.rstrip("/")
                if preview
                else current_app.config["SITE_URL"]
            )
            page["ogImage"] = origin + info["desktop"]["url"]
            page["entry_image"] = True
            page["ogImageWidth"] = info["desktop"]["width"]
            page["ogImageHeight"] = info["desktop"]["height"]
            page["ogImageAlt"] = info["alt"]
            page["ogImageType"] = "image/webp"
    if not page.get("entry_image") and "cover_media" not in data:
        legacy = image_info(
            data.get("heroImg" if entry.kind == "project" else "cover", "")
        )
        if legacy:
            page.update(
                entry_image=True,
                ogImage=current_app.config["SITE_URL"] + legacy["url"],
                ogImageWidth=legacy["width"],
                ogImageHeight=legacy["height"],
                ogImageAlt=data["title"],
            )
            page["ogImageType"] = (
                "image/png"
                if legacy["url"].endswith(".png")
                else "image/jpeg"
                if legacy["url"].endswith((".jpg", ".jpeg"))
                else "image/webp"
            )
    page["ogTitle"] = page["title"]
    page["ogDescription"] = page["description"]
    page["noindex"] = not indexed(data)
    cover = None
    if data.get("cover_media", {}).get("asset_id"):
        info = placement_info(data["cover_media"], private=preview)
        if info:
            origin = (
                request.host_url.rstrip("/")
                if preview
                else current_app.config["SITE_URL"]
            )
            cover = {
                "url": origin + info["desktop"]["url"],
                "width": info["desktop"]["width"],
                "height": info["desktop"]["height"],
                "alt": info["alt"],
            }
    elif "cover_media" not in data:
        info = image_info(
            data.get("heroImg" if entry.kind == "project" else "cover", "")
        )
        if info:
            cover = {
                "url": current_app.config["SITE_URL"] + info["url"],
                "width": info["width"],
                "height": info["height"],
                "alt": data["title"],
            }
    page["structuredData"], breadcrumbs = entry_schema(
        page, entry, data, published_page("branding"), cover, preview
    )
    # The reader is offered the following published entry, wrapping at the end.
    siblings = [] if preview else entries(entry.kind)
    position = next((i for i, item in enumerate(siblings) if item.id == entry.id), None)
    next_entry = (
        siblings[(position + 1) % len(siblings)]
        if position is not None and len(siblings) > 1
        else None
    )
    return render_template(
        f"public/{entry.kind}.html",
        next_entry=next_entry,
        entry=entry,
        data=data,
        project_figures=figures_for(data) if entry.kind == "project" else [],
        project_feedback=feedback_for(data),
        page=page,
        is_preview=preview,
        unsaved_preview=payload is not None,
        revision_preview=revision,
        breadcrumb_items=breadcrumbs,
        publication_modified=entry_modified(entry, data, preview),
    )


def render_address():
    reservation = db.get_or_404(EntryAddress, request.path)
    entry = db.get_or_404(Entry, reservation.entry_id)
    if entry.published is None:
        abort(404)
    if entry.path != request.path:
        response = redirect(entry.path, code=301)
        response.headers["Cache-Control"] = "no-store"
        return response
    return render_entry(entry)


@public.get("/projects/<slug>.html")
def project(slug):
    return render_address()


@public.get("/<slug>.html")
def article(slug):
    return render_address()


@public.get("/tools/<slug>.html")
def tool(slug):
    return render_address()


@public.get("/guides/<slug>.html")
def guide(slug):
    return render_address()


@public.get("/guides/files/<digest>.pdf")
def guide_file(digest):
    """A guide's PDF: public while a published guide uses it; the owner can preview drafts."""
    from flask_login import current_user

    from .services.guide_files import draft_record, file_path, published_record

    record = published_record(digest)
    private_preview = False
    if record is None and current_user.is_authenticated:
        record = draft_record(digest)
        private_preview = record is not None
    if record is None or not file_path(digest).is_file():
        abort(404)
    response = send_from_directory(
        file_path(digest).parent,
        file_path(digest).name,
        mimetype="application/pdf",
        download_name=record.get("download_name") or "guide.pdf",
        max_age=0 if private_preview else 3600,
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    if private_preview:
        response.headers["Cache-Control"] = "private, no-store"
    return response


@public.post("/contact")
def contact():
    if request.form.get("bot-field"):
        return jsonify(ok=True)
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    message = request.form.get("message", "").strip()
    if not (
        1 <= len(name) <= 120
        and len(email) <= 254
        and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)
        and not any(ord(char) < 32 or ord(char) == 127 for char in name + email)
        and 1 <= len(message) <= 5000
        and "\x00" not in message
    ):
        return jsonify(error="Check your name, email, and message."), 422
    retry_after = contact_limit()
    if retry_after:
        db.session.commit()
        return (
            jsonify(error="Please wait before sending another message."),
            429,
            {"Retry-After": str(retry_after), "Cache-Control": "no-store"},
        )
    inquiry = Inquiry(name=name, email=email, message=message)
    db.session.add(inquiry)
    db.session.flush()
    queue_notification(inquiry)
    db.session.commit()
    return jsonify(ok=True, notification=inquiry.notification_state), 201


@public.get("/healthz")
def health():
    try:
        db.session.execute(db.text("SELECT 1"))
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(status="unavailable"), 503
    return jsonify(status="ok")


@public.get("/readyz")
def ready():
    from .services.runtime import readiness

    if readiness():
        return jsonify(status="unavailable"), 503
    return jsonify(status="ready")


@public.get("/503.html")
def unavailable():
    return render_template(
        "public/error.html",
        page=page_config("503.html"),
        message="Temporarily unavailable.",
    ), 503


@public.get("/sitemap.xml")
def sitemap():
    root = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for path, modified in sitemap_pages():
        item = SubElement(root, "url")
        SubElement(item, "loc").text = current_app.config["SITE_URL"] + path
        if modified:
            SubElement(item, "lastmod").text = iso_time(modified)
    return (
        tostring(root, encoding="utf-8", xml_declaration=True),
        200,
        {"Content-Type": "application/xml"},
    )


@public.get("/robots.txt")
def robots():
    text = (
        "User-agent: *\nDisallow: /\n"
        if current_app.config["ENVIRONMENT"] != "production"
        or not current_app.config["SEARCH_INDEXING_ENABLED"]
        else f"User-agent: *\nDisallow: /admin/\nSitemap: {current_app.config['SITE_URL']}/sitemap.xml\n"
    )
    return text, 200, {"Content-Type": "text/plain; charset=utf-8"}


@public.get("/public/<path:filename>")
def public_asset(filename):
    return send_from_directory(ROOT / "public", filename)


@public.get("/assets/blog/<path:filename>")
def blog_asset(filename):
    return send_from_directory(ROOT / "assets/blog", filename)


@public.get("/tailwind.css")
@public.get("/bundle.js")
@public.get("/src/theme-init.js")
def generated_asset():
    return send_from_directory(ROOT, request.path.lstrip("/"))
