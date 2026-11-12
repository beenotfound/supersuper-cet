# -*- coding: utf-8 -*-
"""Validate authored content JSON under content/ (excluding content/papers/).

Usage:  python tools/verify_content.py [--fix-report]
Exit code 0 = all good, 1 = errors printed.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

TYPES = {"reading", "cloze", "matching", "translation", "writing"}
LEVELS = {"cet4", "cet6"}
LETTERS = list("ABCDEFGHIJ")

errors: list[str] = []
warnings: list[str] = []


def err(path: Path, msg: str) -> None:
    errors.append(f"{path.relative_to(ROOT)} :: {msg}")


def warn(path: Path, msg: str) -> None:
    warnings.append(f"{path.relative_to(ROOT)} :: {msg}")


def is_word(s) -> bool:
    return isinstance(s, str) and bool(re.fullmatch(r"[a-zA-Z][a-zA-Z' .-]*", s.strip()))


def check_common(path: Path, d: dict, seen: set[str]) -> bool:
    ok = True
    for key, typ in [("id", str), ("type", str), ("level", str), ("title", str), ("source", str)]:
        if not isinstance(d.get(key), typ) or not str(d.get(key, "")).strip():
            err(path, f"missing/invalid '{key}'")
            ok = False
    if not ok:
        return False
    if d["id"] != path.stem:
        err(path, f"id '{d['id']}' != filename stem '{path.stem}'")
        ok = False
    if d["id"] in seen:
        err(path, f"duplicate id '{d['id']}'")
        ok = False
    seen.add(d["id"])
    if d["type"] not in TYPES:
        err(path, f"bad type '{d['type']}'")
        ok = False
    if d["level"] not in LEVELS:
        err(path, f"bad level '{d['level']}'")
        ok = False
    if d.get("source") not in {"original", "imported"}:
        err(path, "source must be 'original' or 'imported'")
        ok = False
    if not isinstance(d.get("difficulty"), int) or not (1 <= d["difficulty"] <= 5):
        err(path, "difficulty must be int 1-5")
        ok = False
    if d.get("source") == "original":
        tw = d.get("targetWords")
        if not isinstance(tw, list) or not (2 <= len(tw) <= 6) or not all(isinstance(x, str) and x.strip() for x in tw):
            err(path, "targetWords must be 2-6 non-empty strings")
            ok = False
    return ok


def check_reading(path: Path, d: dict) -> None:
    passage = d.get("passage", "")
    if not isinstance(passage, str) or len(passage.split()) < 250:
        err(path, f"passage too short ({len(str(passage).split())} words, need >=250)")
    qs = d.get("questions")
    if not isinstance(qs, list) or len(qs) != 5:
        err(path, "questions must be exactly 5")
        return
    answers = []
    for i, q in enumerate(qs, 1):
        if not isinstance(q.get("q"), str) or not q["q"].strip():
            err(path, f"q{i} missing question text")
        opts = q.get("options")
        if not isinstance(opts, list) or len(opts) != 4:
            err(path, f"q{i} needs exactly 4 options")
        elif len({str(o).strip().lower() for o in opts}) != 4:
            err(path, f"q{i} has duplicate options")
        elif any(str(o).strip().lower() in {"all of the above", "none of the above"} for o in opts):
            err(path, f"q{i} uses banned option")
        a = q.get("answer")
        if not isinstance(a, int) or not (0 <= a <= 3):
            err(path, f"q{i} answer must be int 0-3")
        else:
            answers.append(a)
        if not isinstance(q.get("explain"), str) or len(q["explain"].strip()) < 8:
            err(path, f"q{i} explain too short")
    if len(set(answers)) < 3:
        err(path, f"answer distribution too narrow: {answers}")


def check_cloze(path: Path, d: dict) -> None:
    passage = d.get("passage", "")
    if not isinstance(passage, str):
        err(path, "passage must be string")
        return
    words = len(passage.split())
    if words < 200:
        err(path, f"passage too short ({words} words, need >=200)")
    positions = []
    for n in range(1, 11):
        token = "{{%d}}" % n
        if token not in passage:
            err(path, f"missing placeholder {token}")
        else:
            positions.append(passage.index(token))
    if positions and positions != sorted(positions):
        err(path, "placeholders {{1}}..{{10}} out of order")
    bank = d.get("bank")
    if not isinstance(bank, list) or len(bank) != 15:
        err(path, f"bank must have exactly 15 words (got {len(bank) if isinstance(bank, list) else '?'})")
        return
    low = [str(w).strip().lower() for w in bank]
    if len(set(low)) != 15:
        err(path, "bank has duplicates")
    for w in low:
        if not is_word(w):
            err(path, f"bank word invalid: {w!r}")
        if re.search(r"\b" + re.escape(w) + r"\b", passage, re.I):
            err(path, f"bank word '{w}' leaks into passage")
    blanks = d.get("blanks")
    if not isinstance(blanks, list) or len(blanks) != 10:
        err(path, "blanks must have exactly 10 items")
        return
    ns = [b.get("n") for b in blanks if isinstance(b, dict)]
    if sorted(ns) != list(range(1, 11)):
        err(path, f"blanks n must be 1..10 (got {ns})")
    used = []
    for b in blanks:
        if not isinstance(b, dict):
            err(path, "blank item must be object")
            continue
        ans = str(b.get("answer", "")).strip().lower()
        if ans not in low:
            err(path, f"blank {b.get('n')} answer '{ans}' not in bank")
        used.append(ans)
        if not isinstance(b.get("explain"), str) or len(b["explain"].strip()) < 6:
            err(path, f"blank {b.get('n')} explain too short")
    if len(set(used)) != 10:
        err(path, f"the 10 blanks must use 10 distinct bank words: {used}")


def check_matching(path: Path, d: dict) -> None:
    paras = d.get("paragraphs")
    if not isinstance(paras, list) or len(paras) != 10:
        err(path, "paragraphs must be exactly 10")
        return
    labels = [p.get("label") for p in paras]
    if labels != LETTERS[:10]:
        err(path, f"paragraph labels must be A-J in order (got {labels})")
    for p in paras:
        if not isinstance(p.get("text"), str) or len(p["text"].split()) < 50:
            err(path, f"paragraph {p.get('label')} too short")
    sts = d.get("statements")
    if not isinstance(sts, list) or len(sts) != 10:
        err(path, "statements must be exactly 10")
        return
    used = set()
    for i, s in enumerate(sts, 1):
        if not isinstance(s.get("text"), str) or len(s["text"].split()) < 5:
            err(path, f"statement {i} too short")
        a = s.get("answer")
        if a not in LETTERS[:10]:
            err(path, f"statement {i} answer must be A-J (got {a!r})")
        else:
            used.add(a)
    missing = set(LETTERS[:10]) - used
    if missing:
        err(path, f"paragraphs never used as answer: {sorted(missing)}")


def check_translation(path: Path, d: dict) -> None:
    prompt = d.get("prompt", "")
    if not isinstance(prompt, str):
        err(path, "prompt must be string")
        return
    cn = len(re.findall(r"[\u4e00-\u9fff]", prompt))
    if not (120 <= cn <= 200):
        err(path, f"Chinese prompt should be 120-200 chars (got {cn})")
    ref = d.get("reference", "")
    if not isinstance(ref, str) or len(ref.split()) < 100:
        err(path, "reference translation too short")
    kp = d.get("keyPoints")
    if not isinstance(kp, list) or not (3 <= len(kp) <= 5):
        err(path, "keyPoints must be 3-5 items")


def check_writing(path: Path, d: dict) -> None:
    prompt = d.get("prompt", "")
    if not isinstance(prompt, str) or "Directions" not in prompt:
        err(path, "prompt must contain 'Directions'")
    ref = d.get("reference", "")
    n = len(str(ref).split())
    if not (150 <= n <= 220):
        err(path, f"reference essay should be 150-220 words (got {n})")
    kp = d.get("keyPoints")
    if not isinstance(kp, list) or not (2 <= len(kp) <= 5):
        err(path, "keyPoints must be 2-5 items")


def check_imported(path: Path, d: dict) -> None:
    """Lighter structural checks for imported papers (layout varies upstream)."""
    t = d["type"]
    if t == "reading":
        if not str(d.get("passage", "")).strip():
            err(path, "reading needs a passage")
        qs = d.get("questions") or []
        if not qs:
            err(path, "reading needs questions")
        for i, q in enumerate(qs, 1):
            opts = q.get("options") or []
            if len(opts) != 4:
                err(path, f"q{i} needs 4 options")
            a = q.get("answer")
            if not isinstance(a, int) or not (0 <= a <= 3):
                err(path, f"q{i} answer must be 0-3")
    elif t == "cloze":
        passage = str(d.get("passage", ""))
        if "{{" not in passage:
            err(path, "cloze passage has no placeholders")
        bank = d.get("bank") or []
        blanks = d.get("blanks") or []
        if not bank or not blanks:
            err(path, "cloze needs bank and blanks")
        for b in blanks:
            if str(b.get("answer", "")).lower() not in {str(w).lower() for w in bank}:
                err(path, f"blank answer {b.get('answer')!r} not in bank")
    elif t == "matching":
        labels = {p.get("label") for p in (d.get("paragraphs") or [])}
        if not labels:
            err(path, "matching needs paragraphs")
        for s in d.get("statements") or []:
            if s.get("answer") not in labels:
                err(path, f"statement answer {s.get('answer')!r} not a paragraph label")
    elif t in ("translation", "writing"):
        if not str(d.get("prompt", "")).strip():
            err(path, f"{t} needs a prompt")
        if t == "translation" and not str(d.get("reference", "")).strip():
            err(path, "translation needs a reference")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if not CONTENT.exists():
        print("content/ not found")
        return 1
    seen: set[str] = set()
    files = sorted(p for p in CONTENT.rglob("*.json") if "papers" not in p.relative_to(CONTENT).parts)
    counts: dict[str, int] = {}
    for path in files:
        try:
            d = json.loads(path.read_text(encoding="utf-8-sig"))
        except Exception as e:
            err(path, f"invalid JSON: {e}")
            continue
        if not isinstance(d, dict):
            err(path, "top-level must be object")
            continue
        if not check_common(path, d, seen):
            continue
        counts[d["type"]] = counts.get(d["type"], 0) + 1
        if d.get("source") == "imported":
            check_imported(path, d)
        else:
            {"reading": check_reading, "cloze": check_cloze, "matching": check_matching,
             "translation": check_translation, "writing": check_writing}[d["type"]](path, d)

    print(f"scanned {len(files)} files")
    for k in sorted(counts):
        print(f"  {k}: {counts[k]}")
    for w in warnings:
        print("WARN", w)
    if errors:
        print(f"\n{len(errors)} ERROR(S):")
        for e in errors[:200]:
            print("  -", e)
        return 1
    print("\nALL CONTENT VALID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
