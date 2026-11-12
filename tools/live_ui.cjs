/* tools/live_ui.cjs — verify the three-way answers and the new rail on the deployed site. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');

const BASE = 'https://beenotfound.github.io/cet-prep/';
const OUT = path.join(__dirname, '..', 'shots');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !document.body.innerText.includes('正在加载'), null, { timeout: 180000 });
  await page.screenshot({ path: path.join(OUT, 'live-ipad-rail.png') });

  await page.evaluate(() => (location.hash = '#/onboarding'));
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '开始词汇量校准' }).click();
  await page.locator('.answer-row').waitFor({ timeout: 60000 });
  const labels = await page.locator('.answer-row .c-btn').allInnerTexts();
  console.log('answer buttons:', JSON.stringify(labels));
  await page.screenshot({ path: path.join(OUT, 'live-ipad-quiz.png') });

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
