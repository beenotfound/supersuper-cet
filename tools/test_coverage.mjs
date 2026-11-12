/* tools/test_coverage.mjs — unit tests for the coverage / i+1 logic. */
import { coverageOf, passageFit, recommendPassages, coveragePlan, wordProbability } from '../site/js/domain/coverage.js';
import { pKnow } from '../site/js/domain/engine.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

const byWord = new Map([
  ['easy', { w: 'easy', d: 1 }],
  ['mid', { w: 'mid', d: 5 }],
  ['hard', { w: 'hard', d: 9 }],
]);
const state = { words: {} };
const theta = 5;

// probability sanity
check('easy word is likely known', wordProbability('easy', byWord, theta, state) > 0.9);
check('hard word is unlikely known', wordProbability('hard', byWord, theta, state) < 0.1);
check('out-of-bank token counts as known', wordProbability('the', byWord, theta, state) === 1);

const corpus = { tokens: 100, words: [['easy', 50], ['hard', 50]] };
const cov = coverageOf(corpus, byWord, theta, state);
const expected = (50 * pKnow(1, theta) + 50 * pKnow(9, theta)) / 100;
check('coverage matches weighted expectation', Math.abs(cov.ratio - expected) < 1e-9, cov.ratio.toFixed(4));

// out-of-bank tokens stay in the denominator as known
const withOov = coverageOf({ tokens: 200, words: [['easy', 100]] }, byWord, theta, state);
check('out-of-bank tokens lift coverage', withOov.ratio > coverageOf({ tokens: 100, words: [['easy', 100]] }, byWord, theta, state).ratio);

const hardOnly = { tokens: 10, words: [['hard', 10]] };
check('all-unknown passage has low coverage', coverageOf(hardOnly, byWord, theta, state).ratio < 0.1);

// passage fit counts distinct unknown words
const fit = passageFit({ tokens: 10, words: [['hard', 3], ['mid', 3], ['easy', 4]] }, byWord, theta, state);
check('passageFit counts unknown distinct words', fit.unknownWords >= 1, `unknown=${fit.unknownWords}`);

// i+1 recommendation prefers ~95% known
const passages = [
  { id: 'too-easy', level: 'cet6', tokens: 100, words: [['easy', 100]] },
  { id: 'just-right', level: 'cet6', tokens: 100, words: [['easy', 95], ['hard', 5]] },
  { id: 'too-hard', level: 'cet6', tokens: 100, words: [['easy', 40], ['hard', 60]] },
];
const rec = recommendPassages(passages, byWord, theta, state, { target: 0.95 });
check('i+1 picks the closest passage', rec[0].passage.id === 'just-right', rec.map((r) => `${r.passage.id}:${r.ratio.toFixed(2)}`).join(' '));

// level filter
const mixed = [...passages, { id: 'cet4-one', level: 'cet4', tokens: 100, words: [['easy', 100]] }];
const rec6 = recommendPassages(mixed, byWord, theta, state, { level: 'cet6' });
check('cet6 filter excludes cet4 passages', rec6.every((r) => r.passage.level !== 'cet4'));

// coverage plan
const plan = coveragePlan(corpus, byWord, theta, state, { step: 0.05 });
check('coverage plan raises coverage to its goal', plan.achieved >= plan.goal - 1e-9,
  `${plan.current.toFixed(3)} -> ${plan.achieved.toFixed(3)} goal=${plan.goal.toFixed(3)} need=${plan.need}`);
check('coverage plan reports a positive word count', plan.need > 0, `need=${plan.need}`);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL COVERAGE TESTS PASS');
process.exit(failures ? 1 : 0);
