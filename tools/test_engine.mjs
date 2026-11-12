/* tools/test_engine.mjs — acceptance tests for the calibration + SRS engine. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  Calibrator, pKnow, zoneOf, ZONES, buildQueue, applyGrade, markKnown,
  spotCheck, applySpotCheck, estimateKnown, recordAnswer,
} from '../site/js/domain/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const words = JSON.parse(readFileSync(join(root, 'site/data/words.json'), 'utf8')).words;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

/* ------------------------------------------------------------------ calibration */
// Virtual learners: know every word below a difficulty threshold, with 8% noise.
function simulate(threshold, noise, level = 'cet6', seed = 1) {
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const knows = (d) => (d < threshold ? rand() > noise : rand() < noise);

  const cal = new Calibrator(words, level, { theta: 3.2 });
  while (!cal.done) {
    const w = cal.next();
    if (!w) break;
    cal.answer(w, knows(w.d));
  }
  const theta = cal.theta;
  const eligible = level === 'cet6'
    ? words.filter((w) => w.g.includes('cet6'))
    : words.filter((w) => w.g.includes('cet4'));

  let knownZone = 0, knownHit = 0, unknownZone = 0, unknownHit = 0;
  for (const w of eligible) {
    const p = pKnow(w.d, theta);
    const truth = w.d < threshold;
    if (p > ZONES.known) { knownZone++; if (truth) knownHit++; }
    else if (p < ZONES.unknown) { unknownZone++; if (!truth) unknownHit++; }
  }
  return {
    theta, items: cal.answers.length,
    knownPrecision: knownZone ? knownHit / knownZone : 1,
    unknownPrecision: unknownZone ? unknownHit / unknownZone : 1,
    knownZone, unknownZone,
  };
}

for (const [threshold, noise, label] of [
  [2.4, 0.08, 'weak learner'],
  [4.2, 0.08, 'medium learner'],
  [6.2, 0.08, 'strong learner'],
  [7.4, 0.05, 'near-native'],
]) {
  const r = simulate(threshold, noise, 'cet6', threshold * 100);
  check(
    `calibration ${label}: known-zone precision >= 0.90`,
    r.knownPrecision >= 0.9,
    `precision=${r.knownPrecision.toFixed(3)} zone=${r.knownZone} theta=${r.theta.toFixed(2)} items=${r.items}`,
  );
  check(
    `calibration ${label}: unknown-zone precision >= 0.90`,
    r.unknownPrecision >= 0.9,
    `precision=${r.unknownPrecision.toFixed(3)} zone=${r.unknownZone}`,
  );
  check(`calibration ${label}: finishes in <= 24 items`, r.items <= 24, `items=${r.items}`);
}

/* ------------------------------------------------------------------ three-way answers */
{
  const cal = new Calibrator(words, 'cet6', { theta: 5.2 });
  while (!cal.done) {
    const w = cal.next();
    if (!w) break;
    cal.answer(w, 0.5); // always "眼熟"
  }
  check('all-familiar answers keep theta near the middle', Math.abs(cal.theta - 5.2) < 1.6, `theta=${cal.theta.toFixed(2)}`);

  const state = { v: 1, theta: 5.2, words: {} };
  const w = words.find((x) => x.d > 6);
  recordAnswer({ state, theta: 5.2, k: 1 }, w, 0.5);
  check('"familiar" nudges theta less than "known"', Math.abs(state.theta - 5.2) < 0.55, `theta=${state.theta.toFixed(2)}`);
}

/* ------------------------------------------------------------------ queue */
{
  const state = { v: 1, theta: 3.2, words: {} };
  const sample = words.slice(0, 3);
  for (const w of sample) markKnown(state, w);
  const queue = buildQueue(words, state, 'cet6');
  const all = [...queue.review, ...queue.fresh, ...queue.frontier].map((w) => w.w);
  const leaked = sample.filter((w) => all.includes(w.w));
  check('queue never contains a word marked known', leaked.length === 0, `leaked=${leaked.map((w) => w.w).join(',')}`);

  const unknownWords = queue.fresh;
  const maxFreshD = unknownWords.length ? Math.max(...unknownWords.map((w) => w.d)) : 0;
  check('fresh queue only holds predicted-unknown words', unknownWords.every((w) => pKnow(w.d, 3.2) < ZONES.unknown),
    `count=${unknownWords.length} maxD=${maxFreshD.toFixed(2)}`);
  check('fresh queue is ordered easiest-first', unknownWords.every((w, i, a) => i === 0 || a[i - 1].d <= w.d));
}

/* ------------------------------------------------------------------ SRS */
{
  const state = { words: {} };
  const w = { w: 'test', d: 3 };
  const t0 = Date.now();
  applyGrade(state, w, 2, t0);
  const first = state.words.test;
  const firstIv = first.iv;
  check('grade "good" on a new word schedules ~1 day', Math.abs(firstIv - 1) < 0.01, `iv=${firstIv}`);
  check('due is in the future', first.due > t0);

  applyGrade(state, { w: 'test' }, 2, t0);
  const second = state.words.test;
  check('second "good" grows the interval', second.iv > firstIv, `${firstIv} -> ${second.iv}`);

  applyGrade(state, { w: 'test' }, 0, t0);
  const lapsed = state.words.test;
  check('"forgot" resets to 10 minutes', Math.abs(lapsed.iv - 10 / 1440) < 1e-6, `iv=${lapsed.iv}`);
  check('lapses counted', lapsed.lapses >= 1);
}

/* ------------------------------------------------------------------ spot check */
{
  const theta = 3.6;
  const sample = spotCheck(words, theta, 5);
  check('spot check samples 5 known + 5 unknown', sample.known.length === 5 && sample.unknown.length === 5);
  const lowered = applySpotCheck(theta, 2, 5, 0, 5);
  check('bad known-accuracy lowers theta', lowered < theta, `${theta} -> ${lowered.toFixed(2)}`);
  const raised = applySpotCheck(theta, 5, 5, 4, 5);
  check('user knowing more than expected raises theta', raised > theta, `${theta} -> ${raised.toFixed(2)}`);
}

/* ------------------------------------------------------------------ estimate */
{
  const est = estimateKnown(words, 3.2, 'cet6');
  check('estimate returns a sane count', est.known > 0 && est.known < est.total, `${est.known}/${est.total}`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ENGINE TESTS PASS');
process.exit(failures ? 1 : 0);
