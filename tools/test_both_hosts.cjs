const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const out = {};
  for (const [name, url] of [
    ['cloudflare', 'https://cet-prep-6ee.pages.dev/#/listening/cet6-2024-12-01'],
    ['github-pages', 'https://beenotfound.github.io/cet-prep/#/listening/cet6-2024-12-01'],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(4000);
      const players = await page.locator('audio').count();
      const src = await page.locator('audio').first().evaluate(a => a.currentSrc).catch(() => '');
      const meta = await page.locator('audio').first().evaluate(a => new Promise(res => {
        if (a.readyState >= 1) res(a.duration);
        else { a.addEventListener('loadedmetadata', () => res(a.duration), { once: true }); setTimeout(() => res(-1), 5000); }
      })).catch(() => -1);
      out[name] = { errors, players, host: src.includes('cet-audio.pages.dev') ? 'cet-audio' : src, duration: Math.round(meta), title: await page.title() };
    } catch (e) { out[name] = { error: e.message.slice(0, 160) }; }
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
