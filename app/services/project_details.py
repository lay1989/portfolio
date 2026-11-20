"""Editable project evidence, with read-only adapters for imported snapshots."""

import re
from copy import deepcopy
from uuid import uuid4

from .content import ContentError

MAX_FIGURES = 12
FIGURE_LIMITS = {"label": 100, "value": 180, "note": 500}
FEEDBACK_LIMITS = {"quote": 2400, "author": 180, "role": 240}


def figures_for(data):
    if "project_figures" in data:
        return deepcopy(data["project_figures"])
    return [
        {"id": f"legacy-figure-{i}", "label": label, "value": str(value), "note": ""}
        for i, (label, value) in enumerate(data.get("metrics", {}).items())
    ]


def feedback_for(data):
    feedback = data.get("testimonial") or {}
    return {
        "quote": feedback.get("quote", ""),
        "author": feedback.get("author", ""),
        "role": feedback.get("role", feedback.get("position", "")),
    }


def blank_figure():
    return {"id": uuid4().hex, **dict.fromkeys(FIGURE_LIMITS, "")}


def check_ids(identities):
    if (
        len(identities) > MAX_FIGURES
        or any(
            not isinstance(i, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", i)
            for i in identities
        )
        or len(set(identities)) != len(identities)
    ):
        raise ContentError("Use up to 12 project figures with distinct identifiers.")


def read_details(data, form):
    if form.get("figures_present") == "1":
        identities = form.getlist("figure_id")
        check_ids(identities)
        data["project_figures"] = [
            {
                "id": identity,
                **{
                    key: form.get(f"figure.{identity}.{key}", "").strip()
                    for key in FIGURE_LIMITS
                },
            }
            for identity in identities
        ]
    if form.get("feedback_present") == "1":
        feedback = {
            key: form.get(f"feedback.{key}", "").strip() for key in FEEDBACK_LIMITS
        }
        previous = data.get("testimonial") or {}
        data["testimonial"] = (
            {**previous, **feedback} if any(feedback.values()) else None
        )


def validate_details(data, publishing=False):
    rows = figures_for(data)
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ContentError("Invalid project figures.")
    check_ids([row.get("id") for row in rows])
    for row in rows:
        for key, limit in FIGURE_LIMITS.items():
            value = row.get(key, "")
            if not isinstance(value, str) or len(value) > limit:
                raise ContentError(
                    f"Project figure {key}: use at most {limit} characters."
                )
        if publishing and (
            not row.get("label", "").strip() or not row.get("value", "").strip()
        ):
            raise ContentError(
                "Complete each project figure label and value, or remove the figure before publishing."
            )
    feedback = data.get("testimonial")
    if feedback is not None and not isinstance(feedback, dict):
        raise ContentError("Invalid client feedback.")
    feedback = feedback_for(data)
    for key, limit in FEEDBACK_LIMITS.items():
        if not isinstance(feedback[key], str) or len(feedback[key]) > limit:
            raise ContentError(
                f"Client feedback {key}: use at most {limit} characters."
            )
    if (
        publishing
        and any(feedback.values())
        and (not feedback["quote"].strip() or not feedback["author"].strip())
    ):
        raise ContentError(
            "Client feedback needs a quotation and author before publishing. Clear all feedback fields to remove it."
        )


def change_figure(data, action):
    direction, _, identity = action.partition(":")
    rows = figures_for(data)
    if direction == "add":
        if len(rows) >= MAX_FIGURES:
            raise ContentError("Use up to 12 project figures.")
        rows.append(blank_figure())
    else:
        index = next((i for i, row in enumerate(rows) if row["id"] == identity), None)
        if index is None or direction not in ("up", "down", "remove"):
            raise ContentError("Choose a valid project figure action.")
        if direction == "remove":
            rows.pop(index)
        else:
            target = index + (-1 if direction == "up" else 1)
            if 0 <= target < len(rows):
                rows[index], rows[target] = rows[target], rows[index]
    data["project_figures"] = rows
