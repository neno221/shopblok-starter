import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { entries } from "@shopblok/registry";
import { familyRoot, variantsAt } from "../src/payload/blocks/drift";
import { signInToAdmin } from "./support/admin-ui";
import { catalogs } from "./support/catalogs";
import { collectConsole, judgeConsole, type FailedRequest, type Message } from "./support/console";
import { BLOCK_MEMBERS, everyBlockLayout, type BlockIds } from "./support/every-block";
import { publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import { headerLook, SOLID, TRANSPARENT } from "./support/header-look";
import { openMiniCart } from "./support/mini-cart";
import { api, PNG, rest, syncedId, upload } from "./support/payload-rest";
import {
  add,
  addToCart,
  checkOut,
  HANDLE,
  type AddressInput,
  type Words,
} from "./support/purchase";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T91 (SPEC §17.1, M5's done-when; M5 plan §5 T91, D99 to D104, D110): every variant is on the DS
// page and selectable in Payload, and the shop draws what an editor selects. Against `next start`
// with the seeded Medusa and markets (Cyprus in Greek at `/`, the US in English at `/us`), as
// `e2e-smoke` runs it. The DS half (each member's page in four locales and its thumbnail) is
// `variants-ds.spec.ts`, in the `design-system` job, whose build has the DS.
//
// 1. **Selectable in Payload**, in the admin's UI as an editor the bootstrap admin creates: on Home
//    the hero's design is changed to `overlay` with the keyboard in its picker, and the header's to
//    `transparent`, both published; `/` and `/us` show the overlay hero under the transparent
//    header within two requests, and the cart a solid header. Under Templates the editor picks the
//    product page `grid`, the listing `top-bar` with the `quick-add` card and the quick view
//    `drawer`, the cart `table` with the `drawer-picks` mini cart and the quick cart off, the
//    checkout `one-page` and the receipt `statement`, and publishes; each page says it is that
//    variant (`data-variant`) in `/` and `/us`, and a purchase ends on the `statement` receipt.
// 2. **Every variant draws on the shop:** a page with each of the registry's block variants (60),
//    published through the REST API and read through T59's test page (`/[market]/e2e-cms/[slug]`),
//    and each template variant published through the API in turn, each page's `data-variant` the
//    one set (`express-rail` included, D100), with no axe violation, console message or failed
//    request, in `/` and `/us`.
//
// `afterAll` puts Home, the header and the templates back as they were, in every language,
// published, removes the editor, the page and its upload, waits until `/` and `/us` show them as
// they were, and fails the run if it cannot.

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);
// An action that waits names its step when it fails, rather than the whole test's time-out.
test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });

const stamp = Date.now().toString(36);
const LANGUAGES = ["en", "el", "de", "fr"] as const;
const editor = { email: `variants-editor-${stamp}@example.com`, password: `editor-${stamp}-pass` };
const blocksPage = {
  en: { title: `Every block ${stamp}`, slug: `e2e-every-block-${stamp}` },
  el: { title: `Κάθε μπλοκ ${stamp}`, slug: `e2e-kathe-block-${stamp}` },
};

// D34's tags, as the design-system checks use them.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type Market = {
  name: string;
  prefix: "" | "/us";
  words: Words;
  lang: "el" | "en";
  address: AddressInput;
};
const MARKETS: readonly Market[] = [
  {
    name: "Cyprus, in Greek",
    prefix: "",
    words: catalogs.el,
    lang: "el",
    address: {
      firstName: "Μαρία",
      lastName: "Γεωργίου",
      address1: "Λεωφόρος Μακαρίου 10",
      city: "Λευκωσία",
    },
  },
  {
    name: "the US, in English",
    prefix: "/us",
    words: catalogs.en,
    lang: "en",
    address: {
      firstName: "Grace",
      lastName: "Hopper",
      address1: "350 Fifth Avenue",
      city: "New York",
      province: "NY",
      postalCode: "10118",
    },
  },
];
const US = MARKETS[1] as Market;
const homeOf = (market: Market) => market.prefix || "/";

/** What the editor picks under Templates (step 2 of the plan's T91). */
const PICKED = {
  productPage: "grid",
  listing: "top-bar",
  card: "quick-add",
  quickView: "drawer",
  cart: "table",
  miniCart: "drawer-picks",
  quickCart: "off",
  checkout: "one-page",
  receipt: "statement",
} as const;

