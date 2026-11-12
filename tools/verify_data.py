# -*- coding: utf-8 -*-
"""Validate the built site data before publishing."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"

problems: list[str] = []
notes: list[str] = []


def bad(msg: str) -> None:
    problems.append(msg)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    words = json.loads((DATA / "words.json").read_text(encoding="utf-8"))
    details = json.loads((DATA / "words-detail.json").read_text(encoding="utf-8"))
    vocab = json.loads((DATA / "questions-vocab.json").read_text(encoding="utf-8"))
    content = json.loads((DATA / "content.json").read_text(encoding="utf-8"))
    papers = json.loads((DATA / "papers.json").read_text(encoding="utf-8"))
    stats = json.loads((DATA / "reading-stats.json").read_text(encoding="utf-8"))

    ws = words["words"]
    ids = set()
    ipa = 0
    for w in ws:
        if w["w"] in ids:
            bad(f"duplicate word id {w['w']}")
        ids.add(w["w"])
        if not w.get("t"):
            bad(f"word without translation: {w['w']}")
        if w.get("i"):
            ipa += 1
        if not (0.8 <= w.get("d", -1) <= 9.5):
            bad(f"difficulty out of range: {w['w']}={w.get('d')}")
        if not set(w.get("g", [])) <= {"cet4", "cet6", "cet6only"}:
            bad(f"bad tags: {w['w']}")
    if len(ws) < 6500:
        bad(f"word count too low: {len(ws)}")
    cov = ipa / max(len(ws), 1)
    if cov < 0.95:
        bad(f"IPA coverage too low: {cov:.1%}")

    vitems = vocab["items"]
    by_type: dict[str, int] = {}
    for q in vitems:
        by_type[q["type"]] = by_type.get(q["type"], 0) + 1
        if q["word"] not in ids:
            bad(f"question references unknown word: {q['word']}")
        if q["type"] == "spell":
            if not q.get("answer"):
                bad(f"spell without answer: {q['id']}")
            continue
        opts = q.get("options") or []
        if len(opts) != 4:
            bad(f"{q['id']}: needs 4 options")
        elif len(set(opts)) != 4:
            bad(f"{q['id']}: duplicate options")
        if not (0 <= q.get("answer", -1) < 4):
            bad(f"{q['id']}: answer index out of range")
        if not q.get("explain"):
            bad(f"{q['id']}: missing explanation")
    if len(vitems) < 3500:
        bad(f"vocab bank too small: {len(vitems)}")

    citems = content["items"]
    cids = {c["id"] for c in citems}
    for c in citems:
        if not c.get("id") or not c.get("type"):
            bad("content item missing id/type")
        if c.get("type") in {"reading", "cloze", "matching"} and not c.get("passage") and not c.get("paragraphs"):
            bad(f"{c['id']}: no passage")

    for paper in papers["items"]:
        for section in paper["sections"]:
            for cid in section["ids"]:
                if cid not in cids:
                    bad(f"paper {paper['id']} references missing content {cid}")

    for item in details["items"]:
        if item.get("w") not in ids:
            bad(f"detail for unknown word: {item.get('w')}")
    if len(details["items"]) < 5000:
        bad(f"detail coverage too low: {len(details['items'])}")

    if stats["meta"]["passages"] < 10:
        bad(f"reading stats too small: {stats['meta']['passages']} passages")
    for passage in stats["passages"]:
        if passage["tokens"] <= 0:
            bad(f"reading stats: {passage['id']} has no tokens")
        if passage["id"] not in cids:
            bad(f"reading stats references missing content {passage['id']}")
    if not stats["corpus"]["words"]:
        bad("reading stats corpus is empty")

    notes.append(f"words={len(ws)} ipa={cov:.1%}")
    notes.append(f"details={len(details['items'])}")
    notes.append(f"reading stats: {stats['meta']['passages']} passages / {stats['meta']['tokens']} tokens")
    notes.append(f"vocab={len(vitems)} {by_type}")
    notes.append(f"content={len(citems)} papers={len(papers['items'])}")

    for n in notes:
        print(n)
    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems[:60]:
            print("  -", p)
        return 1
    print("\nALL DATA VALID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
