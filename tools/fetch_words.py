# -*- coding: utf-8 -*-
"""Fetch CET4/CET6 word data through the GitHub API.

raw.githubusercontent.com is unreachable on this machine, but api.github.com works,
so blobs are pulled via the git blobs endpoint and decoded locally.

Usage: python tools/fetch_words.py [--with-synonyms] [--force]
"""
from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "source"
REPO = "KyleBing/english-vocabulary"
BRANCH = "master"

TARGETS = [
    ("full_line_jsonl/sentence/正序/六级.jsonl", "cet6.jsonl"),
    ("full_line_jsonl/sentence/正序/四级.jsonl", "cet4.jsonl"),
]
SYNONYM_TARGET = ("full_line_jsonl/full/正序/六级.jsonl", "cet6_full.jsonl")


def github_token() -> str:
    try:
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception as exc:
        raise SystemExit(f"could not run git credential: {exc}")
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line[len("password="):]
    raise SystemExit("No GitHub credential stored in Git Credential Manager.")


def api_get(url: str, token: str, timeout: int = 600) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"token {token}",
            "User-Agent": "cet-prep-builder",
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--with-synonyms", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    token = github_token()

    print("listing repo tree ...")
    tree = api_get(f"https://api.github.com/repos/{REPO}/git/trees/{BRANCH}?recursive=1", token)
    nodes = {n["path"]: n for n in tree.get("tree", []) if n.get("type") == "blob"}

    targets = list(TARGETS)
    if args.with_synonyms:
        targets.append(SYNONYM_TARGET)

    for path, name in targets:
        dest = OUT / name
        if dest.exists() and dest.stat().st_size > 100_000 and not args.force:
            print(f"skip existing {name} ({dest.stat().st_size/1024/1024:.1f} MB)")
            continue
        node = nodes.get(path)
        if not node:
            print(f"!! not found in repo: {path}")
            continue
        print(f"fetching {path} ({node['size']/1024/1024:.1f} MB) ...")
        blob = api_get(f"https://api.github.com/repos/{REPO}/git/blobs/{node['sha']}", token)
        raw = base64.b64decode(blob["content"].replace("\n", "").replace("\r", ""))
        dest.write_bytes(raw)
        print(f"wrote {dest} ({dest.stat().st_size/1024/1024:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
