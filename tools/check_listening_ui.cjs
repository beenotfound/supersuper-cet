const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { const t=m.text(); if (m.type()==='error' && !t.includes('cloudflareinsights') && !t.includes('CORS') && !t.includes('ERR_FAILED')) errors.push(t); });
  await page.goto('http://127.0.0.1:8790/#/listening', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const hint = await page.locator('text=按大题一题一题做').count();
  const tones = await page.locator('.c-tag').evaluateAll(els => [...new Set(els.map(e => e.className))]);
  await page.screenshot({ path: 'shots/listening-list-fixed.png' });
  console.log(JSON.stringify({ errors, hint, tones }, null, 2));
  await browser.close();
})();
