/* tools/live_check.cjs — verify the deployed site's key screens (waits for lazy data). */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');

const BASE = 'https://beenotfound.github.io/cet-prep/';
const OUT = path.join(__dirname, '..', 'shots');

async function visit(browser, { label, viewport, hash, selector, timeout = 150000 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${label} PAGEERROR ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label} CONSOLE ${m.text()}`); });

  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => !document.body.innerText.includes('正在加载'), null, { timeout });
  if (hash !== '#/today') {
    await page.evaluate((h) => (location.hash = h), hash);
  }
  await page.locator(selector).first().waitFor({ timeout });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${label}.png`) });
  const text = await page.locator('#app').innerText();
  console.log(`--- ${label} (${Date.now() - t0}ms) ---`);
  console.log(text.replace(/\n+/g, ' | ').slice(0, 260));
  await ctx.close();
  return errors;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [
    ...(await visit(browser, { label: 'live-phone-today', viewport: { width: 390, height: 844 }, hash: '#/today', selector: '.v-today' })),
    ...(await visit(browser, { label: 'live-phone-me', viewport: { width: 390, height: 844 }, hash: '#/me', selector: '.v-me' })),
    ...(await visit(browser, { label: 'live-ipad-exam', viewport: { width: 1024, height: 768 }, hash: '#/exam', selector: '.v-exam__tile' })),
  ];
  console.log('errors:', errors.length);
  errors.slice(0, 10).forEach((e) => console.log(' ', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
