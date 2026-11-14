const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { const t=m.text(); if (m.type()==='error' && !t.includes('501') && !t.includes('ERR_FAILED') && !t.includes('cloudflareinsights')) errors.push('CONSOLE ' + t); });
  await page.goto('http://127.0.0.1:8790/#/exam', { waitUntil:'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil:'networkidle' });
  await page.waitForTimeout(1000);
  const tile = page.locator('.v-exam__tile', { hasText: '选词填空' }).first();
  await tile.getByRole('button', { name: '开始' }).click({ force: true });
  await page.waitForTimeout(500);
  let items = 0;
  for (let step = 0; step < 8; step++) {
    const selects = page.locator('.v-exam select.c-select');
    const n = await selects.count();
    if (!n) break;
    for (let i = 0; i < n; i++) await selects.nth(i).selectOption({ index: 2 }).catch(() => {});
    const submit = page.getByRole('button', { name: '提交答案' }).first();
    if (await submit.count()) { await submit.click({ force: true }); items++; await page.waitForTimeout(200); }
    const next = page.getByRole('button', { name: /下一题|查看结果/ }).first();
    if (await next.count()) { await next.click({ force: true }); await page.waitForTimeout(250); }
    else break;
  }
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cetcollage.v1') || '{}');
    return { practices: (s.practiceAttempts||[]).length, seen: Object.keys(s.practiceSeen||{}).length, wrong: (s.wrongBook||[]).length, mode: s.profile?.practiceMode };
  });
  await page.goto('http://127.0.0.1:8790/#/records', { waitUntil:'networkidle' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '专项记录' }).click({ force: true });
  await page.waitForTimeout(300);
  const rec = await page.locator('#app').innerText();
  const practiceListed = rec.includes('选词填空') && rec.includes('正确率');
  // wrong mode selection
  await page.goto('http://127.0.0.1:8790/#/exam', { waitUntil:'networkidle' });
  await page.waitForTimeout(800);
  const wrongChip = page.getByRole('button', { name: '只练错题' }).first();
  const hasChip = await wrongChip.count();
  if (hasChip) await wrongChip.click({ force: true });
  await page.waitForTimeout(500);
  const tile2 = page.locator('.v-exam__tile', { hasText: '选词填空' }).first();
  await tile2.getByRole('button', { name: '开始' }).click({ force: true });
  await page.waitForTimeout(600);
  const wrongStarted = await page.locator('.v-exam').count();
  console.log(JSON.stringify({ errors, items, state, practiceListed, hasChip, wrongStarted }, null, 2));
  await browser.close();
})();
