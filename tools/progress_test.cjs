/* tools/progress_test.cjs — studying must not inflate the global ability estimate. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

async function state(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('cetcollage.v1')));
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => localStorage.setItem('cetcollage.v1',
    JSON.stringify({ profile: { onboarded: true }, theta: 5.2 })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (location.hash = '#/today'));
  await page.locator('.v-today').waitFor({ timeout: 60000 });

  const thetaBefore = (await state(page)).theta;
  const masterBefore = (await page.locator('.v-today').innerText()).match(/预计已掌握\s*([\d]+\s*\/\s*\d+)/)[1];

  await page.getByRole('button', { name: /开始学习/ }).first().click();
  for (let i = 0; i < 5; i++) {
    const reveal = page.getByRole('button', { name: '显示释义' });
    await reveal.waitFor({ timeout: 30000 });
    await reveal.click();
    const know = page.getByRole('button', { name: '认识', exact: true });
    await know.waitFor({ timeout: 30000 });
    await know.click();
    await page.waitForTimeout(350);
  }

  const after = await state(page);
  const reps = Object.values(after.words).filter((w) => (w.reps || 0) > 0).length;
  console.log('debug words:', Object.keys(after.words).length, 'with reps:', reps,
    JSON.stringify(Object.entries(after.words).map(([k, v]) => [k, v.reps])));
  check('theta unchanged after studying 5 words', Math.abs(after.theta - thetaBefore) < 0.001,
    `${thetaBefore} -> ${after.theta}`);
  check('five words entered the review schedule', reps >= 5, `reps=${reps}`);

  await page.locator('.c-nav__item[data-tab="today"]').click();
  await page.locator('.v-today').waitFor({ timeout: 30000 });
  await page.waitForTimeout(300);
  const masterAfter = (await page.locator('.v-today').innerText()).match(/预计已掌握\s*([\d]+\s*\/\s*\d+)/)[1];
  check('estimated-known does not jump', masterAfter === masterBefore, `${masterBefore} -> ${masterAfter}`);
  check('review count is shown', (await page.locator('.v-today').innerText()).includes('已进入复习'));

  // migration: a state inflated by the old bug is repaired on load
  await page.evaluate(() => localStorage.setItem('cetcollage.v1',
    JSON.stringify({ v: 1, theta: 11.5, profile: { onboarded: true } })));
  await page.reload({ waitUntil: 'networkidle' });
  const repaired = await state(page);
  check('inflated theta is repaired', repaired.v === 2 && Math.abs(repaired.theta - 5.2) < 0.001,
    `v=${repaired.v} theta=${repaired.theta}`);
  check('repair asks for recalibration', repaired.profile.onboarded === false);

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PROGRESS TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
