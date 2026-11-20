"""Approved feedback keeps complete quotes paired with the correct attribution."""
import re
from copy import deepcopy

from app.extensions import db
from app.models import ManagedPage
from app.services.pages import clean_inline
from test_home_sections import sections_form, sections_state
from test_pages_and_collections import page_form


def feedback_section(response):
    return response.get_data(as_text=True).split('<section id="reviews"', 1)[1].split('</section>', 1)[0]


def quote_rows(section):
    return re.findall(r'<li[^>]+data-home-item="([^"]+)"[^>]*>(.*?)</li>', section, re.S)


def test_quotes_keep_owner_order_complete_wording_and_attribution(owner, app):
    rows = sections_state(app)
    rows['reviews'] = list(reversed(rows['reviews']))
    rows['reviews'].insert(1, {'id': 'extra-feedback', 'name': 'Another client', 'role': 'Founder, Example & Co', 'quote': '<strong onclick="bad()">Exact additional words.</strong> A & B.<script>bad()</script>'})
    assert owner.post('/admin/pages/homepage', data=sections_form(owner, app, rows, action='publish')).status_code == 302
    section = feedback_section(owner.get('/'))
    rendered = quote_rows(section)
    assert [identity for identity, _ in rendered] == [row['id'] for row in rows['reviews']]
    for (_, fragment), row in zip(rendered, rows['reviews']):
        assert clean_inline(row['quote']) in fragment
        assert row['name'] in fragment
        assert '<blockquote>' in fragment and '<figcaption>' in fragment
    assert 'Founder, Example &amp; Co' in section
    assert '<strong>Exact additional words.</strong>' in section
    assert '<script>' not in section and 'onclick=' not in section


def test_feedback_copy_and_quote_edits_use_preview_draft_publish(owner, app):
    rows = sections_state(app)
    rows['reviews'][0]['quote'] = 'A <em>reviewed</em> quotation, preserved in full.'
    intro = 'Feedback supplied by clients about their projects.'
    form = sections_form(owner, app, rows, action='preview', **{'reviews.intro': intro})
    preview = owner.post('/admin/pages/homepage', data=form)
    assert preview.status_code == 200
    assert intro in feedback_section(preview)
    assert rows['reviews'][0]['quote'] in feedback_section(preview)
    assert intro not in feedback_section(owner.get('/'))
    form['action'] = 'draft'
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    assert intro not in feedback_section(owner.get('/'))
    assert owner.post('/admin/pages/homepage', data=page_form(owner, app, action='publish')).status_code == 302
    assert intro in feedback_section(owner.get('/'))
    assert rows['reviews'][0]['quote'] in feedback_section(owner.get('/'))


def test_empty_feedback_hides_introduction_and_retains_other_sections(owner, app):
    rows = sections_state(app)
    rows['reviews'] = []
    form = sections_form(owner, app, rows, action='publish', **{'reviews.intro': '', 'reviews.label': ''})
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    text = owner.get('/').get_data(as_text=True)
    assert '<section id="reviews"' not in text
    assert 'id="reviews-thread"' not in text
    assert '<section id="principles"' in text
    assert '<section id="services"' in text


def test_legacy_quote_and_optional_role_render_without_rewriting_records(owner, app):
    with app.app_context():
        page = db.session.get(ManagedPage, 'homepage')
        page.published = {**page.published, 'review.0.quote': 'The <em>original</em> quotation, in full.', 'review.0.name': 'An earlier client', 'review.0.role': ''}
        page.draft = deepcopy(page.published)
        before = deepcopy(page.published)
        db.session.commit()
    first = quote_rows(feedback_section(owner.get('/')))[0][1]
    assert 'The <em>original</em> quotation, in full.' in first
    assert 'An earlier client' in first
    assert 'class="home-feedback-role' not in first
    assert owner.get('/admin/pages/homepage').status_code == 200
    with app.app_context():
        assert db.session.get(ManagedPage, 'homepage').published == before
