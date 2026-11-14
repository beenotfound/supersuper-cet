const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const posts = [];
  page.on('response', r => { if (r.url().endsWith('/api/e')) posts.push(r.status()); });
  await page.goto('https://cet-prep-6ee.pages.dev/#/today', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.goto('https://cet-prep-6ee.pages.dev/#/listening/cet4-2015-12-03', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.waitForTimeout(1500);
  console.log(JSON.stringify({ posts, localStorage: await page.evaluate(() => ({ cid: localStorage.getItem('cet.telemetry.cid'), off: localStorage.getItem('cet.telemetry') })) }, null, 2));
  await browser.close();
})();
