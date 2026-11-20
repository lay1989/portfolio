"""Versioned repeating homepage sections, adapted without rewriting old snapshots."""

import re
from copy import deepcopy
from uuid import uuid4

from .content import ContentError

SECTION_TYPES = {
    "services": {
        "label": "Services",
        "singular": "Service",
        "fields": {"title": 180, "description": 1600, "tags": 500},
    },
    "process": {
        "label": "How I work",
        "singular": "Step",
        "fields": {"title": 180, "description": 1600},
    },
    "reviews": {
        "label": "Reviews",
        "singular": "Review",
        "fields": {"quote": 2400, "name": 180, "role": 240},
    },
}
MAX_ITEMS = 12


def repeat_field(name):
    return bool(re.match(r"^(service|process|review)\.\d+\.", name))


def sections_for(payload, defaults):
    """An explicit empty list stays empty; legacy positional text remains readable."""
    legacy = {**defaults, **payload}
    result = {}
    for kind, prefix, count in (
        ("services", "service", 6),
        ("process", "process", 4),
        ("reviews", "review", 6),
    ):
        if kind in payload:
            result[kind] = deepcopy(payload[kind])
        else:
            result[kind] = [
                {
                    "id": f"legacy-{prefix}-{i}",
                    **{
                        field: [
                            tag.strip()
                            for tag in legacy.get(f"{prefix}.{i}.{field}", "").split(
                                ","
                            )
                            if tag.strip()
                        ]
                        if field == "tags" and legacy.get(f"{prefix}.{i}.{field}")
                        else []
                        if field == "tags"
                        else legacy.get(f"{prefix}.{i}.{field}", "")
                        for field in SECTION_TYPES[kind]["fields"]
                    },
                }
                for i in range(count)
            ]
    return result


def blank_section(kind):
    return {
        "id": uuid4().hex,
        **{
            field: [] if field == "tags" else ""
            for field in SECTION_TYPES[kind]["fields"]
        },
    }


def read_sections(data, form, defaults):
    sections = sections_for(data, defaults)
    changed = False
    for kind, spec in SECTION_TYPES.items():
        if form.get(f"{kind}.present") != "1":
            continue
        identities = form.getlist(f"{kind}.id")
        check_ids(kind, identities)
        rows = []
        for identity in identities:
            row = {"id": identity}
            for field in spec["fields"]:
                value = form.get(f"item.{kind}.{identity}.{field}", "").strip()
                row[field] = (
                    [tag.strip() for tag in value.split(",") if tag.strip()]
                    if field == "tags"
                    else value
                )
            rows.append(row)
        sections[kind] = rows
        changed = True
    if changed:
        data.update(sections, sections_version=1)


def check_ids(kind, identities):
    if (
        len(identities) > MAX_ITEMS
        or any(
            not isinstance(value, str)
            or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", value)
            for value in identities
        )
        or len(set(identities)) != len(identities)
    ):
        raise ContentError(
            f"{SECTION_TYPES[kind]['label']}: use at most {MAX_ITEMS} items with distinct identifiers."
        )


def validate_sections(sections, publishing, clean_inline):
    result = {}
    for kind, spec in SECTION_TYPES.items():
        rows = sections[kind]
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise ContentError(f"{spec['label']}: invalid section data.")
        check_ids(kind, [row.get("id") for row in rows])
        result[kind] = []
        for row in rows:
            item = {"id": row["id"]}
            for field, limit in spec["fields"].items():
                value = row.get(field, [] if field == "tags" else "")
                if field == "tags":
                    if (
                        not isinstance(value, list)
                        or len(value) > 12
                        or any(
                            not isinstance(tag, str) or not tag.strip() or len(tag) > 40
                            for tag in value
                        )
                    ):
                        raise ContentError(
                            "Use at most 12 service tags, up to 40 characters each."
                        )
                    item[field] = [tag.strip() for tag in value]
                    continue
                if not isinstance(value, str) or len(value) > limit:
                    raise ContentError(
                        f"{spec['label']} {field}: use at most {limit} characters."
                    )
                value = (
                    clean_inline(value.strip()) if field == "quote" else value.strip()
                )
                if (
                    publishing
                    and field != "role"
                    and not (
                        re.sub(r"<[^>]*>", "", value) if field == "quote" else value
                    ).strip()
                ):
                    raise ContentError(
                        f"{spec['label']}: complete each {field} or remove the empty item before publishing."
                    )
                item[field] = value
            result[kind].append(item)
    return result


def change_section(data, action, defaults):
    direction, _, rest = action.partition(":")
    kind, _, identity = rest.partition(":")
    if kind not in SECTION_TYPES or direction not in ("add", "up", "down", "remove"):
        raise ContentError("Choose a valid section action.")
    sections = sections_for(data, defaults)
    rows = sections[kind]
    if direction == "add":
        if len(rows) >= MAX_ITEMS:
            raise ContentError(
                f"Use at most {MAX_ITEMS} {SECTION_TYPES[kind]['label'].lower()} items."
            )
        rows.append(blank_section(kind))
    else:
        index = next((i for i, row in enumerate(rows) if row["id"] == identity), None)
        if index is None:
            raise ContentError("This item is no longer present. Reload the editor.")
        if direction == "remove":
            rows.pop(index)
        else:
            target = index + (-1 if direction == "up" else 1)
            if 0 <= target < len(rows):
                rows[index], rows[target] = rows[target], rows[index]
    data.update(sections, sections_version=1)
    return kind
