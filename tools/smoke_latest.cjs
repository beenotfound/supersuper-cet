const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('cloudflareinsights') && !t.includes('CORS')) errors.push('CONSOLE ' + t);
  });
  const tabs = ['today', 'words', 'library', 'listening', 'exam', 'me'];
  const out = {};
  for (const tab of tabs) {
    await page.goto(`http://127.0.0.1:8790/#/${tab}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const active = await page.locator('.c-nav__item.is-active').innerText().catch(() => '');
    const appText = await page.locator('#app').innerText().catch(() => '');
    out[tab] = { active, chars: appText.length, hasError: /错误|加载失败/.test(appText) };
  }
  // mobile listening
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const mp = await m.newPage();
  const merr = [];
  mp.on('pageerror', (e) => merr.push(e.message));
  await mp.goto('http://127.0.0.1:8790/#/listening', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(900);
  await mp.screenshot({ path: 'D:/project/cet-prep/shots/listening-mobile.png' });
  const mnav = await mp.locator('.c-nav__item[data-tab="listening"]').isVisible();
  const mcards = await mp.locator('.c-card').count();
  console.log(JSON.stringify({ errors, out, mobile: { mnav, mcards, merr } }, null, 2));
  await browser.close();
})();
