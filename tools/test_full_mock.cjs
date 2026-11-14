const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
async function answerPaper(page) {
  for (let step = 0; step < 12; step++) {
    const ta = page.locator('.v-exam textarea').first();
    if (await ta.count()) await ta.fill('This is a test response containing population aging and social security to cover key points for scoring.');
    const selects = page.locator('.v-exam select.c-select');
    const ns = await selects.count();
    for (let i = 0; i < ns; i++) await selects.nth(i).selectOption({ index: 1 }).catch(() => {});
    const groups = page.locator('.v-exam .v-exam__options');
    const ng = await groups.count();
    for (let i = 0; i < ng; i++) await groups.nth(i).locator('button').first().click({ force: true }).catch(() => {});
    const submit = page.getByRole('button', { name: '提交答案' }).first();
    if (await submit.count()) { await submit.click({ force: true }).catch(() => {}); await page.waitForTimeout(200); }
    const next = page.getByRole('button', { name: /下一题|查看结果/ }).first();
    if (await next.count()) { await next.click({ force: true }).catch(() => {}); await page.waitForTimeout(250); }
    else break;
    if (await page.locator('.v-report').count()) break;
  }
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { const t=m.text(); if (m.type()==='error' && !t.includes('501') && !t.includes('ERR_FAILED') && !t.includes('cloudflareinsights')) errors.push('CONSOLE ' + t); });
  await page.goto('http://127.0.0.1:8790/#/exam', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '完整模考' }).click({ force: true });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '开始听力' }).first().click({ force: true });
  await page.waitForTimeout(1000);
  let listeningBlocks = 0;
  for (let b = 0; b < 10; b++) {
    const text = await page.locator('.v-listening').innerText().catch(() => '');
    const m = text.match(/还有\s*(\d+)\s*题未作答/);
    const pending = m ? Number(m[1]) : 0;
    for (let i = 0; i < pending; i++) {
      await page.locator('.v-listening button').filter({ hasText: /^A\./ }).nth(i).click({ force: true }).catch(() => {});
      await page.waitForTimeout(80);
    }
    const next = page.getByRole('button', { name: /下一题/ }).first();
    if (await next.count()) { await next.click({ force: true }); listeningBlocks++; await page.waitForTimeout(250); continue; }
    const submit = page.getByRole('button', { name: /交卷并评分/ }).first();
    if (await submit.count()) { await submit.click({ force: true }); listeningBlocks++; await page.waitForTimeout(500); }
    break;
  }
  const toPaper = page.getByRole('button', { name: /进入笔试/ }).first();
  const hasToPaper = await toPaper.count();
  if (hasToPaper) await toPaper.click({ force: true });
  await page.waitForTimeout(800);
  const paperStarted = await page.locator('.v-exam__option, .v-exam__options').count();
  const urlAfter = page.url();
  await answerPaper(page);
  await page.waitForTimeout(900);
  const txt = await page.locator('#app').innerText();
  const state = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cetcollage.v1') || '{}');
    const a = (s.examAttempts || []).slice(-1)[0] || {};
    return { attempts: (s.examAttempts || []).length, listening: a.listening || null, items: a.items?.length, reportTotal: document.body.innerText.includes('模考报告') };
  });
  await page.screenshot({ path: 'shots/report-full-mock.png' });
  console.log(JSON.stringify({ errors, listeningBlocks, hasToPaper, paperStarted, urlAfter, hasReport: txt.includes('模考报告'), attempts: state.attempts, listening: state.listening ? { setId: state.listening.setId, correct: state.listening.correct, total: state.listening.total, selfAssessed: state.listening.selfAssessed, pairing: state.listening.pairing } : null, items: state.items, snippet: txt.slice(0,160) }, null, 2));
  await browser.close();
})();
