/* tools/test_explanations.mjs — content explanations must not be sliced at the old 220-char cap. */
import fs from 'node:fs';

const content = JSON.parse(fs.readFileSync('site/data/content.json', 'utf8'));
const explanations = [];
for (const item of content.items) {
  if (item.type === 'reading') for (const q of item.questions || []) if (q.explain) explanations.push({ id: item.id, text: q.explain });
  if (item.type === 'cloze') for (const b of item.blanks || []) if (b.explain) explanations.push({ id: item.id, text: b.explain });
  if (item.type === 'matching') for (const s of item.statements || []) if (s.explain) explanations.push({ id: item.id, text: s.explain });
}
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failures++; };

check('has explanations', explanations.length > 0, String(explanations.length));
const max = Math.max(...explanations.map((x) => x.text.length));
check('full-length explanations exist', max > 1000, String(max));
const truncated = explanations.filter((x) => x.text.length <= 222 && x.text.trimEnd().endsWith('…'));
check('no old 220-char truncation signature', truncated.length === 0, truncated.slice(0, 2).map((x) => `${x.id}:${x.text.length}`).join(','));
const structured = explanations.filter((x) => x.text.includes('【判型】') || x.text.includes('【定位】'));
check('structured real-paper explanations retained', structured.length > 100, String(structured.length));
console.log(failures ? `\n${failures} failed` : '\nALL PASS');
process.exit(failures ? 1 : 0);
