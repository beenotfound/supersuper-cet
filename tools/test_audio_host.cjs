const PW = 'C:/Users/黄枫/Documents/deepseek-harness/default-workspace/mc_history/skills/garden-skills-main/skills/motion-showreel/scripts/node_modules/playwright';
const { chromium } = require(PW);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = []; const audioResp = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().includes('cet-audio.pages.dev')) audioResp.push([r.status(), r.url().split('/').pop()]); });
  await page.goto('http://127.0.0.1:8790/#/listening/cet6-2024-12-01', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const players = await page.locator('audio').count();
  const srcs = await page.locator('audio').evaluateAll(as => as.map(a => a.currentSrc.split('/').pop()));
  const meta = await page.locator('audio').first().evaluate(a => new Promise(res => { if (a.readyState>=1) res({duration:a.duration,src:a.currentSrc}); else { a.addEventListener('loadedmetadata',()=>res({duration:a.duration,src:a.currentSrc}),{once:true}); setTimeout(()=>res({duration:a.duration,src:a.currentSrc,timeout:true}),5000); } }));
  console.log(JSON.stringify({ errors, players, srcs, meta, audioResp: audioResp.slice(0,5) }, null, 2));
  await browser.close();
})();
