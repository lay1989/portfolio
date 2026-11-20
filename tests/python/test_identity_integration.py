"""The selected identity reaches public/private shells without publishing research."""

from pathlib import Path

from test_branding_media import PATH, SLOTS, brand_form, image_asset, images_for
from test_pages_and_collections import page_state

ROOT = Path(__file__).resolve().parents[2]


def test_default_identity_is_shared_and_research_stays_private(owner, app):
    before = page_state(app, "branding")
    for path in [
        "/",
        "/projects.html",
        "/blog.html",
        "/tools.html",
        "/projects/ash-clipping.html",
        "/blog-custom-websites.html",
        "/admin/",
    ]:
        response = owner.get(path)
        assert response.status_code == 200
        text = response.get_data(as_text=True)
        assert "/public/identity/horizontal-evergreen.svg" in text
        assert "/public/identity/horizontal-white.svg" in text
        assert "/public/identity/apple-touch-icon.png" in text
        assert 'data-branding="displayName">LAY SHAH' in text
        assert "M 32 30 L 32 70 L 48 70" not in text
    signed_out = app.test_client()
    login = signed_out.get("/admin/login").get_data(as_text=True)
    assert (
        "identity-signin" in login
        and "/public/identity/horizontal-evergreen.svg" in login
    )
    for public, source in [
        ("public/favicon.svg", "favicon.svg"),
        ("public/images/og-image.png", "default-sharing.png"),
        ("public/identity/horizontal-evergreen.svg", "horizontal-evergreen.svg"),
    ]:
        assert (
            signed_out.get("/" + public).data
            == (ROOT / ".cache/identity/evergreen-kit" / source).read_bytes()
        )
    assert signed_out.get("/public/identity/source-geometry.json").status_code == 404
    assert signed_out.get("/admin/lab/identity/kit/manifest.json").status_code == 302
    assert page_state(app, "branding") == before


def test_published_uploads_override_admin_and_signin_then_clear_to_evergreen(
    owner, app
):
    asset = image_asset(owner)
    fields = brand_form(owner, app, dict.fromkeys(SLOTS, asset), action="publish")
    assert owner.post(PATH, data=fields).status_code == 302
    published = page_state(app, "branding")[1]
    images = images_for(app, published)
    for response in [owner.get("/admin/"), app.test_client().get("/admin/login")]:
        text = response.get_data(as_text=True)
        assert images["logo"]["url"] in text
        assert "/public/identity/horizontal-evergreen.svg" not in text
        assert images["icon"]["variants"][0]["url"] in text
    assert (
        owner.post(PATH, data=brand_form(owner, app, {}, action="publish")).status_code
        == 302
    )
    assert "/public/identity/horizontal-evergreen.svg" in owner.get("/admin/").get_data(
        as_text=True
    )
