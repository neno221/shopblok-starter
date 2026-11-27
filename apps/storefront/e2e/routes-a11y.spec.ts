import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page, Route } from "@playwright/test";
import { INDEXABLE_ROUTES, NOINDEX_ROUTES } from "../src/lib/seo/routes";
import { catalogs } from "./support/catalogs";
import {
  add,
  checkOut,
  mailedLink,
  orderIdOf,
  type AddressInput,
  type Words,
} from "./support/purchase";
import { settle } from "./support/settle";
// M6 D114 (T93): fails a test on any request to a third party an integration talks to.
import { expect, test } from "./support/third-party";

// M7 D150 (T113): axe on every route type of the shop, in four markets (`/`, `/us`, `/de`, `/fr`:
// Greek, English, German and French), with scripts and without, against `next start` and the seeded
// Medusa. The route types are T110's inventory (`lib/seo/routes.ts`): every indexable route but the
// later pages of a listing (`samePageAs`: the demo's catalog has one page of each, and the page is
// the first page's template with another number), every `noindex` route, and the not-found page; a
// route the inventory gains and this spec does not open fails the run. Each market's test is one
// visitor who walks the shop signed out (the catalog, the CMS, the journal, the search, the sign-in
// pages), registers in that market (the e-mailed verification link, `E2E_MEDUSA_LOG`, as `auth.spec`
// reads it), puts the product in the cart, checks out through the three steps to the receipt, and
// opens every page of the account with the order and an address it saved. Pages that need an id
// get the visitor's own (the order, the address); the transfer link gets one that does not exist,
// as T110's inventory gives it, so it draws its not-found state.
// - **With scripts:** the page after it loaded, its pictures and fonts in (`settle`).
// - **Without scripts:** axe is a script, and Chromium runs none in a context with JavaScript off
//   (Playwright's `evaluate` waits there for ever). So the same visitor's context (its cookies: the
//   cart, the session) opens the address in a second page whose documents come with every
//   `<script>` taken out and every `<noscript>` opened, which is the page a browser without scripts
//   draws: the server's HTML, its styles and pictures, and what React's streaming left hidden
//   (`<div hidden>`) still hidden. axe then runs in that page as a script of Playwright's own.
// - The tags are WCAG 2.2 AA's (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`); every
//   violation of every page is listed before the test fails, with the page, the pass and the
//   elements, so one run shows them all.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type MarketCase = {
  key: string;
  prefix: string;
  words: Words;
  address: AddressInput;
};

const MARKETS: readonly MarketCase[] = [
  {
    key: "el-cy",
    prefix: "",
    words: catalogs.el,
    address: {
      firstName: "Μαρία",
      lastName: "Γεωργίου",
      address1: "Λεωφόρος Μακαρίου 10",
      city: "Λευκωσία",
    },
  },
  {
    key: "en-us",
    prefix: "/us",
    words: catalogs.en,
    address: {
      firstName: "Grace",
      lastName: "Hopper",
      address1: "350 Fifth Avenue",
      city: "New York",
      province: "NY",
      postalCode: "10118",
    },
  },
  {
    key: "de-de",
    prefix: "/de",
    words: catalogs.de,
    address: {
      firstName: "Erika",
      lastName: "Mustermann",
      address1: "Unter den Linden 1",
      city: "Berlin",
      postalCode: "10117",
    },
  },
  {
    key: "fr-fr",
    prefix: "/fr",
    words: catalogs.fr,
    address: {
      firstName: "Marie",
      lastName: "Curie",
      address1: "1 Rue de Rivoli",
      city: "Paris",
      postalCode: "75001",
    },
  },
];

/** The route types this spec must open: the inventory's, less the later listing pages. */
const ROUTES = [
  ...INDEXABLE_ROUTES.filter((route) => !("samePageAs" in route)).map((route) => route.route),
  ...Object.keys(NOINDEX_ROUTES),
  "not-found",
];

/** The HTML a browser without scripts draws: no `<script>`, every `<noscript>` opened. */
function withoutScriptsHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?noscript\b[^>]*>/gi, "");
}

