/* tools/exam_test.cjs — regression: timer must not repaint the question view. */
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 60000 });

  // translation is the 5th practice tile
  await page.locator('.v-exam__tile').nth(4).getByRole('button', { name: '开始' }).click();
  await page.locator('details').first().waitFor({ timeout: 30000 });

  const details = page.locator('details').first();
  await details.locator('summary').click();
  check('details opens on click', await details.evaluate((el) => el.open));

  await page.waitForTimeout(2600);
  check('details stays open after the timer ticks', await details.evaluate((el) => el.open));

  const ta = page.locator('textarea').first();
  await ta.fill('The tea culture has a long history in China.');
  await page.waitForTimeout(2600);
  const value = await ta.inputValue();
  check('typed translation survives the timer ticks', value === 'The tea culture has a long history in China.', JSON.stringify(value));

  const clock = await page.locator('[data-clock]').innerText();
  check('clock is still running', /⏱ \d\d:\d\d/.test(clock), clock);

  // pointer feedback on the main CTA (sidebar-style lift)
  await page.evaluate(() => (location.hash = '#/today'));
  await page.waitForTimeout(500);
  const cta = page.getByRole('button', { name: /开始词汇量校准|开始学习/ }).first();
  await cta.hover();
  await page.waitForTimeout(200);
  const transform = await cta.evaluate((el) => getComputedStyle(el).transform);
  check('main CTA lifts on hover', transform !== 'none', transform);

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL EXAM TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
