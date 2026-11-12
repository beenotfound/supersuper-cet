# -*- coding: utf-8 -*-
"""Publish site/ to GitHub Pages using the stored GitHub credential.

Uses the Git Data API (blobs -> tree -> commit -> ref) so large data files are fine.
Idempotent: unchanged blobs are skipped by comparing git object ids.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
REPO = "cet-prep"
API = "https://api.github.com"


def token() -> str:
    proc = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                          capture_output=True, text=True, timeout=30)
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line[len("password="):]
    raise SystemExit("no GitHub credential available")


class GH:
    def __init__(self, tok: str):
        self.tok = tok

    def call(self, method: str, path: str, body=None, ok_404=False, retries=6):
        url = path if path.startswith("http") else API + path
        payload = json.dumps(body).encode() if body is not None else None
        last = "unknown error"
        for attempt in range(retries):
            req = urllib.request.Request(url, data=payload, method=method, headers={
                "Authorization": f"token {self.tok}",
                "User-Agent": "cet-prep-deploy",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
            })
            try:
                with urllib.request.urlopen(req, timeout=180) as resp:
                    raw = resp.read()
                    return json.loads(raw) if raw else {}
            except urllib.error.HTTPError as exc:
                if ok_404 and exc.code == 404:
                    return None
                detail = exc.read().decode("utf-8", "replace")[:400]
                last = f"GitHub API {method} {path} -> {exc.code}: {detail}"
                # 400/5xx from GitHub are often transient; retry with backoff
                if exc.code == 400 or exc.code >= 500:
                    time.sleep(2.5 * (attempt + 1))
                    continue
                raise SystemExit(last)
            except (urllib.error.URLError, TimeoutError) as exc:
                last = f"GitHub API {method} {path} -> network error: {exc}"
                time.sleep(2.5 * (attempt + 1))
        raise SystemExit(last)


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode()
    return hashlib.sha1(header + data).hexdigest()


def bump_sw_version() -> str:
    """Cache-bust the service worker with a hash of the site contents."""
    sw_path = SITE / "sw.js"
    digest = hashlib.sha1()
    for path in sorted(SITE.rglob("*")):
        if path.is_file() and path.name != "sw.js":
            digest.update(path.relative_to(SITE).as_posix().encode())
            digest.update(path.read_bytes())
    version = "cet-collage-" + digest.hexdigest()[:10]
    text = sw_path.read_text(encoding="utf-8")
    text = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", text, count=1)
    sw_path.write_text(text, encoding="utf-8")
    return version


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=REPO)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--lean", action="store_true",
                    help="skip raw .json >200KB when a .json.gz sibling exists (smaller upload)")
    args = ap.parse_args()

    version = bump_sw_version()
    print(f"service worker version: {version}")

    files: dict[str, bytes] = {}
    for path in sorted(SITE.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(SITE).as_posix()
        files[rel] = path.read_bytes()
    if args.lean:
        skipped = [rel for rel, data in files.items()
                   if rel.endswith(".json") and len(data) > 200 * 1024 and f"{rel}.gz" in files]
        for rel in skipped:
            del files[rel]
        if skipped:
            print(f"lean mode: skipped {len(skipped)} raw json files (gz served instead)")
    total = sum(len(v) for v in files.values())
    print(f"site: {len(files)} files, {total/1024/1024:.1f} MB")

    if args.dry_run:
        for rel in sorted(files):
            print(f"  {rel} ({len(files[rel])/1024:.1f} KB)")
        return 0

    gh = GH(token())
    user = gh.call("GET", "/user")["login"]
    full = f"{user}/{args.repo}"

    repo = gh.call("GET", f"/repos/{full}", ok_404=True)
    if repo is None:
        print(f"creating repo {full} ...")
        gh.call("POST", "/user/repos", {
            "name": args.repo, "private": False, "auto_init": True,
            "description": "supersuper四六级 · CET-4/6 vocabulary PWA",
        })
        time.sleep(2)
        repo = gh.call("GET", f"/repos/{full}")

    branch = repo.get("default_branch", "main")
    ref = gh.call("GET", f"/repos/{full}/git/ref/heads/{branch}")
    head_sha = ref["object"]["sha"]
    head_commit = gh.call("GET", f"/repos/{full}/git/commits/{head_sha}")
    base_tree = head_commit["tree"]["sha"]

    existing = gh.call("GET", f"/repos/{full}/git/trees/{base_tree}?recursive=1")
    remote_shas = {n["path"]: n["sha"] for n in existing.get("tree", []) if n.get("type") == "blob"}

    tree_entries = []
    uploaded = 0
    for rel, data in files.items():
        sha = git_blob_sha(data)
        if remote_shas.get(rel) == sha:
            continue
        print(f"  uploading {rel} ({len(data)/1024:.0f} KB) ...", flush=True)
        blob = gh.call("POST", f"/repos/{full}/git/blobs", {
            "content": base64.b64encode(data).decode(), "encoding": "base64",
        })
        tree_entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        uploaded += 1

    # .nojekyll so Pages serves everything verbatim
    if ".nojekyll" not in remote_shas:
        blob = gh.call("POST", f"/repos/{full}/git/blobs", {"content": "", "encoding": "base64"})
        tree_entries.append({"path": ".nojekyll", "mode": "100644", "type": "blob", "sha": blob["sha"]})

    if tree_entries:
        tree = gh.call("POST", f"/repos/{full}/git/trees", {"base_tree": base_tree, "tree": tree_entries})
        commit = gh.call("POST", f"/repos/{full}/git/commits", {
            "message": f"deploy {version}", "tree": tree["sha"], "parents": [head_sha],
        })
        gh.call("PATCH", f"/repos/{full}/git/refs/heads/{branch}", {"sha": commit["sha"], "force": True})
        print(f"committed {uploaded} changed files")
    else:
        print("no changes to upload")

    # enable Pages
    pages = gh.call("GET", f"/repos/{full}/pages", ok_404=True)
    if pages is None:
        print("enabling GitHub Pages ...")
        try:
            gh.call("POST", f"/repos/{full}/pages", {"source": {"branch": branch, "path": "/"}})
        except SystemExit as exc:
            print(f"  pages create failed ({exc}); trying update")
            gh.call("PUT", f"/repos/{full}/pages", {"source": {"branch": branch, "path": "/"}})
    else:
        print(f"pages already enabled: {pages.get('html_url')} status={pages.get('status')}")

    url = f"https://{user}.github.io/{args.repo}/"
    print(f"waiting for build: {url}")
    for _ in range(40):
        status = gh.call("GET", f"/repos/{full}/pages", ok_404=True) or {}
        if status.get("status") == "built":
            break
        time.sleep(5)

    print(f"\nLIVE: {url}")
    print("iPad/iPhone: Safari 打开 → 分享 → 添加到主屏幕")
    print("Android: Chrome 打开 → 菜单 → 安装应用 / 添加到主屏幕")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
