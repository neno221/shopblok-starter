import { expect, test, type APIResponse } from "@playwright/test";

// T48 (D66): the shell around every market page, against `next start` with the seeded map and the
// demo catalog. What is the visitor's is never in the server's HTML (D44): the cart's count and the
// suggestion banner arrive after hydration. The switcher's links are the markets' homes, a click on
// one goes to the same page in that market and records the choice in `_shopblok_market`, and `/`
// alone redirects to the market the cookie names (SPEC §8.5). The cart hook is `/next/e2e/cart`,
// open on the server e2e-smoke starts (E2E_TEST_ROUTES=true).

/** The seed's three categories (`apps/backend/src/scripts/seed.ts`), flat: three links. */
const SEED_CATEGORIES = 3;

/**
 * `/`'s HTML, in bytes: 167 to 175 KB when T48 measured it (the shell, the wiring page and the RSC
 * payload that hydrates them; the scripts are not counted). The ceiling leaves room for that
 * spread and a little more; a page that grows past it has started sending something new.
 */
const HOME_HTML_CEILING = 200_000;

const SWITCHER_HOMES = ["/", "/us", "/gb", "/de", "/fr", "/ch", "/ch/fr"];

function locationOf(response: APIResponse): string {
  const location = response.headers()["location"];
  if (location === undefined) throw new Error(`no Location header on ${response.status()}`);
  const url = new URL(location, response.url());
  return url.pathname + url.search;
}

test.describe("the shell (D66)", () => {
  test("the server's HTML holds no cart count and no suggestion banner", async ({ request }) => {
    const html = await (
      await request.get("/us", { headers: { "x-vercel-ip-country": "DE" } })
    ).text();
    expect(html).toContain('data-slot="cart-button"');
    expect(html).not.toContain('data-slot="cart-badge"');
    expect(html).not.toContain('data-slot="market-suggestion-banner"');
  });

  test("the header shows the cart's count once the browser knows it", async ({ page }) => {
    const made = await page.request.post("/next/e2e/cart?market=en-us&quantity=2");
    expect(made.status(), "the cart hook is open (E2E_TEST_ROUTES=true)").toBe(200);
    expect(await made.json()).toEqual({ count: 2 });
    await page.goto("/us");
    const badge = page.locator('header [data-slot="cart-badge"]');
    await expect(badge).toHaveText("2");
    // The live region speaks changes only; the link's name carries the count.
    await expect(page.getByRole("link", { name: "Cart 2 items" })).toHaveCount(1);
  });

  test("the navigation is Medusa's category tree", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/us");
    const navigation = page.getByRole("navigation", { name: "Main" });
    await expect(navigation.getByRole("link")).toHaveCount(SEED_CATEGORIES);
    for (const href of await navigation
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
      expect(href).toMatch(/^\/us\/categories\/[\w-]+$/);
    }
  });

  test("the skip link is the first thing a keyboard reaches, and its target is the page's main", async ({
    page,
  }) => {
    await page.goto("/us");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveAttribute("data-slot", "skip-link");
    await expect(focused).toHaveAttribute("href", "#main");
    await expect(page.locator("main#main")).toHaveCount(1);
  });

  test("the switcher links every market's home, and a click goes to the same page there", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/ch/fr?utm=1");
    await page.locator('header [data-slot="market-switcher-trigger"]').first().click();
    const links = page.locator('[data-slot="market-switcher-link"]');
    await expect(links).toHaveCount(SWITCHER_HOMES.length);
    const hrefs = await links.evaluateAll((all) => all.map((link) => link.getAttribute("href")));
    expect(hrefs).toEqual(SWITCHER_HOMES);
    await page.locator('[data-slot="market-switcher-link"][href="/us"]').click();
    await page.waitForURL("**/us?utm=1");
    const cookie = (await context.cookies()).find((each) => each.name === "_shopblok_market");
    expect(cookie?.value).toBe("en-us");

    // `/` alone now redirects to that market; every other URL stays where it is.
    const root = await page.request.get("/", { maxRedirects: 0 });
    expect(root.status()).toBe(307);
    expect(locationOf(root)).toBe("/us");
    expect((await page.request.get("/de", { maxRedirects: 0 })).status()).toBe(200);
  });

  test("the banner suggests the visitor's market, and staying records the current one", async ({
    browser,
  }) => {
    const context = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": "US" } });
    const page = await context.newPage();
    await page.goto("/");
    const banner = page.locator('[data-slot="market-suggestion-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner.locator('[data-slot="market-suggestion-go"]')).toHaveAttribute(
      "href",
      "/us",
    );
    await banner.locator('[data-slot="market-suggestion-stay"]').click();
    await expect(banner).toBeHidden();
    await expect
      .poll(async () => (await context.cookies()).find((c) => c.name === "_shopblok_market")?.value)
      .toBe("el-cy");
    await page.reload();
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator('[data-slot="market-suggestion-banner"]')).toHaveCount(0);
    await context.close();
  });

  test("/ stays under its HTML ceiling", async ({ request }) => {
    const bytes = (await (await request.get("/")).body()).byteLength;
    expect(bytes, `/ is ${bytes} bytes`).toBeLessThanOrEqual(HOME_HTML_CEILING);
  });
});
