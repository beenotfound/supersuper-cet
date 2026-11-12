/* tools/share_test.cjs — share card renders; desktop downloads, WeChat gets a hint. */
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
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'zh-CN', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => {
    const words = {};
    for (const w of ['abide', 'clamp', 'dominate', 'paragraph', 'senseless', 'assign']) {
      words[w] = { reps: 2, iv: 3, ease: 2.5, due: Date.now() + 86400000, seen: 3 };
    }
    localStorage.setItem('cetcollage.v1', JSON.stringify({
      v: 2,
      profile: { onboarded: true, level: 'cet6', examDate: '2026-12-19' },
      theta: 5.2,
      words,
      stats: { days: { '2026-11-09': { total: 4 }, '2026-11-10': { total: 6 }, '2026-11-11': { total: 3 } }, streak: 3, lastDay: '2026-11-11' },
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (location.hash = '#/me'));
  await page.locator('.v-me__preview').waitFor({ timeout: 60000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'me-share.png'), fullPage: false });

  const size = await page.locator('.v-me__preview').evaluate((img) => [img.naturalWidth, img.naturalHeight]);
  check('card preview is 1080x1350', size[0] === 1080 && size[1] === 1350, size.join('x'));
  await page.locator('.v-me__preview').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.locator('.v-me__preview').screenshot({ path: path.join(__dirname, '..', 'shots', 'share-card.png') });

  check('desktop shows a download button, not a share sheet',
    (await page.getByRole('button', { name: '下载卡片' }).count()) === 1
    && (await page.getByRole('button', { name: '分享卡片' }).count()) === 0);

  const [saveDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.getByRole('button', { name: '下载卡片' }).click(),
  ]);
  check('download card produces a png', /\.png$/i.test(saveDownload.suggestedFilename()), saveDownload.suggestedFilename());

  await page.getByRole('button', { name: '分享这个工具' }).click();
  await page.waitForTimeout(400);
  const body = await page.locator('body').innerText();
  check('desktop link share copies the url', body.includes('链接已复制'), body.slice(0, 30));

  // WeChat in-app browser: explain instead of failing silently
  const wx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.44',
    locale: 'zh-CN',
  });
  const wxPage = await wx.newPage();
  await wxPage.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await wxPage.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({
    v: 2, profile: { onboarded: true, level: 'cet6' }, theta: 5.2, words: {},
    stats: { days: {}, streak: 0, lastDay: null },
  })));
  await wxPage.reload({ waitUntil: 'networkidle' });
  await wxPage.evaluate(() => (location.hash = '#/me'));
  await wxPage.locator('.v-me__preview').waitFor({ timeout: 60000 });
  await wxPage.getByRole('button', { name: '分享这个工具' }).click();
  await wxPage.locator('.c-sheet').waitFor({ timeout: 10000 });
  const sheet = await wxPage.locator('.c-sheet').innerText();
  check('WeChat browser shows "open in browser" hint', sheet.includes('在浏览器中打开'), sheet.replace(/\n+/g, ' ').slice(0, 50));
  await wx.close();

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(' ', e));
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL SHARE TESTS PASS');
  process.exit(failures || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