let token = "";
let editorId: number | undefined;
let homeId: number | undefined;
/** Home's `layout` as each language has it, fallbacks left out, for the restore. */
const originalHome: Partial<Record<(typeof LANGUAGES)[number], unknown[]>> = {};
let header: GlobalData | undefined;
let templates: GlobalData | undefined;
let blocksPageId: number | undefined;
let picture: number | undefined;

const http = <T>(method: string, path: string, body?: unknown) =>
  rest<T>(token, method, path, body);

/** A GET of the shop from Node, no cookies. */
const html = async (path: string) => (await fetch(`${base()}${path}`)).text();

/** Whether the markup draws `slot` and every one of them says it is `variant`. */
const draws = (markup: string, slot: string, variant: string) => {
  const found = variantsAt(markup, slot);
  return found.length > 0 && found.every((each) => each === variant);
};

/** axe with D34's tags, without Base UI's focus guards (as `design-system.spec.ts` explains). */
const axeViolations = async (page: Page) =>
  (
    await new AxeBuilder({ page }).withTags(axeTags).exclude("[data-base-ui-focus-guard]").analyze()
  ).violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}: ${v.nodes[0]?.target})`);

/** A page's console and failed requests, judged by `support/console.ts`'s rules. */
function watch(page: Page) {
  const messages: Message[] = [];
  const failed: FailedRequest[] = [];
  collectConsole(page, messages, failed);
  return () => {
    const { summary, local, failedLine } = judgeConsole(messages, failed, base());
    expect.soft(local, failedLine).toEqual([]);
    expect.soft(summary, "console messages").toEqual([]);
  };
}

/** The `templates` global as published in English, without the fields Payload sets itself. */
async function templatesInEnglish(): Promise<GlobalData> {
  const data = await api<GlobalData>(token, "GET", "/api/globals/templates?locale=en&depth=0");
  for (const key of ["id", "updatedAt", "createdAt", "globalType", "_status"]) delete data[key];
  return data;
}

/** `data` with each tab's fields in `changes` replaced (the sections an editor wrote stay). */
const withTabs = (data: GlobalData, changes: Record<string, GlobalData>): GlobalData =>
  Object.fromEntries(
    [...new Set([...Object.keys(data), ...Object.keys(changes)])].map((tab) => [
      tab,
      { ...((data[tab] as GlobalData | undefined) ?? {}), ...(changes[tab] ?? {}) },
    ]),
  );

/** The page of `{prefix}/store` that lists the purchase's product (the demo's order varies, T83). */
async function listingWith(prefix: string): Promise<string> {
  for (let n = 1; n <= 8; n++) {
    const path = n === 1 ? `${prefix}/store` : `${prefix}/store/page/${n}`;
    if ((await html(path)).includes(`href="${prefix}/products/${HANDLE}"`)) return path;
  }
  throw new Error(`no page of ${prefix}/store lists ${HANDLE}`);
}

/**
 * Polls `path`'s HTML (as `request` reads it, with its cookies) until it draws `slot` as `variant`:
 * the first request after a publish may still read the global as it was (`max`), and each page,
 * and each checkout step, is its own read.
 */
async function untilDrawn(
  request: { get: (path: string) => Promise<{ text: () => Promise<string> }> },
  pages: readonly (readonly [path: string, slot: string, variant: string])[],
) {
  for (const [path, slot, variant] of pages)
    await expect
      .poll(async () => draws(await (await request.get(path)).text(), slot, variant), {
        message: `${path} draws ${slot} as ${variant}`,
        timeout: 30_000,
      })
      .toBe(true);
}

/** The checkout's three steps, each its own route with its own read of the global. */
const checkoutSteps = (prefix: string) =>
  (["contact", "delivery", "review"] as const).map((step) => `${prefix}/checkout/${step}`);

// ---- The template families (step 3) ---------------------------------------------------------

/** A family's members, as its picker lists them: the registry's (`variantsOf`), in its order. */
const membersOf = (family: string): string[] =>
  entries.flatMap((entry) =>
    entry.family === family && entry.variant !== undefined ? [entry.variant] : [],
  );

/** The slot a family's members draw and say their variant on (drift.ts's, as the DS checks it). */
function rootOf(family: string): string {
  const entry = entries.find((each) => each.family === family);
  const slot = entry === undefined ? undefined : familyRoot(entry, entries);
  if (slot === undefined) throw new Error(`the registry has no root slot for the family ${family}`);
  return slot;
}

/** Every picker on its family's first member, the quick view off: M4's shop (the seed's values). */
const FIRST_MEMBERS: Record<string, GlobalData> = {
  productPage: { variant: "default" },
  listing: { variant: "default", card: "standard" },
  quickView: { variant: "off" },
  cart: { variant: "default", miniCart: "drawer", quickCart: "dropdown" },
  checkout: { variant: "default" },
  receipt: { variant: "default" },
};

/** The header cart island's props with the quick cart on (`dropdown`), as the HTML carries them. */
const QUICK_CART_ON = /\\?"quickCart\\?":\\?"dropdown\\?"/;

/** The mini carts the HTML gives the header's cart island (its props, as T79's spec reads them). */
const miniCartsIn = (markup: string): string[] => [
  ...new Set(
    [...markup.matchAll(/\\?"miniCart\\?":\\?"([\w-]+)\\?"/g)].map((match) => match[1] ?? ""),
  ),
];

/** The variants the HTML draws `slot` as, each once (`[]` when it draws none). */
const drawnAs = (slot: string) => (markup: string) => [
  ...new Set(variantsAt(markup, slot).map((each) => each ?? "no data-variant")),
];

type TemplateFamily = {
  family: string;
  /** The templates global's tab and field that pick it. */
  tab: string;
  field: string;
  /** Other picks it needs (the quick view opens from the `quick-add` card only, D101). */
  with?: Record<string, GlobalData>;
  /** Where a shopper meets it in the market; `receipt` is the probe's order's. */
  path: (market: Market, receipt: string) => string;
  /** The members the page's HTML draws: the one set, or (a member missing) the family's first. */
  drawn: (markup: string) => string[];
  /** The member in the browser: its root says it is `variant`, opened where it opens. */
  check: (page: Page, variant: string) => Promise<void>;
};

const rootIs = (slot: string) => async (page: Page, variant: string) =>
  expect(page.locator(`[data-slot="${slot}"]:visible`).first()).toHaveAttribute(
    "data-variant",
    variant,
  );

const TEMPLATE_FAMILIES: readonly TemplateFamily[] = [
  {
    family: "product-detail",
    tab: "productPage",
    field: "variant",
    path: (market) => `${market.prefix}/products/${HANDLE}`,
    drawn: drawnAs(rootOf("product-detail")),
    check: rootIs(rootOf("product-detail")),
  },
  {
    family: "product-listing",
    tab: "listing",
    field: "variant",
    path: (market) => `${market.prefix}/store`,
    drawn: drawnAs(rootOf("product-listing")),
    check: rootIs(rootOf("product-listing")),
  },
  {
    family: "quick-view",
    tab: "quickView",
    field: "variant",
    with: { listing: { variant: "default", card: "quick-add" } },
    path: (market) => `${market.prefix}/store`,
    drawn: drawnAs(rootOf("quick-view")),
    check: async (page, variant) => {
      const trigger = page
        .locator(
          `[data-slot="product-listing-region"] [data-slot="${rootOf("quick-view")}"]:visible`,
        )
        .first();
      await expect(trigger).toHaveAttribute("data-variant", variant);
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      await expect(dialog).toHaveAttribute("data-variant", variant);
    },
  },
  {
    family: "cart",
    tab: "cart",
    field: "variant",
    path: (market) => `${market.prefix}/cart`,
    drawn: drawnAs(rootOf("cart")),
    check: rootIs(rootOf("cart")),
  },
  {
    family: "mini-cart",
    tab: "cart",
    field: "miniCart",
    path: (market) => `${market.prefix}/products/${HANDLE}`,
    // The island draws its trigger in the browser: the HTML has the mini cart in its props.
    drawn: miniCartsIn,
    check: async (page, variant) => {
      await openMiniCart(page, variant);
      await expect(
        page.locator(`header [data-slot="${rootOf("mini-cart")}"]:visible`).first(),
      ).toHaveAttribute("data-variant", variant);
    },
  },
  {
    family: "checkout",
    tab: "checkout",
    field: "variant",
    path: (market) => `${market.prefix}/checkout/contact`,
    drawn: drawnAs(rootOf("checkout")),
    check: rootIs(rootOf("checkout")),
  },
  {
    family: "receipt",
    tab: "receipt",
    field: "variant",
    path: (_, receipt) => receipt,
    drawn: drawnAs(rootOf("receipt")),
    check: rootIs(rootOf("receipt")),
  },
];

// ---- The admin's UI ---------------------------------------------------------------------------

/**
 * Chooses `value` in the radio group of the field `name` with the keyboard, as an editor does in
 * the variant picker (D85, a native radio group) and in Payload's radio field: focus on the chosen
 * option, then the arrow key until `value` is chosen. Each press chooses the option it moves to.
 */
async function chooseWithKeyboard(page: Page, name: string, value: string) {
  const radios = page.locator(`input[type="radio"][name="${name}"]`);
  // The picker's inputs carry the value; Payload's own radio field's (`quickCart`) carry it in their id.
  const target = page.locator(
    `input[type="radio"][name="${name}"]:is([value="${value}"], [id="field-${name}-${value}"])`,
  );
  await expect(target, `the option ${value} of ${name}`).toBeAttached();
  await page.locator(`input[type="radio"][name="${name}"]:checked`).focus();
  const count = await radios.count();
  for (let press = 0; press < count && !(await target.isChecked()); press++)
    await page.keyboard.press("ArrowRight");
  await expect(target, `${name} is ${value}`).toBeChecked();
  await expect(target, `${name}: the chosen card has the focus`).toBeFocused();
}

/** "Publish changes", and Payload's word that it worked. */
async function publishInAdmin(page: Page) {
  await page.locator("#action-save").click();
  await expect(page.getByText(/successfully/i).first()).toBeVisible({ timeout: 15_000 });
}

/** A templates tab, opened by its label. */
async function openTab(page: Page, label: string) {
  await page.locator(".tabs-field__tab-button", { hasText: label }).first().click();
}

// ---- The restore ------------------------------------------------------------------------------

test.beforeAll(async () => {
  token = await adminToken();
  const settings = await api<{ homepage?: number | null }>(
    token,
    "GET",
    "/api/globals/site-settings?depth=0",
  );
  homeId = settings.homepage ?? undefined;
  expect(homeId, "the seed names Home as the homepage (seed-content)").toBeDefined();
  for (const language of LANGUAGES) {
    const answer = await api<{ layout: unknown[] }>(
      token,
      "GET",
      `/api/pages/${homeId}?depth=0&locale=${language}&fallback-locale=none`,
    );
    originalHome[language] = answer.layout;
  }
  header = await snapshotGlobal(token, "header");
  templates = await snapshotGlobal(token, "templates");
  const created = await http<{ doc: { id: number } }>("POST", "/api/users", {
    ...editor,
    role: "editor",
  });
  expect(created.status, created.text).toBe(201);
  editorId = created.json().doc.id;
});

test.afterAll(async () => {
  // Not a test: Home, the header and the templates as they were, in every language, published;
  // then the editor, the page of every block and its upload removed. A failure fails the run.
  const problems: string[] = [];
  const note = async (what: string, call: Promise<{ status: number; text: string }>) => {
    const answer = await call;
    if (answer.status !== 200) problems.push(`${what}: ${answer.status} ${answer.text}`);
  };
  // A lock the editor's closed browser left would refuse the restore (423): the editor's only.
  if (editorId !== undefined) {
    const locks = await http<{ docs: { id: number }[] }>(
      "GET",
      `/api/payload-locked-documents?depth=0&limit=100&where[user.value][equals]=${editorId}`,
    );
    if (locks.status !== 200) problems.push(`the editor's locks: ${locks.status} ${locks.text}`);
    else
      for (const lock of locks.json().docs ?? [])
        await note(
          `the editor's lock ${lock.id}`,
          http("DELETE", `/api/payload-locked-documents/${lock.id}`),
        );
  }
  if (homeId !== undefined)
    for (const language of LANGUAGES) {
      const layout = originalHome[language];
      if (layout === undefined) continue;
      // English first: a publish validates the default language.
      await note(
        `Home in ${language}`,
        http("PATCH", `/api/pages/${homeId}?locale=${language}`, { layout, _status: "published" }),
      );
    }
  if (header !== undefined)
    await publishGlobal(token, "header", header, "all").catch((error: unknown) => {
      problems.push(`the header: ${String(error)}`);
    });
  if (templates !== undefined)
    await publishGlobal(token, "templates", templates, "all").catch((error: unknown) => {
      problems.push(`the templates: ${String(error)}`);
    });
  if (editorId !== undefined) await note("the editor", http("DELETE", `/api/users/${editorId}`));
  if (blocksPageId !== undefined)
    await note("the page of every block", http("DELETE", `/api/pages/${blocksPageId}`));
  if (picture !== undefined) await note("the upload", http("DELETE", `/api/media/${picture}`));
  expect(problems, "the restore").toEqual([]);

  // The suites after this one read the shop as the seed left it: each page shows the header's
  // design, Home's hero and each template's variant as they were, before the next file runs.
  const design = String(header?.["design"] ?? "classic");
  const hero = String(((originalHome.en?.[0] ?? {}) as { variant?: string }).variant ?? "standard");
  const variantOf = (tab: string, field = "variant", fallback = "default") =>
    String(((templates?.[tab] ?? {}) as GlobalData)[field] ?? fallback);
  const restored: [string, string, string][] = [];
  for (const market of MARKETS) {
    restored.push([homeOf(market), "header", design], [homeOf(market), "hero-section", hero]);
    restored.push([
      `${market.prefix}/products/${HANDLE}`,
      "product-detail-template",
      variantOf("productPage"),
    ]);
    restored.push([`${market.prefix}/store`, "product-listing-template", variantOf("listing")]);
    restored.push([
      `${market.prefix}/store`,
      "product-card",
      variantOf("listing", "card", "standard"),
    ]);
    // The search page and the (empty) cart read the global too, each on its own (W7 review item
    // 18); the checkout and the receipt need a cart, so `templates-global.spec.ts` reads them again.
    restored.push([
      `${market.prefix}/search?q=hoodie`,
      "search-results-template",
      variantOf("listing"),
    ]);
    restored.push([`${market.prefix}/cart`, "cart-template", variantOf("cart")]);
  }
  for (const [path, slot, variant] of restored)
    await expect
      .poll(async () => draws(await html(path), slot, variant), {
        message: `${path} draws ${slot} as ${variant} again`,
        timeout: 60_000,
        intervals: [1_000],
      })
      .toBe(true);
});

