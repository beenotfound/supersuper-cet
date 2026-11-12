/* tools/smoke.cjs — drive the local site with Playwright + installed Edge. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });

async function run(label, viewport, steps) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(600);
  for (const step of steps) {
    await step(page);
    await page.waitForTimeout(400);
  }
  const stray = await page.evaluate(() => {
    const bad = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t === 'null' || t === 'undefined') bad.push(t);
    }
    return bad;
  });
  if (stray.length) errors.push(`STRAY TEXT ${stray.join(',')}`);
  await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false });
  console.log(`[${label}] errors=${errors.length}`);
  for (const e of errors.slice(0, 10)) console.log('  ', e);
  await browser.close();
  return errors;
}

(async () => {
  const mobile = { width: 390, height: 844 };
  const ipad = { width: 1024, height: 768 };

  await run('m-today', mobile, []);
  await run('m-onboard', mobile, [async (p) => { await p.evaluate(() => (location.hash = '#/onboarding')); }]);
  await run('m-words', mobile, [async (p) => { await p.evaluate(() => (location.hash = '#/words')); }]);
  await run('m-exam', mobile, [async (p) => { await p.evaluate(() => (location.hash = '#/exam')); }]);
  await run('m-me', mobile, [async (p) => { await p.evaluate(() => (location.hash = '#/me')); }]);
  await run('ipad-today', ipad, []);
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
