# -*- coding: utf-8 -*-
"""Build site/data/words.json from the downloaded CET4/CET6 JSONL sources.

Input:  data/source/cet4.jsonl, data/source/cet6.jsonl
Output: site/data/words.json

Record shape (short keys keep the file small):
  w  word (also the stable id / progress key)
  i  IPA-ish phonetic (uk preferred)
  t  [[pos, chinese gloss], ...]
  e  [[example en, example cn], ...]
  p  [[phrase, chinese], ...]
  g  tags: cet4 | cet6 | cet6only
  d  difficulty 0.8-9.5 (higher = harder), derived from Zipf frequency
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source"
OUT = ROOT / "site" / "data" / "words.json"

WORD_RE = re.compile(r"^[a-z][a-z'\-]*$")
MAX_EX = 2
MAX_PH = 3
MAX_TR = 4

FREQ_FILE = SRC / "freq_en_50k.txt"
MAX_RANK = 50_000
MAX_RANK_FALLBACK = 60_000


def load_ranks() -> dict[str, int]:
    """word -> 1-based frequency rank (hermitdave/FrequencyWords, MIT)."""
    ranks: dict[str, int] = {}
    if not FREQ_FILE.exists():
        return ranks
    with FREQ_FILE.open("r", encoding="utf-8") as fh:
        for i, line in enumerate(fh, 1):
            parts = line.split()
            if parts:
                ranks[parts[0].lower()] = i
            if i >= MAX_RANK:
                break
    return ranks


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def norm_pos(p: str) -> str:
    p = (p or "").strip().rstrip(".")
    return p or "?"


def load_book(path: Path):
    """Return {word: {uk, us, trans: [[pos,cn]], ex: [[en,cn]], ph: [[en,cn]]}}."""
    book: dict[str, dict] = {}
    if not path.exists():
        print(f"!! missing {path}")
        return book
    with path.open("r", encoding="utf-8-sig") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception as exc:
                print(f"  skip {path.name}:{lineno}: {exc}")
                continue
            if "headWord" in obj or "content" in obj:  # the "full" variant
                inner = (((obj.get("content") or {}).get("word") or {}).get("content") or {})
                raw = {
                    "word": obj.get("headWord") or inner.get("wordHead"),
                    "uk": inner.get("ukphone"),
                    "us": inner.get("usphone"),
                    "translations": [],
                    "phrases": [],
                    "sentences": [],
                }
                for tr in ((inner.get("trans") or {}).get("tran") or []):
                    raw["translations"].append({"type": tr.get("pos") or tr.get("tranType"),
                                                "translation": tr.get("tranCn") or tr.get("tran")})
                for ph in ((inner.get("phrase") or {}).get("phrases") or []):
                    raw["phrases"].append({"phrase": ph.get("pContent"), "translation": ph.get("pCn")})
                for se in ((inner.get("sentence") or {}).get("sentences") or []):
                    raw["sentences"].append({"sentence": se.get("sContent"), "translation": se.get("sCn")})
                obj = raw

            w = str(obj.get("word") or "").strip().lower()
            if not w or not WORD_RE.match(w):
                continue
            rec = book.setdefault(w, {"uk": "", "us": "", "trans": [], "ex": [], "ph": []})
            rec["uk"] = rec["uk"] or str(obj.get("uk") or "").strip()
            rec["us"] = rec["us"] or str(obj.get("us") or "").strip()
            for tr in obj.get("translations") or []:
                cn = str((tr or {}).get("translation") or "").strip()
                if not cn:
                    continue
                item = [norm_pos((tr or {}).get("type")), cn]
                if item not in rec["trans"] and len(rec["trans"]) < MAX_TR:
                    rec["trans"].append(item)
            for se in obj.get("sentences") or []:
                en = str((se or {}).get("sentence") or "").strip()
                cn = str((se or {}).get("translation") or "").strip()
                if not en or not cn or not (5 <= len(en.split()) <= 30):
                    continue
                if [en, cn] not in rec["ex"] and len(rec["ex"]) < MAX_EX:
                    rec["ex"].append([en, cn])
            for ph in obj.get("phrases") or []:
                p = str((ph or {}).get("phrase") or "").strip()
                cn = str((ph or {}).get("translation") or "").strip()
                if not p or not cn:
                    continue
                if [p, cn] not in rec["ph"] and len(rec["ph"]) < MAX_PH:
                    rec["ph"].append([p, cn])
    return book


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ranks = load_ranks()
    print(f"frequency list: {len(ranks)} ranked words" if ranks else "!! no frequency list, using fallback")

    c4 = load_book(SRC / "cet4.jsonl")
    c6 = load_book(SRC / "cet6.jsonl")
    print(f"loaded cet4={len(c4)} cet6={len(c6)}")

    words = []
    for w in sorted(set(c4) | set(c6)):
        base = c6.get(w) or c4.get(w) or {"uk": "", "us": "", "trans": [], "ex": [], "ph": []}
        alt = c4.get(w) or {"trans": [], "ex": [], "ph": []}
        # merge translations / examples / phrases from both books
        trans: list[list[str]] = []
        for src in (base, alt):
            for item in src.get("trans", []):
                if item not in trans and len(trans) < MAX_TR:
                    trans.append(item)
        ex: list[list[str]] = []
        for src in (base, alt):
            for item in src.get("ex", []):
                if item not in ex and len(ex) < MAX_EX:
                    ex.append(item)
        ph: list[list[str]] = []
        for src in (base, alt):
            for item in src.get("ph", []):
                if item not in ph and len(ph) < MAX_PH:
                    ph.append(item)
        # The two books often repeat the same gloss with different POS/punctuation.
        deduped: list[list[str]] = []
        seen_gloss: set[str] = set()
        for pos, cn in trans:
            key = re.sub(r"[\s，,；;、。.·/]+", "", cn)
            if not key or key in seen_gloss:
                continue
            seen_gloss.add(key)
            deduped.append([pos, cn])
        trans = deduped[:MAX_TR]
        if not trans:
            continue

        tags = []
        if w in c4:
            tags.append("cet4")
        if w in c6:
            tags.append("cet6")
        if w in c6 and w not in c4:
            tags.append("cet6only")

        rank = ranks.get(w, MAX_RANK_FALLBACK)

        words.append({
            "w": w,
            "i": (base.get("uk") or base.get("us") or "").strip(),
            "t": trans,
            "e": ex,
            "p": ph,
            "g": tags,
            "d": 0.0,
            "_rank": rank,
        })

    # Spread difficulty across the whole CET list by percentile, not raw corpus rank:
    # raw ranks pile every CET word into the 6-9 band, which starves the calibration.
    order = sorted(range(len(words)), key=lambda i: words[i]["_rank"])
    span = max(len(order) - 1, 1)
    for pos, idx in enumerate(order):
        d = 0.8 + 8.7 * (pos / span)
        if "cet6only" in words[idx]["g"]:
            d += 0.15
        words[idx]["d"] = round(clamp(d, 0.8, 9.5), 2)
        del words[idx]["_rank"]

    n4 = sum(1 for x in words if "cet4" in x["g"])
    n6 = sum(1 for x in words if "cet6" in x["g"])
    n6only = sum(1 for x in words if "cet6only" in x["g"])
    with_ipa = sum(1 for x in words if x["i"])
    with_ex = sum(1 for x in words if x["e"])

    meta = {
        "built": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "KyleBing/english-vocabulary (BSD-3-Clause)",
        "count": len(words),
        "cet4": n4,
        "cet6": n6,
        "cet6only": n6only,
        "withIpa": with_ipa,
        "withExample": with_ex,
        "frequencyModel": "hermitdave/FrequencyWords en_50k rank (MIT)" if ranks else "length-fallback",
    }

    # Split the payload so the first paint does not wait for examples:
    #   words.json        compact list (needed by queue/search/calibration)
    #   words-detail.json examples + phrases, prefetched in the background
    light = [{k: w[k] for k in ("w", "i", "t", "g", "d")} for w in words]
    details = [{"w": w["w"], "e": w.get("e", []), "p": w.get("p", [])}
               for w in words if w.get("e") or w.get("p")]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"meta": meta, "words": light}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    detail_out = OUT.with_name("words-detail.json")
    detail_out.write_text(json.dumps({"meta": {"count": len(details)}, "items": details}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size_mb = OUT.stat().st_size / 1024 / 1024
    detail_mb = detail_out.stat().st_size / 1024 / 1024

    print(f"cet4={n4} cet6={n6} cet6only={n6only} total={len(words)}")
    print(f"ipa coverage={with_ipa/len(words)*100:.1f}%  example coverage={with_ex/len(words)*100:.1f}%")
    print(f"wrote {OUT} ({size_mb:.2f} MB) + {detail_out.name} ({detail_mb:.2f} MB)")

    problems = []
    if len(words) < 6500:
        problems.append(f"word count too low: {len(words)}")
    if n6only < 2000:
        problems.append(f"cet6only too low: {n6only}")
    if with_ipa / max(len(words), 1) < 0.95:
        problems.append(f"ipa coverage too low: {with_ipa/len(words)*100:.1f}%")
    if problems:
        for p in problems:
            print("!!", p)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
