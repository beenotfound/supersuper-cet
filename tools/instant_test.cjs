/* tools/instant_test.cjs — vocab choice questions grade on tap, no submit step. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({ profile: { onboarded: true } })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 90000 });
  await page.locator('.v-exam__tile').first().getByRole('button', { name: '开始' }).click();

  // the drill may open with a spell item; skip until a choice question shows up
  for (let i = 0; i < 25 && (await page.locator('.v-exam__option').count()) === 0; i++) {
    const input = page.locator('input.c-input');
    if (await input.count()) {
      await input.fill('test');
      await page.getByRole('button', { name: '提交答案' }).click();
      await page.waitForTimeout(150);
    }
    const nextBtn = page.getByRole('button', { name: '下一题' });
    if (await nextBtn.count()) { await nextBtn.click(); await page.waitForTimeout(150); }
  }
  await page.locator('.v-exam__option').first().waitFor({ timeout: 30000 });

  check('no submit button on a choice question', (await page.getByRole('button', { name: '提交答案' }).count()) === 0);

  await page.locator('.v-exam__option').first().click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'instant-answer.png') });
  check('answer is revealed immediately', (await page.locator('.v-exam__option.is-correct').count()) === 1,
    `correct=${await page.locator('.v-exam__option.is-correct').count()}`);
  check('options are locked after answering', (await page.locator('.v-exam__option.is-locked').count()) > 0);
  check('explanation is shown inline', (await page.locator('.v-exam__explain').count()) >= 1);
  check('next button appears right away', (await page.getByRole('button', { name: '下一题' }).count()) === 1);

  // walk the whole 20-question drill, handling both choice and spelling items
  for (let i = 0; i < 60; i++) {
    const resultBtn = page.getByRole('button', { name: '查看结果' });
    if (await resultBtn.count()) { await resultBtn.click(); break; }

    const nextBtn = page.getByRole('button', { name: '下一题' });
    if (await nextBtn.count()) {
      await nextBtn.click();
      await page.waitForTimeout(120);
      continue;
    }

    const opt = page.locator('.v-exam__option');
    if (await opt.count()) {
      await opt.first().click();
      await page.waitForTimeout(120);
      continue;
    }

    const input = page.locator('input.c-input');
    if (await input.count()) {
      await input.fill('test');
      await page.getByRole('button', { name: '提交答案' }).click();
      await page.waitForTimeout(120);
      continue;
    }
    await page.waitForTimeout(150);
  }

  await page.waitForTimeout(500);
  const text = await page.locator('.v-exam').innerText();
  check('result screen reached', /答对|已提交/.test(text), text.replace(/\n+/g, ' ').slice(0, 60));
  check('no internal type codes on the result screen',
    !/w2m|m2w|fill|spell/.test(text), text.replace(/\n+/g, ' ').slice(0, 60));

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL INSTANT TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
