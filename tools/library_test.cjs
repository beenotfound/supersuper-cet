/* tools/library_test.cjs — library integration: tabs, reader, lookup, mark read. */
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
  await page.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({
    v: 2, profile: { onboarded: true, level: 'cet6', examDate: '2026-12-19' },
    theta: 5.2, words: {}, stats: { days: {}, streak: 0, lastDay: null },
  })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (location.hash = '#/library'));
  await page.locator('.v-library').waitFor({ timeout: 90000 });

  check('library route renders', (await page.locator('.v-library .page-title').first().innerText()).includes('图书馆'));
  check('library subtitle updated', (await page.locator('.v-library').innerText()).includes('咱今天就读起来~~'));
  check('nav has library tab', (await page.locator('.c-nav__item[data-tab="library"]').count()) === 1);
  check('two tabs', (await page.getByRole('button', { name: '考试阅读' }).count()) === 1
    && (await page.getByRole('button', { name: '文学角' }).count()) === 1);

  await page.getByRole('button', { name: '开始阅读' }).first().waitFor({ timeout: 60000 });
  const examCards = await page.getByRole('button', { name: '开始阅读' }).count();
  check('exam reading list has entries', examCards > 0, `cards=${examCards}`);

  await page.getByRole('button', { name: '开始阅读' }).first().click();
  await page.locator('.v-library__w').first().waitFor({ timeout: 30000 });
  const words = await page.locator('.v-library__w').count();
  check('reader has clickable words', words > 50, `words=${words}`);
  check('exam reader offers 去做题', (await page.getByRole('button', { name: '去做题' }).count()) === 1);

  await page.locator('.v-library__w').nth(3).click();
  await page.locator('.c-sheet').waitFor({ timeout: 10000 });
  const sheet = await page.locator('.c-sheet').innerText();
  check('word lookup sheet opens', sheet.includes('查词'), sheet.replace(/\n+/g, ' ').slice(0, 40));
  check('lookup has speak and fav', sheet.includes('朗读') && (sheet.includes('收藏') || sheet.includes('取消收藏')));
  await page.getByRole('button', { name: '关闭' }).first().click();
  await page.locator('.c-sheet').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

  await page.getByRole('button', { name: '返回列表' }).first().click();
  await page.getByRole('button', { name: '文学角' }).click();
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.locator('.v-library__storytitle').first().waitFor({ timeout: 60000 });
  const stories = await page.locator('.v-library__storytitle').count();
  check('literature corner lists stories', stories >= 2, `stories=${stories}`);

  await page.getByRole('button', { name: '开始阅读' }).first().click();
  await page.locator('.v-library__w').first().waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: '标记已读' }).click();
  await page.waitForTimeout(500);
  let read = await page.evaluate(() => JSON.parse(localStorage.getItem('cetcollage.v1')).read);
  check('mark read persists', read.length === 1, JSON.stringify(read));

  await page.getByRole('button', { name: '标记未读' }).click();
  await page.waitForTimeout(500);
  read = await page.evaluate(() => JSON.parse(localStorage.getItem('cetcollage.v1')).read);
  check('mark unread works', read.length === 0, JSON.stringify(read));

  await page.getByRole('button', { name: '标记已读' }).click();
  await page.waitForTimeout(500);
  read = await page.evaluate(() => JSON.parse(localStorage.getItem('cetcollage.v1')).read);
  check('mark read again works', read.length === 1, JSON.stringify(read));

  await page.getByRole('button', { name: '返回列表' }).first().click();
  await page.waitForTimeout(300);
  const home = await page.locator('.v-library').innerText();
  check('library shows read count', /已读\s*1/.test(home), home.replace(/\n+/g, ' ').slice(0, 60));

  await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'library.png') });

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL LIBRARY TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
