import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  addCountryInRegionForm,
  europeRegion,
  openMarketInDrawer,
  regionMarketsPanel,
  regionMarketsRow,
  signInToMedusaAdmin,
} from "./support/admin-ui";
import { marketsAdmin, type MarketsAdmin } from "./support/markets-admin";
import { base, settled } from "./support/server";

// The done-when of M4b (D97; T71's story on Medusa's side): an admin opens a market entirely in
// Medusa Admin, in the browser, against a production build with the seeded markets and Medusa.
//
// 1. Austria is added to the Europe region in Medusa's OWN region form (the region page's Countries
//    section, Add countries). The Markets panel on the same page then lists it, closed.
// 2. Austria is switched on in the panel's drawer: Open, German, and the time zone Europe/Vienna.
//    The panel sends `POST /admin/markets/countries/at` (market-panels.spec.ts drives the rest of
//    the panels' behaviour).
// 3. `/at` answers within 70 s (the save expires the map's cache entry, and the map is 30 s old at
//    most without that) with `<html lang="de-AT">` (German's `htmlLang` is empty, so the language
//    and the country), prices in EUR and the German copy, and `/de`'s hreflang lists `/at`.
//
// It changes the market map every other suite reads, so playwright.config.ts runs it last but one,
// in a project of its own after `locales`. `afterAll` puts the markets and the region back through
// Medusa's Admin API (Austria is closed before it leaves the region), waits until `/at` is gone
// again, and fails the run if it cannot. Run on its own:
// `playwright test --project=markets-add --no-deps` (storefront on :8000 and Medusa on :9000, or the
// ports the .env files name).

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });

const ANSWER_TIMEOUT = 70_000;
const COUNTRY = "at";

let markets: MarketsAdmin;
let context: BrowserContext | undefined;
let page: Page;
let region: { id: string; countries: string[] } | undefined;
let regionChanged = false;
let marketChanged = false;

const medusaApi = <T>(method: string, path: string, body?: unknown) =>
  markets.api<T>(method, path, body);

/** A GET of the shop from Node, no cookies, no redirects followed. */
const get = (path: string) => fetch(`${base()}${path}`, { redirect: "manual" });

/** The hero's heading a market's home shows. */
const heroHeading = (html: string) =>
  /data-slot="hero-heading"[^>]*>([^<]+)</.exec(html)?.[1] ?? null;

const regionPanel = () => regionMarketsPanel(page);
const row = (code: string) => regionMarketsRow(page, code);

test.beforeAll(async ({ browser }) => {
  markets = await marketsAdmin();
  const before = await markets.overview();
  expect(
    before.countries.map((country) => country.code),
    "the seeded regions have no Austria",
  ).not.toContain(COUNTRY);
  expect((await get(`/${COUNTRY}`)).status, "no market at /at yet").toBe(404);

  // The Europe region as found, for the restore: the one with Germany.
  region = await europeRegion(medusaApi);

  context = await browser.newContext({
    baseURL: markets.medusa,
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  await signInToMedusaAdmin(page, markets.medusa);
});

test.afterAll(async () => {
  // Not a test: both sides as found, whatever failed above. Austria is closed and emptied before
  // it leaves the region (a row can only be saved while its country is in one); a country row is
  // never deleted, and a closed, empty one is what a country just added to a region gets.
  const problems: string[] = [];
  await context?.close();
  if (marketChanged) {
    await markets
      .saveCountry(COUNTRY, { enabled: false, languages: [], time_zone: null, domain: null })
      .catch((error: unknown) => problems.push(`the market of Austria: ${String(error)}`));
  }
  if (region !== undefined && regionChanged) {
    await medusaApi("POST", `/admin/regions/${region.id}`, { countries: region.countries }).catch(
      (error: unknown) => problems.push(`the region: ${String(error)}`),
    );
  }
  expect(problems, "the restore").toEqual([]);
  // The next steps of e2e-smoke read the map too: /at is gone before they start.
  await expect
    .poll(async () => (await get(`/${COUNTRY}`)).status, {
      timeout: ANSWER_TIMEOUT,
      intervals: [2_000],
    })
    .toBe(404);
});

test("Austria added in Medusa's own region form is in the Markets panel, closed", async () => {
  await page.goto(`${markets.medusa}/app/settings/regions/${region!.id}`);
  await expect(regionPanel().getByRole("heading", { name: "Markets" })).toBeVisible();
  await expect(row("cy")).toContainText("Open");
  await expect(row(COUNTRY)).toHaveCount(0);

  regionChanged = true;
  await addCountryInRegionForm(page, "Austria");

  // The panel reads the markets again when the region's countries change: Austria, closed.
  await expect(row(COUNTRY)).toContainText("Austria");
  await expect(row(COUNTRY)).toContainText("Closed");
  const austria = (await markets.overview()).countries.find((country) => country.code === COUNTRY);
  expect(austria, "Austria in the overview").toMatchObject({
    code: COUNTRY,
    enabled: false,
    languages: [],
  });
  // Closed, so the public map and the shop do not have it yet.
  expect((await get(`/${COUNTRY}`)).status).toBe(404);
});

test("the admin switches Austria on in German and Europe/Vienna in the Markets panel", async () => {
  // A regeneration of the proxy's map (or of `/de`) that started before the save, and ends after
  // it, is stored as current with the old map: `/at` would then wait a second 30 s (T65).
  await settled("/next/markets");
  await settled("/de");
  await page.goto(`${markets.medusa}/app/settings/regions/${region!.id}`);
  await expect(row(COUNTRY)).toContainText("Closed");
  marketChanged = true;
  await openMarketInDrawer(page, {
    country: "Austria",
    language: "German",
    timeZone: "Europe/Vienna",
  });

  await expect(row(COUNTRY)).toContainText("Open");
  await expect(row(COUNTRY)).toContainText("German");
  await expect(row(COUNTRY)).toContainText("Europe/Vienna");
  const overview = await markets.overview();
  expect(overview.problems, "the plugin has no warning about the new market").toEqual([]);
  expect(overview.countries.find((country) => country.code === COUNTRY)).toMatchObject({
    code: COUNTRY,
    enabled: true,
    languages: ["de"],
    time_zone: "Europe/Vienna",
  });
});

test("/at answers within 70 s in German with EUR prices, and /de's hreflang lists /at", async () => {
  const started = Date.now();
  await expect
    .poll(async () => (await get(`/${COUNTRY}`)).status, {
      timeout: ANSWER_TIMEOUT,
      intervals: [2_000],
    })
    .toBe(200);
  console.log(`markets-add: /at answered after ${(Date.now() - started) / 1000} s`);

  const austria = await (await get(`/${COUNTRY}`)).text();
  expect(austria).toMatch(/<html lang="de-AT"/);
  const germany = await (await get("/de")).text();
  const german = heroHeading(germany);
  expect(german, "the German home's hero").not.toBeNull();
  expect(heroHeading(austria), "the German copy").toBe(german);
  expect(austria, "prices in EUR").toMatch(/€/);
  // A dollar price is written `$12.00`; the page's script payload has `$2`-like references.
  expect(austria).not.toMatch(/\$\d+\.\d{2}/);

  // `/de` is regenerated within 30 s of the map's change, like every page under `[market]`.
  const listsAustria = async () =>
    (await (await get("/de")).text()).includes(
      `hrefLang="de-AT" href="${new URL(base()).origin}/${COUNTRY}"`,
    );
  await expect
    .poll(listsAustria, {
      timeout: Math.max(5_000, ANSWER_TIMEOUT - (Date.now() - started)),
      intervals: [2_000],
    })
    .toBe(true);
});
