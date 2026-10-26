import { readFileSync } from "node:fs";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { catalogs } from "./catalogs";

// The purchase's shared steps (T54) for `checkout-cy`, `checkout-us`, `auth` and `markets-switch`,
// against `next start` and the seeded Medusa: a product added from its page, the three checkout
// steps to the receipt, a context without scripts that keeps the cart, and the links Medusa's local
// notification provider prints in its log (`E2E_MEDUSA_LOG`). A market is its path prefix (`""` for
// `/`, `/us`, `/ch/fr`) and its catalog. Next keeps the pages a visitor came from in the document,
// hidden (`<Activity>`), so the locators take the visible ones: roles, or `:visible`.

export type Words = (typeof catalogs)[keyof typeof catalogs];

/** The product every purchase buys: one of the four the build renders ahead (D58). */
export const HANDLE = "demo-heritage-hoodie";

/** The product's first variant's URL in the market, from the page's JSON-LD (as catalog.spec.ts does). */
export async function variantPath(page: Page, prefix = ""): Promise<string> {
  const html = await (await page.request.get(`${prefix}/products/${HANDLE}`)).text();
  const text = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1] ?? "";
  const graph = (
    JSON.parse(text) as { "@graph": { "@type": string; offers?: { url: string }[] }[] }
  )["@graph"];
  const url = graph.find((node) => node["@type"] === "Product")?.offers?.[0]?.url;
  if (url === undefined) throw new Error("the product has no offer");
  const parsed = new URL(url);
  return parsed.pathname + parsed.search;
}

/** Adds the product's first variant from its page: the quick cart opens on it. */
export async function add(page: Page, prefix = ""): Promise<void> {
  await page.goto(await variantPath(page, prefix));
  const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
  await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
  await box.locator('[data-slot="buy-box-add"]').click();
  await expect(page.locator('[data-slot="quick-cart"]')).toBeVisible();
}

/** Adds, closes the quick cart and waits for the header's count to read `count`. */
export async function addToCart(page: Page, prefix = "", count = 1): Promise<void> {
  await add(page, prefix);
  await page.keyboard.press("Escape");
  await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText(String(count));
}

/** A context with JavaScript off that carries `from`'s cookies (the cart). */
export async function withoutScripts(
  browser: Browser,
  from: BrowserContext,
): Promise<BrowserContext> {
  return browser.newContext({
    javaScriptEnabled: false,
    storageState: await from.storageState(),
  });
}

/** An address form's inputs by name (`firstName`, `address1`, `province`, `postalCode`, …). */
export type AddressInput = Record<string, string>;

/** The contact step's e-mail and address, typed into the page that shows it. */
export async function fillContact(
  page: Page,
  words: Words,
  email: string,
  address: AddressInput,
): Promise<void> {
  await page.getByLabel(words.templates.checkout.contact.email, { exact: true }).fill(email);
  const form = page.locator('[data-slot="address-form"]:visible');
  for (const [name, value] of Object.entries(address))
    await form.locator(`input[name="${name}"]`).fill(value);
}

export type CheckOut = {
  words: Words;
  /** Typed in the contact step with `address`; left out, the step is already filled (a saved address). */
  email?: string;
  address?: AddressInput;
};

/**
 * The three steps from the contact page (where `page` is) to the receipt: the seeded shipping
 * option, "Pay later", the review with what was typed, and "Place order". Answers the receipt's path.
 */
