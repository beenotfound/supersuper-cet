# -*- coding: utf-8 -*-
"""Import the MIT-licensed CET bank (cypher-yht/dsh-plugins-exam-practice).

The upstream bank is a list of papers; each section carries a `note` with the
passage / word bank / paragraphs and `questions` with stems, options, answers
and explanations. We map it onto our content schema:

  writing    -> writing
  translation-> translation
  reading A  -> cloze   (note has the 15-word bank + passage with (26)..(35))
  reading B  -> matching(note has "Paragraph A: ..." blocks)
  reading C  -> reading (note has "Passage 1: ..." / "Passage 2: ...")
  listening  -> skipped (no audio in this project)

Output: content/imported/<id>.json  (source: "imported", with paper metadata)
"""
from __future__ import annotations

import base64
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "source" / "bank"
OUT = ROOT / "content" / "imported"
REPO = "cypher-yht/dsh-plugins-exam-practice"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from deploy import token  # noqa: E402


def api(url: str) -> dict:
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token()}",
        "User-Agent": "cet-prep-import",
        "Accept": "application/vnd.github+json",
    })
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_banks() -> list[dict]:
    CACHE.mkdir(parents=True, exist_ok=True)
    tree = api(f"https://api.github.com/repos/{REPO}/git/trees/main?recursive=1")
    nodes = sorted((n for n in tree["tree"]
                    if n["path"].startswith("bank/") and n["path"].endswith(".json")),
                   key=lambda n: n["path"])
    papers = []
    for node in nodes:
        dest = CACHE / Path(node["path"]).name
        if not dest.exists():
            blob = api(f"https://api.github.com/repos/{REPO}/git/blobs/{node['sha']}")
            dest.write_bytes(base64.b64decode(blob["content"]))
        papers.append(json.loads(dest.read_text(encoding="utf-8")))
    return papers


def level_of(value: str) -> str:
    return "cet6" if str(value).upper() == "CET6" else "cet4"


def strip_option(opt: str) -> str:
    return re.sub(r"^\s*[A-D]\.\s*", "", str(opt)).strip()


def letter_index(letter: str) -> int:
    return ord(str(letter).strip().upper()[:1]) - 65


def extract_bank(note: str) -> list[str] | None:
    """Find a contiguous A..O lettered word run anywhere in the note."""
    pairs = re.findall(r"([A-O])\.\s*([A-Za-z][A-Za-z'\-]*)", note)
    for start in range(len(pairs) - 14):
        seq = pairs[start:start + 15]
        if [p[0] for p in seq] == list("ABCDEFGHIJKLMNO"):
            return [p[1] for p in seq]
    return None


def parse_cloze(note: str, questions: list) -> dict | None:
    bank = extract_bank(note)
    if not bank:
        return None
    paragraphs = re.split(r"\n\s*\n", note)
    start = None
    for i, para in enumerate(paragraphs):
        if re.search(r"\((2[6-9]|3[0-5])\)", para):
            start = i
            break
    if start is None:
        return None
    chosen = []
    for para in paragraphs[start:]:
        if re.match(r"^\s*词库", para):
            continue
        if len(re.findall(r"[A-O]\.\s*[A-Za-z]", para)) >= 5:
            continue
        chosen.append(para)
    passage = "\n\n".join(chosen).strip()
    passage = re.sub(r"\((2[6-9]|3[0-5])\)\s*_*",
                     lambda m: "{{%d}}" % (int(m.group(1)) - 25), passage)
    blanks = []
    for q in questions:
        stem = str(q.get("stem", ""))
        m = re.search(r"\((2[6-9]|3[0-5])\)", stem) or re.match(r"^(\d{2})[.、]", stem)
        if not m:
            continue
        num = int(m.group(1))
        if not 26 <= num <= 35:
            continue
        blanks.append({"n": num - 25,
                       "answer": str(q.get("answer", "")).strip(),
                       "explain": str(q.get("explanation", "")).strip()})
    blanks.sort(key=lambda b: b["n"])
    if len(blanks) != 10 or len({b["answer"] for b in blanks}) != 10:
        return None
    if "{{1}}" not in passage:
        return None
    return {"passage": passage, "bank": bank, "blanks": blanks}


