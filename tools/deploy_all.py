# -*- coding: utf-8 -*-
"""Deploy the site to Cloudflare Pages (primary) and optionally GitHub Pages.

Cloudflare Pages (default, needs a token):
    set CLOUDFLARE_API_TOKEN=...   (Pages:Edit)
    python tools\\deploy_all.py

Also push GitHub Pages (optional, sometimes flaky from mainland):
    python tools\\deploy_all.py --github
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "8119135f0f7a94e907a3b5ffe0b6ce9d")
NPX = shutil.which("npx") or "npx"


def run(cmd: list[str], env: dict | None = None) -> None:
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=ROOT, env=env or os.environ.copy(), check=True)


def deploy_github() -> None:
    print("\n== GitHub Pages ==")
    run([sys.executable, "-X", "utf8", "tools/deploy.py", "--lean"])


def deploy_cloudflare() -> None:
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        print("\n== Cloudflare Pages: skipped (CLOUDFLARE_API_TOKEN not set) ==")
        return
    print("\n== Cloudflare Pages ==")
    # Cloudflare uploads site/ verbatim, so bump the service-worker cache key first.
    sys.path.insert(0, str(ROOT / "tools"))
    from deploy import bump_sw_version  # noqa: PLC0415
    print("service worker version:", bump_sw_version())
    env = os.environ.copy()
    env["CLOUDFLARE_API_TOKEN"] = token
    env["CLOUDFLARE_ACCOUNT_ID"] = ACCOUNT_ID
    run([
        NPX, "--yes", "wrangler@4", "pages", "deploy", "site",
        "--project-name", "cet-prep", "--branch", "main", "--commit-dirty=true",
    ], env=env)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--github", action="store_true", help="also deploy GitHub Pages (often flaky from mainland)")
    args = ap.parse_args()

    failed = []
    # Cloudflare first: it does not depend on the flaky GitHub API path.
    try:
        deploy_cloudflare()
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        failed.append(f"cloudflare: {exc}")
    if args.github:
        try:
            deploy_github()
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            failed.append(f"github: {exc}")
    else:
        print("\n== GitHub Pages: skipped (pass --github when the link is stable) ==")
    if failed:
        print("\nFAILED: " + ", ".join(failed))
        return 1
    print("\nDONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
