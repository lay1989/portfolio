"""The lead project follows published homepage curation and media visibility.

The opening shows the line drawing; the first curated project leads the Work section."""
from app.extensions import db
from app.models import Entry


def work_section(text):
    return text.split('<section id="work"', 1)[1].split('</section>', 1)[0]


def test_lead_project_follows_featured_order_and_never_renders_drafts(client, app):
    with app.app_context():
        projects = list(db.session.scalars(db.select(Entry).where(Entry.kind == 'project').order_by(Entry.position)))
        for project in projects:
            project.featured_position = None
        projects[0].featured_position = 0
        projects[0].published = None
        projects[1].featured_position = 1
        expected = projects[1].id
        db.session.commit()
    response = client.get('/')
    assert response.status_code == 200
    text = response.get_data(as_text=True)
    assert f'data-featured-project="{expected}"' in work_section(text)
    assert 'data-thread-page' in text
    assert '{{HOMEPAGE_PROJECTS}}' not in text


def test_no_featured_project_has_no_empty_frame_and_copy_still_renders(client, app):
    with app.app_context():
        db.session.execute(db.update(Entry).where(Entry.kind == 'project').values(featured_position=None))
        db.session.commit()
    response = client.get('/')
    assert response.status_code == 200
    text = response.get_data(as_text=True)
    assert 'Less busywork.' in text
    assert '<section id="work"' not in text
    assert 'data-featured-project=' not in text


def test_explicitly_cleared_cover_does_not_restore_legacy_image(client, app):
    with app.app_context():
        project = db.session.scalar(db.select(Entry).where(Entry.kind == 'project', Entry.featured_position.is_not(None)).order_by(Entry.featured_position))
        project.published = {**project.published, 'cover_media': {}}
        identity = project.id
        db.session.commit()
    work = work_section(client.get('/').get_data(as_text=True))
    lead = work.split(f'data-project="{identity}"', 1)[1].split('</article>', 1)[0]
    assert 'Read the case study' in lead
    assert 'class="home-work-image"' not in lead
