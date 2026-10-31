import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { signInToMedusaAdmin } from "./support/admin-ui";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./support/medusa-admin";

// T74 (M4b D93): the Markets panels the `@shopblok/medusa-markets` plugin puts on Medusa Admin's
// own Region and Store pages, driven in the browser as the seeded admin.
//
// 1. Austria is added to the Europe region in Medusa's OWN region form (Countries → Add countries)
//    and shows in the region page's Markets panel, closed.
// 2. The panel's drawer opens it with German (and a time zone).
// 3. Switzerland's languages are reordered; a time zone is changed.
// 4. Closing the primary country (`cy`) is refused, and the drawer shows the reason.
// 5. On the Store page the fallback market is changed.
// 6. The panels have no add or remove of countries or locales, the Store panel shows no store-locale
//    select (each language has one store locale in the seed), and axe finds nothing in either panel.
//
// It reads and writes only the plugin's routes and Medusa's region route, never the storefront, so
// it runs without one; it changes the market rows the map is made of, so playwright.config.ts runs
// it in a project of its own after `markets-add`, and `afterAll` puts every row, the region's
// countries and the fallback market back. Run on its own:
// `playwright test --project=market-panels --no-deps` (Medusa up on :9000).
// `E2E_SCREENSHOTS=<folder>` also writes the pictures SETUP.md's T74 section lists.

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });

// D34's tags, as the design-system checks use them.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type MarketCountry = {
  code: string;
  name: string;
  region: { id: string; name: string };
  saved: boolean;
  enabled: boolean;
  languages: string[];
  domain: string | null;
  time_zone: string | null;
};
type Overview = {
  countries: MarketCountry[];
  settings: { primary_country: string | null; fallback_market: string | null };
  locales: string[];
  languages: { code: string; medusa_locale: string; html_lang: string | null }[];
  problems: { code: string; message: string }[];
};

const NEW_COUNTRY = "at";

let medusa = "";
let token = "";
let context: BrowserContext;
let page: Page;
let before: Overview | undefined;
let europe: { id: string; countries: string[] } | undefined;
let store: { id: string; locales: string[] } | undefined;

/** Medusa's own Store route: the store's locales (Store → Locales), which the panel only reads. */
const setStoreLocales = (locales: string[]) =>
  api("POST", `/admin/stores/${store!.id}`, {
    supported_locales: locales.map((locale_code) => ({ locale_code })),
  });

const api = <T>(method: string, path: string, body?: unknown) =>
  medusaAdminApi<T>(medusa, token, method, path, body);
const overview = () => api<Overview>("GET", "/admin/markets");
const countryRow = async (code: string) =>
  (await overview()).countries.find((country) => country.code === code);

const regionPanel = () => page.locator("#markets-region-panel");
const storePanel = () => page.locator("#markets-store-panel");
const drawer = () => page.getByRole("dialog");

/** A picture of the page with `focus` in the middle, when `E2E_SCREENSHOTS` names a folder. */
async function picture(name: string, focus?: Locator) {
  const folder = process.env["E2E_SCREENSHOTS"];
  if (!folder) return;
  await focus?.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: path.join(folder, `${name}.png`) });
}

async function openRegionPage(regionId: string) {
  await page.goto(`${medusa}/app/settings/regions/${regionId}`);
  await expect(regionPanel().getByRole("heading", { name: "Markets" })).toBeVisible();
  await regionPanel().scrollIntoViewIfNeeded();
}

async function openStorePage() {
  await page.goto(`${medusa}/app/settings/store`);
  await expect(storePanel().getByRole("heading", { name: "Markets" })).toBeVisible();
  await storePanel().scrollIntoViewIfNeeded();
}

/** The panel's row of a country, once the panel has read the markets. */
const row = (code: string): Locator => regionPanel().getByTestId(`markets-row-${code}`);