/** A page in `context` that loads every document as a browser without scripts would draw it. */
async function noScriptsPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.route("**/*", async (route: Route) => {
    const request = route.request();
    if (request.resourceType() === "script") return route.abort();
    if (request.resourceType() !== "document") return route.fallback();
    const response = await route.fetch({ maxRedirects: 0 });
    const type = response.headers()["content-type"] ?? "";
    if (!type.includes("text/html")) return route.fulfill({ response });
    return route.fulfill({ response, body: withoutScriptsHtml(await response.text()) });
  });
  return page;
}

/**
 * Waits for the page's finite CSS transitions and animations to end (a spinner's endless one is
 * left alone), so axe reads each element's final colours: a button's colour transition that a
 * late stylesheet starts gave a mid-way contrast once (the newsletter's button, without scripts).
 * Then for the title, which a page reached by a server action's redirect sets after it streams.
 */
async function quiet(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.race([
      Promise.all(finite.map((animation) => animation.finished.catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  });
  await expect(page).toHaveTitle(/\S/);
}

/** The paths (inside the market) of a kind in the market's sitemap. */
async function sitemapPaths(page: Page, market: MarketCase): Promise<string[]> {
  const response = await page.request.get(`/sitemap/${market.key}.xml`);
  expect(response.status(), `the sitemap of ${market.key}`).toBe(200);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc = ""]) => {
    const path = new URL(loc).pathname;
    const inside = market.prefix === "" ? path : path.slice(market.prefix.length);
    return inside === "" ? "/" : inside;
  });
}

test.describe.configure({ timeout: 600_000 });

