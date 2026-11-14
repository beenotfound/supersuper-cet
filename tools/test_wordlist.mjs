/* tools/test_wordlist.mjs — plain word-list import parser. */
import { parseWordList } from '../site/js/domain/importer.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

const text = `# my words
abandon 放弃
abide,忍受
campus\t校园
delicious 美味的
durable 耐用的
abandon 重复`;
const r = parseWordList(text, 'cet4');
check('word count', r.words === 5, String(r.words));
check('two questions per word when >=4', r.items.length === 10, String(r.items.length));
check('spell item', r.items.some((i) => i.type === 'spell' && i.prompt === '放弃' && i.answer === 'abandon'));
check('w2m item', r.items.some((i) => i.type === 'w2m' && i.prompt === 'abide' && i.options.length === 4 && i.options[i.answer] === '忍受'));
check('unique ids', new Set(r.items.map((i) => i.id)).size === r.items.length);
check('all custom', r.items.every((i) => i.custom === true && i.level === 'cet4'));
check('duplicate removed', r.items.filter((i) => i.prompt === '放弃').length === 1);
const short = parseWordList('apple 苹果\nbanana 香蕉', 'cet6');
check('short list spell only', short.items.length === 2 && short.items.every((i) => i.type === 'spell'), String(short.items.length));
const bad = parseWordList('???\nno gloss here', 'cet6');
check('invalid lines reported', bad.items.length === 0 && bad.errors.length > 0);
const empty = parseWordList('', 'cet6');
check('empty list error', empty.items.length === 0 && empty.errors.length === 1);
console.log(failures ? `\n${failures} failed` : '\nALL PASS');
process.exit(failures ? 1 : 0);
