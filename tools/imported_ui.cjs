/* tools/imported_ui.cjs — imported papers must render in every practice type. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

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
  await page.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({ profile: { onboarded: true } })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 90000 });

  await page.getByRole('button', { name: '混合', exact: true }).click();
  await page.waitForTimeout(300);
  const papers = await page.locator('.v-exam__paper').count();
  check('imported papers are listed', papers >= 6, `papers=${papers}`);

  const openTile = async (index) => {
    await page.evaluate(() => (location.hash = '#/today'));
    await page.waitForTimeout(200);
    await page.evaluate(() => (location.hash = '#/exam'));
    await page.locator('.v-exam__tile').first().waitFor({ timeout: 60000 });
    await page.locator('.v-exam__tile').nth(index).getByRole('button', { name: '开始' }).click();
  };

  // cloze
  await openTile(2);
  await page.locator('.v-exam__blankrow').first().waitFor({ timeout: 30000 });
  check('cloze: 10 blanks', (await page.locator('.v-exam__blankrow').count()) === 10);
  check('cloze: 15-word bank', (await page.locator('.v-exam .c-tag').count()) >= 15);
  check('cloze: passage shown', (await page.locator('.v-exam__passage').count()) >= 1);

  // reading
  await openTile(1);
  await page.locator('.v-exam__split').first().waitFor({ timeout: 30000 });
  const questions = await page.locator('.v-exam__pane--questions .v-exam__options').count();
  check('reading: has questions', questions >= 1, `questions=${questions}`);

  // matching
  await openTile(3);
  await page.locator('.v-exam__blankrow').first().waitFor({ timeout: 30000 });
  const stmts = await page.locator('.v-exam__blankrow').count();
  check('matching: statements rendered', stmts >= 5, `statements=${stmts}`);

  // translation
  await openTile(4);
  await page.locator('textarea').first().waitFor({ timeout: 30000 });
  check('translation: textarea present', (await page.locator('textarea').count()) === 1);

  // a full imported CET6 paper
  await page.evaluate(() => (location.hash = '#/today'));
  await page.waitForTimeout(200);
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: '六级', exact: true }).click();
  await page.waitForTimeout(300);
  const expand = page.getByRole('button', { name: /显示全部/ });
  if (await expand.count()) {
    await expand.first().click();
    await page.waitForTimeout(300);
  }
  const cet6Paper = page.locator('.c-card').filter({ hasText: '2023年12月大学英语六级第一套' });
  check('CET6 imported paper listed', (await cet6Paper.count()) >= 1);
  await cet6Paper.first().getByRole('button', { name: '开始' }).click();
  await page.locator('textarea').first().waitFor({ timeout: 60000 });
  check('CET6 imported paper starts with writing', (await page.locator('.v-exam').innerText()).includes('写作'));

  // a real CET-4 paper
  await page.evaluate(() => (location.hash = '#/today'));
  await page.waitForTimeout(200);
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: '四级', exact: true }).click();
  await page.waitForTimeout(300);
  const expand4 = page.getByRole('button', { name: /显示全部/ });
  if (await expand4.count()) {
    await expand4.first().click();
    await page.waitForTimeout(300);
  }
  const real4 = page.locator('.v-exam__paper').filter({ hasText: '四级真题' }).first();
  check('CET4 real paper listed', (await page.locator('.v-exam__paper').filter({ hasText: '四级真题' }).count()) >= 1);
  await real4.getByRole('button', { name: '开始' }).click();
  await page.locator('textarea').first().waitFor({ timeout: 60000 });
  check('CET4 real paper starts', (await page.locator('.v-exam').innerText()).includes('四级真题'));

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL IMPORTED UI TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
