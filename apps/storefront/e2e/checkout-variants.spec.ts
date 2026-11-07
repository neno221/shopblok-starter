import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";
import { publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import {
  addToCart,
  checkOut,
  fillContact,
  mailedLink,
  orderIdOf,
  withoutScripts,
  type AddressInput,
  type Words,
} from "./support/purchase";
import { adminToken, freshWithinTwo } from "./support/server";

// T86 (D101, SETUP.md "Checkout and receipt variants (T86)"): the checkout's `default`, `one-page`
// and `focused` layouts against `next start` and the seeded Medusa, each with one of the receipt's
// layouts. An admin publishes each pair on the templates global; a purchase from `/` (Greek, a
// Cypriot address) and from `/us` (English, a US address), with scripts and without, ends on the
// receipt in the layout the global names. `one-page` draws the three steps on one page: each step's
// action comes back at the next step's anchor with focus on it, the steps done are summed up with
// their "Edit" link, and a delivery sent again keeps the address (every step is its own form). A
// signed-in customer's order screen in the account draws the receipt's layout too, without the
// thanks, and `default` keeps M3's screen. `afterAll` publishes the global as it was, in every
// language. Next keeps the pages a visitor came from in the document, hidden (`<Activity>`), so the
// locators take the visible ones.

type Market = { prefix: string; words: Words; address: AddressInput };
const MARKETS: Market[] = [
  {
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
];
const US = MARKETS[1] as Market;

/** Each checkout layout under test, with the receipt layout its purchases end on. */
const PAIRS = [
  { checkout: "default", receipt: "split" },
  { checkout: "one-page", receipt: "next-steps" },
  { checkout: "focused", receipt: "compact" },
] as const;

/** Every picker on its family's first member (M4's shop), but the checkout's and the receipt's. */
const templatesWith = (checkout: string, receipt: string): GlobalData => ({
  productPage: { variant: "default" },
  listing: { variant: "default", card: "standard" },
  quickView: { variant: "off" },
  cart: { variant: "default", miniCart: "drawer", quickCart: "dropdown" },
  checkout: { variant: checkout },
  receipt: { variant: receipt },
});

test.describe.configure({ mode: "serial", timeout: 180_000 });

let token = "";
let published: GlobalData | undefined;
/**
 * A context per market with a receipt and a cart: its receipt and its checkout's steps say which
 * layouts the market's pages read.
 */
const probes: { prefix: string; context: BrowserContext; receipt: string }[] = [];

const draws = async (checkout: string, receipt: string) => {
  // Every page a purchase draws is asked each time (no early answer): each page keeps its own
  // read of the global, which a request after the publish renews.
  const shown = await Promise.all(
    probes.flatMap(({ prefix, context, receipt: path }) => [
      ...(["contact", "delivery", "review"] as const).map(async (step) =>
        (await (await context.request.get(`${prefix}/checkout/${step}`)).text()).includes(
          `data-slot="checkout-template" data-variant="${checkout}"`,
        ),
      ),
      (async () =>
        (await (await context.request.get(path)).text()).includes(
          `data-slot="order-confirmation-template" data-variant="${receipt}"`,
        ))(),
    ]),
  );
  return shown.every(Boolean);
};

const publish = async (
  checkout: string,
  receipt: string,
  fresh = () => draws(checkout, receipt),
) => {
  await publishGlobal(token, "templates", templatesWith(checkout, receipt));
  expect(await freshWithinTwo(fresh), "the published layouts within two requests").toBeGreaterThan(
    0,
  );
};

test.beforeAll(async ({ browser }) => {
  token = await adminToken();
  published = await snapshotGlobal(token, "templates");
  await publishGlobal(token, "templates", templatesWith("default", "default"));
  for (const market of MARKETS) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await addToCart(page, market.prefix);
    await page.goto(`${market.prefix}/checkout/contact`);
    const email = `t86-probe-${Date.now()}@example.com`;
    const receipt = await checkOut(page, { words: market.words, email, address: market.address });
    await addToCart(page, market.prefix);
    await page.close();
    probes.push({ prefix: market.prefix, context, receipt });
  }
});

test.afterAll(async () => {
  // Not a test: the global as it was, published in every language.
  if (published !== undefined) {
    await publishGlobal(token, "templates", published, "all");
    const { checkout, receipt } = published as {
      checkout?: { variant?: string };
      receipt?: { variant?: string };
    };
    await freshWithinTwo(() =>
      draws(checkout?.variant ?? "default", receipt?.variant ?? "default"),
    );
  }
  for (const probe of probes) await probe.context.close();
});

/** A step of the one-page checkout: its section, at its anchor. */
const stepOf = (page: Page, kind: "contact" | "delivery" | "review") =>
  page.locator(`[id="main-step-${kind}"]:visible`);

/**
 * The one-page checkout from its contact step (where `page` is) to the receipt: each step's action
 * comes back at the next step's anchor, focused, with the steps done summed up; the delivery is
 * opened again from its "Edit" and sent again, and the address stays. Answers the receipt's path.
 */
async function checkOutOnOnePage(
  page: Page,
  { words, address }: Market,
  email: string,
): Promise<string> {
  const steps = words.templates.checkout;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    words.organisms.checkoutSteps.title,
  );
  await expect(stepOf(page, "contact")).toHaveAttribute("data-state", "current");
  await expect(stepOf(page, "delivery")).toHaveAttribute("data-state", "later");
  await expect(stepOf(page, "review")).toHaveAttribute("data-state", "later");
  await fillContact(page, words, email, address);
  await page.getByRole("button", { name: steps.contact.submit }).click();

  await expect(page).toHaveURL(/\/checkout\/delivery#main-step-delivery$/);
  await expect(stepOf(page, "delivery")).toHaveAttribute("data-state", "current");
  await expect(stepOf(page, "delivery")).toBeFocused();
  const contact = stepOf(page, "contact");
  await expect(contact).toHaveAttribute("data-state", "done");
  await expect(contact.locator('[data-slot="checkout-one-page-done"]')).toContainText(email);
  await expect(contact.locator('[data-slot="checkout-one-page-done"]')).toContainText(
    address["address1"] ?? "",
  );
  await expect(contact.locator('[data-slot="checkout-one-page-edit"]')).toHaveAttribute(
    "href",
    /\/checkout\/contact#main-step-contact$/,
  );
  const shipping = page.locator('[data-slot="checkout-shipping"]:visible input[type="radio"]');
  await expect(shipping).toHaveCount(1);
  await shipping.first().check({ force: true });
  await page.getByRole("button", { name: words.organisms.paymentStep.submit }).click();

  await expect(page).toHaveURL(/\/checkout\/review#main-step-review$/);
  await expect(stepOf(page, "review")).toBeFocused();
  await expect(stepOf(page, "delivery")).toHaveAttribute("data-state", "done");
  await expect(stepOf(page, "delivery")).toContainText(words.organisms.paymentStep.systemName);

  // The delivery again, from its "Edit": sent on its own, it leaves the address as it was.
  await stepOf(page, "delivery").locator('[data-slot="checkout-one-page-edit"]').click();
  await expect(page).toHaveURL(/\/checkout\/delivery#main-step-delivery$/);
  await expect(stepOf(page, "delivery")).toHaveAttribute("data-state", "current");
  await expect(stepOf(page, "delivery")).toBeFocused();
  await expect(shipping.first()).toBeChecked();
  await page.getByRole("button", { name: words.organisms.paymentStep.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/review#main-step-review$/);
  // The review is the steps done, summed up, and the order's button.
  await expect(stepOf(page, "contact")).toContainText(email);
  await expect(stepOf(page, "contact")).toContainText(address["address1"] ?? "");
  await expect(stepOf(page, "delivery")).toContainText(words.organisms.paymentStep.systemName);
  await page.getByRole("button", { name: steps.review.place }).click();

  // Without scripts the browser keeps the review's anchor across the action's redirect (a
  // `Location` without a fragment takes the request's): the receipt has no such id, so it stays put.
  await expect(page).toHaveURL(/\/order\/order_[^/]+\/confirmed(#main-step-review)?$/);
  return new URL(page.url()).pathname;
}

/** A purchase in `market` from its contact step in `checkout`'s layout, scripted or not. */
async function purchase(
  browser: Browser,
  page: Page,
  market: Market,
  scripts: boolean,
  checkout: string,
): Promise<{ page: Page; email: string; close: () => Promise<void> }> {
  await addToCart(page, market.prefix);
  const context = scripts ? undefined : await withoutScripts(browser, page.context());
  const shopper = context === undefined ? page : await context.newPage();
  await shopper.goto(`${market.prefix}/checkout/contact`);
  await expect(shopper.locator('[data-slot="checkout-template"]:visible')).toHaveAttribute(
    "data-variant",
    checkout,
  );
  const email = `t86-${checkout}-${scripts ? "js" : "nojs"}-${Date.now()}@example.com`;
  if (checkout === "one-page") await checkOutOnOnePage(shopper, market, email);
  else await checkOut(shopper, { words: market.words, email, address: market.address });
  return { page: shopper, email, close: async () => context?.close() };
}

/** The receipt where `page` is, in `variant`'s layout, with the thanks. */
async function expectReceiptIn(page: Page, words: Words, variant: string, email: string) {
  await expect(page.locator('[data-slot="order-confirmation-template"]:visible')).toHaveAttribute(
    "data-variant",
    variant,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    words.templates.orderConfirmation.title,
  );
  await expect(page.locator('[data-slot="order-confirmation-number"]:visible')).toBeVisible();
  await expect(page.getByRole("main")).toContainText(email);
}

for (const { checkout, receipt } of PAIRS) {
  test.describe(`${checkout}, ending on the ${receipt} receipt`, () => {
    test.beforeAll(async () => {
      await publish(checkout, receipt);
    });

    for (const market of MARKETS)
      for (const scripts of [true, false])
        test(`a purchase from ${market.prefix || "/"}, ${scripts ? "with" : "without"} scripts`, async ({
          browser,
          page,
        }) => {
          const done = await purchase(browser, page, market, scripts, checkout);
          await expectReceiptIn(done.page, market.words, receipt, done.email);
          if (receipt === "next-steps")
            // A guest's next step is an account (D101's `followUp`).
            await expect(
              done.page.locator('[data-slot="order-confirmation-follow-up"]:visible'),
            ).toHaveAttribute("data-kind", "register");
          await done.close();
        });
  });
}

test("the account's order screen draws the receipt's layout, without the thanks", async ({
  page,
}) => {
  const words = US.words;
  const auth = words.templates.auth;
  const customer = { email: `t86-account-${Date.now()}@example.com`, password: "t86-pass-1" };
  await test.step("a verified customer, signed in", async () => {
    await page.goto("/us/register");
    const form = page.locator('[data-slot="auth-register-form"]');
    await form.locator('input[name="email"]').fill(customer.email);
    await form.locator('input[name="password"]').fill(customer.password);
    await form.locator('input[name="firstName"]').fill("Grace");
    await form.locator('input[name="lastName"]').fill("Hopper");
    await form.getByRole("button", { name: auth.register.submit }).click();
    await expect(page).toHaveURL(/\/us\/verify$/);
    await page.goto(await mailedLink(customer.email, "customer-verification"));
    await expect(page.locator('[data-slot="auth-notice"]')).toHaveText(auth.login.notices.verified);
    const login = page.locator('[data-slot="auth-login"]');
    await login.locator('input[name="email"]').fill(customer.email);
    await login.locator('input[name="password"]').fill(customer.password);
    await login.getByRole("button", { name: auth.login.submit }).click();
    await expect(page).toHaveURL(/\/us\/account$/);
  });

  await publish("one-page", "next-steps");
  await addToCart(page, "/us");
  await page.goto("/us/checkout/contact");
  const receiptPath = await checkOutOnOnePage(page, US, customer.email);
  const orderId = orderIdOf(receiptPath);
  // The owner's next step is the order in the account.
  await expectReceiptIn(page, words, "next-steps", customer.email);
  await expect(page.locator('[data-slot="order-confirmation-follow-up"]:visible')).toHaveAttribute(
    "data-kind",
    "account-order",
  );
  await expect(page.locator('[data-slot="order-confirmation-follow-up"]:visible')).toHaveAttribute(
    "href",
    new RegExp(`/us/account/orders/${orderId}$`),
  );

  const screen = `/us/account/orders/${orderId}`;
  const drawn = async (variant: string) => {
    const html = await (await page.request.get(screen)).text();
    return variant === "default"
      ? !html.includes('data-slot="account-order-receipt"')
      : html.includes(`data-slot="account-order-receipt" data-variant="${variant}"`);
  };
  for (const variant of ["next-steps", "split", "compact", "statement"]) {
    await publish("default", variant, () => drawn(variant));
    await page.goto(screen);
    const root = page.locator('[data-slot="account-order-receipt"]:visible');
    await expect(root).toHaveAttribute("data-variant", variant);
    // The account's own heading (the order's number) and its column, not the receipt's thanks.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      words.templates.orderConfirmation.title,
    );
    await expect(page.locator('[data-slot="order-confirmation-number"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-slot="order-confirmation-continue"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-slot="order-confirmation-template"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-slot="account-nav"]:visible').first()).toBeVisible();
    await expect(root).toContainText(US.address["address1"] ?? "");
  }
  // `default` keeps M3's order screen.
  await publish("default", "default", () => drawn("default"));
  await page.goto(screen);
  await expect(page.locator('[data-slot="account-order-receipt"]:visible')).toHaveCount(0);
  await expect(page.locator('[data-slot="account-order-shipping"]:visible')).toBeVisible();
});