// ---- 1. Selectable in Payload ---------------------------------------------------------------

test.describe("selectable in Payload: an editor picks, the shop draws it", () => {
  test("on Home, the editor picks the overlay hero with the keyboard and the transparent header, and publishes", async ({
    browser,
  }) => {
    // A regeneration running across the publish would keep what it read before (`settled`, T65).
    for (const market of MARKETS) await settled(homeOf(market));
    const context = await browser.newContext({
      baseURL: base(),
      viewport: { width: 1600, height: 1000 },
    });
    const page = await context.newPage();
    try {
      await signInToAdmin(page, editor);

      await page.goto(`/admin/collections/pages/${homeId}?locale=en`);
      await expect(page.locator('input[name="layout.0.heading"]')).toBeVisible();
      await chooseWithKeyboard(page, "layout.0.variant", "overlay");
      // Autosave keeps the draft 375 ms after the change: the choice reached the document.
      await expect
        .poll(
          async () =>
            (
              await api<{ layout: { variant?: string }[] }>(
                token,
                "GET",
                `/api/pages/${homeId}?depth=0&draft=true&locale=en`,
              )
            ).layout[0]?.variant,
        )
        .toBe("overlay");
      await publishInAdmin(page);

      await page.goto("/admin/globals/header");
      await chooseWithKeyboard(page, "design", "transparent");
      await publishInAdmin(page);
    } finally {
      // Leaving the documents gives up the editor's locks (`afterAll` removes one left behind).
      await page.goto("/admin").catch(() => undefined);
      await page.waitForTimeout(1_500);
      await context.close();
    }
  });

  test("/ and /us show the overlay hero under the transparent header within two requests, the cart a solid header", async ({
    browser,
  }) => {
    for (const market of MARKETS) {
      const shows = async () => {
        const markup = await html(homeOf(market));
        return draws(markup, "header", "transparent") && draws(markup, "hero-section", "overlay");
      };
      expect(
        await freshWithinTwo(shows, 1_500),
        `${homeOf(market)}: the overlay hero and the transparent header within two requests`,
      ).toBeGreaterThan(0);
      // The cart is drawn per request, with the header global's cached read (`max`, as the pages').
      const cart = `${market.prefix}/cart`;
      expect(
        await freshWithinTwo(async () => draws(await html(cart), "header", "transparent")),
        `${cart}: the transparent header within two requests`,
      ).toBeGreaterThan(0);
    }
    const context = await browser.newContext({
      baseURL: base(),
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const judge = watch(page);
    try {
      for (const market of MARKETS) {
        await page.goto(homeOf(market));
        await expect(page.locator('[data-slot="hero-section"]').first()).toHaveAttribute(
          "data-under-header",
          "all",
        );
        expect(await headerLook(page), `${homeOf(market)}: over the overlay hero`).toMatchObject(
          TRANSPARENT,
        );
        expect(await axeViolations(page), homeOf(market)).toEqual([]);
        await page.goto(`${market.prefix}/cart`);
        const seen = await headerLook(page);
        expect(seen, `${market.prefix}/cart: solid`).toMatchObject(SOLID);
        expect(
          seen?.height,
          `${market.prefix}/cart: the header takes its row's height`,
        ).toBeGreaterThan(40);
      }
    } finally {
      await context.close();
    }
    judge();
  });

  test("under Templates, the editor picks each commerce page's variant and publishes", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: base(),
      viewport: { width: 1600, height: 1000 },
    });
    const page = await context.newPage();
    try {
      await signInToAdmin(page, editor);
      await page.goto("/admin/globals/templates");
      await openTab(page, "Product page");
      await chooseWithKeyboard(page, "productPage.variant", PICKED.productPage);
      await openTab(page, "Listing");
      await chooseWithKeyboard(page, "listing.variant", PICKED.listing);
      await chooseWithKeyboard(page, "listing.card", PICKED.card);
      // The quick view's picker shows once the card is `quick-add` (D101).
      await openTab(page, "Quick view");
      await chooseWithKeyboard(page, "quickView.variant", PICKED.quickView);
      await openTab(page, "Cart");
      await chooseWithKeyboard(page, "cart.variant", PICKED.cart);
      await chooseWithKeyboard(page, "cart.miniCart", PICKED.miniCart);
      await chooseWithKeyboard(page, "cart.quickCart", PICKED.quickCart);
      await openTab(page, "Checkout");
      await chooseWithKeyboard(page, "checkout.variant", PICKED.checkout);
      await openTab(page, "Receipt");
      await chooseWithKeyboard(page, "receipt.variant", PICKED.receipt);
      await publishInAdmin(page);
    } finally {
      await page.goto("/admin").catch(() => undefined);
      await page.waitForTimeout(1_500);
      await context.close();
    }
    const saved = await templatesInEnglish();
    expect(saved).toMatchObject({
      productPage: { variant: PICKED.productPage },
      listing: { variant: PICKED.listing, card: PICKED.card },
      quickView: { variant: PICKED.quickView },
      cart: { variant: PICKED.cart, miniCart: PICKED.miniCart, quickCart: PICKED.quickCart },
      checkout: { variant: PICKED.checkout },
      receipt: { variant: PICKED.receipt },
    });
  });

  for (const market of MARKETS)
    test(`each commerce page draws what the editor picked, in ${market.name}`, async ({ page }) => {
      const judge = watch(page);
      const product = `${market.prefix}/products/${HANDLE}`;
      const listing = await listingWith(market.prefix);
      // Each page is its own cache entry; each shows the picks once it is read again.
      await untilDrawn(page.request, [
        [product, "product-detail-template", PICKED.productPage],
        [listing, "product-listing-template", PICKED.listing],
        [listing, "quick-view-trigger", PICKED.quickView],
        [`${market.prefix}/search?q=hoodie`, "search-results-template", PICKED.listing],
      ]);

      // The product page: its layout, and an add opens no quick cart (it is off).
      await add(page, market.prefix, { quickCart: false });
      await expect(page.locator('[data-slot="product-detail-template"]:visible')).toHaveAttribute(
        "data-variant",
        PICKED.productPage,
      );
      await expect(page.locator('[data-slot="quick-cart"]')).toBeHidden();
      expect(await axeViolations(page), product).toEqual([]);
      // The header's cart opens the drawer with picks.
      const drawer = await openMiniCart(page, PICKED.miniCart);
      await expect(drawer.locator('[data-slot="cart-picks"]')).toHaveCount(1);
      expect(await axeViolations(page), `${product}: the drawer`).toEqual([]);
      await page.keyboard.press("Escape");

      // The listing: its filter layout, the quick-add cards and the drawer quick view.
      await page.goto(listing);
      await expect(page.locator('[data-slot="product-listing-template"]:visible')).toHaveAttribute(
        "data-variant",
        PICKED.listing,
      );
      const card = page
        .locator(
          `[data-slot="product-listing-region"] [data-slot="product-card"]:has(a[href$="/products/${HANDLE}"])`,
        )
        .first();
      await expect(card).toHaveAttribute("data-variant", PICKED.card);
      const quickView = card.locator('[data-slot="quick-view-trigger"]');
      await expect(quickView).toHaveAttribute("data-variant", PICKED.quickView);
      await page.waitForLoadState("networkidle");
      await quickView.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      await expect(dialog).toHaveAttribute("data-variant", PICKED.quickView);
      expect(await axeViolations(page), `${listing}: the quick view`).toEqual([]);
      await page.keyboard.press("Escape");
      // The search page follows the listing's layout (D101).
      await page.goto(`${market.prefix}/search?q=hoodie`);
      await expect(page.locator('[data-slot="search-results-template"]:visible')).toHaveAttribute(
        "data-variant",
        PICKED.listing,
      );

      // The cart page and the checkout, drawn per request for this visitor's cart: the first
      // request after the publish may still read the global as it was (`max`), as a page does.
      await untilDrawn(page.request, [
        [`${market.prefix}/cart`, "cart-template", PICKED.cart],
        [`${market.prefix}/checkout/contact`, "checkout-template", PICKED.checkout],
      ]);
      await page.goto(`${market.prefix}/cart`);
      await expect(page.locator('[data-slot="cart-template"]:visible')).toHaveAttribute(
        "data-variant",
        PICKED.cart,
      );
      expect(await axeViolations(page), `${market.prefix}/cart`).toEqual([]);
      await page.goto(`${market.prefix}/checkout/contact`);
      await expect(page.locator('[data-slot="checkout-template"]:visible')).toHaveAttribute(
        "data-variant",
        PICKED.checkout,
      );
      expect(await axeViolations(page), `${market.prefix}/checkout/contact`).toEqual([]);
      judge();
    });

  test("a purchase from /us on the one-page checkout ends on the statement receipt", async ({
    page,
  }) => {
    await add(page, US.prefix, { quickCart: false });
    // Each step's own read of the global: all three in the one-page layout before the walk.
    await untilDrawn(
      page.request,
      checkoutSteps(US.prefix).map((step) => [step, "checkout-template", PICKED.checkout] as const),
    );
    await page.goto(`${US.prefix}/checkout/contact`);
    const email = `t91-${stamp}@example.com`;
    const path = await checkOut(page, {
      words: US.words,
      email,
      address: US.address,
      onePage: true,
    });
    // The receipt's route reads the global as every page does: its first request since the publish
    // may still draw the layout as it was (`max`), as `checkout-variants.spec.ts`'s probes show.
    await expect
      .poll(
        async () =>
          draws(
            await (await page.request.get(path)).text(),
            "order-confirmation-template",
            PICKED.receipt,
          ),
        { message: `${path} draws the ${PICKED.receipt} receipt`, timeout: 30_000 },
      )
      .toBe(true);
    await page.reload();
    const receipt = page.locator('[data-slot="order-confirmation-template"]:visible');
    await expect(receipt).toHaveAttribute("data-variant", PICKED.receipt);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      US.words.templates.orderConfirmation.title,
    );
    await expect(page.getByRole("main")).toContainText(email);
    expect(await axeViolations(page), "the receipt").toEqual([]);
  });
});

