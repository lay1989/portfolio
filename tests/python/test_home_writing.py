"""Homepage Writing follows published curation and the existing media workflow."""
import re
from copy import deepcopy
from html import escape

import pytest

from app.extensions import db
from app.models import Entry
from app.services.media import new_placement, prepare_media, sync_references
from test_media import image_bytes, upload
from test_pages_and_collections import page_form


def writing(response):
    text = response.get_data(as_text=True)
    if '<section id="latest-posts"' not in text:
        return ''
    return text.split('<section id="latest-posts"', 1)[1].split('</section>', 1)[0]


def curate(app, count):
    with app.app_context():
        rows = list(db.session.scalars(db.select(Entry).where(Entry.kind == 'post').order_by(Entry.position)))
        for row in rows:
            row.featured_position = None
        selected = list(reversed(rows))[:count]
        for index, row in enumerate(selected):
            row.featured_position = index
        db.session.commit()
        return [row.id for row in selected]


@pytest.mark.parametrize('count', [0, 1, 2, 3])
def test_curated_articles_keep_owner_order_and_adapt_to_empty_or_small_sets(client, app, count):
    identities = curate(app, count)
    section = writing(client.get('/'))
    if not count:
        assert not section
        assert 'id="services"' in client.get('/').get_data(as_text=True)
        return
    assert re.findall(r'data-post="([^"]+)"', section) == identities
    assert section.count('home-writing-entry--lead') == 1
    assert section.count('<h3') == count
    assert section.count('class="home-writing-image"') == count
    assert section.count('loading="lazy"') == count
    assert 'line-clamp' not in section
    assert 'href="/blog.html"' in section


def test_only_published_articles_and_images_render_without_private_draft_leaks(client, app):
    identities = curate(app, 5)
    with app.app_context():
        db.session.get(Entry, identities[1]).published = None
        row = db.session.get(Entry, identities[0])
        row.published = {**row.published, 'title': 'Planning <a website> & its content', 'summary': 'Complete summary & useful details.'}
        row.draft = {**deepcopy(row.published), 'title': 'Private unreviewed title'}
        db.session.commit()
    section = writing(client.get('/'))
    assert re.findall(r'data-post="([^"]+)"', section) == [identities[0], identities[2], identities[3]]
    assert 'Private unreviewed title' not in section
    assert escape('Planning <a website> & its content') in section
    assert 'Complete summary &amp; useful details.' in section


def test_writing_respects_published_thumbnail_mobile_crop_cover_fallback_and_removal(owner, app):
    identity = curate(app, 1)[0]
    cover_id = upload(owner).json['asset']['id']
    thumbnail_id = upload(owner, raw=image_bytes(size=(300, 200))).json['asset']['id']
    with app.app_context():
        row = db.session.get(Entry, identity)
        data = {**deepcopy(row.published),
                'cover_media': {**new_placement(), 'asset_id': cover_id, 'alt': 'Published article cover'},
                'thumbnail_media': {**new_placement(), 'asset_id': thumbnail_id, 'alt': 'Published article preview', 'ratio': 'square', 'mobile_ratio': 'portrait', 'mobile_x': 100}}
        prepare_media(data, publishing=True)
        row.published = data
        row.draft = {**deepcopy(data), 'thumbnail_media': data['cover_media']}
        sync_references(row)
        db.session.commit()
    section = writing(owner.get('/'))
    assert f'/media/{thumbnail_id}/' in section and f'/media/{cover_id}/' not in section
    assert 'alt="Published article preview"' in section
    assert 'width="160" height="200"' in section
    with app.app_context():
        row = db.session.get(Entry, identity)
        row.published = {**row.published, 'thumbnail_media': new_placement()}
        sync_references(row)
        db.session.commit()
    assert 'alt="Published article cover"' in writing(owner.get('/'))
    with app.app_context():
        row = db.session.get(Entry, identity)
        row.published = {**row.published, 'cover_media': new_placement()}
        title = row.published['title']
        sync_references(row)
        db.session.commit()
    section = writing(owner.get('/'))
    assert 'class="home-writing-image"' not in section and '<img' not in section
    assert escape(title) in section and 'Read article' in section


def test_writing_section_copy_uses_preview_draft_and_publication(owner, app):
    curate(app, 1)
    intro = 'Notes about the decisions behind a working website.'
    form = page_form(owner, app, **{'posts.intro': intro, 'posts.allArticles': 'Browse articles', 'action': 'preview'})
    preview = owner.post('/admin/pages/homepage', data=form)
    assert preview.status_code == 200
    assert intro in writing(preview) and 'Browse articles' in writing(preview)
    assert intro not in writing(owner.get('/'))
    form['action'] = 'draft'
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    assert intro not in writing(owner.get('/'))
    assert owner.post('/admin/pages/homepage', data=page_form(owner, app, action='publish')).status_code == 302
    assert intro in writing(owner.get('/'))