async function axeFindings(include: string) {
  const result = await new AxeBuilder({ page }).include(include).withTags(axeTags).analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((node) => node.html.slice(0, 160)).join(" | ")})`,
  );
}

test.beforeAll(async ({ browser }) => {
  medusa = medusaUrl();
  token = await medusaAdminToken(medusa);
  before = await overview();
  expect(
    before.countries.map((country) => country.code),
    "the seeded regions have no Austria",
  ).not.toContain(NEW_COUNTRY);
  expect(before.problems, "the seeded markets have no warning").toEqual([]);
  const { regions } = await api<{ regions: { id: string; countries: { iso_2: string }[] }[] }>(
    "GET",
    "/admin/regions?fields=id,countries.iso_2",
  );
  const found = regions.find((region) =>
    region.countries.some((country) => country.iso_2 === "de"),
  );
  expect(found, "the seeded Europe region (Germany's)").toBeDefined();
  europe = { id: found!.id, countries: found!.countries.map((country) => country.iso_2) };
  const { stores } = await api<{
    stores: { id: string; supported_locales: { locale_code: string }[] }[];
  }>("GET", "/admin/stores?fields=id,*supported_locales");
  store = {
    id: stores[0]!.id,
    locales: stores[0]!.supported_locales.map((each) => each.locale_code),
  };

  context = await browser.newContext({
    baseURL: medusa,
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  await signInToMedusaAdmin(page, medusa);
});

test.afterAll(async () => {
  // Not a test: everything as found, whatever failed above. The settings first (a country cannot
  // be closed while the fallback market names it, and a language row names a store locale), the
  // store's locales, then the rows the tests saved, then the
  // region's countries (a row can only be saved while its country is in a region). A country row
  // cannot be deleted (D93: no add or remove of countries), so Austria's is left closed and empty,
  // which is what a country just added to a region gets.
  const problems: string[] = [];
  const attempt = async (what: string, run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (error) {
      problems.push(`${what}: ${String(error)}`);
    }
  };
  await context?.close();
  if (before !== undefined && europe !== undefined) {
    const now = await overview().catch(() => undefined);
    await attempt("the fallback market", () =>
      api("POST", "/admin/markets/settings", {
        fallback_market: before!.settings.fallback_market ?? undefined,
        primary_country: before!.settings.primary_country ?? undefined,
        languages: before!.languages.map(({ code, medusa_locale, html_lang }) => ({
          code,
          medusa_locale,
          html_lang,
        })),
      }),
    );
    if (store !== undefined) {
      await attempt("the store's locales", () => setStoreLocales(store!.locales));
    }
    for (const original of before.countries) {
      await attempt(`the market of ${original.code}`, () =>
        api("POST", `/admin/markets/countries/${original.code}`, {
          enabled: original.enabled,
          languages: original.languages,
          time_zone: original.time_zone,
          domain: original.domain,
        }),
      );
    }
    if (now?.countries.some((country) => country.code === NEW_COUNTRY)) {
      await attempt("the market of Austria", () =>
        api("POST", `/admin/markets/countries/${NEW_COUNTRY}`, {
          enabled: false,
          languages: [],
          time_zone: null,
          domain: null,
        }),
      );
    }
    await attempt("the Europe region", () =>
      api("POST", `/admin/regions/${europe!.id}`, { countries: europe!.countries }),
    );
    const after = await overview().catch(() => undefined);
    for (const original of before.countries) {
      expect(
        after?.countries.find((country) => country.code === original.code),
        original.code,
      ).toMatchObject({
        enabled: original.enabled,
        languages: original.languages,
        time_zone: original.time_zone,
        domain: original.domain,
      });
    }
    expect(after?.countries.map((country) => country.code)).not.toContain(NEW_COUNTRY);
    expect(after?.settings).toEqual(before.settings);
  }
  expect(problems, "the restore").toEqual([]);
});

test("Austria added in Medusa's own region form is closed in the Markets panel", async () => {
  await openRegionPage(europe!.id);
  await expect(row("cy")).toContainText("Open");
  await expect(row(NEW_COUNTRY)).toHaveCount(0);
  await picture("1-region-page", regionPanel());

  // Medusa's Countries section: its action menu, "Add countries", its table and "Add".
  const countries = page.getByRole("heading", { name: "Countries", exact: true });
  await countries.locator("xpath=..").getByRole("button").click();
  await page.getByRole("menuitem", { name: "Add countries" }).click();
  const form = page.getByRole("dialog");
  await form.getByPlaceholder("Search").fill("Austria");
  await form
    .getByRole("row", { name: /Austria/ })
    .getByRole("checkbox")
    .check();
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await expect(form).toBeHidden();

  // The panel reads the markets again when the region's countries change: Austria, closed.
  await expect(row(NEW_COUNTRY)).toContainText("Austria");
  await expect(row(NEW_COUNTRY)).toContainText("Closed");
  // Closed and with no language, whether or not an earlier run left Austria's (closed, empty) row.
  expect(await countryRow(NEW_COUNTRY)).toMatchObject({ enabled: false, languages: [] });
});

test("the drawer opens Austria with German and a time zone", async () => {
  await openRegionPage(europe!.id);
  await regionPanel().getByRole("button", { name: "Edit the market of Austria" }).click();
  await expect(drawer().getByRole("heading", { name: "Austria" })).toBeVisible();
  await drawer().getByRole("switch", { name: "Open" }).click();
  await drawer().getByRole("combobox", { name: "Add a language" }).click();
  await page.getByRole("option", { name: "German" }).click();
  await expect(drawer().getByRole("listitem").filter({ hasText: "German" })).toContainText(
    "Default",
  );
  await drawer().getByRole("combobox", { name: "Time zone" }).click();
  await page.getByRole("option", { name: "Europe/Vienna", exact: true }).click();
  await picture("3-region-drawer");
  await drawer().getByRole("button", { name: "Save" }).click();
  await expect(drawer()).toBeHidden();

  await expect(row(NEW_COUNTRY)).toContainText("Open");
  await expect(row(NEW_COUNTRY)).toContainText("German");
  await expect(row(NEW_COUNTRY)).toContainText("Europe/Vienna");
  expect(await countryRow(NEW_COUNTRY)).toMatchObject({
    enabled: true,
    languages: ["de"],
    time_zone: "Europe/Vienna",
    saved: true,
  });
});

test("Switzerland's languages are reordered, the first being the default", async () => {
  const switzerland = before!.countries.find((country) => country.code === "ch")!;
  expect(switzerland.languages, "the seeded Swiss languages").toEqual(["de", "fr"]);
  await openRegionPage(switzerland.region.id);
  await expect(row("ch")).toContainText("German (default), French");
  await regionPanel().getByRole("button", { name: "Edit the market of Switzerland" }).click();
  const items = drawer().getByRole("listitem");
  await expect(items.nth(0)).toContainText("German");
  await drawer().getByRole("button", { name: "Move French up" }).click();
  await expect(items.nth(0)).toContainText("French");
  await expect(items.nth(0)).toContainText("Default");
  await expect(items.nth(1)).toContainText("German");
  await drawer().getByRole("button", { name: "Save" }).click();
  await expect(drawer()).toBeHidden();

  await expect(row("ch")).toContainText("French (default), German");
  expect((await countryRow("ch"))?.languages).toEqual(["fr", "de"]);
});

test("a time zone is changed", async () => {
  expect((await countryRow("fr"))?.time_zone, "the seeded zone of France").toBe("Europe/Paris");
  await openRegionPage(europe!.id);
  await regionPanel().getByRole("button", { name: "Edit the market of France" }).click();
  await drawer().getByRole("combobox", { name: "Time zone" }).click();
  await page.getByRole("option", { name: "Europe/Brussels", exact: true }).click();
  await drawer().getByRole("button", { name: "Save" }).click();
  await expect(drawer()).toBeHidden();
  await expect(row("fr")).toContainText("Europe/Brussels");
  expect((await countryRow("fr"))?.time_zone).toBe("Europe/Brussels");
});

test("closing the primary country is refused, with the reason in the drawer", async () => {
  expect(before!.settings.primary_country, "the seeded primary country").toBe("cy");
  await openRegionPage(europe!.id);
  await regionPanel().getByRole("button", { name: "Edit the market of Cyprus" }).click();
  await drawer().getByRole("switch", { name: "Open" }).click();
  await drawer().getByRole("button", { name: "Save" }).click();

  const refusal = drawer().getByRole("alert");
  await expect(refusal).toContainText("The market was not saved");
  await expect(refusal).toContainText("is the primary country");
  await expect(drawer()).toBeVisible();
  await picture("5-region-refusal");
  await drawer().getByRole("button", { name: "Cancel" }).click();
  await expect(drawer()).toBeHidden();
  await expect(row("cy")).toContainText("Open");
  expect((await countryRow("cy"))?.enabled).toBe(true);
});

test("the Store page's panel changes the fallback market", async () => {
  await openStorePage();
  await expect(storePanel()).toContainText("Cyprus");
  await expect(storePanel()).toContainText("English · United States");
  await expect(storePanel().getByText("Needs attention")).toHaveCount(0);
  await picture("2-store-page", storePanel());

  await storePanel().getByRole("button", { name: "Edit the markets settings" }).click();
  await expect(drawer().getByLabel(/^HTML language for/)).toHaveCount(4);
  // One store locale per language: nothing to choose, nothing shown.
  await expect(drawer().getByLabel(/store locale/i)).toHaveCount(0);
  await drawer().getByRole("combobox", { name: "Fallback market" }).click();
  await page.getByRole("option", { name: "German · Germany" }).click();
  await picture("4-store-drawer");
  await drawer().getByRole("button", { name: "Save" }).click();
  await expect(drawer()).toBeHidden();

  await expect(storePanel()).toContainText("German · Germany");
  expect((await overview()).settings.fallback_market).toBe("de-de");
});

test("a language with two store locales gets a store-locale select, and only that language", async () => {
  // The ambiguous case (D8): Medusa's Store → Locales gains `de-CH` next to `de-DE`.
  await setStoreLocales([...store!.locales, "de-CH"]);
  await openStorePage();
  // The panel reads the markets again when the store's locales change.
  await expect(storePanel()).toContainText("Store locale for German");
  await expect(storePanel()).toContainText("de-DE");
  await expect(storePanel().getByText(/Store locale for/)).toHaveCount(1);
  await storePanel().getByRole("button", { name: "Edit the markets settings" }).click();
  await expect(drawer().getByLabel(/store locale/i)).toHaveCount(1);
  await drawer().getByRole("combobox", { name: "Store locale for German" }).click();
  await expect(page.getByRole("option")).toHaveText(["de-DE", "de-CH"]);
  await page.getByRole("option", { name: "de-CH" }).click();
  await drawer().getByRole("button", { name: "Save" }).click();
  await expect(drawer()).toBeHidden();
  await expect(storePanel()).toContainText("de-CH");
  expect((await overview()).languages.find((language) => language.code === "de")).toMatchObject({
    medusa_locale: "de-CH",
  });

  // Put it back: the language row first (it names a locale the store is about to lose).
  await api("POST", "/admin/markets/settings", {
    languages: [{ code: "de", medusa_locale: "de-DE" }],
  });
  await setStoreLocales(store!.locales);
  await openStorePage();
  await expect(storePanel().getByText(/Store locale for/)).toHaveCount(0);
});

test("the panels have no add or remove of countries or locales", async () => {
  await openRegionPage(europe!.id);
  const names = await regionPanel()
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent ?? ""),
    );
  expect(names.length, "one edit button a country").toBeGreaterThan(0);
  for (const name of names) expect(name).toMatch(/^Edit the market of /);
  await expect(regionPanel().getByRole("checkbox")).toHaveCount(0);
  await regionPanel().getByRole("button", { name: "Edit the market of Germany" }).click();
  const regionButtons = await drawer()
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent ?? ""),
    );
  // A country's languages are picked, moved and removed here; countries and locales are not.
  expect(regionButtons.filter((name) => /countr|locale|region/i.test(name))).toEqual([]);
  await drawer().getByRole("button", { name: "Cancel" }).click();

  await openStorePage();
  const storeButtons = await storePanel()
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent ?? ""),
    );
  expect(storeButtons).toEqual(["Edit the markets settings"]);
  await storePanel().getByRole("button", { name: "Edit the markets settings" }).click();
  const drawerButtons = await drawer()
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent ?? ""),
    );
  expect(drawerButtons.filter((name) => /add|remove|delete|new/i.test(name))).toEqual([]);
  await drawer().getByRole("button", { name: "Cancel" }).click();
});

test("axe finds nothing in the Region panel and its drawer", async () => {
  await openRegionPage(europe!.id);
  expect(await axeFindings("#markets-region-panel")).toEqual([]);
  await regionPanel().getByRole("button", { name: "Edit the market of Germany" }).click();
  await expect(drawer()).toBeVisible();
  expect(await axeFindings('[role="dialog"]')).toEqual([]);
  await drawer().getByRole("button", { name: "Cancel" }).click();
});

test("axe finds nothing in the Store panel and its drawer", async () => {
  await openStorePage();
  expect(await axeFindings("#markets-store-panel")).toEqual([]);
  await storePanel().getByRole("button", { name: "Edit the markets settings" }).click();
  await expect(drawer()).toBeVisible();
  expect(await axeFindings('[role="dialog"]')).toEqual([]);
  await drawer().getByRole("button", { name: "Cancel" }).click();
});
