import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";

// S3 (ADR 0003): the admin's locale selector follows the `markets` global. Payload preloads 42
// languages; `filterAvailableLocales` (src/payload/filter-available-locales.ts) offers the admin
// the enabled ones and English. It filters the selector only, so the REST API still answers for a
// language that is switched off (L8), and the storefront has to enforce its markets itself.
//
// This suite saves the `markets` global, which changes the map the proxy serves for up to a minute,
// so playwright.config.ts runs it as its own project after every other suite, and `afterAll` puts
// the global back as it found it. Run on its own: `playwright test --project=locales --no-deps`.

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
let originalMarkets: Record<string, unknown> | undefined;

const origin = (): string => new URL(page.url()).origin;

async function readMarkets(request: APIRequestContext): Promise<Record<string, unknown>> {
  const response = await request.get("/api/globals/markets", {
    headers: { Authorization: `JWT ${token}` },
  });
  expect(response.status(), "an admin may read the markets global").toBe(200);
  return (await response.json()) as Record<string, unknown>;
}

async function postMarkets(request: APIRequestContext, body: unknown): Promise<void> {
  const response = await request.post("/api/globals/markets", {
    headers: { Authorization: `JWT ${token}`, Origin: origin() },
    data: body,
  });
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
  const login = await request.post("/api/users/login", {
    headers: { Origin: baseURL ?? "http://localhost:8000" },
    data: { email, password },
  });
  expect(login.status(), "bootstrap's admin logs in").toBe(200);
  token = ((await login.json()) as { token: string }).token;
  originalMarkets = await readMarkets(request);

  page = await browser.newPage({ baseURL: baseURL ?? "http://localhost:8000" });
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
});

test.afterAll(async ({ request }) => {
  // Not a test: leave the global as found, whatever failed above. The REST body is the document
  // the form would send back, minus what Payload sets itself.
  if (originalMarkets !== undefined) {
    const {
      id: _id,
      createdAt: _created,
      updatedAt: _updated,
      globalType: _type,
      ...body
    } = originalMarkets as Record<string, unknown>;
    await postMarkets(request, body).catch(() => undefined);
  }
  // Payload remembers the admin's last language per user (`?locale=` is what it stores).
  await page?.goto("/admin/collections/pages?locale=en").catch(() => undefined);
  await page?.close();
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
  const asAdmin = await request.get("/api/pages?locale=fr", {
    headers: { Authorization: `JWT ${token}` },
  });
  expect(asVisitor.status()).toBe(200);
  expect(asAdmin.status()).toBe(200);
});
