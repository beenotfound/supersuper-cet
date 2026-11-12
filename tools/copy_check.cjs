/* tools/copy_check.cjs — welcome / today / onboarding copy. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.v-today').waitFor({ timeout: 60000 });

  const welcome = await page.locator('.v-today').innerText();
  check('welcome: 首先', welcome.includes('首先'));
  check('welcome: 我们需要了解你的词汇量', welcome.includes('我们需要了解你的') && welcome.includes('词汇量'));
  check('welcome: 背单词拒绝从abandon开始', welcome.includes('背单词拒绝从abandon开始'));
  check('welcome: old copy removed', !welcome.includes('认清自己') && !welcome.includes('不再出现在队列里') && !welcome.includes('不用从 abandon 开始'));
  check('welcome: button renamed', welcome.includes('开始词汇量校准') && !welcome.includes('开始 3 分钟校准'));
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'welcome.png') });

  await page.evaluate(() => (location.hash = '#/onboarding'));
  await page.locator('.v-onboard').waitFor({ timeout: 30000 });
  const onboard = await page.locator('.v-onboard').innerText();
  check('onboarding: new title', onboard.includes('首先') && onboard.includes('词汇量'));
  check('onboarding: button renamed', onboard.includes('开始词汇量校准'));
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'onboarding.png') });

  await page.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({
    v: 2, profile: { onboarded: true, level: 'cet6' }, theta: 5.2, words: {},
    stats: { days: {}, streak: 0, lastDay: null },
  })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (location.hash = '#/today'));
  await page.locator('.v-today').waitFor({ timeout: 60000 });
  const home = await page.locator('.v-today').innerText();
  check('home: 今天学点什么呢', home.includes('今天') && home.includes('学点什么'));
  check('home: old title removed', !home.includes('只学不会的'));
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'today-home.png') });

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL COPY TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
