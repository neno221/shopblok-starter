import { expect, test, type FrameLocator, type Locator, type Page } from "@playwright/test";
import { catalogs } from "../support/catalogs";
import { publishGlobal, snapshotGlobal, type GlobalData } from "../support/globals";
import { skipWithoutKeys } from "../support/integration-keys";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "../support/medusa-admin";
import { add, fillContact, orderIdOf, withoutScripts } from "../support/purchase";
import { adminToken, freshWithinTwo } from "../support/server";

// M6 D120 (T102, SETUP.md "Express checkout (T102)"): Stripe's Express Checkout Element in the
// `express-rail` checkout's rail, live, with Stripe's test keys (skipped, naming them, without).
// Headless Chromium over HTTP shows only Link (Apple Pay and Google Pay need HTTPS and a wallet:
// W8's), so the spec pays with Link's sandbox: a new e-mail each run signs up (a test phone,
// Stripe's sandbox passcode 000000 and the `4242…` card), the wallet's address goes through the
// cart's actions (the shipping option and its price come from Medusa), and the payment ends on the
// receipt through `/api/payment-return`, authorised and not captured (D118). The rail is drawn only
// with `express-rail` and only once the Element has a wallet to show; without scripts it is hidden.
// A shopper who only looks (the wallet's address entered, the sheet closed) keeps the contact step
// they had done: the cart's address is written back (PR 141 review, item 1).
// `afterAll` publishes the templates global as it was, in every language.

skipWithoutKeys(test, "stripe");
test.describe.configure({ mode: "serial", timeout: 240_000 });

const words = catalogs.el;

/** Every picker on its family's first member (M4's shop), but the checkout's. */
const templatesWith = (checkout: string): GlobalData => ({
  productPage: { variant: "default" },
  listing: { variant: "default", card: "standard" },
  quickView: { variant: "off" },
  cart: { variant: "default", miniCart: "drawer", quickCart: "dropdown" },
  checkout: { variant: checkout },
  receipt: { variant: "default" },
});

let token = "";
let published: GlobalData | undefined;

/** Publishes the checkout's layout and waits until the contact step draws it. */
async function useLayout(page: Page, layout: string) {
  await publishGlobal(token, "templates", templatesWith(layout));
  expect(
    await freshWithinTwo(async () => {
      await page.goto("/checkout/contact");
      return (await page.locator(`[data-variant="${layout}"]`).count()) > 0;
    }),
    `the ${layout} layout within two requests`,
  ).toBeGreaterThan(0);
}

test.beforeAll(async () => {
  token = await adminToken();
  published = await snapshotGlobal(token, "templates");
});

test.afterAll(async () => {
  if (published !== undefined) await publishGlobal(token, "templates", published, "all");
});

const island = (page: Page) => page.locator('[data-slot="express-checkout"]');
const rail = (page: Page) => page.locator('[data-slot="checkout-express"]');

test("the rail draws the Express Checkout Element with express-rail, and nothing without it", async ({
  page,
  browser,
}) => {
  await add(page, "");
  await useLayout(page, "express-rail");
  await page.goto("/checkout/contact");
  await expect(island(page)).toHaveAttribute("data-express", "shown", { timeout: 60_000 });
  await expect(rail(page)).toBeVisible();
  await expect(rail(page).getByRole("heading")).toHaveText(words.templates.checkout.express.title);
  // What the Element shows here, recorded for SETUP: Link (no HTTPS, no wallet on the machine);
  // never Revolut Pay, which the Express Checkout Element does not offer (the Payment Element does).
  const methods = (await island(page).getAttribute("data-methods")) ?? "";
  test.info().annotations.push({ type: "express methods", description: methods });
  expect(methods.split(" ")).toContain("link");
  expect(methods).not.toMatch(/revolut/i);

  // Without scripts the Element cannot load: the rail stays hidden, and the form is the way to pay.
  const plain = await withoutScripts(browser, page.context());
  const noScript = await plain.newPage();
  await noScript.goto("/checkout/contact");
  await expect(noScript.locator('[data-variant="express-rail"]')).toHaveCount(1);
  await expect(noScript.locator('[data-slot="express-checkout"]')).toHaveCount(1);
  await expect(noScript.locator('[data-slot="checkout-express"]')).toBeHidden();
  await plain.close();

  // The default layout has no rail.
  await useLayout(page, "default");
  await page.goto("/checkout/contact");
  await expect(page.locator('[data-variant="default"]')).toHaveCount(1);
  await expect(rail(page)).toHaveCount(0);
  await expect(island(page)).toHaveCount(0);
});

