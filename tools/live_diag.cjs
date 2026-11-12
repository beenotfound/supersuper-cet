/* tools/live_diag.cjs — diagnose cold load on the deployed site. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const t0 = Date.now();
  page.on('response', async (r) => {
    if (r.url().includes('/data/')) console.log(`+${Date.now() - t0}ms ${r.status()} ${r.url().split('/').pop()}`);
  });
  page.on('requestfailed', (r) => console.log(`+${Date.now() - t0}ms FAILED ${r.url().split('/').pop()} ${r.failure()?.errorText}`));
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

  await page.goto('https://beenotfound.github.io/cet-prep/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(10000);
    const text = await page.locator('#app').innerText().catch(() => '');
    console.log(`+${Date.now() - t0}ms app="${text.replace(/\n+/g, ' ').slice(0, 90)}"`);
    if (text && !text.includes('正在加载')) break;
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
