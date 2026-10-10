// S3 PROTOTYPE. L10, the admin half: with `is` in the list and migrated, enable it in `markets`, see it in
// the selector, write a page in it, read it back.   node spike/s3/l10-admin.mjs
import { chromium } from "@playwright/test";
const B = "http://localhost:8000";
const json = { "content-type": "application/json", Origin: B };
const { token } = await (await fetch(`${B}/api/users/login`, { method: "POST", headers: json, body: JSON.stringify({ email: "owner@example.com", password: "correct-horse-battery" }) })).json();
const auth = { ...json, Authorization: `JWT ${token}` };
const get = async (path) => { const r = await fetch(B + path, { headers: auth }); return { status: r.status, body: await r.json().catch(() => null) }; };

const markets = (extra) => ({
  countries: [
    { code: "cy", enabled: true, languages: ["el"] },
    { code: "us", enabled: true, languages: ["en"] },
    ...extra,
  ],
  languages: [{ code: "en", medusaLocale: "en-US" }, { code: "el", medusaLocale: "el-GR" }, ...(extra.length ? [{ code: "is", medusaLocale: "en-US" }] : [])],
  primaryCountry: "cy",
  fallbackMarket: "en-us",
});
const save = async (body) => { const r = await fetch(`${B}/api/globals/markets`, { method: "POST", headers: auth, body: JSON.stringify(body) }); return { status: r.status, text: (await r.text()).slice(0, 220) }; };

const out = {};
out.beforeEnabling = await save(markets([]));
const browser = await chromium.launch();
const page = await browser.newPage({ baseURL: B });
await page.goto("/admin/login");
await page.fill('input[name="email"]', "owner@example.com");
await page.fill('input[name="password"]', "correct-horse-battery");
await page.getByRole("button", { name: /^log in$|^login$/i }).click();
await page.waitForURL(/\/admin\/?$/);
const selector = async () => {
  await page.goto("/admin/collections/pages?locale=en");
  await page.waitForLoadState("networkidle");
  const button = page.getByRole("button", { name: "Locale" }).first();
  await button.click(); await page.waitForTimeout(300);
  const items = await page.locator(".popup__content .popup-button-list__button").allInnerTexts();
  const codes = await page.locator(".popup__content .localizer__locale-code").evaluateAll((els) => els.map((e) => e.dataset.locale));
  await page.keyboard.press("Escape");
  return { codes, items };
};
out.selectorBefore = await selector();
out.enable = await save(markets([{ code: "is", enabled: true, languages: ["is"] }]));
await page.waitForTimeout(2600); // the 2 s memo of the prototype (no save hook yet)
out.selectorAfter = await selector();

// write a page in Icelandic through the admin form
await page.goto("/admin/collections/pages/create?locale=en");
await page.locator('input[name="title"]:visible').fill("About us (L10)");
await page.locator('input[name="slug"]:visible').fill("about-l10");
await page.getByRole("button", { name: "Save Draft" }).click();
await page.waitForURL(/\/admin\/collections\/pages\/(\d+)/);
const id = Number(/\/pages\/(\d+)/.exec(page.url())?.[1]);
await page.goto(`/admin/collections/pages/${id}?locale=is`);
await page.locator('input[name="title"]:visible').waitFor();
await page.locator('input[name="title"]:visible').fill("Um okkur");
await page.locator('input[name="slug"]:visible').fill("um-okkur");
const patch = page.waitForResponse((r) => r.url().includes(`/api/pages/${id}`) && r.request().method() === "PATCH");
await page.getByRole("button", { name: /^Publish/ }).click();
out.publishStatus = (await patch).status();
out.restIs = (await get(`/api/pages/${id}?locale=is&fallback-locale=none`)).body && { title: (await get(`/api/pages/${id}?locale=is&fallback-locale=none`)).body.title, slug: (await get(`/api/pages/${id}?locale=is&fallback-locale=none`)).body.slug };
out.restAll = Object.keys((await get(`/api/pages/${id}?locale=all`)).body?.title ?? {});
await browser.close();
console.log(JSON.stringify({ l10Admin: out }, null, 1));
