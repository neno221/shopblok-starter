import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import { appEnv } from "./support/app-env";
import { api, PNG, upload } from "./support/payload-rest";
import { HANDLE } from "./support/purchase";
import { adminToken, base, freshWithinTwo } from "./support/server";

// T48 (D66): the shell around every market page, against `next start` with the seeded map and the
// demo catalog. What is the visitor's is never in the server's HTML (D44): the cart's count and the
// suggestion banner arrive after hydration. The switcher's links are the markets' homes, a click on
// one goes to the same page in that market and records the choice in `_shopblok_market`, and `/`
// alone redirects to the market the cookie names (SPEC §8.5). The cart hook is `/next/e2e/cart`,
// open on the server e2e-smoke starts (E2E_TEST_ROUTES=true).
//
// T61 (D78): the header is the `header` global's. A design published in the admin shows within two
// requests, and the announcement is the market's language, not the visitor's: Greek on `/` (Cyprus)
// while `/us` keeps English, whatever the browser asks for.
//
// T80 (D103): the transparent header, published in the global. Over a page whose `<main>` opens
// with the `overlay` hero (a picture behind its words) it lies over the picture, its words light on
// its scrim; on a page that opens with the `text` hero, the cart and a product page it is solid and
// takes its row's height; scrolling makes it solid. T82: a page that opens with the full-bleed
// promo banner has the header over its picture too. All of it with scripts off too, at 375 and
// 1440 px, since the page tells the header nothing and the stylesheet decides.

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
    const context = await browser.newContext({
      extraHTTPHeaders: { "x-vercel-ip-country": "US" },
    });
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

/** A page's HTML, as a visitor (or a browser with `headers`) asks for it. */
const html = async (path: string, headers: Record<string, string> = {}) =>
  (await fetch(new URL(path, base()), { headers })).text();
/**
 * Whether `path`'s HTML, within two requests, matches. A market page regenerates with its Medusa
 * reads: 140 to 320 ms here once the server is warm, longer just after it starts, so request 2
 * waits 1.5 s rather than the 0.5 s a test-only read needs.
 */
const showsWithinTwo = (
  path: string,
  matches: (html: string) => boolean,
  headers: Record<string, string> = {},
) => freshWithinTwo(async () => matches(await html(path, headers)), 1500);

const headerVariant = (html: string) => /<header[^>]*data-variant="([\w-]+)"/.exec(html)?.[1];
const announcement = (html: string) =>
  /data-slot="announcement-bar-text"[^>]*>([^<]*)</.exec(html)?.[1];

