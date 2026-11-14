const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  const audioStatus = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  page.on('response', (r) => { if (r.url().includes('/audio/')) audioStatus.push([r.status(), r.url().split('/').pop()]); });

  await page.goto('http://127.0.0.1:8790/#/listening', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const navActive = await page.locator('.c-nav__item.is-active').innerText().catch(() => '');
  const cards = await page.locator('.c-card').count();
  const title = await page.locator('h1').first().innerText().catch(() => '');
  await page.screenshot({ path: 'D:/project/cet-prep/shots/listening-home.png' });

  const setCard = page.locator('.c-card', { hasText: '2015年12月 四级 真题 · 第03套' }).first();
  const hasSet = await setCard.count();
  let started = false;
  if (hasSet) {
    await setCard.getByRole('button', { name: '开始练习' }).click({ force: true });
    await page.waitForTimeout(800);
    started = (await page.locator('.v-listening audio').count()) > 0;
    await page.screenshot({ path: 'D:/project/cet-prep/shots/listening-set.png' });
    // answer current block
    const opts = await page.locator('.v-listening button').all();
    let guard = 0;
    while (guard++ < 30) {
      const qBtns = page.locator('.v-listening button').filter({ hasText: /^[A-D]\./ });
      const n = await qBtns.count();
      if (n === 0) break;
      for (let i = 0; i < n; i++) {
        const btn = qBtns.nth(i);
        const box = await btn.boundingBox().catch(() => null);
        if (box) await btn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(40);
      }
      const next = page.getByRole('button', { name: /下一题/ }).first();
      if (await next.count()) { await next.click({ force: true }); await page.waitForTimeout(300); }
      else {
        const submit = page.getByRole('button', { name: /交卷/ }).first();
        if (await submit.count()) { await submit.click({ force: true }); await page.waitForTimeout(600); }
        break;
      }
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'D:/project/cet-prep/shots/listening-result.png' });
  }

  console.log(JSON.stringify({ errors, navActive, cards, title, hasSet, started, audioStatus: audioStatus.slice(0, 5) }, null, 2));
  await browser.close();
})();
