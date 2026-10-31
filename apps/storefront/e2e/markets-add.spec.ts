import { expect, test } from "@playwright/test";
import { marketsAdmin, type MarketsAdmin } from "./support/markets-admin";
import { base, settled } from "./support/server";

// T71 (SPEC §17.1, M4's done-when; D76), on Medusa's side since T75 (M4b D94): an admin adds a
// market, end to end, against a production build with the seeded markets and Medusa.
//
// 1. Austria is added to the Europe region through Medusa's Admin API, and `GET /admin/markets`
//    lists it at once, closed (the map is Medusa's own, so there is nothing to sync).
// 2. Austria is switched on in German through Medusa's Admin API, `POST /admin/markets/countries/at`,
//    which is what the Markets panel on the region page sends (market-panels.spec.ts drives the
//    panel). This step was Payload's Markets page in T71; the page is gone with the `markets`
//    global (D95), and the panel's own UI is T74's.
// 3. `/at` answers within 70 s (the save expires the map's cache entry, and the map is 30 s old at
//    most without that) with `<html lang="de-AT">` (German's `htmlLang` is empty, so the language
//    and the country), prices in EUR and the German copy, and `/de`'s hreflang lists `/at`.
//
// It changes the market map every other suite reads, so playwright.config.ts runs it last, in a
// project of its own after `locales`. `afterAll` puts the markets and the region back (Austria is
// closed before it leaves the region), waits until `/at` is gone again, and fails the run if it
// cannot. Run on its own: `playwright test --project=markets-add --no-deps`.

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });

const ANSWER_TIMEOUT = 70_000;
const COUNTRY = "at";

let markets: MarketsAdmin;
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

test.beforeAll(async () => {
  markets = await marketsAdmin();
  const before = await markets.overview();
  expect(
    before.countries.map((country) => country.code),
    "the seeded regions have no Austria",
  ).not.toContain(COUNTRY);
  expect((await get(`/${COUNTRY}`)).status, "no market at /at yet").toBe(404);
});

test.afterAll(async () => {
  // Not a test: both sides as found, whatever failed above. Austria is closed and emptied before
  // it leaves the region (a row can only be saved while its country is in one); a country row is
  // never deleted, and a closed, empty one is what a country just added to a region gets.
  const problems: string[] = [];
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

test("Austria added to the Europe region in Medusa is in the markets overview, closed", async () => {
  const { regions } = await medusaApi<{
    regions: { id: string; countries: { iso_2: string }[] }[];
  }>("GET", "/admin/regions?fields=id,countries.iso_2");
  const europe = regions.find((candidate) =>
    candidate.countries.some((country) => country.iso_2 === "de"),
  );
  expect(europe, "the seeded Europe region (Germany's)").toBeDefined();
  region = { id: europe!.id, countries: europe!.countries.map((country) => country.iso_2) };
  await medusaApi("POST", `/admin/regions/${region.id}`, {
    countries: [...region.countries, COUNTRY],
  });
  regionChanged = true;
  const austria = (await markets.overview()).countries.find((country) => country.code === COUNTRY);
  expect(austria, "Austria in the overview").toMatchObject({
    code: COUNTRY,
    enabled: false,
    languages: [],
  });
  // Closed, so the public map and the shop do not have it yet.
  expect((await get(`/${COUNTRY}`)).status).toBe(404);
});

test("the admin switches Austria on in German through Medusa's markets API", async () => {
  // A regeneration of the proxy's map (or of `/de`) that started before the save, and ends after
  // it, is stored as current with the old map: `/at` would then wait a second 30 s (T65).
  await settled("/next/markets");
  await settled("/de");
  marketChanged = true;
  const saved = await markets.saveCountry(COUNTRY, {
    enabled: true,
    languages: ["de"],
    time_zone: "Europe/Vienna",
  });
  expect(saved.problems, "the plugin has no warning about the new market").toEqual([]);
  const austria = (await markets.overview()).countries.find((country) => country.code === COUNTRY);
  expect(austria).toMatchObject({
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
