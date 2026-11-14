# -*- coding: utf-8 -*-
"""打印匿名统计：DAU、次日/7 日留存、关键功能完成率。

用法（PowerShell）：
    $env:CLOUDFLARE_API_TOKEN = "..."
    python tools/analytics_report.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request

ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "8119135f0f7a94e907a3b5ffe0b6ce9d")
DB = os.environ.get("CET_ANALYTICS_DB", "6b8e6d42-7be7-45f5-ae5e-37aae6f4d7af")
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()


def query(sql: str):
    if not TOKEN:
        raise SystemExit("先设置 CLOUDFLARE_API_TOKEN")
    body = json.dumps({"sql": sql}).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/d1/database/{DB}/query",
        data=body, method="POST",
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())["result"][0]["results"]


def table(title: str, rows: list[dict]) -> None:
    print(f"\n== {title} ==")
    if not rows:
        print("(no data)")
        return
    cols = list(rows[0].keys())
    print(" | ".join(cols))
    for row in rows:
        print(" | ".join(str(row.get(c, "")) for c in cols))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    table("每日活跃 / 事件量（最近 14 天）", query("""
        SELECT day,
               COUNT(DISTINCT cid) AS 活跃用户,
               COUNT() AS 事件数
        FROM events
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
    """))

    table("留存：首次访问后的次日 / 7 日回访", query("""
        WITH first_seen AS (
          SELECT cid, MIN(day) AS d0 FROM events WHERE ev = 'app_open' GROUP BY cid
        )
        SELECT f.d0 AS 首次日期,
               COUNT(DISTINCT f.cid) AS 新增,
               COUNT(DISTINCT CASE WHEN e.day = date(f.d0, '+1 day') THEN e.cid END) AS 次日,
               COUNT(DISTINCT CASE WHEN e.day = date(f.d0, '+7 day') THEN e.cid END) AS 七日后
        FROM first_seen f
        LEFT JOIN events e ON e.cid = f.cid AND e.ev = 'app_open'
        GROUP BY f.d0
        ORDER BY f.d0 DESC
        LIMIT 14
    """))

    funnel_rows = query("""
        SELECT ev, COUNT(DISTINCT cid) AS users
        FROM events
        WHERE day >= date('now', '-7 day')
        GROUP BY ev
    """)
    f = {r["ev"]: r["users"] for r in funnel_rows}
    def rate(a: str, b: str) -> str:
        if not f.get(b):
            return "-"
        return f"{round(f.get(a, 0) / f[b] * 100)}%"

    print("\n== 关键完成率（最近 7 天，按独立匿名用户）==")
    print("校准完成率：", rate("calibration_complete", "calibration_start"))
    print("复核完成率：", rate("recheck_complete", "recheck_start"))
    print("学习组完成率：", rate("study_finish", "study_start"))
    print("听力套完成率：", rate("listening_submit", "listening_start"))
    print("模考提交率：", rate("exam_finish", "exam_start"))

    table("事件次数（最近 7 天）", query("""
        SELECT ev, COUNT() AS 次数, COUNT(DISTINCT cid) AS 人数
        FROM events
        WHERE day >= date('now', '-7 day')
        GROUP BY ev
        ORDER BY 次数 DESC
    """))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
