import { expect, test, type BrowserContext, type Frame, type Page } from "@playwright/test";
import { catalogs } from "../support/catalogs";
import { skipWithoutKeys } from "../support/integration-keys";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "../support/medusa-admin";
import { add, fillContact, orderIdOf, type AddressInput, type Words } from "../support/purchase";

// M6 D117, D118 (T100): Stripe in the checkout, live, with Stripe's test keys (`STRIPE_API_KEY`,
// `STRIPE_WEBHOOK_SECRET` in the backend, `NEXT_PUBLIC_STRIPE_KEY` in the storefront; skipped,
// naming them, without). Stripe's test cards and test pages only: `4242…` in `/` (EUR) and `/us`
// (USD) to the receipt; the 3-D Secure card through its challenge; a declined card back on the
// delivery step with Stripe's reason, which takes focus; Revolut Pay through Stripe's test page and
// `/api/payment-return`; a cart changed in another tab, and a promotion applied there, while the
// shopper is on the review page, each paid at the new total (Medusa deleted the session, the review's
// action made a new one); and the payment authorised at the order and captured when it ships
// (Medusa's Admin API). The webhook is not needed: the shopper comes back to the return route.

skipWithoutKeys(test, "stripe");
test.describe.configure({ timeout: 180_000 });

const CY = { prefix: "", words: catalogs.el };
const US = { prefix: "/us", words: catalogs.en };
const CY_ADDRESS: AddressInput = {
  firstName: "Μαρία",
  lastName: "Γεωργίου",
  address1: "Λεωφόρος Μακαρίου 10",
  city: "Λευκωσία",
};
const US_ADDRESS: AddressInput = {
  firstName: "Grace",
  lastName: "Hopper",
  address1: "350 Fifth Avenue",
  city: "New York",
  province: "NY",
  postalCode: "10118",
};

const CARDS = {
  visa: "4242424242424242",
  threeDs: "4000002760003184",
  declined: "4000000000000002",
} as const;

/** The Payment Element's frame, once it has drawn its tabs. */
function element(page: Page) {
  return page.frameLocator('[data-slot="payment-element"] iframe').first();
}

