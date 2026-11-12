/* tools/import_cet4_real.cjs — import real CET-4 papers (2020–2026).
 *
 * Source: 123xzw999/cet4-exam-quiz data/papers/*.js
 *   window.__CET4_PAPERS[id] = { id, label, set, questions[], subjective{writing,translation} }
 *
 * Mapped to our content schema:
 *   questions[part=reading]   -> reading  (grouped by passageNo, 2 per paper)
 *   questions[part=cloze]     -> cloze    ((26)..(35) -> {{1}}..{{10}}, 15-word bank)
 *   questions[part=matching]  -> matching (A)..M) paragraphs)
 *   subjective.writing        -> writing
 *   subjective.translation    -> translation
 *   questions[part=listening] -> skipped (no audio)
 *
 * Dedupe: item-level passage hash + question-level stem hash against every other
 * content file, so re-running or overlapping sources never adds copies.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'source', 'cet4-real', 'papers');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(CONTENT, 'imported');

const letter = (s) => String(s || '').trim().toUpperCase().slice(0, 1);
const letterIdx = (s) => letter(s).charCodeAt(0) - 65;
const norm = (s) => String(s || '').toLowerCase().normalize('NFKC')
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').replace(/\s+/g, ' ').trim();

function hash(text) {
  let h = 2166136261;
  const s = norm(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function flatExplain(explain) {
  if (!explain) return '';
  const raw = typeof explain === 'string'
    ? explain
    : Object.values(explain).filter((v) => typeof v === 'string' && v.trim()).join(' ');
  const text = raw.replace(/\s+/g, ' ').trim();
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}

// ---- load all source papers
const sandbox = { window: {} };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.js'))) {
  vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sandbox, { timeout: 20000 });
}
const papers = sandbox.window.__CET4_PAPERS || {};

// ---- existing content hashes (exclude our own previous output)
for (const f of fs.readdirSync(OUT).filter((x) => x.startsWith('real4-') && x.endsWith('.json'))) {
  fs.unlinkSync(path.join(OUT, f));
}
const seenPassages = new Set();
const seenStems = new Set();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!entry.name.endsWith('.json')) continue;
    if (entry.name.startsWith('real4-')) continue;
    let item;
    try { item = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    if (!item || !item.type) continue;
    const text = item.passage || item.prompt || '';
    if (text) seenPassages.add(hash(text));
    for (const q of item.questions || []) seenStems.add(hash(q.q || q.stem || ''));
    for (const s of item.statements || []) seenStems.add(hash(s.text || ''));
    if (item.prompt) seenStems.add(hash(item.prompt));
  }
}
walk(CONTENT);

const stats = { papers: 0, reading: 0, cloze: 0, matching: 0, writing: 0, translation: 0, dupItems: 0, dupQuestions: 0 };

function write(item) {
  fs.writeFileSync(path.join(OUT, `${item.id}.json`), JSON.stringify(item, null, 1), 'utf8');
}

function base(p, suffix, type) {
  const [year, month] = String(p.id).split('-');
  return {
    id: `real4-${p.id}-${suffix}`,
    type,
    level: 'cet4',
    title: `${p.label}大学英语四级真题（${p.set}）`,
    difficulty: 3,
    source: 'imported',
    targetWords: [],
    paperId: `real4-${p.id}`,
    paperTitle: `${p.label}大学英语四级真题（${p.set}）`,
    paperLevel: 'cet4',
    paperYear: `${year}-${month}`,
  };
}

function acceptItem(passage) {
  const h = hash(passage);
  if (seenPassages.has(h)) { stats.dupItems++; return false; }
  seenPassages.add(h);
  return true;
}

function acceptStem(stem) {
  const h = hash(stem);
  if (seenStems.has(h)) { stats.dupQuestions++; return false; }
  seenStems.add(h);
  return true;
}

for (const id of Object.keys(papers).sort()) {
  const p = papers[id];
  const qs = p.questions || [];
  const paperOk = true;

  // ---- reading: two passages
  const readQs = qs.filter((q) => q.part === 'reading');
  const byPassage = {};
  for (const q of readQs) (byPassage[q.passageNo] = byPassage[q.passageNo] || []).push(q);
  for (const no of Object.keys(byPassage).sort()) {
    const list = byPassage[no];
    const passage = String(list[0].passage || '').trim();
    if (!passage) continue;
    if (!acceptItem(passage)) continue;
    const questions = [];
    for (const q of list) {
      const opts = (q.options || []).map((o) => String(o).trim());
      const ans = letterIdx(q.answer);
      if (opts.length !== 4 || ans < 0 || ans > 3) continue;
      if (!acceptStem(q.stem)) continue;
      questions.push({ q: String(q.stem || '').trim(), options: opts, answer: ans, explain: flatExplain(q.explain) });
    }
    if (!questions.length) continue;
    write({ ...base(p, `read${no}`, 'reading'), title: `${p.label}四级真题 ${p.set} 阅读${no}`, passage, questions });
    stats.reading++;
  }

  // ---- cloze
  const clozeQs = qs.filter((q) => q.part === 'cloze');
  if (clozeQs.length === 10) {
    let passage = String(clozeQs[0].passage || '');
    for (let n = 26; n <= 35; n++) {
      passage = passage.replace(new RegExp(`\\(${n}\\)\\s*_+`), `{{${n - 25}}}`);
    }
    const bankObj = clozeQs[0].wordBank || {};
    const bank = 'ABCDEFGHIJKLMNO'.split('').map((k) => bankObj[k]).filter(Boolean);
    const blanks = clozeQs.map((q) => ({
      n: q.no - 25,
      answer: String(q.answerText || bank[letterIdx(q.answer)] || '').trim(),
      explain: flatExplain(q.explain),
    }));
    const ok = passage.includes('{{1}}') && passage.includes('{{10}}')
      && bank.length === 15 && blanks.length === 10
      && blanks.every((b) => b.answer && bank.includes(b.answer));
    if (ok && acceptItem(passage)) {
      write({ ...base(p, 'cloze', 'cloze'), passage, bank, blanks });
      stats.cloze++;
    }
  }

  // ---- matching
  const matchQs = qs.filter((q) => q.part === 'matching');
  if (matchQs.length >= 5) {
    const raw = String(matchQs[0].passage || '');
    const paragraphs = raw.split(/\n(?=[A-M]\)\s)/).map((chunk) => {
      const m = /^([A-M])\)\s*([\s\S]*)$/.exec(chunk.trim());
      return m ? { label: m[1], text: m[2].trim() } : null;
    }).filter(Boolean);
    const labels = new Set(paragraphs.map((x) => x.label));
    const statements = [];
    for (const q of matchQs) {
      const ans = letter(q.answer);
      if (!labels.has(ans)) continue;
      if (!acceptStem(q.stem)) continue;
      statements.push({ text: String(q.stem || '').trim(), answer: ans });
    }
    if (paragraphs.length >= 5 && statements.length >= 5 && acceptItem(raw)) {
      write({ ...base(p, 'match', 'matching'), paragraphs, statements });
      stats.matching++;
    }
  }

  // ---- writing
  const w = p.subjective && p.subjective.writing;
  if (w && w.directions && w.model) {
    const keyPoints = (w.outline || []).map((o) => String(o.text || '').trim()).filter(Boolean).slice(0, 4);
    write({
      ...base(p, 'write', 'writing'),
      prompt: String(w.directions).trim(),
      reference: String(w.model).trim(),
      keyPoints,
    });
    stats.writing++;
  }

  // ---- translation
  const t = p.subjective && p.subjective.translation;
  if (t && t.source && t.reference) {
    const keyPoints = (t.sentences || []).map((s) => String(s.target || '').trim()).filter(Boolean).slice(0, 4);
    write({
      ...base(p, 'trans', 'translation'),
      prompt: String(t.source).trim(),
      reference: String(t.reference).trim(),
      keyPoints,
    });
    stats.translation++;
  }

  if (paperOk) stats.papers++;
}

console.log('imported:', JSON.stringify(stats));
