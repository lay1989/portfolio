"""Approach uses managed copy and preserves publication and recovery behavior."""
from copy import deepcopy

from app.extensions import db
from app.models import ManagedPage
from test_pages_and_collections import page_form


def test_approach_is_readable_without_javascript_and_replaces_moving_claims(client):
    text = client.get('/').get_data(as_text=True)
    about = text.split('<section id="about"', 1)[1].split('</section>', 1)[0]
    assert 'One person.' in about
    assert 'The whole build.' in about
    assert 'Accountable to you.' in about
    assert 'What should this make easier' in about
    assert 'data-reading-statement' in about
    assert 'home-reading-word' not in about  # Enhancement happens only in the browser.
    assert 'data-marquee' not in text
    assert 'Pause ticker' not in text


def test_approach_question_follows_preview_draft_publish_and_conflict_protection(owner, app):
    form = page_form(owner, app, **{'about.question': 'Which task costs your team the most time?', 'action': 'preview'})
    response = owner.post('/admin/pages/homepage', data=form)
    assert response.status_code == 200
    assert 'Which task costs your team the most time?' in response.get_data(as_text=True)
    assert 'Which task costs your team the most time?' not in owner.get('/').get_data(as_text=True)
    form['action'] = 'draft'
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    assert owner.post('/admin/pages/homepage', data=form).status_code == 409
    assert 'Which task costs your team the most time?' not in owner.get('/').get_data(as_text=True)
    assert owner.post('/admin/pages/homepage', data=page_form(owner, app, action='publish')).status_code == 302
    assert 'Which task costs your team the most time?' in owner.get('/').get_data(as_text=True)


def test_legacy_about_copy_survives_without_rendering_retired_ticker_fields(owner, app):
    with app.app_context():
        page = db.session.get(ManagedPage, 'homepage')
        page.published = {**page.published, 'about.heading.line1': 'A previous personal statement', 'about.paragraph1': 'Previously published personal copy.', 'ticker.0': 'A retired moving claim'}
        page.draft = deepcopy(page.published)
        db.session.commit()
        before = deepcopy(page.published)
    text = owner.get('/').get_data(as_text=True)
    assert 'A previous personal statement' in text
    assert 'Previously published personal copy.' in text
    assert 'A retired moving claim' not in text
    assert 'What should this make easier' in text
    editor = owner.get('/admin/pages/homepage').get_data(as_text=True)
    assert 'name="about.question"' in editor
    assert 'name="ticker.0"' not in editor
    with app.app_context():
        assert db.session.get(ManagedPage, 'homepage').published == before


def test_approach_question_is_plain_text_not_executable_markup(owner, app):
    form = page_form(owner, app, **{'about.question': '<img src=x onerror=alert(1)>', 'action': 'preview'})
    response = owner.post('/admin/pages/homepage', data=form)
    assert response.status_code == 200
    about = response.get_data(as_text=True).split('<section id="about"', 1)[1].split('</section>', 1)[0]
    assert '&lt;img src=x onerror=alert(1)&gt;' in about
    assert '<img src=x' not in about
