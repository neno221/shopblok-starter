// S3 PROTOTYPE. L9, browser half: how long the admin edit view takes from `goto` to the last
// localized field on screen, as a person sees it.  node spike/s3/bench-browser.mjs [N]
import { chromium } from "@playwright/test";
const B = "http://localhost:8000";
const N = Number(process.argv[2] ?? 30);
const browser = await chromium.launch();
const page = await browser.newPage({ baseURL: B });
await page.goto("/admin/login");
await page.fill('input[name="email"]', "owner@example.com");
await page.fill('input[name="password"]', "correct-horse-battery");
await page.getByRole("button", { name: /^log in$|^login$/i }).click();
await page.waitForURL(/\/admin\/?$/);
await page.waitForLoadState("networkidle");
const token = (await page.context().cookies()).find((c) => c.name === "payload-token")?.value;
const first = await (await fetch(`${B}/api/s3-rich?limit=1&sort=id&depth=0`, { headers: { Authorization: `JWT ${token}` } })).json();
const url = `/admin/collections/s3-rich/${first.docs[0].id}?locale=el`;
const visible = page.locator('input[name="text24"]:visible');
const samples = [];
for (let i = 0; i < N + 3; i++) {
  const t = performance.now();
  await page.goto(url);
  await visible.waitFor({ state: "visible" });
  const ms = performance.now() - t;
  if (i >= 3) samples.push(ms);
}
const s = [...samples].sort((a, b) => a - b);
const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
console.log(JSON.stringify({ benchBrowser: { n: s.length, p50: +at(0.5).toFixed(1), p95: +at(0.95).toFixed(1) } }));
await browser.close();
