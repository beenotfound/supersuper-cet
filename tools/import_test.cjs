/* tools/import_test.cjs — verify the question-bank importer end to end. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  const before = await page.evaluate(async () => {
    const d = await (await fetch('./data/questions-vocab.json')).json();
    return d.items.length;
  });

  await page.evaluate(() => (location.hash = '#/me'));
  await page.locator('.v-me textarea').waitFor({ timeout: 30000 });

  const sample = JSON.stringify({
    items: [
      { type: 'w2m', prompt: 'abide', options: ['忍受', '放弃', '加速', '测量'], answer: 0, explain: 'abide = 忍受' },
      { type: 'spell', prompt: 'v. 忍受', answer: 'abide', hint: '首字母 A，共 5 个字母', explain: 'abide' },
      { type: 'bogus', prompt: 'x' },
    ],
  });
  await page.locator('.v-me textarea').fill(sample);
  await page.getByRole('button', { name: '导入', exact: true }).click();
  await page.waitForTimeout(600);
  const dismiss = page.getByRole('button', { name: '知道了' });
  await dismiss.first().waitFor({ timeout: 5000 }).catch(() => {});
  if (await dismiss.count()) await dismiss.first().click();
  await page.locator('.c-sheet').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cetcollage.v1')).custom);
  console.log('imported items:', stored.length, stored.map((i) => i.type).join(','));
  console.log('invalid entries rejected:', stored.length === 2);

  await page.evaluate(() => (location.hash = '#/today'));
  await page.waitForTimeout(300);
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 30000 });
  const header = await page.locator('.v-exam .page-sub').innerText();
  console.log('exam header:', header);

  // run the imported vocab question to make sure it renders
  await page.locator('.v-exam__tile').first().getByRole('button', { name: '开始' }).click();
  await page.waitForTimeout(400);
  console.log('drill started:', (await page.locator('.v-exam').innerText()).slice(0, 80).replace(/\n/g, ' '));
  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