/** Link's sign-up modal, which opens over the page when its button is pressed. */
const linkModal = (page: Page): FrameLocator =>
  page.frameLocator('iframe[src*="universal-link-modal-inner"]');

/**
 * Types `digits` into one of Link's card fields until it holds them (spaces and the slash aside):
 * the fields format as they go and move focus on, and a key typed meanwhile can be lost.
 */
async function typeInto(field: Locator, digits: string) {
  await expect(field).toBeVisible({ timeout: 30_000 });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await field.fill("");
    await field.pressSequentially(digits, { delay: 40 });
    if ((await field.inputValue()).replace(/\D/g, "") === digits) return;
  }
  expect((await field.inputValue()).replace(/\D/g, "")).toBe(digits);
}

/** The modal's last button ("Continue", or "Pay" on its summary), once it can be pressed. */
async function next(modal: FrameLocator) {
  const button = modal.getByRole("button", { name: /./ }).last();
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
}

/**
 * Opens Link's sheet from the rail and signs a new e-mail up (a test phone, the sandbox passcode),
 * up to Link's shipping address form: answers the modal.
 */
async function openLink(page: Page, email: string): Promise<FrameLocator> {
  await page
    .frameLocator('[data-slot="express-checkout"] iframe')
    .first()
    .getByRole("button")
    .first()
    .click();
  const modal = linkModal(page);
  await modal.locator("input").first().fill(email, { timeout: 30_000 });
  await next(modal);
  // A new Link account: a test phone, then Stripe's sandbox passcode.
  await modal.locator('input[type="tel"]').fill("2015550123", { timeout: 30_000 });
  await next(modal);
  await modal
    .locator('input[name="search-codeControllingInput"]')
    .fill("000000", { timeout: 30_000 });
  return modal;
}

/** Link's shipping address form, filled with a Nicosia address under `name`. */
async function fillLinkAddress(modal: FrameLocator, name: string, street: string) {
  const country = modal.locator('select[name="country"]');
  await expect(country).toBeVisible({ timeout: 30_000 });
  await modal.locator('input[name="name"]').fill(name);
  await country.selectOption("CY");
  await modal.locator('input[name="addressLine1"]').fill(street);
  await modal.locator('input[name="postalCode"]').fill("1065");
  await modal.locator('input[name="locality"]').fill("Nicosia");
}

