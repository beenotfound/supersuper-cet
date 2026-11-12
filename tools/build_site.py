# -*- coding: utf-8 -*-
"""Assemble authored content into site/data/content.json + site/data/papers.json."""

from __future__ import annotations

import gzip
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT_CONTENT = ROOT / "site" / "data" / "content.json"
OUT_PAPERS = ROOT / "site" / "data" / "papers.json"
OUT_STATS = ROOT / "site" / "data" / "reading-stats.json"

ORDER = ["reading", "cloze", "matching", "translation", "writing"]


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    items = []
    for path in sorted(CONTENT.rglob("*.json")):
        if "papers" in path.relative_to(CONTENT).parts:
            continue
        try:
            item = json.loads(path.read_text(encoding="utf-8-sig"))
        except Exception as exc:
            print(f"!! skip {path}: {exc}")
            continue
        if isinstance(item, dict) and item.get("id") and item.get("type"):
            items.append(item)

    items.sort(key=lambda x: (ORDER.index(x["type"]) if x["type"] in ORDER else 99, x["id"]))
    OUT_CONTENT.write_text(
        json.dumps({"meta": {"count": len(items)}, "items": items}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    buckets: dict[tuple[str, str], list[str]] = defaultdict(list)
    for item in items:
        buckets[(item["type"], item.get("level", "cet6"))].append(item["id"])

    used: set[str] = set()

    def take(kind: str, level: str, n: int) -> list[str]:
        out = []
        for cid in buckets.get((kind, level), []):
            if cid in used:
                continue
            out.append(cid)
            used.add(cid)
            if len(out) == n:
                break
        return out

    papers = []
    plan = [("cet6", 4), ("cet4", 1)]
    index = 0
    for level, count in plan:
        for _ in range(count):
            index += 1
            sections = []
            for kind, need in [("reading", 2), ("cloze", 1), ("matching", 1), ("translation", 1), ("writing", 1)]:
                ids = take(kind, level, need)
                if ids:
                    sections.append({"type": kind, "level": level, "ids": ids})
            if len(sections) < 3:
                continue
            papers.append({
                "id": f"paper-{index:02d}",
                "title": f"{'六级' if level == 'cet6' else '四级'}模拟卷 {index}",
                "level": level,
                "sections": sections,
            })

    # imported papers: each item carries its paper metadata
    imported: dict[str, dict] = {}
    for item in items:
        pid = item.get("paperId")
        if not pid:
            continue
        info = imported.setdefault(pid, {
            "title": item.get("paperTitle") or pid,
            "level": item.get("paperLevel") or "cet4",
            "sections": {},
        })
        info["sections"].setdefault(item["type"], []).append(item)

    section_order = ["writing", "cloze", "matching", "reading", "translation"]
    for pid, info in sorted(imported.items()):
        sections = []
        for kind in section_order:
            group = info["sections"].get(kind) or []
            if not group:
                continue
            group.sort(key=lambda x: x["id"])
            sections.append({"type": kind, "level": info["level"], "ids": [x["id"] for x in group]})
        if len(sections) >= 2:
            papers.append({
                "id": f"bank-{pid}",
                "title": info["title"],
                "level": info["level"],
                "sections": sections,
            })

    OUT_PAPERS.write_text(
        json.dumps({"meta": {"count": len(papers)}, "items": papers}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    counts = defaultdict(int)
    for item in items:
        counts[item["type"]] += 1
    print(f"content: {len(items)} items {dict(counts)}")
    print(f"papers: {len(papers)}")
    for paper in papers:
        total = sum(len(s["ids"]) for s in paper["sections"])
        print(f"  {paper['id']} {paper['title']}: {total} items, {[s['type'] for s in paper['sections']]}")

    # ---- reading statistics: per-passage token counts so the app can compute
    #      "how many words of this passage do I already know" without shipping the
    #      whole exam bundle to the first paint.
    words_payload = json.loads((ROOT / "site" / "data" / "words.json").read_text(encoding="utf-8"))
    bank = {w["w"] for w in words_payload["words"]}
    token_re = re.compile(r"[A-Za-z][A-Za-z'-]*")

    def passage_text(item: dict) -> str:
        if item["type"] == "reading":
            return item.get("passage", "")
        if item["type"] == "cloze":
            return re.sub(r"\{\{\d+\}\}", " ", item.get("passage", ""))
        if item["type"] == "matching":
            return " ".join(p.get("text", "") for p in item.get("paragraphs", []))
        return ""

    passage_stats = []
    corpus_total = 0
    corpus_counts: Counter[str] = Counter()
    for item in items:
        text = passage_text(item)
        if not text:
            continue
        toks = [t.lower() for t in token_re.findall(text)]
        total = len(toks)
        counts = Counter(t for t in toks if t in bank)
        corpus_total += total
        corpus_counts.update(counts)
        passage_stats.append({
            "id": item["id"], "type": item["type"], "level": item.get("level", "cet6"),
            "title": item.get("title", ""), "tokens": total,
            "words": [[w, c] for w, c in sorted(counts.items(), key=lambda x: (-x[1], x[0]))],
        })

    stats = {
        "meta": {"passages": len(passage_stats), "tokens": corpus_total},
        "passages": passage_stats,
        "corpus": {
            "tokens": corpus_total,
            "words": [[w, c] for w, c in sorted(corpus_counts.items(), key=lambda x: (-x[1], x[0]))],
        },
    }
    OUT_STATS.write_text(json.dumps(stats, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"reading stats: {len(passage_stats)} passages, {corpus_total} tokens, "
          f"{len(corpus_counts)} in-bank types ({OUT_STATS.stat().st_size/1024:.0f} KB)")

    # pre-compress the data bundle: 3.4 MB -> ~0.9 MB over the wire
    for name in ("words.json", "words-detail.json", "questions-vocab.json", "content.json", "papers.json", "reading-stats.json"):
        path = ROOT / "site" / "data" / name
        if not path.exists():
            continue
        gz = path.with_name(path.name + ".gz")
        gz.write_bytes(gzip.compress(path.read_bytes(), 9))
        print(f"  gz {name}: {path.stat().st_size/1024:.0f} -> {gz.stat().st_size/1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
