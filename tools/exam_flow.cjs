/* tools/exam_flow.cjs — end-of-run screens must never render "undefined".
 * Covers both paths: a single recommended reading ("查看结果") and a
 * multi-item practice ("下一题" -> "查看结果"). Runs several rounds.
 */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const ROUNDS = Number(process.env.ROUNDS || 3);
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

async function seedOnboarded(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({ profile: { onboarded: true } })));
  await page.reload({ waitUntil: 'networkidle' });
}

async function singleReading(page, round) {
  await page.evaluate(() => (location.hash = '#/today'));
  const start = page.getByRole('button', { name: '开始读这篇' });
  await start.waitFor({ timeout: 60000 });
  await start.click();
  await page.locator('.v-exam__pane--questions').waitFor({ timeout: 60000 });

  const groups = page.locator('.v-exam__pane--questions > .stack');
  const n = await groups.count();
  for (let i = 0; i < n; i++) {
    await groups.nth(i).locator('.v-exam__option').nth(i % 4).click();
    await page.waitForTimeout(60);
  }
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.waitForTimeout(300);

  const resultBtn = page.getByRole('button', { name: '查看结果' });
  check(`r${round} reading: 查看结果 shown`, (await resultBtn.count()) === 1);
  await resultBtn.click();
  await page.waitForTimeout(400);

  const text = await page.locator('.v-exam').innerText();
  check(`r${round} reading: no undefined`, !text.includes('undefined'), text.replace(/\n+/g, ' ').slice(0, 70));
  check(`r${round} reading: result screen`, /答对|已提交/.test(text), text.replace(/\n+/g, ' ').slice(0, 70));
}

async function practice(page, round) {
  await page.evaluate(() => (location.hash = '#/today'));
  await page.waitForTimeout(200);
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 60000 });
  // translation practice: 3 items, submit without typing, then advance
  await page.locator('.v-exam__tile').nth(4).getByRole('button', { name: '开始' }).click();
  await page.locator('textarea').first().waitFor({ timeout: 30000 });

  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '提交答案' }).click();
    await page.waitForTimeout(250);
    const adv = page.getByRole('button', { name: '下一题' });
    if (await adv.count()) {
      await adv.click();
    } else {
      const last = page.getByRole('button', { name: '查看结果' });
      check(`r${round} practice: 查看结果 on last item`, (await last.count()) === 1);
      await last.click();
      break;
    }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
  const text = await page.locator('.v-exam').innerText();
  check(`r${round} practice: no undefined`, !text.includes('undefined'), text.replace(/\n+/g, ' ').slice(0, 70));
  check(`r${round} practice: result screen`, /答对|已提交/.test(text), text.replace(/\n+/g, ' ').slice(0, 70));
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (let round = 1; round <= ROUNDS; round++) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await seedOnboarded(page);
    await singleReading(page, round);
    await practice(page, round);
    check(`r${round}: console clean`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL EXAM FLOW TESTS PASS');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
