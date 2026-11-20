"""Prepare private staging files only. Never creates cloud resources or changes DNS."""

import argparse
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def prepare(hostname, output):
    hostname = hostname.lower()
    labels = hostname.split(".")
    if (
        len(hostname) > 253
        or len(labels) < 3
        or not all(
            re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
            for label in labels
        )
        or not re.fullmatch(r"[a-z]{2,63}", labels[-1])
    ):
        raise ValueError(
            "Use a plain staging subdomain without a scheme, port or path."
        )
    live_host = urlsplit(
        json.loads((ROOT / "data/site.json").read_text())["url"]
    ).hostname
    if hostname in {
        live_host,
        f"www.{live_host}",
        f"www.{live_host.removeprefix('www.')}",
    }:
        raise ValueError("Choose a staging subdomain, not the live website address.")
    source = ROOT / "deploy"
    nginx = (source / "portfolio.nginx.conf").read_text()
    anchor = "    server_tokens off;"
    if nginx.count(anchor) != 1:
        raise ValueError("Review the nginx source before generating staging files.")
    nginx = nginx.replace("portfolio.example.invalid", hostname).replace(
        anchor,
        anchor + "\n    include /etc/nginx/snippets/portfolio-staging-access.conf;",
    )
    environment = (
        (source / "portfolio.env.example")
        .read_text()
        .replace("portfolio.example.invalid", hostname)
        .replace("SEARCH_INDEXING_ENABLED=true", "SEARCH_INDEXING_ENABLED=false")
    )
    if (
        "SEARCH_INDEXING_ENABLED=false" not in environment
        or "INQUIRY_EMAIL_ENABLED=false" not in environment
    ):
        raise ValueError("Staging requires indexing and email to stay disabled.")
    files = {
        "portfolio.nginx.conf": nginx,
        "portfolio.env.example": environment,
        **{
            name: (source / name).read_text()
            for name in (
                "portfolio-proxy.conf",
                "portfolio-staging-access.conf",
                "portfolio.service",
                "portfolio.logrotate",
                "gunicorn.conf.py",
            )
        },
        "review.json": json.dumps(
            {
                "purpose": "private portfolio staging; local preparation only",
                "hostname_proposed": hostname,
                "authentication": "nginx basic auth on the entire server; owner creates credentials locally",
                "indexing": False,
                "email": False,
                "oracle_inventory_verified": False,
                "vm_created": False,
                "dns_changed": False,
                "blocked_until": "Live tenancy quota, free eligibility and regional capacity verified; final VM reviewed.",
            },
            indent=2,
        )
        + "\n",
    }
    output = Path(output)
    output.mkdir(mode=0o700, parents=False, exist_ok=False)
    try:
        for name, content in files.items():
            with os.fdopen(
                os.open(output / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w"
            ) as stream:
                stream.write(content)
    except Exception:
        # Remove only files created by this call; never replace an existing bundle.
        for path in output.iterdir():
            path.unlink()
        output.rmdir()
        raise
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hostname", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        output = prepare(args.hostname, args.output)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Staging preparation stopped: {exc}\n")
    print(
        f"Private staging files prepared in {output}. No VM, DNS or credentials changed."
    )


if __name__ == "__main__":
    main()
