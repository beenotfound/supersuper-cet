const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { const t=m.text(); if (m.type()==='error' && !t.includes('cloudflareinsights') && !t.includes('CORS') && !t.includes('ERR_FAILED')) errors.push(t); });
  await page.goto('http://127.0.0.1:8790/#/listening/cet4-2015-12-03', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const deep = await page.locator('audio').count();
  // answer each block
  for (let block=0; block<12; block++) {
    const qBtns = page.locator('.v-listening button').filter({ hasText: /^[A-D]\./ });
    const n = await qBtns.count();
    for (let i=0;i<n;i++){ await qBtns.nth(i).click({ force: true }).catch(()=>{}); }
    await page.waitForTimeout(120);
    const next = page.getByRole('button', { name: /下一题/ }).first();
    if (await next.count()) { await next.click({ force: true }); await page.waitForTimeout(250); continue; }
    const submit = page.getByRole('button', { name: /交卷/ }).first();
    if (await submit.count()) { await submit.click({ force: true }); await page.waitForTimeout(500); }
    break;
  }
  const resultText = await page.locator('#app').innerText();
  const scored = /得分|答题详情/.test(resultText);
  await page.screenshot({ path: 'shots/listening-submitted.png' });
  await page.goto('http://127.0.0.1:8790/#/listening', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const active = await page.locator('.c-nav__item.is-active').innerText();
  console.log(JSON.stringify({ errors, deep, scored, active }, null, 2));
  await browser.close();
})();
