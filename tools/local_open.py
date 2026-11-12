# -*- coding: utf-8 -*-
"""Start (or stop) the local preview server and open the browser.

Usage:
  pythonw tools/local_open.py            # start hidden, open browser
  python  tools/local_open.py --no-open  # start only (for testing)
  python  tools/local_open.py --stop     # stop the server started by this script
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DATA = ROOT / "data"
STATE = DATA / "local_server.json"
LOG = DATA / "local_server.log"


def log(message: str) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with LOG.open("a", encoding="utf-8") as fh:
        fh.write(f"[{stamp}] {message}\n")


def is_our_site(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/index.html", timeout=2) as resp:
            return "supersuper四六级" in resp.read().decode("utf-8", "replace")
    except Exception:
        return False


def port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def read_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def stop_server() -> int:
    state = read_state()
    pid = state.get("pid")
    if not pid:
        print("没有找到本脚本启动的服务。")
        return 0
    try:
        subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True, timeout=15)
        log(f"stopped pid={pid}")
        print(f"已停止本地服务（pid {pid}）。")
    except Exception as exc:
        print(f"停止失败：{exc}")
    try:
        STATE.unlink()
    except Exception:
        pass
    return 0


class QuietHandler(SimpleHTTPRequestHandler):
    """Same as SimpleHTTPRequestHandler but logs to a file instead of the console."""

    def log_message(self, fmt, *args):  # noqa: D102
        log(f"{self.address_string()} {fmt % args}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true")
    ap.add_argument("--stop", action="store_true")
    args = ap.parse_args()

    if args.stop:
        return stop_server()
    if not SITE.exists():
        print(f"找不到站点目录：{SITE}")
        return 1

    port = args.port
    if is_our_site(port):
        if not args.no_open:
            webbrowser.open(f"http://127.0.0.1:{port}/")
        print(f"已经在运行：http://127.0.0.1:{port}/")
        return 0

    for candidate in range(port, port + 12):
        if port_free(candidate):
            port = candidate
            break
    else:
        print("8765–8776 端口都被占用了。")
        return 1

    handler = partial(QuietHandler, directory=str(SITE))
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError as exc:
        print(f"无法监听端口 {port}：{exc}")
        return 1

    DATA.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps({"pid": os.getpid(), "port": port, "started": time.time()}), encoding="utf-8")
    log(f"listening on 127.0.0.1:{port} pid={os.getpid()}")

    if not args.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(f"http://127.0.0.1:{port}/")).start()
    print(f"本地服务：http://127.0.0.1:{port}/  （关闭窗口不会停止服务，用 --stop 停止）")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        try:
            if read_state().get("pid") == os.getpid():
                STATE.unlink()
        except Exception:
            pass
        log("server stopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
