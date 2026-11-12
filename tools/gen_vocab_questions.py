# -*- coding: utf-8 -*-
"""Generate vocabulary questions from site/data/words.json.

Output: site/data/questions-vocab.json
Types: w2m (word->meaning), m2w (meaning->word), fill (sentence cloze), spell.

Distractors are drawn from the same part of speech and a nearby difficulty band,
which keeps them plausible instead of absurd.
"""
from __future__ import annotations

import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "site" / "data" / "words.json"
OUT = ROOT / "site" / "data" / "questions-vocab.json"

COUNTS = { "w2m": 3200, "m2w": 1000, "fill": 700, "spell": 800 }
SEED = 20261111


def level_of(word) -> str:
    return "cet6" if "cet6only" in word["g"] else "cet4"


def primary(word):
    return word["t"][0] if word.get("t") else None


def gloss_key(word) -> str:
    tr = primary(word)
    return tr[1].strip() if tr else ""


def pick_distractors(rng, pool, target, n, used_gloss):
    band = [w for w in pool
            if w["w"] != target["w"]
            and abs(w["d"] - target["d"]) <= 1.8
            and gloss_key(w) and gloss_key(w) not in used_gloss]
    if len(band) < n:
        band = [w for w in pool if w["w"] != target["w"] and gloss_key(w) and gloss_key(w) not in used_gloss]
    rng.shuffle(band)
    out, seen = [], set(used_gloss)
    for w in band:
        g = gloss_key(w)
        if g in seen:
            continue
        seen.add(g)
        out.append(w)
        if len(out) == n:
            break
    return out


def blank_out(sentence: str, word: str):
    pattern = re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)
    if not pattern.search(sentence):
        return None
    return pattern.sub("____", sentence, count=1)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    payload = json.loads(WORDS.read_text(encoding="utf-8"))
    words = [w for w in payload["words"] if primary(w) and gloss_key(w)]

    # examples live in the split detail file
    detail_path = WORDS.with_name("words-detail.json")
    if detail_path.exists():
        details = {d["w"]: d for d in json.loads(detail_path.read_text(encoding="utf-8"))["items"]}
        for w in words:
            d = details.get(w["w"])
            if d:
                w["e"] = d.get("e", [])
                w["p"] = d.get("p", [])
    rng = random.Random(SEED)

    groups = defaultdict(list)
    for w in words:
        groups[primary(w)[0]].append(w)

    items = []

    def add(item):
        item["id"] = f"{item['type']}-{len(items):05d}"
        items.append(item)

    # ---- w2m: word -> Chinese meaning
    pool = [w for w in words if len(gloss_key(w)) >= 2]
    for w in rng.sample(pool, min(COUNTS["w2m"], len(pool))):
        pos, correct = primary(w)
        distractors = pick_distractors(rng, groups[pos], w, 3, {correct})
        if len(distractors) < 3:
            continue
        options = [correct] + [gloss_key(d) for d in distractors]
        rng.shuffle(options)
        add({
            "type": "w2m", "level": level_of(w), "prompt": w["w"],
            "options": options, "answer": options.index(correct),
            "explain": f"{w['w']} = {pos}. {correct}", "word": w["w"],
        })

    # ---- m2w: Chinese meaning -> word
    pool = [w for w in words if len(gloss_key(w)) >= 2]
    for w in rng.sample(pool, min(COUNTS["m2w"], len(pool))):
        pos, correct = primary(w)
        distractors = pick_distractors(rng, groups[pos], w, 3, {correct})
        if len(distractors) < 3:
            continue
        options = [w["w"]] + [d["w"] for d in distractors]
        rng.shuffle(options)
        add({
            "type": "m2w", "level": level_of(w), "prompt": f"{pos}. {correct}",
            "options": options, "answer": options.index(w["w"]),
            "explain": f"{pos}. {correct} 对应 {w['w']}", "word": w["w"],
        })

    # ---- fill: sentence with the target blanked
    pool = [w for w in words if w.get("e")]
    rng.shuffle(pool)
    made = 0
    for w in pool:
        if made >= COUNTS["fill"]:
            break
        sentence = blank_out(w["e"][0][0], w["w"])
        if not sentence:
            continue
        pos, correct = primary(w)
        distractors = pick_distractors(rng, groups[pos], w, 3, {correct})
        if len(distractors) < 3:
            continue
        options = [w["w"]] + [d["w"] for d in distractors]
        rng.shuffle(options)
        add({
            "type": "fill", "level": level_of(w), "prompt": sentence,
            "options": options, "answer": options.index(w["w"]),
            "explain": f"{w['w']}：{pos}. {correct}", "word": w["w"],
        })
        made += 1

    # ---- spell: Chinese -> type the word
    pool = [w for w in words if len(w["w"]) >= 4 and not w["w"].endswith("-")]
    for w in rng.sample(pool, min(COUNTS["spell"], len(pool))):
        pos, correct = primary(w)
        add({
            "type": "spell", "level": level_of(w), "prompt": f"{pos}. {correct}",
            "options": [], "answer": w["w"],
            "hint": f"首字母 {w['w'][0].upper()}，共 {len(w['w'])} 个字母",
            "explain": f"{pos}. {correct} = {w['w']}", "word": w["w"],
        })

    rng.shuffle(items)
    by_type = defaultdict(int)
    for item in items:
        by_type[item["type"]] += 1

    meta = {"count": len(items), "byType": dict(by_type), "seed": SEED,
            "source": "generated from words.json"}
    OUT.write_text(json.dumps({"meta": meta, "items": items}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"generated {len(items)} questions -> {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
    print(dict(by_type))
    if len(items) < 3500:
        print("!! too few questions")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
