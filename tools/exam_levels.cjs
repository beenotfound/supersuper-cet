/* tools/exam_levels.cjs — 题库 must switch cleanly between CET-4 and CET-6. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 90000 });

  const sub = () => page.locator('.v-exam .page-sub').innerText();
  const paperTitles = () => page.locator('.v-exam__paper').allInnerTexts();
  async function expandAll() {
    const b = page.getByRole('button', { name: /显示全部/ });
    if (await b.count()) {
      await b.first().click();
      await page.waitForTimeout(350);
    }
  }
  const hasLevel = (titles, word) => titles.some((t) => t.includes(word));

  check('level chips exist', (await page.locator('.c-chip').count()) >= 3);

  // default is CET-6
  const cet6Sub = await sub();
  await expandAll();
  const cet6Titles = await paperTitles();
  check('CET-6 mode lists only CET-6 papers',
    cet6Titles.length > 0 && !hasLevel(cet6Titles, '四级') && hasLevel(cet6Titles, '六级'),
    `papers=${cet6Titles.length}`);

  await page.getByRole('button', { name: '四级', exact: true }).click();
  await page.waitForTimeout(350);
  await expandAll();
  const cet4Sub = await sub();
  const cet4Titles = await paperTitles();
  check('CET-4 mode lists only CET-4 papers',
    cet4Titles.length > 0 && !hasLevel(cet4Titles, '六级') && hasLevel(cet4Titles, '四级'),
    `papers=${cet4Titles.length}`);
  check('counts change with the level', cet4Sub !== cet6Sub, `${cet6Sub} -> ${cet4Sub}`);
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'exam-cet4.png') });

  await page.getByRole('button', { name: '混合', exact: true }).click();
  await page.waitForTimeout(350);
  await expandAll();
  const bothTitles = await paperTitles();
  check('mixed mode shows both levels', hasLevel(bothTitles, '四级') && hasLevel(bothTitles, '六级'),
    `papers=${bothTitles.length}`);

  await page.getByRole('button', { name: '六级', exact: true }).click();
  await page.waitForTimeout(350);
  await expandAll();
  const backTitles = await paperTitles();
  check('switching back restores CET-6', !hasLevel(backTitles, '四级') && hasLevel(backTitles, '六级'));
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'exam-cet6.png') });

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL LEVEL TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