/** Payload's REST API as the `medusa-sync` integration, which alone creates catalog documents. */
const integrationApi = (method: string, path: string, body?: unknown) =>
  fetch(`${base()}/api${path}`, {
    method,
    headers: {
      authorization: `integrations API-Key ${appEnv("backend", "PAYLOAD_API_KEY")}`,
      origin: new URL(base()).origin,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

test.describe("the header global (T61)", () => {
  test.describe.configure({ mode: "serial" });
  const stamp = Date.now().toString(36);
  let token = "";
  let published: GlobalData | undefined;
  let productId: number | undefined;

  test.beforeAll(async () => {
    token = await adminToken();
    published = await snapshotGlobal(token, "header");
  });

  test.afterAll(async () => {
    // Not a test: the header as it was, published again in every language, then the test's
    // product (the header no longer links to it).
    if (published !== undefined) {
      await publishGlobal(token, "header", published, "all");
      // Settle: the next spec reads the old header from its first request.
      await showsWithinTwo("/us", (html) => headerVariant(html) === published?.["design"]);
    }
    if (productId !== undefined)
      await integrationApi("DELETE", `/products/${productId}`).catch(() => undefined);
  });

  test("a design published in the admin shows within two requests", async () => {
    expect(headerVariant(await html("/us"))).not.toBe("centered");
    await publishGlobal(token, "header", { design: "centered" });
    expect(
      await showsWithinTwo("/us", (html) => headerVariant(html) === "centered"),
      "the centered header within two requests",
    ).toBeGreaterThan(0);
  });

  test("the announcement is the market's language: Greek on /, English on /us", async () => {
    const greek = `Ανακοίνωση ${stamp}`;
    const english = `Notice ${stamp}`;
    await publishGlobal(token, "header", { announcement: { message: english } }, "en");
    await publishGlobal(token, "header", { announcement: { message: greek } }, "el");
    expect(
      await showsWithinTwo("/", (html) => announcement(html) === greek),
      "the Greek announcement on / within two requests",
    ).toBeGreaterThan(0);
    expect(
      await showsWithinTwo("/us", (html) => announcement(html) === english),
      "the English announcement on /us within two requests",
    ).toBeGreaterThan(0);
    // A Greek browser on /us still reads the market's language.
    expect(announcement(await html("/us", { "accept-language": "el" }))).toBe(english);
  });

  test("a menu link follows its product: renamed, deleted in Medusa, and the header still publishes", async () => {
    // A product as the sync writes one (Medusa's own sync is `sync.spec.ts`'s), removed in afterAll.
    const created = await integrationApi("POST", "/products", {
      medusaId: `prod_e2e_${stamp}`,
      title: `E2E shirt ${stamp}`,
      handle: `e2e-shirt-${stamp}`,
    });
    expect(created.status, await created.clone().text()).toBe(201);
    productId = ((await created.json()) as { doc: { id: number } }).doc.id;
    const reference = {
      type: "reference",
      reference: { relationTo: "products", value: productId },
    };
    await publishGlobal(token, "header", {
      navigation: {
        source: "manual",
        items: [
          { kind: "link", link: { ...reference, label: "Shirt" } },
          {
            kind: "link",
            link: { type: "custom", url: "/store", label: "All" },
          },
        ],
      },
    });
    const linksTo = (handle: string) => (page: string) =>
      page.includes(`href="/us/products/${handle}"`);
    expect(await showsWithinTwo("/us", linksTo(`e2e-shirt-${stamp}`))).toBeGreaterThan(0);

    // Renamed in Medusa: the cached header follows within two requests (PR 94 review, item 2).
    const renamed = await integrationApi("PATCH", `/products/${productId}`, {
      handle: `e2e-tee-${stamp}`,
    });
    expect(renamed.status, await renamed.clone().text()).toBe(200);
    expect(await showsWithinTwo("/us", linksTo(`e2e-tee-${stamp}`))).toBeGreaterThan(0);

    // Deleted in Medusa: the link is left out, the rest of the menu stays.
    const deleted = await integrationApi("PATCH", `/products/${productId}`, {
      deletedInMedusa: true,
    });
    expect(deleted.status, await deleted.clone().text()).toBe(200);
    expect(
      await showsWithinTwo(
        "/us",
        (page) => !linksTo(`e2e-tee-${stamp}`)(page) && page.includes('href="/us/store"'),
      ),
    ).toBeGreaterThan(0);

    // The header still holds that link, and an unrelated change still publishes (item 1).
    await publishGlobal(token, "header", { sticky: false });
  });
});

test.describe("the transparent header (D103, T80)", () => {
  test.describe.configure({ mode: "serial" });
  const stamp = Date.now().toString(36);
  const slugs = {
    overlay: `e2e-overlay-${stamp}`,
    text: `e2e-text-${stamp}`,
    // An overlay hero shown from `lg` only: on a phone the page opens with nothing under the
    // header (PR 119 review, item 1).
    desktop: `e2e-overlay-desktop-${stamp}`,
    // T82 (D103): a full-bleed promo banner opening the page, its picture under the header too.
    promo: `e2e-promo-full-bleed-${stamp}`,
  };
  let token = "";
  let published: GlobalData | undefined;
  const pageIds: number[] = [];
  const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  /** Where it is solid: a page that opens with the text hero, the cart, a product page. */
  const solidPaths = () => [`/us/${slugs.text}`, "/us/cart", `/us/products/${HANDLE}`];
  const paths = () => [
    `/us/${slugs.overlay}`,
    `/us/${slugs.desktop}`,
    `/us/${slugs.promo}`,
    ...solidPaths(),
  ];

  /** A published page whose layout is one hero of `variant`, with a picture. */
  async function heroPage(
    slug: string,
    variant: string,
    media: number,
    visibility: "all" | "mobile" | "desktop" = "all",
  ) {
    const { doc } = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      title: `Hero ${variant} ${stamp}`,
      slug,
      _status: "published",
      layout: [
        {
          blockType: "hero",
          variant,
          heading: `The ${variant} hero ${stamp}`,
          subheading: "Warm layers for cooler days.",
          media,
          sectionSettings: { visibility },
          links: [{ link: { type: "custom", url: "/store", label: "Shop now" } }],
        },
      ],
    });
    pageIds.push(doc.id);
  }

  test.beforeAll(async () => {
    token = await adminToken();
    published = await snapshotGlobal(token, "header");
    const picture = await upload(token, `hero-${stamp}.png`, "image/png", PNG, "A white wall");
    await heroPage(slugs.overlay, "overlay", picture.id);
    await heroPage(slugs.text, "text", picture.id);
    await heroPage(slugs.desktop, "overlay", picture.id, "desktop");
    const { doc } = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      title: `Promo full bleed ${stamp}`,
      slug: slugs.promo,
      _status: "published",
      layout: [
        {
          blockType: "promoBanner",
          variant: "full-bleed",
          heading: `The full-bleed offer ${stamp}`,
          text: "Ten percent off your first order.",
          code: "WELCOME10",
          media: picture.id,
        },
      ],
    });
    pageIds.push(doc.id);
    await publishGlobal(token, "header", {
      design: "transparent",
      sticky: true,
    });
    // Each page is its own cache entry: every one the tests visit shows the new header first.
    for (const path of paths())
      expect(
        await showsWithinTwo(path, (page) => headerVariant(page) === "transparent"),
        `${path}: the transparent header within two requests`,
      ).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    // Not a test: the header as it was, in every language, settled on every page the tests saw;
    // then the test's pages.
    if (published !== undefined) {
      await publishGlobal(token, "header", published, "all");
      for (const path of ["/us", ...paths()])
        await showsWithinTwo(path, (page) => headerVariant(page) === published?.["design"]);
    }
    for (const id of pageIds) await api(token, "DELETE", `/api/pages/${id}`).catch(() => undefined);
  });

  /** What the header looks like on the page now: its height, its row's fill and the scrim. */
  const look = (page: Page) =>
    page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('header[data-variant="transparent"]');
      const surface = header?.querySelector<HTMLElement>('[data-slot="header-surface"]');
      const scrim = header?.querySelector<HTMLElement>('[data-slot="header-scrim"]');
      const main = document.querySelector("main");
      if (!header || !surface || !scrim || !main) return null;
      const fill = getComputedStyle(surface).backgroundColor;
      return {
        solid: header.dataset["solid"],
        height: header.getBoundingClientRect().height,
        filled: fill !== "rgba(0, 0, 0, 0)" && fill !== "transparent",
        scrim: getComputedStyle(scrim).display !== "none",
        // The page's top edge against the row's bottom: under the row, or below it.
        underRow: main.getBoundingClientRect().top < surface.getBoundingClientRect().bottom - 1,
      };
    });

  const transparent = { height: 0, filled: false, scrim: true, underRow: true };
  const solid = { filled: true, scrim: false, underRow: false };

  for (const scripts of [true, false])
    for (const width of [375, 1440])
      test(`over the overlay hero, solid elsewhere · ${width} px · scripts ${scripts ? "on" : "off"}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({
          baseURL: base(),
          javaScriptEnabled: scripts,
          viewport: { width, height: 900 },
        });
        const page = await context.newPage();
        await page.goto(`/us/${slugs.overlay}`);
        expect(await look(page), "over the overlay hero").toMatchObject(transparent);
        // Its words are readable on its scrim, and the hero's on theirs (axe runs as a script, so
        // only with scripts on; the look is the same either way).
        if (scripts) {
          const axe = await new AxeBuilder({ page })
            .withTags(axeTags)
            .include("header")
            .include('[data-slot="hero-section"]')
            .analyze();
          expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
        }
        // T82: a full-bleed promo banner opening the page lies under the header as the hero does.
        await page.goto(`/us/${slugs.promo}`);
        expect(await look(page), "over the full-bleed promo banner").toMatchObject(transparent);
        if (scripts) {
          const axe = await new AxeBuilder({ page })
            .withTags(axeTags)
            .include("header")
            .include('[data-slot="promo-banner-section"]')
            .analyze();
          expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
        }
        // The hero shown from `lg` only: under the header there, solid on a phone, where it is
        // hidden and the page opens with nothing under the header.
        await page.goto(`/us/${slugs.desktop}`);
        if (width >= 1024)
          expect(await look(page), "over the desktop-only hero").toMatchObject(transparent);
        else {
          const seen = await look(page);
          expect(seen, "the desktop-only hero, hidden on a phone").toMatchObject(solid);
          expect(seen?.height, "the header takes its row's height").toBeGreaterThan(40);
        }
        for (const path of solidPaths()) {
          await page.goto(path);
          const seen = await look(page);
          expect(seen, path).toMatchObject(solid);
          expect(seen?.height, `${path}: the header takes its row's height`).toBeGreaterThan(40);
        }
        await context.close();
      });

  test("turns solid once the page scrolls, and transparent again at the top", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/us/${slugs.overlay}`);
    await expect.poll(() => look(page)).toMatchObject({ ...transparent, solid: "auto" });
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => look(page))
      .toMatchObject({ solid: "true", filled: true, scrim: false });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => look(page)).toMatchObject({ ...transparent, solid: "auto" });
  });
});