for (const market of MARKETS) {
  test(`axe finds nothing on any route type in ${market.key}, with and without scripts`, async ({
    context,
    page,
  }) => {
    const { prefix, words } = market;
    const bare = await noScriptsPage(context);
    const violations: string[] = [];
    const opened = new Set<string>();
    /** The not-found states, which Next sends as its error shell: empty without scripts. */
    const blankWithoutScripts: string[] = [];

    /** axe on the page `page` is on, then on the same address without scripts. */
    async function check(route: string, label = route) {
      opened.add(route);
      const url = new URL(page.url());
      const path = url.pathname + url.search;
      await settle(page);
      const notFoundState = (await page.locator('[data-slot="not-found-template"]').count()) > 0;
      for (const [pass, target] of [
        ["scripts", page],
        ["no scripts", bare],
      ] as const) {
        if (target === bare) {
          await bare.goto(path);
          // Next's error shell: a market's not-found state is drawn by the browser (SETUP.md
          // "First load, axe and Lighthouse (T113)"), so without scripts it is an empty page.
          if ((await bare.locator("html#__next_error__").count()) > 0) {
            if (notFoundState) blankWithoutScripts.push(label);
            else
              violations.push(`${path} (${label}, no scripts): Next's error shell, an empty page`);
            continue;
          }
        }
        await quiet(target);
        const result = await new AxeBuilder({ page: target }).withTags(TAGS).analyze();
        for (const violation of result.violations)
          violations.push(
            `${path} (${label}, ${pass}): ${violation.id}: ${violation.help} at ${violation.nodes
              .map((node) => node.target.join(" "))
              .join(", ")}`,
          );
      }
    }

    /** Opens `path` inside the market and checks it. */
    async function visit(route: string, path: string, status = 200) {
      const response = await page.goto(`${prefix}${path}`);
      expect(response?.status(), `${prefix}${path}`).toBe(status);
      await check(route);
    }

    const paths = await sitemapPaths(page, market);
    const first = (kind: string) => {
      const found = paths.find((path) => path.startsWith(kind));
      expect(found, `a ${kind} address in ${market.key}'s sitemap`).toBeDefined();
      return found ?? kind;
    };
    const kinds = ["/products/", "/categories/", "/collections/", "/journal/"];
    const cmsPage = paths.find(
      (path) =>
        !kinds.some((kind) => path.startsWith(kind)) && !["/", "/store", "/journal"].includes(path),
    );
    expect(cmsPage, `a CMS page in ${market.key}'s sitemap`).toBeDefined();

    await test.step("signed out: the catalog, the CMS, the journal, the search", async () => {
      await visit("", "/");
      await visit("store", "/store");
      await visit("categories/[...handle]", first("/categories/"));
      await visit("collections/[handle]", first("/collections/"));
      await visit("products/[handle]", first("/products/"));
      await visit("[...slug]", cmsPage ?? "/");
      await visit("journal", "/journal");
      await visit("journal/[slug]", first("/journal/"));
      await visit("search", NOINDEX_ROUTES["search"] ?? "/search");
      await visit("not-found", "/no-such-page-for-axe", 404);
      for (const route of [
        "login",
        "register",
        "forgot-password",
        "reset-password",
        "verify",
        "order/lookup",
        "newsletter/confirm",
        "order/[id]/transfer/[token]",
      ])
        await visit(route, NOINDEX_ROUTES[route] ?? `/${route}`);
    });

    const email = `t113-${market.key}-${Date.now()}@example.com`;
    const password = "axe-route-pass-1";
    await test.step("registers, verifies and signs in", async () => {
      await page.goto(`${prefix}/register`);
      const form = page.locator('[data-slot="auth-register-form"]');
      await form.locator('input[name="email"]').fill(email);
      await form.locator('input[name="password"]').fill(password);
      await form.locator('input[name="firstName"]').fill(market.address["firstName"] ?? "Axe");
      await form.locator('input[name="lastName"]').fill(market.address["lastName"] ?? "Tester");
      await form.getByRole("button", { name: words.templates.auth.register.submit }).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/verify$`));
      await check("verify", "verify, after registering");
      await page.goto(await mailedLink(email, "customer-verification"));
      const login = page.locator('[data-slot="auth-login"]');
      await login.locator('input[name="email"]').fill(email);
      await login.locator('input[name="password"]').fill(password);
      await login.getByRole("button", { name: words.templates.auth.login.submit }).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/account$`));
    });

    let orderId = "";
    await test.step("the cart, the checkout's three steps and the receipt", async () => {
      await add(page, prefix);
      await page.keyboard.press("Escape");
      await visit("cart", "/cart");
      await page.goto(`${prefix}/checkout/contact`);
      const receipt = await checkOut(page, {
        words,
        address: market.address,
        onStep: async (step) => check("checkout/[step]", `checkout/${step}`),
      });
      orderId = orderIdOf(receipt);
      await check("order/[id]/confirmed");
    });

    await test.step("the account, with the order and a saved address", async () => {
      await visit("account", "/account");
      await visit("account/profile", "/account/profile");
      await visit("account/orders", "/account/orders");
      await visit("account/orders/[id]", `/account/orders/${orderId}`);
      await visit("account/returns", "/account/returns");
      await visit("account/returns/[orderId]", `/account/returns/${orderId}`);
      await visit("account/payment-methods", "/account/payment-methods");
      await visit("account/payment-methods/new", "/account/payment-methods/new");
      await visit("account/payment-methods/remove", "/account/payment-methods/remove");
      await visit("account/addresses/new", "/account/addresses/new");
      const form = page.locator('[data-slot="address-form"]:visible');
      for (const [name, value] of Object.entries(market.address))
        await form.locator(`input[name="${name}"]`).fill(value);
      await form.getByRole("button", { name: words.molecules.addressForm.submit }).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/account/addresses$`));
      await check("account/addresses");
      // The saved address's edit link: the one address link that is not "Add an address".
      const href = await page
        .locator('main a[href*="/account/addresses/"]:visible')
        .evaluateAll((links) =>
          links
            .map((link) => link.getAttribute("href") ?? "")
            .find((each) => !each.endsWith("/account/addresses/new")),
        );
      expect(href, "the saved address's link").toBeDefined();
      await page.goto(href ?? "");
      await check("account/addresses/[id]");
    });

    expect(
      ROUTES.filter((route) => !opened.has(route)),
      "route types of the inventory this spec did not open",
    ).toEqual([]);
    console.log(
      `routes-a11y: ${market.key}, ${opened.size} route types, axe with ${TAGS.join(" ")}: ${violations.length} violations; not-found states empty without scripts (Next's error shell): ${blankWithoutScripts.join(", ") || "none"}`,
    );
    expect(violations, `axe in ${market.key}`).toEqual([]);
  });
}
