/* tools/test_progress.mjs — pure tests for practice selection + wrong-book extraction. */
import { choosePracticeItems, wrongEntriesFromItem, typeLabel } from '../site/js/domain/progress.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const seen = { a: { wrong: 2, lastAt: 1 }, b: { wrong: 0, lastAt: 2 } };
const seq = () => { let i = 0; return () => [0.1, 0.5, 0.9][i++] ?? 0.3; };

check('random count', choosePracticeItems(pool, 'random', seen, 2, seq()).length === 2);
check('unseen excludes seen b?', choosePracticeItems(pool, 'unseen', seen, 5, seq()).map((x) => x.id).join('') === 'c');
check('wrong only wrong items', choosePracticeItems(pool, 'wrong', seen, 5, seq()).map((x) => x.id).join('') === 'a');
check('wrong empty', choosePracticeItems(pool, 'wrong', {}, 5, seq()).length === 0);

const reading = {
  id: 'r1', type: 'reading',
  questions: [{ q: 'Why?', answer: 1, explain: 'because' }],
};
const rw = wrongEntriesFromItem(reading, { response: [0], detail: [{ ok: false }] });
check('reading wrong entry', rw.length === 1 && rw[0].mine === 'A' && rw[0].correct === 'B' && rw[0].prompt === 'Why?', JSON.stringify(rw));

const cloze = { id: 'c1', type: 'cloze', blanks: [{ n: 1, answer: 'memorable', explain: 'ctx' }] };
const cw = wrongEntriesFromItem(cloze, { response: ['wrong'], detail: [{ ok: false }] });
check('cloze wrong entry', cw.length === 1 && cw[0].prompt === '第 1 空' && cw[0].correct === 'memorable', JSON.stringify(cw));

const match = { id: 'm1', type: 'matching', statements: [{ text: 'stmt', answer: 'D' }] };
const mw = wrongEntriesFromItem(match, { response: ['A'], detail: [{ ok: false }] });
check('matching wrong entry', mw.length === 1 && mw[0].correct === 'D' && mw[0].prompt === 'stmt');

const correct = wrongEntriesFromItem(reading, { response: [1], detail: [{ ok: true }] });
check('correct produces nothing', correct.length === 0);
check('type label', typeLabel('cloze') === '选词填空');

console.log(failures ? `\n${failures} failed` : '\nALL PASS');
process.exit(failures ? 1 : 0);
