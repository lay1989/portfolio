"""The service directory remains driven by published, editable records."""
import re
from copy import deepcopy

from app.extensions import db
from app.models import ManagedPage
from test_home_sections import sections_form, sections_state
from test_pages_and_collections import page_form


def service_section(response):
    return response.get_data(as_text=True).split('<section id="services"', 1)[1].split('</section>', 1)[0]


def test_directory_renders_all_published_rows_in_owner_order_and_escapes_tags(owner, app):
    rows = sections_state(app)
    extra = deepcopy(rows['services'][0])
    extra.update(id='new-service', title='An additional service', tags=['SQL & ORM', '<script>bad()</script>'])
    rows['services'].insert(0, extra)
    assert owner.post('/admin/pages/homepage', data=sections_form(owner, app, rows, action='publish')).status_code == 302
    section = service_section(owner.get('/'))
    assert re.findall(r'data-home-item="([^"]+)"', section) == [row['id'] for row in rows['services']]
    assert 'An additional service' in section
    assert 'SQL &amp; ORM' in section
    assert '&lt;script&gt;bad()&lt;/script&gt;' in section
    assert '<script>bad()' not in section
    assert '<ol id="services-list"' in section
    assert 'Six services' not in section
    assert 'href="#contact"' in section


def test_services_without_technology_tags_keep_their_description_without_empty_list(owner, app):
    rows = sections_state(app)
    row = rows['services'][0]
    row['tags'] = []
    rows['services'] = [row]
    assert owner.post('/admin/pages/homepage', data=sections_form(owner, app, rows, action='publish')).status_code == 302
    section = service_section(owner.get('/'))
    assert row['description'] in section
    assert 'home-service-tags' not in section
    assert 'hidden' not in section.replace('aria-hidden="true"', '')


def test_service_project_prompt_uses_preview_draft_and_publish(owner, app):
    prompt = 'Tell me which part of your business needs attention.'
    form = page_form(owner, app, **{'services.note': prompt, 'services.cta': 'Talk through your project', 'action': 'preview'})
    response = owner.post('/admin/pages/homepage', data=form)
    assert response.status_code == 200
    assert prompt in service_section(response)
    assert prompt not in service_section(owner.get('/'))
    form['action'] = 'draft'
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    assert prompt not in service_section(owner.get('/'))
    assert owner.post('/admin/pages/homepage', data=page_form(owner, app, action='publish')).status_code == 302
    assert prompt in service_section(owner.get('/'))
    assert 'Talk through your project' in service_section(owner.get('/'))


def test_old_service_copy_is_not_replaced_by_new_source_defaults(owner, app):
    with app.app_context():
        page = db.session.get(ManagedPage, 'homepage')
        page.published = {**page.published, 'service.0.title': 'Websites & Landing Pages', 'service.0.description': 'Previously published service description.', 'service.0.tags': 'CUSTOM STACK'}
        page.draft = deepcopy(page.published)
        before = deepcopy(page.published)
        db.session.commit()
    section = service_section(owner.get('/'))
    assert 'Websites &amp; Landing Pages' in section
    assert 'Previously published service description.' in section
    assert 'CUSTOM STACK' in section
    assert owner.get('/admin/pages/homepage').status_code == 200
    with app.app_context():
        assert db.session.get(ManagedPage, 'homepage').published == before
