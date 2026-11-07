import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { api, PNG, upload } from "./support/payload-rest";
import { adminToken, base } from "./support/server";

// T82 (M5 plan §1a; D99, D102, D103; WCAG 2.1.2, 2.4.3, 2.4.11): the content and promotion
// blocks' seventeen members on a page published through Payload's REST API as the bootstrap
// admin and read through T59's test page (`/[market]/e2e-cms/[slug]`, `E2E_TEST_ROUTES=true`).
// There is no `/next/e2e/sections` route yet (T91 builds it), so the members are drawn the way a
// shop's page draws them, as `cms-commerce-blocks.spec.ts` does. In the US market (`/us`, English)
// and in Cyprus (`/`, Greek): each member says which it is (`data-variant`), the page keeps one
// FAQPage JSON-LD with the side-heading FAQ, and axe finds nothing. Then the popup, at 375 and
// 1440 px: nothing before the cookie banner is answered (the banner's buttons are never under
// it), then the card at the window's corner, named, taking no focus and keeping its height clear;
// it goes with Escape, does not come back on the next page, and goes with its close button for a
// new visitor. The pages and the upload are deleted afterwards.

const stamp = Date.now().toString(36);
const english = { title: `Variants ${stamp}`, slug: `e2e-variants-${stamp}` };
const greek = { title: `Παραλλαγές ${stamp}`, slug: `e2e-parallages-${stamp}` };
const popupPage = { title: `Popup ${stamp}`, slug: `e2e-popup-${stamp}` };

// D34's tags, as the design-system checks use them.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const DAY = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/** The seventeen members, each by its block's section slot and its variant. */
const MEMBERS = [
  ["media-with-text", "overlap"],
  ["media-with-text", "full-bleed"],
  ["usp-bar", "strip"],
  ["logo-cloud", "grid"],
  ["faq", "side-heading"],
  ["testimonials", "single"],
  ["testimonials", "carousel"],
  ["testimonials", "wall"],
  ["promo-banner", "strip"],
  ["promo-banner", "ticket"],
  ["promo-banner", "full-bleed"],
  ["promo-banner", "countdown"],
  ["promo-banner", "popup"],
  ["comparison", "cards"],
  ["comparison", "highlight"],
  ["newsletter", "split"],
  ["editorial-list", "featured"],
] as const;

type Ids = { picture: number; newsletter: number; tee: number; hoodie: number };

const lexical = (text: string) => ({
  root: {
    type: "root",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        children: [
          { type: "text", version: 1, text, format: 0, detail: 0, mode: "normal", style: "" },
        ],
      },
    ],
  },
});

/** A layout with every member, in §1a's order. */
function layout(ids: Ids) {
  const media = (variant: string) => ({
    blockType: "mediaWithText",
    variant,
    media: ids.picture,
    imageSide: "start",
    heading: `The Heritage collection · ${variant}`,
    content: lexical("Heavyweight jersey and a lined hood."),
    links: [{ link: { type: "custom", url: "/store", label: `Shop the collection · ${variant}` } }],
  });
  const quotes = [
    { quote: "Soft and sturdy.", author: "Jordan P.", role: "Verified buyer", rating: 5 },
    { quote: "The best tee I own.", author: "Sam K.", rating: 4 },
    { quote: "Arrived in two days and fits as described.", author: "Alex M.", rating: 5 },
  ];
  const testimonials = (variant: string) => ({
    blockType: "testimonials",
    variant,
    heading: `What our customers say · ${variant}`,
    quotes,
  });
  const promo = (variant: string, extra: Record<string, unknown> = {}) => ({
    blockType: "promoBanner",
    variant,
    heading: `Ten percent off · ${variant}`,
    text: "On your first order.",
    code: "WELCOME10",
    terms: "One use per order.",
    endsAt: inDays(30),
    ...extra,
  });
  const comparison = (variant: string, extra: Record<string, unknown> = {}) => ({
    blockType: "comparison",
    variant,
    heading: `Compare · ${variant}`,
    products: [ids.tee, ids.hoodie],
    showOptions: true,
    ...extra,
  });
  return [
    media("overlap"),
    media("full-bleed"),
    {
      blockType: "uspBar",
      variant: "strip",
      items: [
        { icon: "delivery", title: "Free delivery", text: "On orders over $75" },
        { icon: "returns", title: "30-day returns" },
        { icon: "secure", title: "Secure checkout" },
      ],
    },
    {
      blockType: "logoCloud",
      variant: "grid",
      heading: "As seen in",
      logos: [
        { name: "Northwind Weekly", image: ids.picture, url: "https://north.example" },
        { name: "Southside Daily", image: ids.picture },
      ],
    },
    {
      blockType: "faq",
      variant: "side-heading",
      heading: "Questions",
      items: [
        { question: "How long does delivery take?", answer: "Two to four days." },
        { question: "Can I return an item?", answer: "Yes, within 30 days." },
      ],
    },
    testimonials("single"),
    testimonials("carousel"),
    testimonials("wall"),
    promo("strip"),
    promo("ticket"),
    promo("full-bleed", { media: ids.picture }),
    promo("countdown", { endsAt: inDays(3) }),
    promo("popup"),
    comparison("cards"),
    comparison("highlight", { pick: ids.hoodie }),
    {
      blockType: "newsletter",
      variant: "split",
      heading: "Letters from the mill",
      text: "One e-mail a month.",
      media: ids.picture,
      form: ids.newsletter,
      privacy: { type: "custom", url: "/privacy" },
    },
    // The seed's two posts at least (`seed-content`).
    { blockType: "editorialList", variant: "featured", heading: "From the journal", limit: 3 },
  ];
}

