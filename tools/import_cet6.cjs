/* tools/import_cet6.cjs — import the CET6-only paper set.
 *
 * Source: Drhm1224/cet6-all-in-one (data/*.js, plain data literals).
 * Mapped to our content schema:
 *   cloze.passage + wordbank + answers  -> cloze
 *   reading.p1/p2 + questions + answers -> reading (2 per paper)
 *   sectionB.article + statements       -> matching
 *   TRANSLATION_DATA                    -> translation
 *   WRITING_EXAMS                       -> writing (prompt only, no sample)
 *
 * Anything that fails validation is skipped and reported.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'source', 'cet6');
const OUT = path.join(ROOT, 'content', 'imported');
fs.mkdirSync(OUT, { recursive: true });

function load(file, names) {
  const code = fs.readFileSync(path.join(SRC, file), 'utf8');
  const probe = names.map((n) => `${n}: (typeof ${n} !== 'undefined' ? ${n} : null)`).join(', ');
  const ctx = { console, document: {}, window: {} };
  vm.createContext(ctx);
  vm.runInContext(`${code}\n;globalThis.__out = ({${probe}});`, ctx, { timeout: 10000 });
  return ctx.__out;
}

const { READING_EXAMS } = load('reading.js', ['READING_EXAMS']);
const { TRANSLATION_DATA } = load('translation.js', ['TRANSLATION_DATA']);
const { WRITING_EXAMS } = load('writing.js', ['WRITING_EXAMS']);

const LETTERS = (s) => String(s || '').trim().toUpperCase().slice(0, 1);
const stripOpt = (s) => String(s || '').replace(/^\s*[A-D]\.\s*/, '').trim();
const letterIndex = (s) => LETTERS(s).charCodeAt(0) - 65;

const stats = { cloze: 0, reading: 0, matching: 0, translation: 0, writing: 0, skipped: 0 };

function write(item) {
  fs.writeFileSync(path.join(OUT, `${item.id}.json`), JSON.stringify(item, null, 1), 'utf8');
}

function paperTitle(e, level = '六级') {
  return `${e.year}年${e.period}大学英语${level}${e.set}`;
}

function base(e, suffix, type) {
  return {
    id: `imp6-${e.id}-${suffix}`,
    type,
    level: 'cet6',
    title: `${e.year}年${e.period}六级${e.set}`,
    difficulty: 4,
    source: 'imported',
    targetWords: [],
    paperId: e.id,
    paperTitle: paperTitle(e),
    paperLevel: 'cet6',
    paperYear: `${e.year}-${String(e.period).replace('月', '').padStart(2, '0')}`,
  };
}

// ---------------------------------------------------------------- papers
for (const e of READING_EXAMS) {
  // ---- cloze
  let text = String(e.cloze.passage);
  let cursor = 0;
  let ok = true;
  for (let n = 26; n <= 35; n++) {
    const re = new RegExp(`(?<![0-9])${n}(?![0-9])`, 'g');
    re.lastIndex = cursor;
    const m = re.exec(text);
    if (!m) { ok = false; break; }
    const ph = `{{${n - 25}}}`;
    text = text.slice(0, m.index) + ph + text.slice(m.index + String(n).length);
    cursor = m.index + ph.length;
  }
  const bank = (e.cloze.wordbank || []).map(String);
  const blanks = [];
  if (ok && bank.length === 15) {
    for (let n = 26; n <= 35; n++) {
      const letter = LETTERS((e.answers.cloze || {})[n]);
      const idx = letter.charCodeAt(0) - 65;
      if (idx < 0 || idx >= bank.length) { ok = false; break; }
      blanks.push({ n: n - 25, answer: bank[idx], explain: '' });
    }
  }
  if (ok && blanks.length === 10 && new Set(blanks.map((b) => b.answer)).size === 10) {
    write({ ...base(e, 'cloze', 'cloze'), passage: text, bank, blanks });
    stats.cloze++;
  } else {
    stats.skipped++;
  }

  // ---- reading (two passages)
  for (const [pKey, qKey, offset] of [['p1', 'p1Questions', 1], ['p2', 'p2Questions', 2]]) {
    const passage = String(e.reading?.[pKey] || '').trim();
    const questions = [];
    for (const q of e.reading?.[qKey] || []) {
      const opts = (q.opts || []).map(stripOpt);
      const letter = LETTERS((e.answers.reading || {})[q.num]);
      const ans = letter.charCodeAt(0) - 65;
      if (opts.length !== 4 || ans < 0 || ans > 3) continue;
      questions.push({ q: String(q.q || '').trim(), options: opts, answer: ans, explain: '' });
    }
    if (passage && questions.length) {
      write({ ...base(e, `read${offset}`, 'reading'), title: `${base(e, '', '').title} 阅读${offset}`, passage, questions });
      stats.reading++;
    } else {
      stats.skipped++;
    }
  }

  // ---- matching
  const article = String(e.sectionB?.article || '');
  const parts = article.split(/\n(?=[A-J]\.\s)/).map((s) => s.trim()).filter(Boolean);
  const paragraphs = [];
  for (const part of parts) {
    const m = /^([A-J])\.\s*([\s\S]*)$/.exec(part);
    if (m) paragraphs.push({ label: m[1], text: m[2].trim() });
  }
  const labels = new Set(paragraphs.map((p) => p.label));
  const statements = [];
  for (const s of e.sectionB?.statements || []) {
    const letter = LETTERS((e.answers.sectionB || {})[s.num]);
    if (labels.has(letter)) statements.push({ text: String(s.statement || '').trim(), answer: letter });
  }
  if (paragraphs.length >= 5 && statements.length >= 5) {
    write({ ...base(e, 'match', 'matching'), paragraphs, statements });
    stats.matching++;
  } else {
    stats.skipped++;
  }
}

// ---------------------------------------------------------------- translation
for (const t of TRANSLATION_DATA) {
  const exam = READING_EXAMS.find((e) => e.year === t.year && e.period === t.period && e.set === t.set);
  const paperId = exam ? exam.id : `tr-${t.id}`;
  write({
    id: `imp6-${t.id}-trans`,
    type: 'translation',
    level: 'cet6',
    title: `${t.year}年${t.period}六级翻译：${t.title}`,
    difficulty: 4,
    source: 'imported',
    targetWords: [],
    paperId,
    paperTitle: exam ? paperTitle(exam) : `${t.year}年${t.period}六级翻译`,
    paperLevel: 'cet6',
    paperYear: `${t.year}-${String(t.period).replace('月', '').padStart(2, '0')}`,
    prompt: String(t.original || '').trim(),
    reference: String(t.reference || '').trim(),
    keyPoints: (t.keypoints || []).map(String),
  });
  stats.translation++;
}

// ---------------------------------------------------------------- writing
for (const w of WRITING_EXAMS) {
  write({
    id: `imp6-${w.id}-write`,
    type: 'writing',
    level: 'cet6',
    title: `${w.year}年${w.period}六级写作：${w.title}`,
    difficulty: 4,
    source: 'imported',
    targetWords: [],
    paperId: `r${String(w.id).replace(/^w/, '')}`,
    paperTitle: `${w.year}年${w.period}大学英语六级${w.set}`,
    paperLevel: 'cet6',
    paperYear: `${w.year}-${String(w.period).replace('月', '').padStart(2, '0')}`,
    prompt: `${w.prompt || ''}\n\n开头句：${w.opening || ''}`.trim(),
    reference: '',
    keyPoints: [],
  });
  stats.writing++;
}

console.log('imported:', JSON.stringify(stats));