def parse_matching(note: str, questions: list) -> dict | None:
    parts = re.split(r"(?:^|\n)\s*Paragraph ([A-J]):\s*", note)
    paragraphs = []
    if len(parts) >= 5:
        for i in range(1, len(parts) - 1, 2):
            paragraphs.append({"label": parts[i],
                               "text": re.sub(r"\s+", " ", parts[i + 1]).strip()})
    else:
        parts = re.split(r"(?:^|\n)\s*([A-J])\.\s+", note)
        for i in range(1, len(parts) - 1, 2):
            paragraphs.append({"label": parts[i],
                               "text": re.sub(r"\s+", " ", parts[i + 1]).strip()})
    statements = [{"text": re.sub(r"\s+", " ", str(q.get("stem", ""))).strip(),
                   "answer": str(q.get("answer", "")).strip().upper()} for q in questions]
    if not paragraphs or not statements:
        return None
    return {"paragraphs": paragraphs, "statements": statements}


def parse_reading(note: str, questions: list) -> list[dict]:
    parts = re.split(r"Passage (\d+):\s*", note)
    passages = {}
    if len(parts) >= 3:
        for i in range(1, len(parts) - 1, 2):
            passages[int(parts[i])] = parts[i + 1].strip()
    elif note.strip():
        passages[1] = note.strip()
    grouped: dict[int, list] = {}
    for q in questions:
        stem = str(q.get("stem", ""))
        m = re.match(r"^\(Passage (\d+)\)\s*", stem)
        num = int(m.group(1)) if m else 1
        stem = re.sub(r"^\(Passage \d+\)\s*", "", stem).strip()
        options = [strip_option(o) for o in (q.get("options") or [])]
        if len(options) != 4 or not stem:
            continue
        grouped.setdefault(num, []).append({
            "q": stem,
            "options": options,
            "answer": letter_index(q.get("answer", "")),
            "explain": str(q.get("explanation", "")).strip(),
        })
    out = []
    for num, qs in grouped.items():
        text = passages.get(num)
        if text and qs:
            out.append({"passage": text, "questions": qs})
    return out


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    # start clean so removed upstream items do not linger
    for old in OUT.glob("*.json"):
        old.unlink()

    books = fetch_banks()
    written = 0
    skipped = 0
    paper_meta = {}

    for book in books:
        for paper in book.get("papers", []):
            pid = str(paper.get("id") or "")
            title = str(paper.get("title") or "")
            level = level_of(paper.get("level", "CET4"))
            slug = re.sub(r"[^a-z0-9]+", "-", pid.lower()) or f"paper-{written}"
            if not pid:
                skipped += 1
                continue
            paper_meta[pid] = {"title": title, "level": level, "year": paper.get("year", "")}
            order = 0
            for sec in paper.get("sections", []):
                stype = sec.get("type")
                questions = sec.get("questions") or []
                note = sec.get("note") or ""
                base = {
                    "id": None, "type": None, "level": level,
                    "title": str(sec.get("title") or stype),
                    "difficulty": 3, "source": "imported", "targetWords": [],
                    "paperId": pid, "paperTitle": title, "paperLevel": level,
                    "paperYear": paper.get("year", ""), "sectionOrder": order,
                }
                order += 1
                if stype == "writing" and sec.get("prompt"):
                    item = dict(base, id=f"imp-{slug}-writing", type="writing",
                                prompt=str(sec["prompt"]).strip(),
                                reference=str(sec.get("reference", "")).strip(),
                                keyPoints=[])
                elif stype == "translation" and sec.get("prompt"):
                    item = dict(base, id=f"imp-{slug}-trans", type="translation",
                                prompt=str(sec["prompt"]).strip(),
                                reference=str(sec.get("reference", "")).strip(),
                                keyPoints=[])
                elif stype == "reading" and "选词填空" in str(sec.get("title", "")):
                    data = parse_cloze(note, questions)
                    if not data:
                        skipped += 1
                        continue
                    item = dict(base, id=f"imp-{slug}-cloze", type="cloze", **data)
                elif stype == "reading" and "匹配" in str(sec.get("title", "")):
                    data = parse_matching(note, questions)
                    if not data:
                        skipped += 1
                        continue
                    item = dict(base, id=f"imp-{slug}-match", type="matching", **data)
                elif stype == "reading" and "仔细阅读" in str(sec.get("title", "")):
                    passages = parse_reading(note, questions)
                    if not passages:
                        skipped += 1
                        continue
                    for i, data in enumerate(passages, 1):
                        item = dict(base, id=f"imp-{slug}-read{i}", type="reading", title=f"{base['title']} {i}", **data)
                        (OUT / f"{item['id']}.json").write_text(json.dumps(item, ensure_ascii=False, indent=1), encoding="utf-8")
                        written += 1
                    continue
                else:
                    continue  # listening / empty sections
                (OUT / f"{item['id']}.json").write_text(json.dumps(item, ensure_ascii=False, indent=1), encoding="utf-8")
                written += 1

    (OUT / "papers-meta.json").unlink(missing_ok=True)
    print(f"imported {written} items from {len(paper_meta)} papers, skipped {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
