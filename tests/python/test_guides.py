"""Guides: a dashboard-managed collection of downloadable PDFs with a public list."""

import io
from copy import deepcopy

from conftest import token
from werkzeug.datastructures import MultiDict

from app.extensions import db
from app.models import Entry

PDF = b"%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << >>\n%%EOF\n"


def new_guide(owner, slug="ai-order-checklist"):
    response = owner.post(
        "/admin/new/guide",
        data={
            "csrf_token": token(owner.get("/admin/new/guide")),
            "title": "The AI order checklist",
            "slug": slug,
            "summary": "Let AI start the work. Keep the yes with a person.",
            "category": "Checklist",
        },
    )
    assert response.status_code == 302
    return response.headers["Location"]


def editor_form(owner, path, version, action="draft", **extra):
    fields = MultiDict(
        {
            "csrf_token": token(owner.get(path)),
            "version": str(version),
            "action": action,
            "title": "The AI order checklist",
            "summary": "Let AI start the work. Keep the yes with a person.",
            "category": "Checklist",
            "format": "One-page PDF",
            "audience": "Shops, cafés, local services",
            "checked": "22 Nov 2026",
            "source_note": "From the reel series on Instagram.",
            "blocks_present": "1",
        }
    )
    fields.add("block_id", "idea")
    fields["block.idea.type"] = "rich_text"
    fields["block.idea.html"] = "<p>AI drafts, one person decides.</p>"
    for key, value in extra.items():
        fields[key] = value
    return fields


def entry_for(app, slug="ai-order-checklist"):
    with app.app_context():
        entry = db.session.scalar(db.select(Entry).where(Entry.slug == slug))
        return entry.id, entry.version, deepcopy(entry.draft), deepcopy(entry.published)


def test_guide_needs_a_pdf_then_publishes_with_list_page_and_download(owner, app):
    path = new_guide(owner)
    identity, version, draft, _ = entry_for(app)
    assert draft["file"] is None and draft["format"] == "PDF"

    # Publishing without a PDF is refused and keeps the form.
    refused = owner.post(path, data=editor_form(owner, path, version, "publish"))
    assert refused.status_code == 422
    assert "Upload the guide" in refused.get_data(as_text=True)

    # A file that isn't a PDF is refused.
    bad = editor_form(owner, path, version)
    bad["guide_file"] = (io.BytesIO(b"<html>nope</html>"), "checklist.pdf")
    assert owner.post(path, data=bad, content_type="multipart/form-data").status_code == 422

    # Upload the PDF with a draft save: private until published.
    form = editor_form(owner, path, version)
    form["guide_file"] = (io.BytesIO(PDF), "AI order checklist.pdf")
    saved = owner.post(path, data=form, content_type="multipart/form-data")
    assert saved.status_code == 302
    _, version, draft, published = entry_for(app)
    record = draft["file"]
    assert record["size"] == len(PDF) and record["download_name"] == "AI_order_checklist.pdf"
    assert published is None
    file_url = f"/guides/files/{record['sha256']}.pdf"
    assert owner.get(file_url).status_code == 200  # the owner can preview it
    anonymous = app.test_client()
    assert anonymous.get(file_url).status_code == 404
    assert anonymous.get("/guides/ai-order-checklist.html").status_code == 404

    published_response = owner.post(path, data=editor_form(owner, path, version, "publish"))
    assert published_response.status_code == 302

    page = anonymous.get("/guides/ai-order-checklist.html")
    assert page.status_code == 200
    html = page.get_data(as_text=True)
    assert "The AI order checklist" in html and file_url in html
    assert "One-page PDF" in html and "Shops, cafés, local services" in html
    assert "AI drafts, one person decides." in html
    assert '"@type": "DigitalDocument"' in html or '"DigitalDocument"' in html

    listing = anonymous.get("/guides.html").get_data(as_text=True)
    assert "/guides/ai-order-checklist.html" in listing and "Download PDF" in listing

    download = anonymous.get(file_url)
    assert download.status_code == 200
    assert download.mimetype == "application/pdf"
    assert download.data == PDF
    assert "AI_order_checklist.pdf" in download.headers["Content-Disposition"]
    download.close()

    sitemap = anonymous.get("/sitemap.xml").get_data(as_text=True)
    assert "/guides.html" in sitemap and "/guides/ai-order-checklist.html" in sitemap
    assert 'href="/guides.html"' in anonymous.get("/").get_data(as_text=True)

    # Unpublishing hides the page and the file again.
    _, version, _, _ = entry_for(app)
    owner.post(path, data=editor_form(owner, path, version, "unpublish"))
    assert anonymous.get("/guides/ai-order-checklist.html").status_code == 404
    assert anonymous.get(file_url).status_code == 404


def test_guides_admin_screens_and_page_settings(owner):
    assert "Guides" in owner.get("/admin/").get_data(as_text=True)
    assert owner.get("/admin/collection/guide").status_code == 200
    assert owner.get("/admin/new/guide").status_code == 200
    settings = owner.get("/admin/pages/guides")
    assert settings.status_code == 200
    assert "Free, practical guides" in settings.get_data(as_text=True)


def test_empty_guides_page_and_unknown_files(client):
    page = client.get("/guides.html")
    assert page.status_code == 200
    assert "New guides will appear here" in page.get_data(as_text=True)
    assert client.get("/guides/files/" + "0" * 64 + ".pdf").status_code == 404
    assert client.get("/guides/files/not-a-hash.pdf").status_code == 404