// ---- 2. Every variant draws on the shop -----------------------------------------------------

test.describe("every variant draws on the shop", () => {
  test.beforeAll(async () => {
    picture = (await upload(token, `every-block-${stamp}.png`, "image/png", PNG, "A white wall"))
      .id;
    const form = async (seedKey: string) => {
      const found = await api<{ docs: { id: number }[] }>(
        token,
        "GET",
        `/api/forms?where[seedKey][equals]=${seedKey}&limit=1&depth=0`,
      );
      const id = found.docs[0]?.id;
      if (id === undefined) throw new Error(`the seed has no form with the seedKey ${seedKey}`);
      return id;
    };
    const ids: BlockIds = {
      picture,
      contact: await form("contact"),
      newsletter: await form("newsletter"),
      basics: await syncedId("collections", "everyday-basics"),
      summer: await syncedId("collections", "summer-edit"),
      accessories: await syncedId("categories", "accessories"),
      products: {
        tee: await syncedId("products", "demo-classic-tee"),
        hoodie: await syncedId("products", "demo-heritage-hoodie"),
        cap: await syncedId("products", "demo-canvas-cap"),
        mug: await syncedId("products", "demo-ceramic-mug"),
      },
    };
    const created = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      ...blocksPage.en,
      layout: everyBlockLayout(ids),
      _status: "published",
    });
    blocksPageId = created.doc.id;
    // Greek: the same rows with the English text, as the editor's "copy from English".
    const saved = await api<{ layout: unknown }>(
      token,
      "GET",
      `/api/pages/${blocksPageId}?locale=en&depth=0`,
    );
    await api(token, "PATCH", `/api/pages/${blocksPageId}?locale=el`, {
      ...blocksPage.el,
      layout: saved.layout,
      _status: "published",
    });
  });

  test("the page has every block variant the registry has", () => {
    // 20 blocks' first members and M5's 40 more (D100).
    expect(BLOCK_MEMBERS.length).toBe(60);
  });

  for (const market of MARKETS)
    test(`every block variant draws in ${market.name}, with no axe violation, console message or failed request`, async ({
      page,
    }) => {
      const judge = watch(page);
      // The recently viewed row draws the products the visitor viewed in this market.
      await page.goto(`${market.prefix}/products/demo-ceramic-mug`);
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("shopblok:recently-viewed") ?? ""))
        .toContain("demo-ceramic-mug");
      const { title, slug } = blocksPage[market.lang];
      await page.goto(`${market.prefix}/e2e-cms/${slug}`);
      await expect(page.getByTestId("cms-title")).toHaveText(title);
      await page.waitForLoadState("networkidle");
      const main = page.locator("main#main");
      for (const entry of BLOCK_MEMBERS)
        await expect
          .soft(
            main.locator(`[data-slot="${entry.family}-section"][data-variant="${entry.variant}"]`),
            `${entry.id} draws on the page as ${entry.variant}`,
          )
          .toHaveCount(1);
      expect(await axeViolations(page)).toEqual([]);
      judge();
    });

  // Each template family's members, published through the API one at a time, each drawn where a
  // shopper meets it in `/` and `/us`. Every other picker stays on its family's first member.
  test.describe("every template variant, set through the API in turn", () => {
    /** Per market: a context with a placed order (its receipt) and a line in its cart. */
    const probes: { market: Market; context: BrowserContext; receipt: string }[] = [];
    /** The global as the editor left it, with every picker on its family's first member. */
    let first: GlobalData = {};

    test.beforeAll(async ({ browser }) => {
      first = withTabs(await templatesInEnglish(), FIRST_MEMBERS);
      await publishGlobal(token, "templates", first);
      for (const market of MARKETS) {
        const context = await browser.newContext({ baseURL: base() });
        // Closed by `afterAll` even when a step below fails; its receipt comes with the order.
        const probe = { market, context, receipt: "" };
        probes.push(probe);
        const page = await context.newPage();
        // The product page in M4's layout with the quick cart on, then one add (a retried add
        // would put the product in the cart again); then each checkout step in M3's layout.
        const product = `${market.prefix}/products/${HANDLE}`;
        await untilDrawn(page.request, [[product, "product-detail-template", "default"]]);
        await expect
          .poll(async () => (await (await page.request.get(product)).text()).match(QUICK_CART_ON), {
            message: `${product} has the quick cart on`,
            timeout: 30_000,
          })
          .not.toBeNull();
        await addToCart(page, market.prefix);
        await untilDrawn(
          page.request,
          checkoutSteps(market.prefix).map(
            (step) => [step, "checkout-template", "default"] as const,
          ),
        );
        await page.goto(`${market.prefix}/checkout/contact`);
        probe.receipt = await checkOut(page, {
          words: market.words,
          email: `t91-probe-${market.lang}-${stamp}@example.com`,
          address: market.address,
        });
        await addToCart(page, market.prefix);
        await page.close();
      }
    });

    test.afterAll(async () => {
      for (const probe of probes) await probe.context.close();
    });

    for (const family of TEMPLATE_FAMILIES)
      for (const variant of membersOf(family.family))
        test(`${family.family} · ${variant} draws in / and /us, with no axe violation, console message or failed request`, async () => {
          await publishGlobal(
            token,
            "templates",
            withTabs(first, { ...family.with, [family.tab]: { [family.field]: variant } }),
          );
          for (const { market, context, receipt } of probes) {
            const path = family.path(market, receipt);
            // A missing member draws the family's first, which says so: the poll names the pair.
            await expect
              .poll(async () => family.drawn(await (await context.request.get(path)).text()), {
                message: `${path} draws the ${family.family} family's ${variant}`,
                timeout: 30_000,
              })
              .toEqual([variant]);
            const page = await context.newPage();
            const judge = watch(page);
            try {
              await page.goto(path);
              await page.waitForLoadState("networkidle");
              await family.check(page, variant);
              expect(await axeViolations(page), `${path} · ${variant}`).toEqual([]);
            } finally {
              await page.close();
            }
            judge();
          }
        });
  });
});
