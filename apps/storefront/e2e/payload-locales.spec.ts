import { expect, test, type APIRequestContext, type Frame, type Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";
import {
  marketsAdmin,
  waitForServedCountries,
  type MarketsAdmin,
  type MarketsOverview,
  type OpenCountry,
} from "./support/markets-admin";

// S3 (ADR 0003, M4b D95): the admin's locale selector follows Medusa's market map. Payload preloads
// 42 languages; `filterAvailableLocales` (src/payload/filter-available-locales.ts) offers the admin
// the languages of the open countries and English. It filters the selector only, so the REST API
// still answers for a language that is switched off (L8), and the storefront has to enforce its
// markets itself.
//
// The markets are opened and closed through Medusa's Admin API (`POST /admin/markets/countries/:code`),
// which changes the map the proxy serves for up to a minute (the admin's own within seconds), so
// playwright.config.ts runs this suite as its own project after every other suite, and `afterAll`
// puts the markets, and the admin's remembered locale, back as it found them (and fails the run if
// it cannot). The plugin refuses to close the primary country, so "no market open" is not a state
// Medusa can be put in: L5 leaves only English open instead, and an unreadable map (Medusa down) is
// `filter-available-locales.test.ts`'s and `config-outside-next.test.ts`'s. Run on its own:
// `playwright test --project=locales --no-deps`.

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

type Country = OpenCountry;
type Selector = { current: string | null; codes: string[]; url: string };

let page: Page;
let token = "";
let appOrigin = "";
let admin: MarketsAdmin;
let originalMarkets: MarketsOverview | undefined;
// The admin's remembered locale (Payload's `locale` preference): null is "none stored".
let originalLocale: string | null | undefined;

const LOCALE_PREFERENCE = "/api/payload-preferences/locale";

/** The bootstrap admin's JWT; `Origin` is what Payload's CSRF check compares on a write. */
const adminHeaders = () => ({ Authorization: `JWT ${token}`, Origin: appOrigin });

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

/**
 * Leaves exactly these countries open in Medusa (the first is the primary one) and waits until the
 * proxy's map lists them: the backend expires the map's cache entry on the save, so it takes seconds.
 */
async function setMarkets(countries: Country[]): Promise<void> {
  await admin.openOnly(countries);
  await waitForServedCountries(countries.map((country) => country.code));
}

/**
 * How long the admin's selector may take to show a save. The admin reads the map through the
 * storefront's 30 s in-process cache, which the save's `medusa:markets` event marks stale through
 * `/api/revalidate` (the webhook is asynchronous, so a first try can still be early); a try that is
 * early is repeated. A regression to waiting out the cache (30 s) must fail the run, not add
 * minutes to it, so the limit is under 30 s (T75 review, item 1).
 */
const SELECTOR_TIMEOUT = 15_000;

/**
 * The selector once it offers `expected`: `setMarkets` has waited for the proxy's route, which
 * the same event refreshes, and the admin's in-process map is expired by the same webhook, so the
 * first try is usually the answer.
 */
async function selectorOffering(expected: string[], url: string): Promise<Selector> {
  let last: Selector | undefined;
  await expect
    .poll(
      async () => {
        last = await selector(url);
        return last.codes;
      },
      { message: `the selector at ${url}`, timeout: SELECTOR_TIMEOUT, intervals: [1_000] },
    )
    .toEqual(expected);
  return last!;
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
  admin = await marketsAdmin();
  originalMarkets = await admin.overview();
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
  // Payload also remembers the admin's last language per user, and the tests changed that.
  const restores: Promise<unknown>[] = [];
  if (originalMarkets !== undefined) restores.push(admin.restore(originalMarkets));
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

test("L5: with only English open the selector offers English and the admin still loads", async () => {
  await setMarkets([{ code: "us", languages: ["en"] }]);
  const result = await selectorOffering(["en"], "/admin/collections/pages");
  expect(result.current).toBe("en");
  await expect(page).toHaveTitle(/Pages/);
});

test("L2: Greek and English open, the selector shows exactly those", async () => {
  await setMarkets([
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
  ]);
  await selectorOffering(["en", "el"], "/admin/collections/pages");
});

test("L3: opening a market for German adds it on the next page, with no restart", async () => {
  await setMarkets([
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
    { code: "de", languages: ["de"] },
  ]);
  // Config order (`locales.ts`), not the order the markets were saved in.
  await selectorOffering(["en", "de", "el"], "/admin/collections/pages");
});

test("L4: only Greek open, the selector shows Greek and the forced English", async () => {
  await setMarkets([{ code: "cy", languages: ["el"] }]);
  await selectorOffering(["en", "el"], "/admin/collections/pages");
});

test("a market opened and closed in Medusa comes and goes in the selector, with no restart", async () => {
  // The filter reads Medusa's map (30 s in memory, marked stale by the save's event through
  // `/api/revalidate`): no Payload write announces a change any more, so the next page after it
  // must show it all the same, within `SELECTOR_TIMEOUT` and not after the 30 s.
  await setMarkets([{ code: "cy", languages: ["el"] }]);
  await selectorOffering(["en", "el"], "/admin/collections/pages");
  await setMarkets([
    { code: "cy", languages: ["el"] },
    { code: "fr", languages: ["fr"] },
  ]);
  await selectorOffering(["en", "fr", "el"], "/admin/collections/pages");
  await setMarkets([{ code: "cy", languages: ["el"] }]);
  await selectorOffering(["en", "el"], "/admin/collections/pages");
});

test("L6: ?locale=fr while fr is switched off redirects to an allowed locale, and nothing crashes", async ({
  request,
}) => {
  await setMarkets([
    { code: "cy", languages: ["el"] },
    { code: "us", languages: ["en"] },
  ]);
  // The admin's own map is current before the first visit: fr is off for it too.
  await selectorOffering(["en", "el"], "/admin/collections/pages");
  for (const url of [
    "/admin/collections/pages?locale=fr",
    "/admin/collections/pages/create?locale=fr",
    "/admin/globals/header?locale=fr",
    "/admin?locale=fr",
  ]) {
    // Every URL the page passes through: on `pages/create`, autosave (T59) saves a draft as soon as
    // the redirect lands and moves on to its edit view, whose URL carries no `locale`.
    const visited: string[] = [];
    const record = (frame: Frame) => {
      if (frame === page.mainFrame()) visited.push(frame.url());
    };
    page.on("framenavigated", record);
    const response = await page.goto(url);
    await page.waitForLoadState("networkidle");
    page.off("framenavigated", record);
    expect(response?.status(), url).toBeLessThan(400);
    expect(
      visited.map((visit) => new URL(visit).searchParams.get("locale")),
      url,
    ).toContain("en");
    expect(new URL(page.url()).searchParams.get("locale"), url).not.toBe("fr");
    const autosaved = /\/admin\/collections\/pages\/(\d+)$/.exec(new URL(page.url()).pathname);
    if (autosaved) {
      await request.delete(`/api/pages/${autosaved[1]}`, { headers: adminHeaders() });
    }
  }
  // Payload stored `fr` as the admin's language before it redirected: a plain page must still load.
  const plain = await page.goto("/admin/collections/pages");
  expect(plain?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/Pages/);
  // With fr switched on, the same URL stays.
  await setMarkets([{ code: "fr", languages: ["fr"] }]);
  let enabled: Selector | undefined;
  await expect
    .poll(
      async () => {
        enabled = await selector("/admin/collections/pages?locale=fr");
        return new URL(enabled.url).searchParams.get("locale");
      },
      { timeout: SELECTOR_TIMEOUT, intervals: [1_000] },
    )
    .toBe("fr");
  expect(enabled?.current).toBe("fr");
});

test("L8: the API answers for a language that is switched off (the filter is the admin's, not the API's)", async ({
  request,
}) => {
  await setMarkets([{ code: "cy", languages: ["el"] }]);
  const asVisitor = await request.get("/api/pages?locale=fr");
  const asAdmin = await request.get("/api/pages?locale=fr", { headers: adminHeaders() });
  expect(asVisitor.status()).toBe(200);
  expect(asAdmin.status()).toBe(200);
});
