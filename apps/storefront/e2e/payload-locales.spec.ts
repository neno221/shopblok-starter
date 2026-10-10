import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";

// S3 (ADR 0003): the admin's locale selector follows the `markets` global. Payload preloads 42
// languages; `filterAvailableLocales` (src/payload/filter-available-locales.ts) offers the admin
// the enabled ones and English. It filters the selector only, so the REST API still answers for a
// language that is switched off (L8), and the storefront has to enforce its markets itself.
//
// This suite saves the `markets` global, which changes the map the proxy serves for up to a minute,
// so playwright.config.ts runs it as its own project after every other suite, and `afterAll` puts
// the global, and the admin's remembered locale, back as it found them (and fails the run if it
// cannot). Run on its own: `playwright test --project=locales --no-deps`.

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

// A language's Medusa locale (D8); the global requires one for every language it lists.
const MEDUSA_LOCALE: Record<string, string> = {
  en: "en-US",
  el: "el-GR",
  de: "de-DE",
  fr: "fr-FR",
};

type Country = { code: string; languages: string[] };
type Selector = { current: string | null; codes: string[]; url: string };

let page: Page;
let token = "";
let appOrigin = "";
let originalMarkets: Record<string, unknown> | undefined;
// The admin's remembered locale (Payload's `locale` preference): null is "none stored".
let originalLocale: string | null | undefined;

const LOCALE_PREFERENCE = "/api/payload-preferences/locale";

/** The bootstrap admin's JWT; `Origin` is what Payload's CSRF check compares on a write. */
const adminHeaders = () => ({ Authorization: `JWT ${token}`, Origin: appOrigin });

async function readMarkets(request: APIRequestContext): Promise<Record<string, unknown>> {
  const response = await request.get("/api/globals/markets", { headers: adminHeaders() });
  expect(response.status(), "an admin may read the markets global").toBe(200);
  return (await response.json()) as Record<string, unknown>;
}

