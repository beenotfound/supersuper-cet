# -*- coding: utf-8 -*-
"""Create desktop shortcuts + app icon for the local and online versions.

Encoding notes: Windows PowerShell 5.1 mangles non-ASCII in -Command, so the
shortcut script is handed over as a UTF-16LE base64 -EncodedCommand.
"""
from __future__ import annotations

import base64
import ctypes
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE_ICON = ROOT / "site" / "icons" / "icon-512.png"
ICO = ROOT / "site" / "icons" / "app.ico"
PYTHONW = Path(r"D:\Python312\pythonw.exe")
LAUNCHER = ROOT / "tools" / "local_open.py"
ONLINE = "https://beenotfound.github.io/cet-prep/"

LOCAL_NAME = "supersuper四六级（本地）.lnk"
ONLINE_NAME = "supersuper四六级（在线）.url"


def desktop_path() -> Path:
    buf = ctypes.create_unicode_buffer(260)
    ctypes.windll.shell32.SHGetFolderPathW(None, 0x10, None, 0, buf)  # CSIDL_DESKTOPDIRECTORY
    return Path(buf.value or (Path.home() / "Desktop"))


def make_ico() -> None:
    img = Image.open(SITE_ICON).convert("RGBA")
    img.save(ICO, sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])


def run_ps(script: str) -> subprocess.CompletedProcess:
    encoded = base64.b64encode(script.encode("utf-16-le")).decode("ascii")
    return subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60,
    )


def make_lnk(dest: Path) -> bool:
    script = f"""
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut('{dest}')
$sc.TargetPath = '{PYTHONW}'
$sc.Arguments = '"{LAUNCHER}"'
$sc.WorkingDirectory = '{ROOT}'
$sc.IconLocation = '{ICO}'
$sc.Description = 'supersuper四六级 · 本地版'
$sc.WindowStyle = 7
$sc.Save()
"""
    result = run_ps(script)
    if result.returncode != 0:
        print("powershell stderr:", result.stderr.strip()[:300])
    return dest.exists()


def make_url(dest: Path) -> bool:
    dest.write_text(f"[InternetShortcut]\nURL={ONLINE}\nIconFile={ICO}\nIconIndex=0\n", encoding="utf-8")
    return dest.exists()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not PYTHONW.exists():
        print(f"找不到 pythonw：{PYTHONW}")
        return 1

    make_ico()
    desk = desktop_path()
    print(f"desktop: {desk}")

    local = desk / LOCAL_NAME
    online = desk / ONLINE_NAME
    print(f"local  shortcut: {local} -> {make_lnk(local)}")
    print(f"online shortcut: {online} -> {make_url(online)}")

    launcher = ROOT / "打开本地版.cmd"
    stopper = ROOT / "关闭本地服务.cmd"
    launcher.write_text(
        "@echo off\r\n"
        f'start "" "{PYTHONW}" "{LAUNCHER}"\r\n',
        encoding="utf-8", newline="",
    )
    stopper.write_text(
        "@echo off\r\n"
        f'"{sys.executable}" -X utf8 "{LAUNCHER}" --stop\r\n'
        "timeout /t 2 >nul\r\n",
        encoding="utf-8", newline="",
    )
    print(f"launcher: {launcher} -> {launcher.exists()}")
    print(f"stopper : {stopper} -> {stopper.exists()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