test("closing Link's sheet without paying keeps the contact step the shopper had done", async ({
  page,
}) => {
  await add(page, "");
  await useLayout(page, "express-rail");
  await page.goto("/checkout/contact");
  await expect(island(page)).toHaveAttribute("data-express", "shown", { timeout: 60_000 });
  const street = "Odos Lidras 5";
  await fillContact(page, words, `looker-${Date.now()}@example.com`, {
    firstName: "Eleni",
    lastName: "Constantinou",
    address1: street,
    postalCode: "1010",
    city: "Nicosia",
  });
  await page.getByRole("button", { name: words.templates.checkout.contact.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/delivery$/);

  // Back on the contact step ("Edit"), the wallet opened: its address goes through the cart.
  await page.goto("/checkout/contact");
  await expect(island(page)).toHaveAttribute("data-express", "shown", { timeout: 60_000 });
  const modal = await openLink(page, `express-look-${Date.now()}@example.com`);
  await fillLinkAddress(modal, "Wallet Person", "Leoforos Makariou 10");
  await next(modal);
  // The wallet's address is the cart's now (Medusa's shipping in the page's summary)...
  await expect(page.locator('[data-slot="order-summary"]').first()).toContainText("6,00", {
    timeout: 30_000,
  });
  // ...and closing the sheet (Link's own close button, on its card form) writes the cart's own
  // back: the Element's `cancel`, one action.
  await expect(modal.locator('input[name="cardNumber"]')).toBeVisible({ timeout: 30_000 });
  const restored = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/checkout/contact",
    { timeout: 30_000 },
  );
  await modal.locator('[data-testid="ulm-header-close-button"]:visible').first().click();
  expect((await restored).ok()).toBe(true);
  // The delivery step opens again (a cart without a name or a street draws the contact step).
  await expect
    .poll(
      async () => {
        await page.goto("/checkout/delivery");
        return page.locator('[data-slot="checkout-shipping"]:visible').count();
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  await page.goto("/checkout/contact");
  const form = page.locator('[data-slot="address-form"]:visible');
  await expect(form.locator('input[name="address1"]')).toHaveValue(street);
  await expect(form.locator('input[name="firstName"]')).toHaveValue("Eleni");
});

test("a Link payment in / to the receipt: the wallet's address, the cart's option, authorised", async ({
  page,
}) => {
  await add(page, "");
  await useLayout(page, "express-rail");
  await page.goto("/checkout/contact");
  await expect(island(page)).toHaveAttribute("data-express", "shown", { timeout: 60_000 });
  const email = `express-${Date.now()}@example.com`;
  const modal = await openLink(page, email);

  // The wallet offers only the region's countries (D120: `allowedShippingCountries`).
  const country = modal.locator('select[name="country"]');
  await expect(country).toBeVisible({ timeout: 30_000 });
  const offered = await country
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter((value) => value !== ""),
    );
  expect(offered.sort()).toEqual(["CY", "DE", "FR"]);
  await fillLinkAddress(modal, "Maria Georgiou", "Leoforos Makariou 10");
  await next(modal);

  // The wallet's address went through the cart: Medusa's shipping is in the page's summary.
  await expect(page.locator('[data-slot="order-summary"]').first()).toContainText("6,00", {
    timeout: 30_000,
  });
  await typeInto(modal.locator('input[name="cardNumber"]'), "4242424242424242");
  await typeInto(modal.locator('input[name="cardExpiry"]'), "1234");
  await typeInto(modal.locator('input[name="cardCvc"]'), "123");
  // The card's billing country (Link guesses it from the network), and what Link asks for it.
  await modal.locator('select[name="billingAddress.country"]').selectOption("CY");
  const billingName = modal.locator('input[name="billingAddress.name"]');
  await expect(billingName).toBeVisible();
  await billingName.fill("Maria Georgiou");
  await next(modal);
  // Link's summary (the shop's option and total, the card), then "Pay".
  await expect(modal.locator("body")).toContainText("4242", { timeout: 30_000 });
  await next(modal);

  await expect(page).toHaveURL(/\/order\/order_[^/]+\/confirmed$/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    words.templates.orderConfirmation.title,
  );
  const main = page.getByRole("main");
  await expect(main).toContainText("Maria Georgiou");
  await expect(main).toContainText("Leoforos Makariou 10");
  await expect(main).toContainText(email);
  await expect(main).toContainText("Link");

  const id = orderIdOf(new URL(page.url()).pathname);
  const medusa = medusaUrl();
  const { order } = await medusaAdminApi<{
    order: {
      email: string;
      total: number;
      shipping_address: { first_name: string; last_name: string; country_code: string };
      shipping_methods: { name: string; amount: number }[];
      payment_collections: {
        payments: { amount: number; provider_id: string; captured_at: string | null }[];
      }[];
    };
  }>(
    medusa,
    await medusaAdminToken(medusa),
    "GET",
    `/admin/orders/${id}?fields=email,total,*shipping_address,*shipping_methods,*payment_collections,*payment_collections.payments`,
  );
  expect(order.email).toBe(email);
  expect(order.shipping_address).toMatchObject({
    first_name: "Maria",
    last_name: "Georgiou",
    country_code: "cy",
  });
  expect(order.shipping_methods).toHaveLength(1);
  const payments = order.payment_collections.flatMap((collection) => collection.payments);
  expect(payments).toHaveLength(1);
  expect(payments[0]).toMatchObject({ provider_id: "pp_stripe_stripe", captured_at: null });
  expect(payments[0]?.amount).toBe(order.total);
});
