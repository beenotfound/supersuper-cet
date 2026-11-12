/* tools/library_ui_test.cjs — Playwright acceptance for the #/library view.
 *
 * Covers: library renders, tab chips switch (考试阅读 / 文学角), level filter,
 * reader opens, clicking a word (mouse + keyboard) opens the lookup sheet,
 * 标记已读 works and lands in the stats line, 下一篇 advances, zero console/page errors.
 *
 * Run with the local preview server up:  node tools/library_ui_test.cjs
 * (start it first: python tools/local_open.py --no-open)
 */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const STORE_KEY = 'cetcollage.v1';

let passed = 0;
function check(cond, label) {
  if (!cond) throw new Error(`ASSERT FAILED: ${label}`);
  passed++;
  console.log(`  ok - ${label}`);
}

async function textOf(page, selector) {
  return (await page.locator(selector).first().innerText()).trim();
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: 'zh-CN',
    });
    // Deterministic starting state: onboarded, CET-4, nothing read yet.
    await context.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({
        v: 2,
        profile: { level: 'cet4', onboarded: true },
        read: [],
        fav: [],
      }));
    }, STORE_KEY);

    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

    await page.goto(BASE + '#/library', { waitUntil: 'domcontentloaded', timeout: 60000 });

    /* 1. library home renders */
    await page.waitForSelector('.v-library', { timeout: 30000 });
    await page.waitForSelector('.v-library__row', { timeout: 30000 });
    check((await page.locator('.v-library').count()) === 1, 'exactly one .v-library root (no nesting)');
    check((await textOf(page, '.v-library .page-title')).includes('图书馆'), 'library title renders');
    check((await page.locator('.v-library__pick').count()) === 3, 'three i+1 recommendation cards');
    check((await page.locator('.v-library__row').count()) > 20, 'all-reading list renders');
    check(/已读 0 篇/.test(await textOf(page, '.v-library__stats')), 'stats line shows 已读 0 篇');
    check((await textOf(page, '.v-library__tabs .c-chip.is-active')).includes('考试阅读'), '考试阅读 tab active by default');
    check((await textOf(page, '.v-library__levels .c-chip.is-active')).includes('四级'), 'level filter defaults to the profile level');
    check((await page.locator('.v-library__w').count()) === 0, 'no reader on the home screen');

    /* 2. level chip -> 全部, then tab chip -> 文学角 (lazy-loads stories.json) */
    await page.locator('.v-library__levels .c-chip', { hasText: '全部' }).click();
    await page.locator('.v-library__tabs .c-chip', { hasText: '文学角' }).click();
    await page.waitForSelector('.v-library__story', { timeout: 30000 });
    check((await page.locator('.v-library__story').count()) >= 1, '文学角 story cards render');
    check((await page.locator('.v-library__tabs .c-chip.is-active').innerText()).includes('文学角'), '文学角 tab active after switch');
    check((await textOf(page, '.v-library__storytitle')).length > 0, 'story title is not empty');

    /* 3. back to 考试阅读 (level 全部) */
    await page.locator('.v-library__tabs .c-chip', { hasText: '考试阅读' }).click();
    await page.waitForSelector('.v-library__row', { timeout: 30000 });
    const allRows = await page.locator('.v-library__row').count();

    /* 4. level filter chips */
    await page.locator('.v-library__levels .c-chip', { hasText: '六级' }).click();
    await page.waitForFunction(() => {
      const rows = [...document.querySelectorAll('.v-library__row')];
      return rows.length > 0 && rows.every((r) => r.textContent.includes('六级'));
    }, { timeout: 20000 });
    const cet6Rows = await page.locator('.v-library__row').count();
    await page.locator('.v-library__levels .c-chip', { hasText: '四级' }).click();
    await page.waitForFunction(() => {
      const rows = [...document.querySelectorAll('.v-library__row')];
      return rows.length > 0 && rows.every((r) => r.textContent.includes('四级'));
    }, { timeout: 20000 });
    const cet4Rows = await page.locator('.v-library__row').count();
    check(cet4Rows > 0 && cet6Rows > 0 && cet4Rows + cet6Rows === allRows, 'level filter splits 四级 / 六级');
    check((await textOf(page, '.v-library__levels .c-chip.is-active')).includes('四级'), 'level filter switches back to 四级');

    /* 5. open the reader */
    await page.locator('.v-library__row .c-btn').first().click();
    await page.waitForSelector('.v-library__reader', { timeout: 20000 });
    const wordCount = await page.locator('.v-library__w').count();
    check(wordCount > 20, `reader tokenizes words into spans (${wordCount})`);
    const firstTitle = await textOf(page, '.v-library__rtitle');
    check(firstTitle.length > 0, 'reader title is not empty');
    check((await page.locator('.v-library__rfoot .c-btn', { hasText: '去做题' }).count()) === 1, '读者 footer offers 去做题 for exam passages');

    /* 6. click a word -> lookup sheet */
    const target = page.locator('.v-library__w').nth(4);
    const targetWord = (await target.innerText()).trim().toLowerCase();
    await target.click();
    await page.waitForSelector('.c-sheet', { state: 'visible', timeout: 10000 });
    check((await textOf(page, '.v-library__lookupword')).toLowerCase() === targetWord, 'lookup sheet shows the clicked word');
    check((await page.locator('.c-sheet .c-btn', { hasText: '朗读' }).count()) >= 1, 'lookup sheet has 朗读 button');
    const hasDictionary = (await page.locator('.c-sheet .v-library__glosscn').count()) > 0
      || (await page.locator('.c-sheet .small.muted').count()) > 0;
    check(hasDictionary, 'lookup sheet shows glosses or a not-found hint');
    await page.locator('.c-sheet button[aria-label="关闭"]').click();
    await page.waitForSelector('.c-sheet', { state: 'detached', timeout: 10000 });
    check(true, 'lookup sheet closes');

    /* 7. keyboard: focus a word, press Enter */
    await page.locator('.v-library__w').nth(5).focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.c-sheet', { state: 'visible', timeout: 10000 });
    check(true, 'word span opens lookup via keyboard Enter');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.c-sheet', { state: 'detached', timeout: 10000 });

    /* 8. 标记已读 */
    await page.locator('.v-library__rfoot .c-btn', { hasText: '标记已读' }).click();
    await page.waitForSelector('.v-library__rfoot .c-btn:has-text("标记未读")', { timeout: 10000 });
    check((await textOf(page, '.v-library__rfoot')).includes('标记未读'), '标记已读 flips the button to 标记未读 (enabled)');

    /* 9. 下一篇 */
    await page.locator('.v-library__rfoot .c-btn', { hasText: '下一篇' }).click();
    await page.waitForFunction((t) => document.querySelector('.v-library__rtitle')?.textContent !== t, firstTitle, { timeout: 10000 });
    check(true, '下一篇 advances to another passage');

    /* 10. back to list: read state persists in stats + list badge */
    check((await page.locator('.v-library__rfoot .c-btn', { hasText: '返回列表' }).count()) === 1, 'footer also offers 返回列表');
    await page.locator('.v-library__rtop .c-btn').click();
    await page.waitForSelector('.v-library__row', { timeout: 20000 });
    check(/已读 1 篇/.test(await textOf(page, '.v-library__stats')), 'stats line shows 已读 1 篇 after marking');
    check((await page.locator('.v-library__row .c-tag', { hasText: '已读' }).count()) >= 1, 'list row shows 已读 badge');

    /* 11. hydration / error hygiene */
    const stray = await page.evaluate(() => {
      const bad = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t === 'null' || t === 'undefined') bad.push(t);
      }
      return bad;
    });
    check(stray.length === 0, 'no stray null/undefined text');
    check(errors.length === 0, `zero console/page errors${errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''}`);

    console.log(`\nPASS ${passed} checks`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('FAIL', error.message);
  process.exit(1);
});