async function postMarkets(request: APIRequestContext, body: unknown): Promise<void> {
  const response = await request.post("/api/globals/markets", {
    headers: adminHeaders(),
    data: body,
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function readLocalePreference(request: APIRequestContext): Promise<string | null> {
  const response = await request.get(LOCALE_PREFERENCE, { headers: adminHeaders() });
  expect(response.status(), "an admin may read their own preferences").toBe(200);
  return ((await response.json()) as { value: string | null }).value;
}

async function writeLocalePreference(
  request: APIRequestContext,
  value: string | null,
): Promise<void> {
  const headers = adminHeaders();
  const response =
    value === null
      ? await request.delete(LOCALE_PREFERENCE, { headers })
      : await request.post(LOCALE_PREFERENCE, { headers, data: { value } });
  expect(response.status(), await response.text()).toBe(200);
}

/** Saves a market map with these countries (the first is the primary one), as the admin's form does. */
function setMarkets(request: APIRequestContext, countries: Country[]): Promise<void> {
  const languages = [...new Set(countries.flatMap((country) => country.languages))];
  return postMarkets(request, {
    countries: countries.map((country) => ({ enabled: true, ...country })),
    languages: languages.map((code) => ({ code, medusaLocale: MEDUSA_LOCALE[code] ?? "en-US" })),
    primaryCountry: countries[0]?.code,
    fallbackMarket: "en-us",
  });
}

/** The locale codes the admin's selector offers, in order, and the one it shows as current. */
async function selector(url: string): Promise<Selector> {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const button = page.getByRole("button", { name: "Locale" }).first();
  const current = await button.locator("[data-locale]").first().getAttribute("data-locale");
  await button.click();
  const items = page.locator(".popup__content .localizer__locale-code");
  await items.first().waitFor();
  const codes = await items.evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset["locale"] ?? ""),
  );
  await page.keyboard.press("Escape");
  return { current, codes, url: page.url() };
}

test.beforeAll(async ({ browser, request, baseURL }) => {
  const { email, password } = adminCredentials();
  const base = baseURL ?? "http://localhost:8000";
  appOrigin = new URL(base).origin;
  const login = await request.post("/api/users/login", {
    headers: { Origin: appOrigin },
    data: { email, password },
  });
  expect(login.status(), "bootstrap's admin logs in").toBe(200);
  token = ((await login.json()) as { token: string }).token;
  originalMarkets = await readMarkets(request);
  originalLocale = await readLocalePreference(request);

  page = await browser.newPage({ baseURL: base });
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
});

test.afterAll(async ({ request }) => {
  // Not a test: leave the shared server as found, whatever failed above, and fail the run if that
  // cannot be done (a swallowed error would leave the next step with the last test's markets).
  // The REST body is the document the form would send back, minus what Payload sets itself.
  // Payload also remembers the admin's last language per user, and the tests changed that.
  const restores: Promise<void>[] = [];
  if (originalMarkets !== undefined) {
    const {
      id: _id,
      createdAt: _created,
      updatedAt: _updated,
      globalType: _type,
      ...body
    } = originalMarkets;
    restores.push(postMarkets(request, body));
  }
  if (originalLocale !== undefined) restores.push(writeLocalePreference(request, originalLocale));
  try {
    // Each restore is tried even when the other fails; the first failure fails the run.
    const results = await Promise.allSettled(restores);
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
  } finally {
    await page?.close();
  }
});

test("L5: with no market open the selector offers English and the admin still loads", async ({
  request,
}) => {
  await setMarkets(request, []);
  const result = await selector("/admin/collections/pages");
  expect(result.codes).toEqual(["en"]);
  expect(result.current).toBe("en");
  await expect(page).toHaveTitle(/Pages/);
});

test("L2: Greek and English open, the selector shows exactly those", async ({ request }) => {
  await setMarkets(request, [
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
  ]);
  expect((await selector("/admin/collections/pages")).codes).toEqual(["en", "el"]);
});

test("L3: opening a market for German adds it on the next page, with no restart", async ({
  request,
}) => {
  await setMarkets(request, [
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
    { code: "de", languages: ["de"] },
  ]);
  // Config order (`locales.ts`), not the order the markets were saved in.
  expect((await selector("/admin/collections/pages")).codes).toEqual(["en", "de", "el"]);
});

test("L4: only Greek open, the selector shows Greek and the forced English", async ({
  request,
}) => {
  await setMarkets(request, [{ code: "cy", languages: ["el"] }]);
  expect((await selector("/admin/collections/pages")).codes).toEqual(["en", "el"]);
});

test("a save shows on the very next page, inside the filter's memo", async ({ request }) => {
  // The filter keeps one read of `markets` for a moment (it is called three times per page). The
  // save clears it, or the page that follows it would offer the old list.
  await setMarkets(request, [{ code: "cy", languages: ["el"] }]);
  expect((await selector("/admin/collections/pages")).codes).toEqual(["en", "el"]);
  await setMarkets(request, [
    { code: "cy", languages: ["el"] },
    { code: "fr", languages: ["fr"] },
  ]);
  expect((await selector("/admin/collections/pages")).codes).toEqual(["en", "fr", "el"]);
});

test("L6: ?locale=fr while fr is switched off redirects to an allowed locale, and nothing crashes", async ({
  request,
}) => {
  await setMarkets(request, [
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
  ]);
  for (const url of [
    "/admin/collections/pages?locale=fr",
    "/admin/collections/pages/create?locale=fr",
    "/admin/globals/markets?locale=fr",
    "/admin?locale=fr",
  ]) {
    const response = await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(response?.status(), url).toBeLessThan(400);
    expect(new URL(page.url()).searchParams.get("locale"), url).toBe("en");
  }
  // Payload stored `fr` as the admin's language before it redirected: a plain page must still load.
  const plain = await page.goto("/admin/collections/pages");
  expect(plain?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/Pages/);
  // With fr switched on, the same URL stays.
  await setMarkets(request, [{ code: "fr", languages: ["fr"] }]);
  const enabled = await selector("/admin/collections/pages?locale=fr");
  expect(new URL(enabled.url).searchParams.get("locale")).toBe("fr");
  expect(enabled.current).toBe("fr");
});

test("L8: the API answers for a language that is switched off (the filter is the admin's, not the API's)", async ({
  request,
}) => {
  await setMarkets(request, [{ code: "cy", languages: ["el"] }]);
  const asVisitor = await request.get("/api/pages?locale=fr");
  const asAdmin = await request.get("/api/pages?locale=fr", { headers: adminHeaders() });
  expect(asVisitor.status()).toBe(200);
  expect(asAdmin.status()).toBe(200);
});
