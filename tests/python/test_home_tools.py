"""Tools stays owner-curated, publication-scoped and useful without an image."""
import re
from copy import deepcopy
from html import escape

import pytest

from app.extensions import db
from app.models import Entry, EntryAddress
from app.services.media import new_placement, prepare_media, sync_references
from test_media import image_bytes, upload
from test_pages_and_collections import page_form


def tool_records(app, count):
    identities = []
    with app.app_context():
        for index in range(count):
            data = {'title': f'Fixture tool {index}', 'summary': f'Full description for tool {index}.',
                    'category': 'Utilities', 'launch_url': f'https://example.com/tool-{index}',
                    'seo_title': f'Fixture tool {index}', 'seo_description': 'Isolated test content.'}
            entry = Entry(kind='tool', slug=f'fixture-tool-{index}', path=f'/tools/fixture-tool-{index}.html',
                          position=index, featured_position=count-index, draft=deepcopy(data), published=data)
            db.session.add(entry)
            db.session.flush()
            db.session.add(EntryAddress(path=entry.path, entry_id=entry.id))
            identities.append(entry.id)
        db.session.commit()
    return list(reversed(identities))


def tool_section(response):
    text = response.get_data(as_text=True)
    return text.split('<section id="tools"', 1)[1].split('</section>', 1)[0] if '<section id="tools"' in text else ''


@pytest.mark.parametrize('count', [0, 1, 3])
def test_home_tools_uses_published_featured_order_with_separate_actions(client, app, count):
    identities = tool_records(app, count)
    section = tool_section(client.get('/'))
    if not count:
        assert not section
        assert 'id="latest-posts"' in client.get('/').get_data(as_text=True)
        return
    assert re.findall(r'data-tool="([^"]+)"', section) == identities
    assert re.search(r'<h2[^>]*>Tools</h2>', section)
    assert section.count('class="home-tool-about') == count
    assert section.count('class="home-outline-action') == count
    assert section.count('target="_blank" rel="noopener noreferrer"') == count
    assert section.count('(opens in a new tab)') == count
    assert 'class="home-tool-image"' not in section
    assert 'href="/tools.html"' in section


def test_tool_limit_private_drafts_and_missing_launch_url(client, app):
    identities = tool_records(app, 5)
    with app.app_context():
        db.session.get(Entry, identities[1]).published = None
        entry = db.session.get(Entry, identities[0])
        entry.published = {**entry.published, 'title': 'A tool <for teams> & owners', 'launch_url': ''}
        entry.draft = {**deepcopy(entry.published), 'title': 'Private tool name', 'launch_url': 'https://example.com/private'}
        db.session.commit()
    section = tool_section(client.get('/'))
    assert re.findall(r'data-tool="([^"]+)"', section) == [identities[0], identities[2], identities[3]]
    assert 'Private tool name' not in section and 'https://example.com/private' not in section
    assert escape('A tool <for teams> & owners') in section
    assert section.count('class="home-outline-action') == 2
    assert section.count('class="home-tool-about') == 3


def test_tool_image_uses_published_thumbnail_mobile_crop_then_cover_and_clear(owner, app):
    identity = tool_records(app, 1)[0]
    cover_id = upload(owner).json['asset']['id']
    thumbnail_id = upload(owner, raw=image_bytes(size=(300, 200))).json['asset']['id']
    with app.app_context():
        entry = db.session.get(Entry, identity)
        data = {**deepcopy(entry.published),
                'cover_media': {**new_placement(), 'asset_id': cover_id, 'alt': 'Tool cover'},
                'thumbnail_media': {**new_placement(), 'asset_id': thumbnail_id, 'alt': 'Published tool image', 'ratio': 'square', 'mobile_ratio': 'portrait', 'mobile_x': 100}}
        prepare_media(data, publishing=True)
        entry.published = data
        entry.draft = {**deepcopy(data), 'thumbnail_media': data['cover_media']}
        sync_references(entry)
        db.session.commit()
    section = tool_section(owner.get('/'))
    assert f'/media/{thumbnail_id}/' in section and f'/media/{cover_id}/' not in section
    assert 'alt="Published tool image"' in section and 'loading="lazy"' in section
    assert 'width="160" height="200"' in section
    with app.app_context():
        entry = db.session.get(Entry, identity)
        entry.published = {**entry.published, 'thumbnail_media': new_placement()}
        sync_references(entry)
        db.session.commit()
    assert 'alt="Tool cover"' in tool_section(owner.get('/'))
    with app.app_context():
        entry = db.session.get(Entry, identity)
        entry.published = {**entry.published, 'cover_media': new_placement()}
        sync_references(entry)
        db.session.commit()
    section = tool_section(owner.get('/'))
    assert 'class="home-tool-image"' not in section
    assert 'Full description for tool 0.' in section and 'Open tool' in section


def test_home_tool_labels_and_intro_use_page_preview_draft_publication(owner, app):
    tool_records(app, 1)
    intro = 'A collection of tools built for practical tasks.'
    form = page_form(owner, app, **{'tools.intro': intro, 'tools.open': 'Launch tool', 'tools.about': 'Tool details', 'action': 'preview'})
    preview = owner.post('/admin/pages/homepage', data=form)
    assert preview.status_code == 200
    assert intro in tool_section(preview) and 'Launch tool' in tool_section(preview) and 'Tool details' in tool_section(preview)
    assert intro not in tool_section(owner.get('/'))
    form['action'] = 'draft'
    assert owner.post('/admin/pages/homepage', data=form).status_code == 302
    assert intro not in tool_section(owner.get('/'))
    assert owner.post('/admin/pages/homepage', data=page_form(owner, app, action='publish')).status_code == 302
    assert intro in tool_section(owner.get('/'))
