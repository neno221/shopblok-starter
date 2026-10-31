import { expect, type Locator, type Page } from "@playwright/test";
import { adminCredentials, type Credentials } from "./admin-credentials";

/**
 * Signs in to Medusa Admin (`{medusa}/app`) through its login form as the bootstrap admin (T74).
 * `page` has the Medusa origin as its `baseURL`, or `medusa` is the origin. The form's inputs have
 * no label, so they are found by name; it waits for the page the login leads to, not for the URL
 * pattern `/app`, which `/app/login` matches too.
 */
export async function signInToMedusaAdmin(
  page: Page,
  medusa: string,
  credentials: Credentials = adminCredentials(),
) {
  await page.goto(`${medusa}/app/login`);
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

/** Signs in to Payload's admin through its login form; the bootstrap admin unless told otherwise. */
export async function signInToAdmin(page: Page, credentials: Credentials = adminCredentials()) {
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
}

// The Markets panels of the `@shopblok/medusa-markets` plugin on Medusa Admin's Region page, as
// `markets-add.spec.ts` (M4b's done-when) and `market-panels.spec.ts` (T74) drive them.

type AdminApi = <T>(method: string, path: string, body?: unknown) => Promise<T>;

/** The seeded Europe region (the one with Germany) and its countries, as found. */
export async function europeRegion(api: AdminApi): Promise<{ id: string; countries: string[] }> {
  const { regions } = await api<{ regions: { id: string; countries: { iso_2: string }[] }[] }>(
    "GET",
    "/admin/regions?fields=id,countries.iso_2",
  );
  const europe = regions.find((region) =>
    region.countries.some((country) => country.iso_2 === "de"),
  );
  expect(europe, "the seeded Europe region (Germany's)").toBeDefined();
  return { id: europe!.id, countries: europe!.countries.map((country) => country.iso_2) };
}

/** The panel the plugin puts on a region's page, and its row of a country. */
export const regionMarketsPanel = (page: Page): Locator => page.locator("#markets-region-panel");
export const regionMarketsRow = (page: Page, code: string): Locator =>
  regionMarketsPanel(page).getByTestId(`markets-row-${code}`);

/**
 * Adds a country to the region whose page is open, in Medusa's OWN region form: the Countries
 * section's action menu, "Add countries", its table and "Add".
 */
export async function addCountryInRegionForm(page: Page, name: string): Promise<void> {
  const countries = page.getByRole("heading", { name: "Countries", exact: true });
  await countries.locator("xpath=..").getByRole("button").click();
  await page.getByRole("menuitem", { name: "Add countries" }).click();
  const form = page.getByRole("dialog");
  await form.getByPlaceholder("Search").fill(name);
  await form
    .getByRole("row", { name: new RegExp(name) })
    .getByRole("checkbox")
    .check();
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await expect(form).toBeHidden();
}

/**
 * Opens a closed country in the region panel's drawer with one language and a time zone, and
 * saves. `beforeSave` runs with the drawer filled in (a picture, for one).
 */
export async function openMarketInDrawer(
  page: Page,
  market: { country: string; language: string; timeZone: string },
  beforeSave?: () => Promise<void>,
): Promise<void> {
  await regionMarketsPanel(page)
    .getByRole("button", { name: `Edit the market of ${market.country}` })
    .click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: market.country })).toBeVisible();
  await drawer.getByRole("switch", { name: "Open" }).click();
  await drawer.getByRole("combobox", { name: "Add a language" }).click();
  await page.getByRole("option", { name: market.language }).click();
  await expect(drawer.getByRole("listitem").filter({ hasText: market.language })).toContainText(
    "Default",
  );
  await drawer.getByRole("combobox", { name: "Time zone" }).click();
  await page.getByRole("option", { name: market.timeZone, exact: true }).click();
  await beforeSave?.();
  await drawer.getByRole("button", { name: "Save" }).click();
  await expect(drawer).toBeHidden();
}
