"""Homepage work follows curation; the first curated project leads the section."""
import re

from app.extensions import db
from app.models import Entry
from test_pages_and_collections import page_form


def curated(app, count=3):
    with app.app_context():
        rows = list(db.session.scalars(db.select(Entry).where(Entry.kind == 'project').order_by(Entry.position)))
        for row in rows:
            row.featured_position = None
        # Deliberately use a different order from the full Work collection.
        for position, row in enumerate(rows[1:count + 1]):
            row.featured_position = position
        db.session.commit()
        return [row.id for row in rows[1:count + 1]]


def test_work_follows_featured_order_with_the_first_as_lead(client, app):
    ids = curated(app)
    text = client.get('/').get_data(as_text=True)
    work = text.split('<section id="work"', 1)[1].split('</section>', 1)[0]
    assert re.findall(r'data-project="([^"]+)"', work) == ids
    assert f'data-featured-project="{ids[0]}"' in work
    assert text.count('data-featured-project=') == 1
    assert text.index('id="hero"') < text.index('id="about"') < text.index('id="work"')
    assert '<h3' in work


def test_unpublished_project_never_appears_in_work(client, app):
    ids = curated(app, 4)
    with app.app_context():
        db.session.get(Entry, ids[1]).published = None
        db.session.commit()
    text = client.get('/').get_data(as_text=True)
    work = text.split('<section id="work"', 1)[1].split('</section>', 1)[0]
    assert re.findall(r'data-project="([^"]+)"', work) == [ids[0], ids[2], ids[3]][:3]
    assert f'data-project="{ids[1]}"' not in text


def test_single_featured_project_leads_the_work_section(client, app):
    ids = curated(app, 1)
    text = client.get('/').get_data(as_text=True)
    work = text.split('<section id="work"', 1)[1].split('</section>', 1)[0]
    assert re.findall(r'data-project="([^"]+)"', work) == ids
    assert f'data-featured-project="{ids[0]}"' in work


def test_cleared_work_image_leaves_readable_case_study_without_blank_frame(client, app):
    ids = curated(app, 2)
    with app.app_context():
        row = db.session.get(Entry, ids[1])
        row.published = {**row.published, 'cover_media': {}, 'thumbnail_media': {}}
        title = row.published['title']
        db.session.commit()
    text = client.get('/').get_data(as_text=True)
    work = text.split('<section id="work"', 1)[1].split('</section>', 1)[0]
    card = work.split(f'data-project="{ids[1]}"', 1)[1].split('</article>', 1)[0]
    assert title in card
    assert 'Read the case study' in card
    assert 'class="home-work-image"' not in card


def test_work_copy_uses_existing_preview_draft_and_publish_workflow(owner, app):
    form = page_form(owner, app, **{'work.intro': 'A closer look at the choices behind the work.', 'action': 'preview'})
    preview = owner.post('/admin/pages/homepage', data=form)
    assert preview.status_code == 200
    assert 'A closer look at the choices behind the work.' in preview.get_data(as_text=True)
    assert 'A closer look at the choices behind the work.' not in owner.get('/').get_data(as_text=True)
    form['action'] = 'draft'
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    assert 'A closer look at the choices behind the work.' not in owner.get('/').get_data(as_text=True)
    assert owner.post('/admin/pages/homepage', data=page_form(owner, app, action='publish')).status_code == 302
    assert 'A closer look at the choices behind the work.' in owner.get('/').get_data(as_text=True)
