const { chromium } = require('@playwright/test');
(async () => {
  const [, , id, width, out, action] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
  await p.goto(`http://localhost:8000/design-system/en/frame/${id}`, { waitUntil: 'networkidle', timeout: 180000 });
  if (action) { await p.locator(action).first().click(); await p.waitForTimeout(400); }
  await p.screenshot({ path: out, fullPage: false });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
