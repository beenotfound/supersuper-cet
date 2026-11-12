/* tools/writing_ai_test.cjs — local essay score + consent-gated AI button. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

const ESSAY = `In modern society, the ability to ask good questions has become increasingly crucial. Although many people think that quick answers are more useful, this view is mistaken. Furthermore, a good question often opens a door that a ready answer has already closed.

Consequently, we should consider the significant challenge that easy answers bring. It is inevitable that search engines can supply facts within seconds, but they cannot tell us what is worth asking. Moreover, individuals who ask questions are more likely to understand a problem deeply. For example, a student who asks why a formula works will remember it far longer than one who merely memorizes it.

In conclusion, the development of technology does not reduce the value of curiosity; on the contrary, it makes curiosity more important. It is crucial that we keep asking questions, because genuine understanding depends on them rather than on convenient answers.`;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  page.on('request', (req) => {
    const url = req.url();
    if (/api\.openai\.com|api\.deepseek\.com|anthropic\.com|volces\.com/.test(url)) external.push(url);
  });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({
    v: 2, profile: { onboarded: true, level: 'cet6', examDate: '2026-12-19' },
    theta: 5.2, words: {}, stats: { days: {}, streak: 0, lastDay: null },
  })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 90000 });

  const writingTile = page.locator('.v-exam__tile').filter({ hasText: '写作' }).first();
  await writingTile.getByRole('button', { name: '开始' }).click();
  const ta = page.locator('textarea').first();
  await ta.waitFor({ timeout: 60000 });
  await ta.fill(ESSAY);
  await page.getByRole('button', { name: '提交答案' }).click();

  await page.locator('.v-exam').getByText('本地评分', { exact: true }).waitFor({ timeout: 30000 });
  const body = await page.locator('.v-exam').innerText();
  check('local score card appears', body.includes('本地评分') && /\d+\s*\/\s*15/.test(body));
  check('band label shown', /优秀|良好|中等|较差|差/.test(body));
  check('dimensions shown', body.includes('内容') && body.includes('结构') && body.includes('语言'));
  check('metrics shown', body.includes('平均句长') && body.includes('高级词'));

  const aiBtn = page.getByRole('button', { name: /AI 精批/ });
  check('AI button is not configured yet', (await aiBtn.count()) === 1
    && (await aiBtn.first().innerText()).includes('先配置'));

  await aiBtn.first().click();
  await page.waitForTimeout(500);
  const after = await page.locator('body').innerText();
  check('clicking AI without config explains setup', after.includes('我的 → AI 设置') || after.includes('AI 设置'));
  check('no AI request was made on render/click', external.length === 0, external.join(','));

  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'writing-review.png') });

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL WRITING AI TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
