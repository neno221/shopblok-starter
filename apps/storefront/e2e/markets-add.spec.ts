import { expect, test } from "@playwright/test";
import { signInToAdmin } from "./support/admin-ui";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./support/medusa-admin";
import { rest } from "./support/payload-rest";
import { adminToken, base, settled } from "./support/server";

// T71 (SPEC §17.1, M4's done-when; D76): an admin adds a market from settings, end to end, against
// a production build with the seeded markets and Medusa.
//
// 1. Austria is added to the Europe region through Medusa's Admin API, and the sync lists `at` in
//    `markets.synced` within 10 s (the `region.updated` subscriber, T60).
// 2. In Payload's Markets page (the admin's UI, so "from settings" is what is tested), the admin
//    adds the country `at`, open, in German.
// 3. `/at` answers within 70 s (the proxy's map is 30 s old at most, and so is `/next/markets`')
//    with `<html lang="de-AT">` (German's `htmlLang` is empty, so the language and the country),
//    prices in EUR and the German copy, and `/de`'s hreflang lists `/at`.
//
// It changes the market map every other suite reads, so playwright.config.ts runs it last, in a
// project of its own after `locales`. `afterAll` puts both sides back (the `markets` global first,
// since a save refuses an open country no synced region has), waits until `/at` is gone again, and
// fails the run if it cannot. Run on its own: `playwright test --project=markets-add --no-deps`.

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });

const SYNC_TIMEOUT = 10_000;
const ANSWER_TIMEOUT = 70_000;
const COUNTRY = "at";

let token = "";
let medusa = "";
let medusaToken = "";
let region: { id: string; countries: string[] } | undefined;
let regionChanged = false;
let originalMarkets: Markets | undefined;

const medusaApi = <T>(method: string, path: string, body?: unknown) =>
  medusaAdminApi<T>(medusa, medusaToken, method, path, body);

type Markets = {
  [field: string]: unknown;
  countries: { code: string }[];
  synced?: { regions?: { medusaId: string; countries: string[] }[] };
};

async function readMarkets(): Promise<Markets> {
  const answer = await rest<Markets>(token, "GET", "/api/globals/markets?depth=0");
  expect(answer.status, answer.text).toBe(200);
  return answer.json();
}

/** A GET of the shop from Node, no cookies, no redirects followed. */
const get = (path: string) => fetch(`${base()}${path}`, { redirect: "manual" });

/** The hero's heading a market's home shows. */
const heroHeading = (html: string) =>
  /data-slot="hero-heading"[^>]*>([^<]+)</.exec(html)?.[1] ?? null;

test.beforeAll(async () => {
  token = await adminToken();
  medusa = medusaUrl();
  medusaToken = await medusaAdminToken(medusa);
  originalMarkets = await readMarkets();
  expect(
    originalMarkets.countries.map((country) => country.code),
    "the seeded map has no Austria",
  ).not.toContain(COUNTRY);
  expect((await get(`/${COUNTRY}`)).status, "no market at /at yet").toBe(404);
});

test.afterAll(async () => {
  // Not a test: both sides as found, whatever failed above. The REST body is the document the form
  // would send back, minus what Payload sets itself; `synced` is the sync's alone and is ignored.
  const problems: string[] = [];
  if (originalMarkets !== undefined) {
    const {
      id: _id,
      createdAt: _created,
      updatedAt: _updated,
      globalType: _type,
      ...body
    } = originalMarkets;
    const answer = await rest(token, "POST", "/api/globals/markets", body);
    if (answer.status !== 200) problems.push(`markets: ${answer.status} ${answer.text}`);
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

test("Austria added to the Europe region in Medusa is in markets.synced within 10 s", async () => {
  const { regions } = await medusaApi<{
    regions: { id: string; countries: { iso_2: string }[] }[];
  }>("GET", "/admin/regions?fields=id,countries.iso_2");
  const europe = regions.find((candidate) =>
    candidate.countries.some((country) => country.iso_2 === "de"),
  );
  expect(europe, "the seeded Europe region (Germany's)").toBeDefined();
  region = { id: europe!.id, countries: europe!.countries.map((country) => country.iso_2) };
  const started = Date.now();
  await medusaApi("POST", `/admin/regions/${region.id}`, {
    countries: [...region.countries, COUNTRY],
  });
  regionChanged = true;
  await expect
    .poll(
      async () =>
        (await readMarkets()).synced?.regions?.find((each) => each.medusaId === region?.id)
          ?.countries ?? [],
      { timeout: SYNC_TIMEOUT, intervals: [500] },
    )
    .toContain(COUNTRY);
  console.log(`markets-add: markets.synced listed at after ${(Date.now() - started) / 1000} s`);
});

test("in Payload's Markets page, the admin opens Austria in German", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: base(),
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  try {
    await signInToAdmin(page);
    await page.goto("/admin/globals/markets");
    const rows = (originalMarkets?.countries ?? []).length;
    await page.getByRole("button", { name: "Add Country" }).click();
    // The countries' rows open collapsed (`initCollapsed`), the new one too.
    await page
      .locator("#field-countries")
      .getByRole("button", { name: "Show All" })
      .first()
      .click();
    const code = page.locator(`input[name="countries.${rows}.code"]`);
    await code.fill(COUNTRY);
    await expect(code).toHaveValue(COUNTRY);
    await expect(page.locator(`input[name="countries.${rows}.enabled"]`)).toBeChecked();
    await page.locator(`#field-countries__${rows}__languages .rs__control`).click();
    await page.locator(".rs__option", { hasText: "(de)" }).first().click();
    await page.locator(`input[name="countries.${rows}.timeZone"]`).fill("Europe/Vienna");
    // A regeneration of the proxy's map (or of `/de`) that started before the save, and ends after
    // it, is stored as current with the old map: `/at` would then wait a second 30 s (T65).
    await settled("/next/markets");
    await settled("/de");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/successfully/i).first()).toBeVisible({ timeout: 15_000 });
  } finally {
    await page.goto("/admin").catch(() => undefined);
    await context.close();
  }
  const saved = await readMarkets();
  expect(saved.countries.find((country) => country.code === COUNTRY)).toMatchObject({
    code: COUNTRY,
    enabled: true,
    languages: ["de"],
    timeZone: "Europe/Vienna",
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
