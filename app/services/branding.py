"""Known navigation destinations and published shell text; no editable HTML or CSS."""

from flask import current_app

from .content import ContentError


def navigation_spec():
    return current_app.config["BRANDING_SCHEMA"]["navigation"]


def fields():
    result = list(current_app.config["BRANDING_SCHEMA"]["fields"])
    for index, link in enumerate(navigation_spec(), 1):
        result.extend(
            [
                {
                    "key": f"nav.{link['id']}.label",
                    "label": f"{link['label']} link label",
                    "group": "Navigation",
                    "type": "text",
                    "limit": 40,
                    "default": link["label"],
                },
                {
                    "key": f"nav.{link['id']}.position",
                    "label": f"{link['label']} position",
                    "group": "Navigation",
                    "type": "position",
                    "limit": 1,
                    "default": str(index),
                },
            ]
        )
    return result


def validate_navigation(payload):
    positions = []
    for link in navigation_spec():
        position = payload[f"nav.{link['id']}.position"]
        if position not in [str(i) for i in range(len(navigation_spec()) + 1)]:
            raise ContentError("Choose a navigation position from the list.")
        if position != "0":
            positions.append(position)
            if not payload[f"nav.{link['id']}.label"]:
                raise ContentError("Give every visible navigation link a label.")
        if link["id"] == "tools" and payload["nav.tools.label"] != "Tools":
            raise ContentError("The Tools navigation label must stay “Tools”.")
    if len(set(positions)) != len(positions):
        raise ContentError("Use a different position for each visible navigation link.")


def navigation_for(payload, section_visible):
    links = []
    for link in navigation_spec():
        position = int(payload[f"nav.{link['id']}.position"])
        if position and (not link["section"] or section_visible(link["section"])):
            links.append(
                {
                    **link,
                    "label": payload[f"nav.{link['id']}.label"],
                    "position": position,
                }
            )
    return sorted(links, key=lambda link: link["position"])