async function id(token: string, path: string): Promise<number> {
  const { docs } = await api<{ docs: { id: number }[] }>(token, "GET", path);
  const found = docs[0]?.id;
  if (found === undefined) throw new Error(`nothing at ${path}`);
  return found;
}

const card = (page: Page) => page.locator('body > [data-slot="promo-popup"]');
const banner = (page: Page) => page.locator('[data-slot="cookie-consent"]');

/** Whether each of the banner's buttons is the element at its own centre (nothing over it). */
const bannerButtonsClear = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-slot="cookie-consent"] button')].map(
      (button) => {
        const box = button.getBoundingClientRect();
        const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return top !== null && button.contains(top);
      },
    ),
  );

test.describe("the content and promotion blocks' members (T82)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  const pageIds: number[] = [];
  let picture: number | undefined;

  test.beforeAll(async () => {
    token = await adminToken();
    picture = (await upload(token, `variants-${stamp}.png`, "image/png", PNG, "A white wall")).id;
    const ids: Ids = {
      picture,
      newsletter: await id(token, "/api/forms?where[seedKey][equals]=newsletter&limit=1&depth=0"),
      tee: await id(token, "/api/products?where[handle][equals]=demo-classic-tee&depth=0"),
      hoodie: await id(token, "/api/products?where[handle][equals]=demo-heritage-hoodie&depth=0"),
    };
    const created = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      ...english,
      layout: layout(ids),
      _status: "published",
    });
    pageIds.push(created.doc.id);
    // Greek: the same rows with the English text, as the editor's "copy from English".
    const saved = await api<{ layout: unknown }>(
      token,
      "GET",
      `/api/pages/${created.doc.id}?locale=en&depth=0`,
    );
    await api(token, "PATCH", `/api/pages/${created.doc.id}?locale=el`, {
      ...greek,
      layout: saved.layout,
      _status: "published",
    });
    // The popup's page: words to scroll past, and the offer last.
    const popup = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      ...popupPage,
      layout: [
        {
          blockType: "faq",
          variant: "standard",
          heading: "Questions",
          items: Array.from({ length: 8 }, (_, index) => ({
            question: `Question ${index + 1}?`,
            answer: "An answer.",
          })),
        },
        {
          blockType: "promoBanner",
          variant: "popup",
          heading: `The offer ${stamp}`,
          code: "HELLO5",
        },
      ],
      _status: "published",
    });
    pageIds.push(popup.doc.id);
  });

  test.afterAll(async () => {
    for (const each of pageIds)
      await api(token, "DELETE", `/api/pages/${each}`).catch(() => undefined);
    if (picture !== undefined)
      await api(token, "DELETE", `/api/media/${picture}`).catch(() => undefined);
  });

  for (const market of [
    { name: "the US, in English", prefix: "/us", ...english },
    { name: "Cyprus, in Greek", prefix: "", ...greek },
  ])
    test(`draws every member in ${market.name}, with one FAQPage and no axe violation`, async ({
      page,
    }) => {
      await page.goto(`${market.prefix}/e2e-cms/${market.slug}`);
      await expect(page.getByTestId("cms-title")).toHaveText(market.title);
      const main = page.locator("main#main");
      for (const [slot, variant] of MEMBERS)
        await expect(
          main.locator(`[data-slot="${slot}-section"][data-variant="${variant}"]`),
          `${slot} · ${variant}`,
        ).toHaveCount(1);
      // The full-bleed bands say a picture is behind their words (D103).
      for (const slot of ["media-with-text", "promo-banner"])
        await expect(
          main.locator(`[data-slot="${slot}-section"][data-variant="full-bleed"]`),
        ).toHaveAttribute("data-under-header", "all");
      // The pick is named in its column.
      await expect(main.locator('[data-slot="comparison-pick"]')).toHaveCount(1);
      // The popup's in-place offer is for a browser without scripts only.
      await expect(
        main.locator('[data-slot="promo-banner-section"][data-variant="popup"]'),
      ).toBeHidden();
      // One FAQPage, the side-heading FAQ's questions in it.
      const faqs = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
        scripts.flatMap((script) => {
          const data = JSON.parse(script.textContent ?? "{}") as { "@type"?: string };
          return data["@type"] === "FAQPage" ? [data] : [];
        }),
      );
      expect(faqs).toHaveLength(1);
      expect(JSON.stringify(faqs[0])).toContain("How long does delivery take?");
      const axe = await new AxeBuilder({ page }).include("main#main").withTags(axeTags).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });

  test("without scripts, the popup's offer is drawn in its place", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: base(), javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/us/e2e-cms/${popupPage.slug}`);
    const offer = page.locator(
      'main#main [data-slot="promo-banner-section"][data-variant="popup"]',
    );
    await expect(offer).toBeVisible();
    await expect(offer.getByRole("heading", { name: `The offer ${stamp}` })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
    await context.close();
  });

  for (const width of [375, 1440])
    test(`the popup: only after the cookie choice, once, without taking focus · ${width} px`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        baseURL: base(),
        viewport: { width, height: 800 },
      });
      const page = await context.newPage();
      await page.goto(`/us/e2e-cms/${popupPage.slug}`, { waitUntil: "networkidle" });
      // The banner is up and the popup waits for its answer: nothing over the banner's buttons.
      await expect(banner(page)).toBeVisible();
      await page.waitForTimeout(500);
      await expect(card(page)).toHaveCount(0);
      const clear = await bannerButtonsClear(page);
      expect(clear.length, "the banner's buttons").toBeGreaterThan(1);
      expect(clear, "nothing over the banner's buttons").not.toContain(false);
      expect(await page.evaluate(() => localStorage.length)).toBe(0);

      await banner(page).locator('[data-slot="cookie-consent-reject"]').click();
      await expect(banner(page)).toHaveCount(0);
      // The card at the window's corner, named by its heading.
      await expect(card(page)).toBeVisible();
      await expect(card(page)).toHaveAccessibleName(`The offer ${stamp}`);
      const box = await card(page).boundingBox();
      expect(box, "the card in the window").not.toBeNull();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(800);
      // It takes no focus, and its height is kept clear at the page's end (2.4.11).
      expect(
        await page.evaluate(() =>
          document.querySelector('[data-slot="promo-popup"]')?.contains(document.activeElement),
        ),
      ).toBe(false);
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBlockEnd),
      ).not.toBe("auto");
      const axe = await new AxeBuilder({ page })
        .include('[data-slot="promo-popup"]')
        .withTags(axeTags)
        .analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);

      // Escape closes it, and the next page does not show it again.
      await page.keyboard.press("Escape");
      await expect(card(page)).toHaveCount(0);
      await page.reload({ waitUntil: "networkidle" });
      await banner(page).locator('[data-slot="cookie-consent-accept"]').click();
      await page.waitForTimeout(500);
      await expect(card(page)).toHaveCount(0);
      await context.close();
    });

  test("the popup's close button: it goes, and focus goes back to the page", async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: base() });
    const page = await context.newPage();
    await page.goto(`/us/e2e-cms/${popupPage.slug}`, { waitUntil: "networkidle" });
    await banner(page).locator('[data-slot="cookie-consent-accept"]').click();
    await expect(card(page)).toBeVisible();
    // A keyboard visitor tabs into it from the page's last control (the footer's), then closes it.
    const last = page.locator("footer").locator("a:visible, button:visible").last();
    await last.focus();
    await expect(last).toBeFocused();
    await page.keyboard.press("Tab");
    // The card is next in the order: the end of <body>, after the footer.
    const inCard = () =>
      page.evaluate(
        () =>
          document.querySelector('[data-slot="promo-popup"]')?.contains(document.activeElement) ??
          false,
      );
    expect(await inCard(), "the card follows the page's last control").toBe(true);
    const close = card(page).getByRole("button", { name: "Close" });
    for (
      let tabs = 0;
      tabs < 6 && !(await close.evaluate((b) => b === document.activeElement));
      tabs++
    )
      await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(card(page)).toHaveCount(0);
    await expect(last).toBeFocused();
    await context.close();
  });
});
