const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (m.type()==='error' && !t.includes('cloudflareinsights') && !t.includes('501') && !t.includes('ERR_FAILED')) errors.push('CONSOLE ' + t); });
  await page.goto('http://127.0.0.1:8790/#/exam', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const paper = page.locator('.v-exam__paper').first();
  const paperTitle = await paper.innerText().catch(() => '');
  await paper.getByRole('button', { name: '开始' }).click({ force: true });
  await page.waitForTimeout(600);
  let answered = 0;
  for (let step = 0; step < 12; step++) {
    const ta = page.locator('.v-exam textarea').first();
    if (await ta.count()) { await ta.fill('This is a test response for the mock exam report pipeline. It contains several sentences and key words such as population aging and social security.'); }
    const selects = page.locator('.v-exam select.c-select');
    const ns = await selects.count();
    for (let i = 0; i < ns; i++) { await selects.nth(i).selectOption({ index: 1 }).catch(() => {}); }
    const groups = page.locator('.v-exam .v-exam__options');
    const ng = await groups.count();
    for (let i = 0; i < ng; i++) { await groups.nth(i).locator('button').first().click({ force: true }).catch(() => {}); }
    const submit = page.getByRole('button', { name: '提交答案' }).first();
    if (await submit.count()) { await submit.click({ force: true }); answered++; await page.waitForTimeout(250); }
    const next = page.getByRole('button', { name: /下一题|查看结果/ }).first();
    if (await next.count()) { await next.click({ force: true }); await page.waitForTimeout(350); }
    else break;
    if ((await page.locator('.v-report').count())) break;
  }
  await page.waitForTimeout(800);
  const txt = await page.locator('#app').innerText();
  const state = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cetcollage.v1') || '{}');
    return { attempts: (s.examAttempts || []).length, last: (s.examAttempts || []).slice(-1)[0] || null, wrongBook: (s.wrongBook || []).length, seen: Object.keys(s.practiceSeen || {}).length };
  });
  await page.screenshot({ path: 'shots/report-real.png' });
  console.log(JSON.stringify({ errors, paperTitle: paperTitle.split('\n')[0], answered, hasReport: txt.includes('模考报告'), attempts: state.attempts, attemptKeys: state.last ? Object.keys(state.last) : [], attemptItems: state.last?.items?.length, wrongBook: state.wrongBook, seen: state.seen, writing: Boolean(state.last?.writing), translation: Boolean(state.last?.translation), snippet: txt.slice(0,180) }, null, 2));
  await browser.close();
})();
