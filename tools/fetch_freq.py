# -*- coding: utf-8 -*-
"""Fetch an MIT-licensed English frequency list (hermitdave/FrequencyWords, en_50k).

Output: data/source/freq_en_50k.txt  (lines: "<word> <count>", most frequent first)
"""
from __future__ import annotations

import base64
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "source" / "freq_en_50k.txt"
REPO = "hermitdave/FrequencyWords"
PATH = "content/2018/en/en_50k.txt"


def token() -> str:
    proc = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                          capture_output=True, text=True, timeout=30)
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line[len("password="):]
    raise SystemExit("no GitHub credential")


def get(url: str, tok: str):
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {tok}", "User-Agent": "cet-prep-builder",
        "Accept": "application/vnd.github+json",
    })
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if OUT.exists() and OUT.stat().st_size > 100_000:
        print(f"skip existing {OUT}")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tok = token()
    tree = get(f"https://api.github.com/repos/{REPO}/git/trees/master?recursive=1", tok)
    node = next((n for n in tree["tree"] if n.get("path") == PATH), None)
    if not node:
        raise SystemExit(f"{PATH} not found")
    print(f"fetching {PATH} ({node['size']/1024:.0f} KB)")
    blob = get(f"https://api.github.com/repos/{REPO}/git/blobs/{node['sha']}", tok)
    raw = base64.b64decode(blob["content"].replace("\n", ""))
    OUT.write_bytes(raw)
    print(f"wrote {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
