const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8790/#/today', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('http://127.0.0.1:8790/#/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /开始词汇量校准/ }).first().click({ force: true });
  await page.waitForTimeout(300);
  for (let i=0;i<40;i++) {
    const tag = await page.locator('.v-onboard .c-tag').first().innerText().catch(()=> '');
    if (tag.includes('复核')) break;
    const pick = page.getByRole('button', { name: '不认识', exact: true }).first();
    if (!(await pick.count())) break;
    await pick.click({ force: true }); await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /复核 10 个词/ }).first().click({ force: true });
  await page.waitForTimeout(300);
  const labels=[];
  for (let i=0;i<12;i++) {
    const tag = await page.locator('.v-onboard .c-tag').first().innerText().catch(()=> '');
    if (!tag.includes('复核')) break;
    labels.push(tag.replace(/\s+/g,' ').trim());
    await page.getByRole('button', { name: '不认识', exact: true }).first().click({ force: true });
    await page.waitForTimeout(100);
  }
  console.log(JSON.stringify({ count: labels.length, last: labels[labels.length-1] }, null, 2));
  await browser.close();
})();
