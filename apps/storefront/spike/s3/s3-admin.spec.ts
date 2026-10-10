// S3 PROTOTYPE (not for main). L2 to L8 against a running `next start` on :8000 whose database is
// one of the throwaway `payload_s3_*` databases. The suite sets `markets` through the REST API, as
// the admin's own form does, and reads the admin's locale selector in a browser.
//   server.sh start full && pnpm exec playwright test -c spike/s3/playwright.config.ts
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const BASE = "http://localhost:8000";
const EMAIL = "owner@example.com";
const PASSWORD = "correct-horse-battery";

// A language's Medusa locale (D8), required by the `markets` global.
const MEDUSA_LOCALE: Record<string, string> = {
  en: "en-US",
  el: "el-GR",
  de: "de-DE",
  fr: "fr-FR",
  pt: "pt-BR",
  it: "it-IT",
  mn: "mn-MN",
};

type Country = { code: string; languages: string[]; enabled?: boolean };

let token = "";

async function login(page: Page, request: import("@playwright/test").APIRequestContext) {
  const init = await (await request.get(`${BASE}/api/users/init`)).json();
  if (!init.initialized) {
    const registered = await request.post(`${BASE}/api/users/first-register`, {
      headers: { Origin: BASE },
      data: { email: EMAIL, password: PASSWORD, "confirm-password": PASSWORD },
    });
    expect(registered.status()).toBe(200);
  }
  const response = await request.post(`${BASE}/api/users/login`, {
    headers: { Origin: BASE },
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(response.status()).toBe(200);
  token = (await response.json()).token;
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
}

/** Saves the `markets` global (what the admin's form does). */
async function setMarkets(request: import("@playwright/test").APIRequestContext, countries: Country[]) {
  const languages = [...new Set(countries.flatMap((c) => c.languages))].map((code) => ({
    code,
    medusaLocale: MEDUSA_LOCALE[code] ?? "en-US",
  }));
  const response = await request.post(`${BASE}/api/globals/markets`, {
    headers: { Authorization: `JWT ${token}`, Origin: BASE },
    data: {
      countries: countries.map((c) => ({ enabled: true, ...c })),
      languages,
      primaryCountry: countries[0]?.code,
      fallbackMarket: "en-us",
    },
  });
  expect(response.status(), await response.text()).toBe(200);
}

/** The locale codes the admin's selector offers, in order, and the one it shows as current. */
async function selector(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const button = page.getByRole("button", { name: "Locale" }).first();
  const current = await button.locator("[data-locale]").first().getAttribute("data-locale");
  await button.click();
  await page.waitForTimeout(300);
  const codes = await page
    .locator(".popup__content .localizer__locale-code")
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset["locale"] ?? ""));
  await page.keyboard.press("Escape");
  return { current, codes, url: page.url() };
}

async function counters(request: import("@playwright/test").APIRequestContext, reset = false) {
  const response = await request.get(`${BASE}/next/spike/s3/counters${reset ? "?reset=1" : ""}`);
  return (await response.json()) as { calls: number; reads: number; pid: number; uptime: number };
}

const consoleErrors: string[] = [];
let page: Page;
let startPid = 0;
let startUptime = 0;
const report: Record<string, unknown> = {};