/** The contact step from the cart: the e-mail and the address, then on to the delivery step. */
async function contact(page: Page, prefix: string, words: Words, address: AddressInput) {
  await page.goto(`${prefix}/checkout/contact`);
  await fillContact(page, words, `stripe-${Date.now()}@example.com`, address);
  await page.getByRole("button", { name: words.templates.checkout.contact.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/delivery$/);
}

/** The delivery step with a card typed into the Element: on to the review. */
async function payWithCard(page: Page, words: Words, card: string) {
  await page
    .locator('[data-slot="checkout-shipping"]:visible input[type="radio"]')
    .first()
    .check({ force: true });
  await expect(page.getByText(words.organisms.paymentStep.stripeName).first()).toBeVisible();
  const frame = element(page);
  await frame.locator('input[name="number"]').fill(card, { timeout: 60_000 });
  await frame.locator('input[name="expiry"]').fill("12 / 34");
  await frame.locator('input[name="cvc"]').fill("123");
  const zip = frame.locator('input[name="postalCode"]');
  if (await zip.isVisible().catch(() => false)) await zip.fill("10118");
  await page.getByRole("button", { name: words.organisms.paymentStep.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/review$/, { timeout: 60_000 });
}

const place = (page: Page, words: Words) =>
  page.getByRole("button", { name: words.templates.checkout.review.place }).click();

/** Waits for the receipt and answers the order's id. */
async function receipt(page: Page, words: Words): Promise<string> {
  await expect(page).toHaveURL(/\/order\/order_[^/]+\/confirmed$/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    words.templates.orderConfirmation.title,
  );
  return orderIdOf(new URL(page.url()).pathname);
}

type AdminOrder = {
  id: string;
  total: number;
  payment_collections: {
    payments: { amount: number; provider_id: string; captured_at: string | null }[];
  }[];
  items: { id: string; quantity: number }[];
};

async function adminOrder(id: string): Promise<AdminOrder> {
  const medusa = medusaUrl();
  const { order } = await medusaAdminApi<{ order: AdminOrder }>(
    medusa,
    await medusaAdminToken(medusa),
    "GET",
    `/admin/orders/${id}?fields=id,total,*items,*payment_collections,*payment_collections.payments`,
  );
  return order;
}

/** The order is paid with Stripe at its own total, authorised and not captured (D118). */
async function expectAuthorised(id: string): Promise<AdminOrder> {
  const order = await adminOrder(id);
  const payments = order.payment_collections.flatMap((collection) => collection.payments);
  expect(payments).toHaveLength(1);
  expect(payments[0]).toMatchObject({ provider_id: "pp_stripe_stripe", captured_at: null });
  expect(payments[0]?.amount).toBe(order.total);
  return order;
}

/** A frame of Stripe's 3-D Secure test page with `name`'s button, pressed. */
async function answerChallenge(page: Page, name: RegExp) {
  await expect
    .poll(
      async () => {
        for (const frame of page.frames() as Frame[]) {
          const button = frame.getByRole("button", { name });
          if ((await button.count().catch(() => 0)) > 0) {
            await button.first().click();
            return true;
          }
        }
        return false;
      },
      { timeout: 60_000 },
    )
    .toBe(true);
}

test("a card in / (EUR) and /us (USD) to the receipt, authorised and captured when it ships", async ({
  page,
}) => {
  for (const market of [CY, US]) {
    await add(page, market.prefix);
    await contact(page, market.prefix, market.words, market === CY ? CY_ADDRESS : US_ADDRESS);
    await payWithCard(page, market.words, CARDS.visa);
    // The review's payment line: the brand and the last four, from the token's preview.
    await expect(page.locator('[data-slot="checkout-review"]:visible')).toContainText("4242");
    await place(page, market.words);
    const id = await receipt(page, market.words);
    await expect(page.getByRole("main")).toContainText("4242");
    const order = await expectAuthorised(id);
    if (market !== US) continue;

    // D118: captured when it ships (`capture-on-shipment`), through Medusa's Admin API.
    const medusa = medusaUrl();
    const token = await medusaAdminToken(medusa);
    const items = order.items.map((item) => ({ id: item.id, quantity: item.quantity }));
    const { order: fulfilled } = await medusaAdminApi<{
      order: { fulfillments: { id: string }[] };
    }>(medusa, token, "POST", `/admin/orders/${id}/fulfillments?fields=*fulfillments`, { items });
    const fulfillment = fulfilled.fulfillments.at(-1)?.id ?? "";
    await medusaAdminApi(
      medusa,
      token,
      "POST",
      `/admin/orders/${id}/fulfillments/${fulfillment}/shipments`,
      { items },
    );
    await expect
      .poll(
        async () =>
          (await adminOrder(id)).payment_collections.flatMap((c) => c.payments)[0]?.captured_at ??
          null,
        { timeout: 60_000 },
      )
      .not.toBeNull();
  }
});

test("the 3-D Secure card through its challenge", async ({ page }) => {
  await add(page, CY.prefix);
  await contact(page, CY.prefix, CY.words, CY_ADDRESS);
  await payWithCard(page, CY.words, CARDS.threeDs);
  await place(page, CY.words);
  await answerChallenge(page, /complete/i);
  await expectAuthorised(await receipt(page, CY.words));
});

test("a declined card comes back to the payment with Stripe's reason, which takes focus", async ({
  page,
}) => {
  await add(page, US.prefix);
  await contact(page, US.prefix, US.words, US_ADDRESS);
  await payWithCard(page, US.words, CARDS.declined);
  await place(page, US.words);
  await expect(page).toHaveURL(/\/checkout\/delivery\?f=[^#]+#main-payment-error$/, {
    timeout: 60_000,
  });
  const error = page.locator("#main-payment-error");
  await expect(error).toContainText(/declined/i);
  await expect(error).toBeFocused();
  // Paying again with a good card works from here.
  await payWithCard(page, US.words, CARDS.visa);
  await place(page, US.words);
  await expectAuthorised(await receipt(page, US.words));
});

test("Revolut Pay through Stripe's test page and the return route", async ({ page }) => {
  await add(page, CY.prefix);
  await contact(page, CY.prefix, CY.words, CY_ADDRESS);
  await page
    .locator('[data-slot="checkout-shipping"]:visible input[type="radio"]')
    .first()
    .check({ force: true });
  await element(page)
    .getByRole("tab", { name: /revolut/i })
    .click({ timeout: 60_000 });
  await page.getByRole("button", { name: CY.words.organisms.paymentStep.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/review$/, { timeout: 60_000 });
  await expect(page.locator('[data-slot="checkout-review"]:visible')).toContainText("Revolut Pay");
  await place(page, CY.words);
  // Stripe's test page for a redirect method: authorise, and Stripe sends the shopper back.
  await expect(page).toHaveURL(/stripe\.com/, { timeout: 60_000 });
  await page
    .getByRole("link", { name: /authorize/i })
    .or(page.getByRole("button", { name: /authorize/i }))
    .first()
    .click();
  const id = await receipt(page, CY.words);
  await expect(page.getByRole("main")).toContainText("Revolut Pay");
  await expectAuthorised(id);
});

/** A second tab of the same visitor (the cart cookie), on the cart page. */
async function otherTab(context: BrowserContext, prefix: string): Promise<Page> {
  const tab = await context.newPage();
  await tab.goto(`${prefix}/cart`);
  await expect(tab.locator('[data-slot="cart-line-item"]:visible')).toHaveCount(1);
  return tab;
}

test("a cart changed in another tab on the review page pays the new total", async ({
  page,
  context,
}) => {
  await add(page, US.prefix);
  await contact(page, US.prefix, US.words, US_ADDRESS);
  await payWithCard(page, US.words, CARDS.visa);
  const tab = await otherTab(context, US.prefix);
  const line = tab.locator('[data-slot="cart-line-item"]:visible');
  // The stepper sends its form by itself once the page has hydrated.
  await tab.waitForLoadState("networkidle");
  await line.getByRole("button", { name: /^Increase quantity/ }).click();
  await expect(tab.locator('h1 [data-slot="cart-count"]')).toHaveText("2 items");
  await tab.close();
  await page.reload();
  // Medusa deleted the Stripe session when the total moved; the review still shows the token's card
  // (PR 140's review, item 2), not "Pay later".
  await expect(page.locator('[data-slot="checkout-review"]:visible')).toContainText("4242");
  await place(page, US.words);
  const order = await expectAuthorised(await receipt(page, US.words));
  expect(order.items[0]?.quantity).toBe(2);
});

test("a promotion applied on the review page's cart is paid at the new total", async ({
  page,
  context,
}) => {
  const medusa = medusaUrl();
  const token = await medusaAdminToken(medusa);
  const code = `T100${Date.now()}`;
  const { promotion } = await medusaAdminApi<{ promotion: { id: string } }>(
    medusa,
    token,
    "POST",
    "/admin/promotions",
    {
      code,
      type: "standard",
      status: "active",
      is_automatic: false,
      application_method: {
        type: "percentage",
        target_type: "order",
        allocation: "across",
        value: 10,
      },
    },
  );
  try {
    await add(page, US.prefix);
    await contact(page, US.prefix, US.words, US_ADDRESS);
    await payWithCard(page, US.words, CARDS.visa);
    const tab = await otherTab(context, US.prefix);
    const summary = tab.locator('[data-slot="cart-summary"]:visible');
    await summary.getByText(US.words.molecules.promoCodeField.toggle).click();
    await summary.getByLabel(US.words.molecules.promoCodeField.label).fill(code);
    await summary.getByRole("button", { name: US.words.molecules.promoCodeField.apply }).click();
    await expect(summary.locator('[data-slot="promo-code-chip"]')).toContainText(code);
    await tab.close();
    await page.reload();
    await expect(page.locator('[data-slot="checkout-review"]:visible')).toContainText("4242");
    await place(page, US.words);
    const id = await receipt(page, US.words);
    const { order } = await medusaAdminApi<{ order: { discount_total: number } }>(
      medusa,
      token,
      "GET",
      `/admin/orders/${id}?fields=discount_total`,
    );
    expect(order.discount_total).toBeGreaterThan(0);
    await expectAuthorised(id);
  } finally {
    await medusaAdminApi(medusa, token, "DELETE", `/admin/promotions/${promotion.id}`);
  }
});
