/* tools/test_report.mjs — acceptance tests for mock-exam scoring + listening pairing. */
import { scoreAttempt, translationEstimate, recommendationFor, COMPONENTS, READING_PARTS } from '../site/js/domain/report.js';
import { pairListening, paperYearOf } from '../site/js/domain/pairing.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

const contentById = new Map([
  ['r1', { paperYear: '2024-12' }],
  ['r2', { paperYear: '2024-12' }],
]);
const paper = { id: 'p1', level: 'cet4', title: 'p1', sections: [{ ids: ['r1'] }, { ids: ['r2'] }] };
const sets = [
  { id: 'l-2024-12', level: 4, year: 2024, month: 12, sections: [{}] },
  { id: 'l-2024-06', level: 4, year: 2024, month: 6, sections: [{}] },
  { id: 'l-2023-12', level: 4, year: 2023, month: 12, sections: [{}] },
  { id: 'l-6-2024-12', level: 6, year: 2024, month: 12, sections: [{}] },
];

check('reading weights', READING_PARTS.cloze === 35.5 && READING_PARTS.matching === 71 && READING_PARTS.reading === 142);
check('component max total 710', Object.values(COMPONENTS).reduce((a, b) => a + b, 0) === 710);
check('paperYearOf from items', paperYearOf(paper, contentById) === '2024-12');

check('pair: same month', pairListening(paper, sets, contentById).set.id === 'l-2024-12');
check('pair: same month label', pairListening(paper, sets, contentById).pairing === 'same-month');

const paperNoExact = { ...paper, sections: [{ ids: ['r1'] }] };
contentById.set('r3', { paperYear: '2022-06' });
const nearest = pairListening({ ...paper, sections: [{ ids: ['r3'] }] }, sets, contentById);
check('pair: nearest month', nearest.set.id === 'l-2023-12' || nearest.set.id === 'l-2024-06', JSON.stringify(nearest));

const mockPaper = { id: 'm', level: 4, sections: [{ ids: ['x'] }] };
contentById.set('x', { paperYear: 'mock-01' });
check('pair: mock → latest', pairListening(mockPaper, sets, contentById).set.id === 'l-2024-12');

const explicit = { ...paper, listeningSetId: 'l-2023-12' };
check('pair: explicit', pairListening(explicit, sets, contentById).pairing === 'explicit');
check('pair: none for other level', pairListening({ ...paper, level: 'cet6' }, [{ id: 'x', level: 4, year: 2024, month: 12, sections: [{}] }], contentById).set === null);

const fullItems = [
  { type: 'cloze', correct: 10, total: 10, elapsedMs: 600000 },
  { type: 'matching', correct: 5, total: 10, elapsedMs: 600000 },
  { type: 'reading', correct: 8, total: 10, elapsedMs: 1200000 },
];
const baseAttempt = {
  items: fullItems,
  writing: { score15: 12 },
  translation: { estimatedRatio: 0.6 },
  listening: { correct: 20, total: 25, selfAssessed: 1 },
};
const r = scoreAttempt(baseAttempt);
check('reading component', Math.round(r.components.reading.score * 10) / 10 === 184.6, String(r.components.reading.score));
check('writing component', Math.round(r.components.writing.score * 10) / 10 === 85.2);
check('translation component', Math.round(r.components.translation.score * 10) / 10 === 63.9);
check('listening component', Math.round(r.components.listening.score * 10) / 10 === 198.8);
check('complete total', r.complete && Math.round(r.total * 10) / 10 === 532.5, String(r.total));
check('range around total', r.range[0] < r.total && r.range[1] > r.total);
check('confidence not high with self-assess', r.confidence !== 'high', r.confidence);
const unmarked = scoreAttempt({ ...baseAttempt, listening: { correct: 20, total: 25, selfAssessed: 5, selfMarked: 0 } });
check('unmarked self-assess → low', unmarked.confidence === 'low', unmarked.confidence);
const marked = scoreAttempt({ ...baseAttempt, listening: { correct: 20, total: 25, selfAssessed: 5, selfMarked: 5 } });
check('marked self-assess → medium', marked.confidence === 'medium', marked.confidence);

const partial = scoreAttempt({ items: fullItems, writing: { score15: 12 }, translation: { estimatedRatio: 0.6 } });
check('partial keeps measured max 461.5', partial.measuredMax === 461.5, String(partial.measuredMax));
check('partial not complete', partial.complete === false);
check('partial projected', partial.projected && partial.projected.total > partial.measured);

const weak = scoreAttempt({
  items: [
    { type: 'cloze', correct: 2, total: 10, elapsedMs: 1 },
    { type: 'matching', correct: 9, total: 10, elapsedMs: 1 },
    { type: 'reading', correct: 9, total: 10, elapsedMs: 1 },
  ],
  writing: { score15: 12 },
  translation: { estimatedRatio: 0.6 },
});
check('weakest is cloze', weak.weaknesses[0].key === 'cloze', JSON.stringify(weak.weaknesses));

const est = translationEstimate('Population aging and social security are important.', ['人口老龄化 → population aging', '社会保障 → social security']);
check('translation coverage 1', est.coverage === 1 && est.ratio === 0.9, JSON.stringify(est));
const estEmpty = translationEstimate('', ['人口老龄化 → population aging']);
check('translation lower bound', estEmpty.ratio === 0.4, String(estEmpty.ratio));
check('translation no keypoints', translationEstimate('anything', []).ratio === 0.6);
check('recommendation exists', Boolean(recommendationFor('cloze')));

console.log(failures ? `\n${failures} failed` : '\nALL PASS');
process.exit(failures ? 1 : 0);
