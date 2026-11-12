const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', (r) => { if (r.url().includes('cloudflareinsights')) reqs.push(r.url()); });
  await page.goto('https://cet-prep-6ee.pages.dev/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('cloudflareinsights')));
  console.log('beacon requests:', reqs.length, reqs.slice(0, 2));
  console.log('beacon resource loaded:', resources.length > 0, resources.slice(0, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