test.beforeAll(async ({ browser, request }) => {
  page = await browser.newPage({ baseURL: BASE });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`));
  await login(page, request);
  const c = await counters(request);
  startPid = c.pid;
  startUptime = c.uptime;
});

test.afterAll(async () => {
  console.log("S3_REPORT " + JSON.stringify(report));
  await page.close();
});

test("L5: markets is empty, the selector offers English alone and the admin loads", async ({ request }) => {
  await setMarkets(request, []);
  const result = await selector(page, "/admin/collections/pages");
  report["L5"] = result;
  expect(result.codes.length === 0 || (result.codes.length === 1 && result.codes[0] === "en")).toBe(true);
  expect(result.current).toBe("en");
  await expect(page).toHaveTitle(/Pages/);
});

test("L2: markets enables el and en, the selector shows exactly those", async ({ request }) => {
  await setMarkets(request, [
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
  ]);
  const result = await selector(page, "/admin/collections/pages");
  report["L2"] = result;
  expect(result.codes).toEqual(["en", "el"]);
});

test("L3: enabling de shows it after a reload, with no restart", async ({ request }) => {
  await setMarkets(request, [
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
    { code: "de", languages: ["de"] },
  ]);
  const result = await selector(page, "/admin/collections/pages");
  report["L3"] = result;
  expect(result.codes).toEqual(["en", "de", "el"]);
  const after = await counters(request);
  report["L3-process"] = { startPid, pid: after.pid, startUptime, uptime: after.uptime };
  expect(after.pid).toBe(startPid);
  expect(after.uptime).toBeGreaterThan(startUptime);
});

test("L4: markets enables only el, the selector shows el and the forced en", async ({ request }) => {
  await setMarkets(request, [{ code: "cy", languages: ["el"] }]);
  const result = await selector(page, "/admin/collections/pages");
  report["L4"] = result;
  expect(result.codes).toEqual(["en", "el"]);
});

test("L6: ?locale=fr while fr is disabled redirects to an allowed locale, no crash", async ({ request }) => {
  await setMarkets(request, [
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
  ]);
  const before = consoleErrors.length;
  const out: Record<string, unknown> = {};
  for (const url of [
    "/admin/collections/pages?locale=fr",
    "/admin/collections/pages/create?locale=fr",
    "/admin/globals/markets?locale=fr",
    "/admin?locale=fr",
  ]) {
    const response = await page.goto(url);
    await page.waitForLoadState("networkidle");
    const final = new URL(page.url());
    out[url] = { status: response?.status(), final: final.pathname + final.search, title: await page.title() };
    expect(response?.status()).toBeLessThan(400);
    expect(final.searchParams.get("locale")).toBe("en");
  }
  // The preference Payload stored for `fr` must not make the next plain page load fail either.
  const plain = await page.goto("/admin/collections/pages");
  await page.waitForLoadState("networkidle");
  out["plain after"] = { status: plain?.status(), final: page.url() };
  expect(plain?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/Pages/);
  report["L6"] = out;
  report["L6-console"] = consoleErrors.slice(before);
  // `fr` enabled: it stays.
  await setMarkets(request, [{ code: "fr", languages: ["fr"] }]);
  const enabled = await selector(page, "/admin/collections/pages?locale=fr");
  report["L6-enabled"] = enabled;
  expect(new URL(enabled.url).searchParams.get("locale")).toBe("fr");
  expect(enabled.current).toBe("fr");
});

test("L7: how often the filter runs and how often markets is read, per HTTP request", async ({ request }) => {
  await setMarkets(request, [{ code: "cy", languages: ["el"] }]);
  type Entry = { calls: number; reads: number };
  const out: Record<string, { requests: number; calls: number[]; reads: number[] }> = {};
  const measure = async (name: string, action: () => Promise<void>) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await counters(request, true);
    await action();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const c = (await counters(request)) as unknown as { byRequest: Record<string, Entry> };
    const entries = Object.values(c.byRequest);
    out[name] = { requests: entries.length, calls: entries.map((e) => e.calls), reads: entries.map((e) => e.reads) };
  };
  await measure("hard load of the list view", async () => {
    await page.goto("/admin/collections/pages");
  });
  await measure("hard load of the dashboard", async () => {
    await page.goto("/admin");
  });
  await measure("soft navigation to Media (sidebar link)", async () => {
    // Clicked in the page: an overlay blocks Playwright's click on the nav link (SETUP.md, S1).
    await page.evaluate(() => (document.querySelector('a[href="/admin/collections/media"]') as HTMLElement).click());
    await page.waitForURL(/collections\/media/);
  });
  await measure("hard load of the document view", async () => {
    await page.goto("/admin/collections/pages/create");
  });
  // Payload remembers the admin's last locale per user, and shows the current one as a disabled
  // item, not a button: start from English so the step does not depend on an earlier run.
  await page.goto("/admin/collections/pages?locale=en");
  await measure("switching the locale in the selector (soft)", async () => {
    await page.getByRole("button", { name: "Locale" }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Ελληνικά/ }).click();
    await page.waitForURL(/locale=el/);
  });
  report["L7"] = out;
  // The plan: at most one markets read per admin request.
  for (const [name, { reads }] of Object.entries(out)) {
    expect(Math.max(0, ...reads), `most markets reads in one request, for: ${name}`).toBeLessThanOrEqual(1);
  }
});

test("L8: GET /api/pages?locale=fr answers 200 while fr is disabled", async ({ request }) => {
  await setMarkets(request, [{ code: "cy", languages: ["el"] }]);
  const asVisitor = await request.get(`${BASE}/api/pages?locale=fr`);
  const asAdmin = await request.get(`${BASE}/api/pages?locale=fr`, { headers: { Authorization: `JWT ${token}` } });
  const unknown = await request.get(`${BASE}/api/pages?locale=zz`);
  const all = await request.get(`${BASE}/api/pages?locale=all`);
  report["L8"] = {
    visitorFr: asVisitor.status(),
    adminFr: asAdmin.status(),
    unknownZz: unknown.status(),
    all: all.status(),
  };
  expect(asVisitor.status()).toBe(200);
  expect(asAdmin.status()).toBe(200);
});

test("the admin's console stayed free of errors (informational)", async () => {
  report["console-errors"] = consoleErrors;
  expect.soft(consoleErrors.filter((e) => !/gravatar|ERR_TUNNEL|ERR_ABORTED/i.test(e))).toEqual([]);
});