export async function checkOut(page: Page, { words, email, address }: CheckOut): Promise<string> {
  await expect(page).toHaveURL(/\/checkout\/contact$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    words.organisms.checkoutSteps.title,
  );
  if (email !== undefined) await fillContact(page, words, email, address ?? {});
  await page.getByRole("button", { name: words.templates.checkout.contact.submit }).click();

  await expect(page).toHaveURL(/\/checkout\/delivery$/);
  const shipping = page.locator('[data-slot="checkout-shipping"]:visible input[type="radio"]');
  await expect(shipping).toHaveCount(1);
  await shipping.first().check({ force: true });
  await expect(page.getByText(words.organisms.paymentStep.systemName)).toBeVisible();
  await page.getByRole("button", { name: words.organisms.paymentStep.submit }).click();

  await expect(page).toHaveURL(/\/checkout\/review$/);
  const review = page.locator('[data-slot="checkout-review"]:visible');
  if (email !== undefined) await expect(review).toContainText(email);
  if (address?.["address1"] !== undefined) await expect(review).toContainText(address["address1"]);
  await expect(review).toContainText(words.organisms.paymentStep.systemName);
  await page.getByRole("button", { name: words.templates.checkout.review.place }).click();

  await expect(page).toHaveURL(/\/order\/order_[^/]+\/confirmed$/);
  return new URL(page.url()).pathname;
}

/** The order's id in a receipt's path. */
export const orderIdOf = (receipt: string) =>
  /\/order\/([^/]+)\/confirmed/.exec(receipt)?.[1] ?? "";

/**
 * The receipt where `page` is: the title and the order's number in the market's words, the
 * buyer's e-mail, totals in `currencySign`, the date the order was placed as the market's clock
 * reads it (D65: the timeline's `<time>` has the instant), and the cart gone afterwards.
 */
export async function expectReceipt(
  page: Page,
  market: { prefix: string; words: Words; htmlLang: string; timeZone: string },
  email: string,
  currencySign: string,
): Promise<void> {
  const { words } = market;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    words.templates.orderConfirmation.title,
  );
  const number = words.templates.orderConfirmation.number.replace(/\{[^}]+\}/, "\\d+");
  await expect(page.locator('[data-slot="order-confirmation-number"]:visible')).toHaveText(
    new RegExp(`^${number}$`),
  );
  await expect(page.getByRole("main")).toContainText(email);
  await expect(page.locator('[data-slot="order-summary-rows"]:visible')).toContainText(
    currencySign,
  );
  const at = await page
    .locator('[data-slot="order-timeline"]:visible time')
    .first()
    .getAttribute("datetime");
  expect(at).not.toBeNull();
  const local = new Intl.DateTimeFormat(market.htmlLang, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: market.timeZone,
  }).format(new Date(at as string));
  await expect(page.locator('[data-slot="order-confirmation-placed"]:visible')).toContainText(
    local,
  );
  // The cart is gone: the cart page is empty.
  await page.goto(`${market.prefix}/cart`);
  await expect(page.locator('[data-slot="cart-lines"]:visible')).toHaveCount(0);
}

/** The links Medusa's log shows for `to` with `template` (the local notification provider's lines). */
function mailedLinks(to: string, template: string): string[] {
  const file = process.env["E2E_MEDUSA_LOG"];
  if (!file) throw new Error("E2E_MEDUSA_LOG is not set: it is the log of the Medusa under test.");
  const pattern = new RegExp(
    `notification to: '${to.replace(/[.+]/g, "\\$&")}' on the channel: 'email' with template: '${template}' and data: '(.*)'$`,
    "gm",
  );
  return [...readFileSync(file, "utf8").matchAll(pattern)].map(
    (match) => (JSON.parse(match[1] ?? "{}") as { url?: string }).url ?? "",
  );
}

/** How many links of `template` went to `to` so far. */
export const mailedCount = (to: string, template: string) => mailedLinks(to, template).length;

/** The newest link of `template` to `to`, once there are more than `after`, as a path to open. */
export async function mailedLink(to: string, template: string, after = 0): Promise<string> {
  let found: string[] = [];
  await expect
    .poll(
      () => {
        found = mailedLinks(to, template);
        return found.length;
      },
      { timeout: 30_000, message: `${template} to ${to} in ${process.env["E2E_MEDUSA_LOG"]}` },
    )
    .toBeGreaterThan(after);
  const url = new URL(found.at(-1) ?? "");
  // The link names STOREFRONT_URL's origin; the page is opened on the server under test.
  return url.pathname + url.search;
}
