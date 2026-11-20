"""Editable process steps remain ordered, escaped and compatible with old copy."""
import re
from copy import deepcopy

from app.extensions import db
from app.models import ManagedPage
from test_home_sections import sections_form, sections_state
from test_pages_and_collections import page_form


def process_section(response):
    return response.get_data(as_text=True).split('<section id="principles"', 1)[1].split('</section>', 1)[0]


def test_process_renders_every_step_in_published_order_with_safe_text(owner, app):
    rows = sections_state(app)
    extra = {'id': 'another-step', 'title': 'A fifth step <script>bad()</script>', 'description': 'Review A & B with your team.'}
    rows['process'] = [rows['process'][2], extra, *rows['process'][:2], rows['process'][3]]
    assert owner.post('/admin/pages/homepage', data=sections_form(owner, app, rows, action='publish')).status_code == 302
    section = process_section(owner.get('/'))
    assert '<ol id="process-container"' in section
    assert re.findall(r'data-home-item="([^"]+)"', section) == [row['id'] for row in rows['process']]
    assert re.findall(r'aria-hidden="true">(\d+)</span>', section) == ['01', '02', '03', '04', '05']
    assert '&lt;script&gt;bad()&lt;/script&gt;' in section
    assert '<script>bad()' not in section
    assert 'Review A &amp; B with your team.' in section


def test_process_intro_obeys_preview_draft_and_publication(owner, app):
    intro = 'You review the scope first, then the working build.'
    form = page_form(owner, app, **{'process.intro': intro, 'action': 'preview'})
    preview = owner.post('/admin/pages/homepage', data=form)
    assert preview.status_code == 200
    assert intro in process_section(preview)
    assert intro not in process_section(owner.get('/'))
    form['action'] = 'draft'
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    assert intro not in process_section(owner.get('/'))
    assert owner.post('/admin/pages/homepage', data=page_form(owner, app, action='publish')).status_code == 302
    assert intro in process_section(owner.get('/'))


def test_empty_process_hides_new_intro_and_keeps_other_sections(owner, app):
    rows = sections_state(app)
    rows['process'] = []
    form = sections_form(owner, app, rows, action='publish', **{'process.intro': '', 'process.label': ''})
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    text = owner.get('/').get_data(as_text=True)
    assert '<section id="principles"' not in text
    assert 'id="process-container"' not in text
    assert '<section id="services"' in text
    assert '<section id="about"' in text


def test_legacy_step_copy_and_call_length_survive_without_content_writes(owner, app):
    with app.app_context():
        page = db.session.get(ManagedPage, 'homepage')
        page.published = {**page.published, 'process.0.title': 'Talk about the work', 'process.0.description': 'Book a {callMinutes} minute call to discuss the brief.'}
        page.draft = deepcopy(page.published)
        before = deepcopy(page.published)
        contact = db.session.get(ManagedPage, 'contact')
        contact.published = {**contact.published, 'callMinutes': '45'}
        db.session.commit()
    section = process_section(owner.get('/'))
    assert 'Talk about the work' in section
    assert 'Book a 45 minute call to discuss the brief.' in section
    assert owner.get('/admin/pages/homepage').status_code == 200
    with app.app_context():
        assert db.session.get(ManagedPage, 'homepage').published == before
