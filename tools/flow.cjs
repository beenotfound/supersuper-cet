/* tools/flow.cjs — end-to-end first-run flow on a phone viewport. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  // onboarding
  await page.evaluate(() => (location.hash = '#/onboarding'));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '开始词汇量校准' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'flow-1-quiz.png') });

  // answer 24 items mixing all three levels
  for (let i = 0; i < 24; i++) {
    const label = i % 3 === 0 ? '眼熟' : i % 2 === 0 ? '认识' : '不认识';
    const btn = page.getByRole('button', { name: label, exact: true });
    if (!(await btn.count())) break;
    await btn.first().click();
    await page.waitForTimeout(60);
    if (await page.getByText('你的词表已生成').count()) break;
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'flow-2-result.png'), fullPage: true });
  const resultText = await page.locator('.v-onboard').innerText();
  console.log('--- RESULT ---');
  console.log(resultText.replace(/\n+/g, ' | ').slice(0, 400));

  // review pass: "复核 10 个词，校准更准"
  const reviewBtn = page.getByRole('button', { name: /复核 10 个词/ });
  if (await reviewBtn.count()) {
    await reviewBtn.click();
    await page.waitForTimeout(300);
    console.log('review step tag:', await page.locator('.v-onboard .c-tag').first().innerText());
    for (let i = 0; i < 10; i++) {
      const b = page.getByRole('button', { name: i % 2 === 0 ? '认识' : '不认识', exact: true });
      if (!(await b.count())) break;
      await b.first().click();
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(400);
    const after = await page.locator('.v-onboard').innerText();
    console.log('review result shown:', after.includes('复核结果'));
    await page.screenshot({ path: path.join(OUT, 'flow-2b-review.png'), fullPage: true });
  }

  // go to today
  await page.getByRole('button', { name: '开始今天的词' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'flow-3-today.png'), fullPage: true });
  console.log('--- TODAY ---');
  console.log((await page.locator('.v-today').innerText()).replace(/\n+/g, ' | ').slice(0, 300));

  // i+1 reading recommendation + coverage metric
  const todayText = await page.locator('.v-today').innerText();
  console.log('coverage row:', todayText.includes('阅读覆盖率'), 'reading card:', todayText.includes('今天读哪篇'));
  const readBtn = page.getByRole('button', { name: '开始读这篇' });
  if (await readBtn.count()) {
    await readBtn.click();
    await page.locator('.v-exam .v-exam__passage').first().waitFor({ timeout: 30000 });
    const examText = await page.locator('.v-exam').innerText();
    console.log('reading runner opened:', examText.includes('提交答案'), examText.replace(/\n+/g, ' ').slice(0, 70));
    await page.screenshot({ path: path.join(OUT, 'flow-3b-read.png') });
    await page.evaluate(() => (location.hash = '#/today'));
    await page.getByRole('button', { name: /开始学习/ }).first().waitFor({ timeout: 30000 });
  }

  // start a study session
  const startBtn = page.getByRole('button', { name: /开始学习/ });
  await startBtn.first().waitFor({ timeout: 30000 });
  if (await startBtn.count()) {
    await startBtn.first().click();
    const revealBtn = page.getByRole('button', { name: '显示释义' });
    await revealBtn.waitFor({ timeout: 30000 });
    await page.screenshot({ path: path.join(OUT, 'flow-4-card.png') });
    await revealBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'flow-5-revealed.png'), fullPage: true });
    const knowBtn = page.getByRole('button', { name: '认识', exact: true });
    await knowBtn.waitFor({ timeout: 15000 });
    await knowBtn.click();
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cetcollage.v1')));
    console.log('stored words after one grade:', Object.keys(stored.words).filter((k) => stored.words[k].reps).length);
    console.log('theta:', stored.theta.toFixed(2), 'onboarded:', stored.profile.onboarded);
  }

  // exam: vocab drill
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '开始', exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'flow-6-vocab.png') });

  // exam: reading (force a fresh render of the exam home)
  await page.evaluate(() => (location.hash = '#/today'));
  await page.waitForTimeout(300);
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.waitForTimeout(400);
  const tiles = page.locator('.v-exam__tile');
  await tiles.nth(1).getByRole('button', { name: '开始' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'flow-7-reading.png'), fullPage: false });

  // exam: cloze
  await page.evaluate(() => (location.hash = '#/today'));
  await page.waitForTimeout(300);
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.waitForTimeout(400);
  await page.locator('.v-exam__tile').nth(2).getByRole('button', { name: '开始' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'flow-8-cloze.png'), fullPage: false });

  console.log('errors:', errors.length);
  errors.slice(0, 10).forEach((e) => console.log(' ', e));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
