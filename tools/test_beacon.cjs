const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto('https://cet-prep-6ee.pages.dev/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const res = await page.evaluate(async () => {
    const body = JSON.stringify([{ cid: 'browser-cid-1', ev: 'app_open', path: '/test', ts: Math.floor(Date.now()/1000), props: { x: 4 } }]);
    const r = await fetch('/api/e', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body });
    return { status: r.status, text: (await r.text()).slice(0,200) };
  });
  console.log(JSON.stringify(res));
  await browser.close();
})();
