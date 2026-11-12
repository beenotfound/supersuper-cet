/* tools/writing_score_test.mjs — heuristic essay scorer sanity. */
import assert from 'node:assert';
import { analyze, buildBaseline, scoreWriting, bandOf } from '../site/js/domain/writing-score.js';

const words = [
  ['important', 3.0, 'cet4'], ['people', 2.0, 'cet4'], ['think', 2.2, 'cet4'], ['many', 1.5, 'cet4'],
  ['crucial', 6.5, 'cet6'], ['phenomenon', 6.8, 'cet6'], ['inevitable', 7.0, 'cet6'],
  ['beneficial', 6.2, 'cet6'], ['sustainable', 6.6, 'cet6'], ['consequently', 6.4, 'cet6'],
  ['furthermore', 6.0, 'cet6'], ['significant', 5.4, 'cet4'], ['development', 4.8, 'cet4'],
  ['environment', 4.6, 'cet4'], ['responsibility', 5.2, 'cet4'], ['individual', 5.0, 'cet4'],
  ['society', 4.4, 'cet4'], ['opportunity', 4.9, 'cet4'], ['challenge', 4.5, 'cet4'],
];
const byWord = new Map(words.map(([w, d, l]) => [w, { w, d, g: [l] }]));

const refs = [
  'The development of society brings both opportunity and challenge. It is important that people think about environment and responsibility. Furthermore, individual effort is significant for sustainable development. Consequently, we should consider this phenomenon carefully. Although many people think it is inevitable, beneficial changes are possible when individuals take responsibility. The challenge is significant, but the opportunity is also clear.',
  'In modern society, environment protection has become a crucial issue. Many people think that individual action is not important, but this view is wrong. Furthermore, sustainable development requires responsibility from every individual. Consequently, we should consider the significant challenge and the opportunity it brings. Although the phenomenon is complex, beneficial change is inevitable when people act together.',
  'Many people think that opportunity is important, but responsibility is more significant. Furthermore, the development of society depends on individual effort. Consequently, we should consider the environment and the challenge of sustainable development. Although this phenomenon is complex, beneficial change is possible. It is crucial that people take responsibility and act together.',
];
const baseline = buildBaseline(refs, byWord);

const good = `In modern society, environmental protection has become a crucial phenomenon that deserves our serious attention. Although many people think that individual action is not important, this view is mistaken. Furthermore, sustainable development requires responsibility from every individual, and this responsibility is beneficial for society as a whole.

Consequently, we should consider the significant challenge that the environment faces. It is inevitable that economic development brings pressure on nature, but this pressure can be reduced when people take responsibility. Moreover, individuals who understand this challenge are more likely to change their behaviour. For example, simple choices about transport and consumption can make a significant difference over time.

In conclusion, the development of society and the protection of the environment are not contradictory. Although the challenge is considerable, the opportunity is also clear. It is crucial that every individual takes responsibility, because sustainable change depends on ordinary people rather than on a few experts.`;

const bad = `I think environment is important. Many people think it is important too. People should think about it. It is very important. We should do many things. Environment is important for people. I think we should do it. It is good. Many people think so.`;

const goodScore = scoreWriting(good, { byWord, baseline, reference: refs[0], level: 'cet6' });
const badScore = scoreWriting(bad, { byWord, baseline, reference: refs[0], level: 'cet6' });

console.log('good:', goodScore.total, goodScore.band.label, goodScore.dimensions.map((d) => `${d.label}${d.score.toFixed(1)}`).join(' '));
console.log('bad :', badScore.total, badScore.band.label, badScore.dimensions.map((d) => `${d.label}${d.score.toFixed(1)}`).join(' '));

assert.ok(goodScore.total > badScore.total, 'good essay must beat bad essay');
assert.ok(goodScore.total >= 10, `good essay should score 10+, got ${goodScore.total}`);
assert.ok(badScore.total <= 9, `bad essay should score <=9, got ${badScore.total}`);
assert.ok(goodScore.dimensions.every((d) => d.score >= 0 && d.score <= 5), 'dimensions in 0..5');
assert.ok(['优秀', '良好', '中等', '较差', '差'].includes(goodScore.band.label), 'band label known');
assert.strictEqual(bandOf(15).label, '优秀');
assert.strictEqual(bandOf(1).label, '差');
const m = analyze(good, byWord);
assert.ok(m.tokens >= 150, `word count ${m.tokens}`);
assert.ok(m.paragraphs >= 3, `paragraphs ${m.paragraphs}`);
assert.ok(m.advancedRatio > 0, 'advanced words detected');

const empty = scoreWriting('', { byWord, baseline, reference: refs[0], level: 'cet6' });
assert.ok(empty.total >= 1 && empty.total <= 3, `empty essay should be low, got ${empty.total}`);

console.log('\nALL WRITING SCORE TESTS PASS');
