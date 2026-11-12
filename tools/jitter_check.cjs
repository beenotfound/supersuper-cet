/* tools/jitter_check.cjs — measure layout shift when switching exam levels. */
const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport, locale: 'zh-CN' });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
    await page.evaluate(() => localStorage.setItem('cetcollage.v1', JSON.stringify({ profile: { onboarded: true } })));
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => (location.hash = '#/exam'));
    await page.locator('.v-exam__tile').first().waitFor({ timeout: 60000 });

    await page.evaluate(() => {
      window.__shifts = [];
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shifts.push(Number(entry.value.toFixed(4)));
        }).observe({ type: 'layout-shift', buffered: true });
      } catch { /* unsupported */ }
    });

    const snap = () => page.evaluate(() => ({
      y: window.scrollY,
      h: document.documentElement.scrollHeight,
      vw: window.innerWidth,
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
      shifts: window.__shifts.slice(),
    }));

    const before = await snap();
    const gridBefore = await page.locator('.v-exam__grid').elementHandle();
    await page.getByRole('button', { name: '四级', exact: true }).click();
    await page.waitForTimeout(600);
    const cet4 = await snap();
    await page.getByRole('button', { name: '六级', exact: true }).click();
    await page.waitForTimeout(600);
    const cet6 = await snap();
    const gridStillConnected = await gridBefore.evaluate((el) => el.isConnected);

    // repeat while scrolled down, and with rapid clicks
    await page.evaluate(() => window.scrollTo(0, 240));
    await page.waitForTimeout(150);
    const scrolled = await snap();
    await page.getByRole('button', { name: '四级', exact: true }).click();
    await page.waitForTimeout(500);
    const scrolledAfter = await snap();
    await page.getByRole('button', { name: '四级', exact: true }).click();
    await page.getByRole('button', { name: '六级', exact: true }).click();
    await page.waitForTimeout(500);
    const rapid = await snap();

    console.log(`viewport ${viewport.width}x${viewport.height}`);
    console.log('  before:', before);
    console.log('  cet4  :', cet4);
    console.log('  cet6  :', cet6);
    console.log('  scrolled:', scrolled, '-> after switch:', scrolledAfter);
    console.log('  rapid  :', rapid);
    console.log('  grid DOM preserved across switches:', gridStillConnected);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
