/* tools/reading_layout.cjs — verify the passage/questions split layout. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const OUT = path.join(__dirname, '..', 'shots');
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

async function openReading(browser, viewport, label) {
  const ctx = await browser.newContext({ viewport, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.locator('.v-exam__tile').first().waitFor({ timeout: 90000 });
  await page.locator('.v-exam__tile').nth(1).getByRole('button', { name: '开始' }).click();
  await page.locator('.v-exam__split').waitFor({ timeout: 30000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${label}.png`) });
  const cols = await page.locator('.v-exam__split').evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  const display = await page.locator('.v-exam__split').evaluate((el) => getComputedStyle(el).display);
  const sameRow = await page.locator('.v-exam__pane--passage').evaluate((el) => el.getBoundingClientRect().top);
  const qTop = await page.locator('.v-exam__pane--questions').evaluate((el) => el.getBoundingClientRect().top);
  await ctx.close();
  return { display, cols, sameRow, qTop, errors };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const ipad = await openReading(browser, { width: 1024, height: 768 }, 'layout-ipad-reading');
  check('iPad: split is a grid', ipad.display === 'grid', ipad.display);
  check('iPad: two columns', ipad.cols.split(' ').length >= 2, ipad.cols);
  check('iPad: panes start on the same row', Math.abs(ipad.sameRow - ipad.qTop) < 4, `${ipad.sameRow} vs ${ipad.qTop}`);

  const scroll = await (async () => {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN' });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
    await page.evaluate(() => (location.hash = '#/exam'));
    await page.locator('.v-exam__tile').first().waitFor({ timeout: 90000 });
    await page.locator('.v-exam__tile').nth(1).getByRole('button', { name: '开始' }).click();
    await page.locator('.v-exam__pane--questions').waitFor({ timeout: 30000 });
    await page.locator('.v-exam__pane--questions').hover();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    const result = await page.evaluate(() => ({
      page: window.scrollY,
      pane: document.querySelector('.v-exam__pane--questions').scrollTop,
    }));
    await ctx.close();
    return result;
  })();
  check('iPad: wheel scrolls the options pane, not the page', scroll.pane > 0 && scroll.page === 0,
    `paneTop=${scroll.pane} pageY=${scroll.page}`);

  const phone = await openReading(browser, { width: 390, height: 844 }, 'layout-phone-reading');
  check('phone: split stacks vertically', phone.display === 'flex', phone.display);
  check('phone: questions below passage', phone.qTop > phone.sameRow, `${phone.qTop} > ${phone.sameRow}`);

  const errors = [...ipad.errors, ...phone.errors];
  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL LAYOUT TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
