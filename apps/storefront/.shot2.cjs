const { chromium } = require('@playwright/test');
(async () => {
  const [, , id, width, out, sel] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
  await p.goto(`http://localhost:8000/design-system/en/frame/${id}`, { waitUntil: 'networkidle', timeout: 180000 });
  await p.waitForTimeout(1500);
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: out });
  console.log(await el.evaluate((e) => e.outerHTML.length));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
