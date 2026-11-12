#!/usr/bin/env python3
"""Rebuild site/data/stories.json (+ .gz) from data/source/stories/*.json.

Each source file holds one public-domain short piece:
    {"id", "title", "author", "source", "year", "text", "summaryZh"}

This script only recomputes the derived fields against site/data/words.json:
    words          token count (lowercase [a-z][a-z'-]*, length >= 2)
    unknownRatio   share of tokens that are neither in the vocabulary bank nor
                   common function words (STOPWORDS), i.e. "生词率" for a
                   CET learner: function words are assumed known
    difficulty     mean bank difficulty (d) of known content words
    level          "cet4" when unknownRatio <= 0.10, else "cet6"

Run from anywhere:
    python -X utf8 tools/build_stories.py
"""
from __future__ import annotations

import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "data" / "source" / "stories"
WORDS_JSON = ROOT / "site" / "data" / "words.json"
OUT_JSON = ROOT / "site" / "data" / "stories.json"
OUT_GZ = ROOT / "site" / "data" / "stories.json.gz"

TOKEN_RE = re.compile(r"[a-z][a-z'-]*")
MIN_WORDS, MAX_WORDS = 300, 1100
TARGET_MIN_WORDS, TARGET_MAX_WORDS = 400, 1100
CET4_UNKNOWN_MAX = 0.25  # bank lacks basic content words (snow/street/woman), so 0.10 would make every story cet6
FORBIDDEN_IN_TEXT = ("project gutenberg", "gutenberg", "***", "*** start", "*** end")

# Common function words are ignored when averaging content-word difficulty.
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "almost", "also",
    "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because",
    "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
    "doesn't", "doing", "don't", "down", "during", "each", "either", "else",
    "even", "ever", "every", "few", "for", "from", "further", "get", "got",
    "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
    "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "however", "i", "i'd", "i'll", "i'm",
    "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
    "just", "let's", "like", "may", "me", "might", "more", "most", "much",
    "must", "mustn't", "my", "myself", "no", "nor", "not", "now", "of", "off",
    "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
    "out", "over", "own", "same", "shall", "shan't", "she", "she'd", "she'll",
    "she's", "should", "shouldn't", "since", "so", "some", "such", "than",
    "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "though", "through", "to", "too", "under",
    "until", "up", "upon", "us", "very", "was", "wasn't", "we", "we'd", "we'll",
    "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
    "where", "where's", "which", "while", "who", "who's", "whom", "why",
    "why's", "will", "with", "won't", "would", "wouldn't", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
}


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def load_bank() -> dict[str, float]:
    data = json.loads(WORDS_JSON.read_text(encoding="utf-8"))
    words = data.get("words")
    if not isinstance(words, list) or not words:
        die(f"{WORDS_JSON} has no 'words' list")
    bank: dict[str, float] = {}
    for item in words:
        w = str(item.get("w", "")).strip().lower()
        if not w:
            continue
        try:
            d = float(item.get("d", 0.0))
        except (TypeError, ValueError):
            d = 0.0
        bank[w] = d
    if len(bank) < 1000:
        die(f"vocabulary bank looks too small: {len(bank)} words")
    return bank


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN_RE.findall(text.lower()) if len(t) >= 2]


def metrics(text: str, bank: dict[str, float]) -> tuple[int, int, float, float]:
    tokens = tokenize(text)
    if not tokens:
        return 0, 0, 0.0, 0.0
    # Function words (STOPWORDS) are assumed known: they are not "生词" even
    # though a CET headword list does not contain articles/prepositions.
    unknown = [t for t in tokens if t not in bank and t not in STOPWORDS]
    known_content = [bank[t] for t in tokens if t in bank and t not in STOPWORDS]
    unknown_ratio = len(unknown) / len(tokens)
    difficulty = sum(known_content) / len(known_content) if known_content else 0.0
    return len(tokens), len(unknown), unknown_ratio, difficulty


def main() -> None:
    bank = load_bank()
    source_files = sorted(SRC_DIR.glob("*.json"))
    if not source_files:
        die(f"no story source files in {SRC_DIR}")

    items: list[dict] = []
    seen_ids: set[str] = set()
    for path in source_files:
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            die(f"{path.name}: invalid JSON ({exc})")
        missing = [k for k in ("id", "title", "author", "source", "year", "text", "summaryZh") if not raw.get(k)]
        if missing:
            die(f"{path.name}: missing required field(s): {', '.join(missing)}")
        sid = str(raw["id"]).strip()
        if not re.fullmatch(r"story-[a-z0-9]+-[a-z0-9-]+", sid):
            die(f"{path.name}: bad id {sid!r} (expected story-<author>-<slug>)")
        if sid in seen_ids:
            die(f"{path.name}: duplicate id {sid!r}")
        seen_ids.add(sid)

        text = str(raw["text"]).strip()
        low = text.lower()
        for bad in FORBIDDEN_IN_TEXT:
            if bad in low:
                die(f"{sid}: text still contains boilerplate marker {bad!r}")

        words, unknown, ratio, difficulty = metrics(text, bank)
        if not (MIN_WORDS <= words <= MAX_WORDS):
            die(f"{sid}: {words} words is outside the accepted {MIN_WORDS}-{MAX_WORDS} range")
        if TARGET_MIN_WORDS <= words <= TARGET_MAX_WORDS:
            target_ok = True
        else:
            target_ok = False
        level = "cet4" if ratio <= CET4_UNKNOWN_MAX else "cet6"

        item = {
            "id": sid,
            "title": str(raw["title"]).strip(),
            "author": str(raw["author"]).strip(),
            "source": str(raw["source"]).strip(),
            "year": raw["year"],
            "level": level,
            "text": text,
            "words": words,
            "difficulty": round(difficulty, 2),
            "unknownRatio": round(ratio, 4),
            "summaryZh": str(raw["summaryZh"]).strip(),
        }
        if not target_ok:
            print(f"note: {sid} has {words} words (outside the 400-1000 target, inside 300-1100)")
        items.append(item)

    if len(items) < 10:
        die(f"only {len(items)} stories; need at least 10")

    items.sort(key=lambda it: it["id"])
    payload = {"meta": {"count": len(items)}, "items": items}
    body = (json.dumps(payload, ensure_ascii=False, indent=1) + "\n").encode("utf-8")

    OUT_JSON.write_bytes(body)
    # Deterministic gzip: fixed mtime so rebuilds are byte-identical.
    OUT_GZ.write_bytes(gzip.compress(body, compresslevel=9, mtime=0))

    cet4 = sum(1 for it in items if it["level"] == "cet4")
    cet6 = len(items) - cet4
    word_counts = [it["words"] for it in items]
    ratios = [it["unknownRatio"] for it in items]
    print(f"stories: {len(items)}")
    print(f"levels: cet4={cet4} cet6={cet6}")
    print(f"words: min={min(word_counts)} max={max(word_counts)} total={sum(word_counts)}")
    print(f"unknownRatio: min={min(ratios):.4f} max={max(ratios):.4f}")
    print(f"wrote {OUT_JSON.relative_to(ROOT)} ({len(body)} bytes)")
    print(f"wrote {OUT_GZ.relative_to(ROOT)} ({OUT_GZ.stat().st_size} bytes)")
    for it in items:
        print(f"  {it['id']:<48} {it['words']:5d} words  unknown={it['unknownRatio']:.4f}  {it['level']}  d={it['difficulty']:.2f}")


if __name__ == "__main__":
    main()
