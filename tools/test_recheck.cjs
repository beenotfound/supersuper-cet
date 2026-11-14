const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8790/#/today', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.goto('http://127.0.0.1:8790/#/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const startBtn = page.getByRole('button', { name: /开始词汇量校准/ }).first();
  if (await startBtn.count()) await startBtn.click({ force: true });
  await page.waitForTimeout(400);
  let quizAnswers = 0;
  for (let i=0;i<40;i++) {
    const label = await page.locator('.v-onboard .c-tag').first().innerText().catch(()=> '');
    if (label.includes('复核')) break;
    const pick = page.getByRole('button', { name: '认识', exact: true }).first();
    if (!(await pick.count())) break;
    await pick.click({ force: true });
    quizAnswers++;
    await page.waitForTimeout(120);
  }
  const resultText = await page.locator('#app').innerText();
  const recheckBtn = page.getByRole('button', { name: /复核 10 个词/ }).first();
  const hasRecheck = await recheckBtn.count();
  if (hasRecheck) await recheckBtn.click({ force: true });
  await page.waitForTimeout(400);
  const spotLabels = [];
  for (let i=0;i<15;i++) {
    const tagText = await page.locator('.v-onboard .c-tag').first().innerText().catch(()=> '');
    if (!tagText.includes('复核')) break;
    spotLabels.push(tagText.replace(/\s+/g,' ').trim());
    const pick = page.getByRole('button', { name: '认识', exact: true }).first();
    if (!(await pick.count())) break;
    await pick.click({ force: true });
    await page.waitForTimeout(120);
  }
  await page.screenshot({ path: 'shots/onboarding-recheck.png' });
  console.log(JSON.stringify({ errors, quizAnswers, hasRecheck, spotLabels, last: spotLabels[spotLabels.length-1], resultSnippet: resultText.slice(0,120) }, null, 2));
  await browser.close();
})();
