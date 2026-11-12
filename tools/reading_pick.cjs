/* tools/reading_pick.cjs — clicking a reading option must visibly select it. */
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
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 90000 });
  await page.locator('.v-exam__tile').nth(1).getByRole('button', { name: '开始' }).click();
  await page.locator('.v-exam__pane--questions').waitFor({ timeout: 30000 });

  const firstQuestion = page.locator('.v-exam__pane--questions > .stack').first();
  const options = firstQuestion.locator('.v-exam__option');

  await options.nth(1).click();
  await page.waitForTimeout(150);
  check('clicked option gets is-picked', (await firstQuestion.locator('.v-exam__option.is-picked').count()) === 1);
  check('is-picked is the clicked one', (await options.nth(1).getAttribute('class')).includes('is-picked'));

  await options.nth(2).click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'reading-picked.png') });
  check('only one option stays selected', (await firstQuestion.locator('.v-exam__option.is-picked').count()) === 1);
  check('selection moved to the new option', (await options.nth(2).getAttribute('class')).includes('is-picked'));

  // selection survives scrolling the pane
  await page.mouse.move(800, 400);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  check('selection survives pane scroll', (await firstQuestion.locator('.v-exam__option.is-picked').count()) === 1);

  // submitting shows the score feedback
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.waitForTimeout(300);
  const text = await page.locator('.v-exam').innerText();
  check('submit produces feedback', text.includes('判分'), text.replace(/\n+/g, ' ').slice(0, 60));

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL READING PICK TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
