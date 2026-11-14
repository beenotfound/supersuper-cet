/* tools/test_report_ui.cjs — mock report UI: direct route, history, weak link, mobile. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

const BASE = 'http://127.0.0.1:8790/';
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

function attempt(overrides = {}) {
  const now = Date.now();
  return {
    id: 'att-ui', paperId: 'paper-01', paperTitle: '六级模拟卷 1', level: 'cet6',
    startedAt: now - 3600000, finishedAt: now,
    session: { correct: 6, total: 20, pending: 0, byType: {} },
    items: [
      { itemId: 'imp-cet4-demo-2024-read1', type: 'reading', correct: 0, total: 5, detail: [{ ok: false }, { ok: false }, { ok: false }, { ok: false }, { ok: false }], response: [0, 0, 0, 0, 0], elapsedMs: 1200000 },
      { itemId: 'x-cloze', type: 'cloze', correct: 2, total: 10, detail: Array.from({ length: 10 }, (_, i) => ({ ok: i < 2 })), response: [], elapsedMs: 600000 },
      { itemId: 'x-match', type: 'matching', correct: 5, total: 10, detail: Array.from({ length: 10 }, (_, i) => ({ ok: i < 5 })), response: [], elapsedMs: 900000 },
    ],
    writing: { itemId: 'w', score15: 7, band: { label: '中等' }, dimensions: [] },
    translation: { itemId: 't', estimatedRatio: 0.5, hit: 1, points: 3 },
    listening: null,
    ...overrides,
  };
}

async function seed(page, attempts) {
  await page.evaluate((list) => {
    const s = JSON.parse(localStorage.getItem('cetcollage.v1') || '{}');
    s.examAttempts = list;
    localStorage.setItem('cetcollage.v1', JSON.stringify(s));
  }, attempts);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('501') && !t.includes('ERR_FAILED') && !t.includes('cloudflareinsights')) errors.push('CONSOLE ' + t);
  });

  await page.goto(BASE + '#/exam', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await seed(page, [attempt()]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  check('exam home shows recent attempt', (await page.locator('text=最近模考').count()) === 1);
  const history = page.locator('.v-exam__paper', { hasText: '六级模拟卷 1' }).first();
  check('recent attempt is clickable', (await history.count()) === 1);
  await history.click({ force: true });
  await page.waitForTimeout(900);
  check('report route opens from history', page.url().includes('#/report/att-ui'));
  let text = await page.locator('#app').innerText();
  check('report shows score and estimate', text.includes('模考报告') && text.includes('461.5') && text.includes('估算'));
  check('reading answer letters displayed', text.includes('正确答案 B') && text.includes('你的答案：A'), text.slice(0, 80));
  check('weakness section present', text.includes('最该补的 2 个部分'));

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  check('direct report route survives reload', (await page.locator('text=模考报告').count()) === 1);

  const weak = page.getByRole('button', { name: '去练' }).first();
  check('weakness CTA exists', (await weak.count()) === 1);
  await weak.click({ force: true });
  await page.waitForTimeout(800);
  check('weakness CTA starts practice', page.url().includes('#/exam') && (await page.locator('.v-exam select, .v-exam__options').count()) > 0);

  // mobile
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const mp = await mobile.newPage();
  const merr = [];
  mp.on('pageerror', (e) => merr.push(e.message));
  await mp.goto(BASE + '#/exam', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(800);
  await seed(mp, [attempt({ id: 'att-mobile', listening: { setId: 'x', correct: 10, total: 25, selfAssessed: 5, selfMarked: 5 } })]);
  await mp.reload({ waitUntil: 'networkidle' });
  await mp.goto(BASE + '#/report/att-mobile', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(1000);
  const bodyW = await mp.evaluate(() => document.body.scrollWidth);
  const viewW = await mp.evaluate(() => window.innerWidth);
  await mp.screenshot({ path: 'shots/report-mobile.png' });
  check('mobile report no horizontal overflow', bodyW <= viewW + 2, `${bodyW}/${viewW}`);
  check('mobile report no page errors', merr.length === 0, merr.join(' | '));

  check('no console/page errors in suite', errors.length === 0, errors.join(' | '));
  console.log(`\nRESULT: ${failures ? failures + ' failed' : 'ALL PASS'}`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
