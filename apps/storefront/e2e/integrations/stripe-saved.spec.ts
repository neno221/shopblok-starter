import type { Page } from "@playwright/test";
import { expect, test } from "../support/csp";
import { catalogs } from "../support/catalogs";
import { skipWithoutKeys } from "../support/integration-keys";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "../support/medusa-admin";
import {
  add,
  fillContact,
  orderIdOf,
  paymentElement,
  TEST_CARDS,
  typeTestCard,
  withoutScripts,
  type AddressInput,
  type Words,
} from "../support/purchase";

// M6 D119 (T101): saved payment methods, live, with Stripe's test keys (skipped, naming them,
// without). Each test registers its own customer through the storefront, at one of Resend's test
// addresses (`delivered+…@resend.dev`: with Resend on, Medusa sends there and no one is mailed),
// and opens the verification link Medusa's notification holds (the Admin API's notifications,
// whichever provider sent it). Then:
// - a card saved at checkout ("Save this card for next time"), listed in the account, a second
//   order paid with it from its saved radio (no card typed), and removed in the account (the
//   dialog);
// - a card added in the account (the Payment Element for a SetupIntent), and removed without
//   scripts (the page that asks, `remove/`);
// - the Revolut Pay try (M6 plan §0, 3a): saved at checkout in `/` (EUR), listed by its name, and
//   a second order paid with it, which Stripe's test page approves again (on-session reuse);
// Stripe's test cards and test pages only. The ownership checks (another customer's method, a
// guest's saving) are the backend's suite's (`integration-tests/http/payment-methods.spec.ts`).

skipWithoutKeys(test, "stripe");
test.describe.configure({ timeout: 240_000 });

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

/** Resend's test address with a label: Resend reports it delivered and mails no one. */
const testAddress = (label: string) =>
  `delivered+t101-${label}-${Date.now().toString(36)}@resend.dev`;

type Notification = { to: string; template: string; data: { url?: string } | null };

/** The newest verification link Medusa wrote for `email`, as a path on this storefront. */
async function verificationLink(email: string): Promise<string> {
  const medusa = medusaUrl();
  const token = await medusaAdminToken(medusa);
  const query = new URLSearchParams({ to: email, fields: "id,to,template,data" });
  let url = "";
  await expect
    .poll(
      async () => {
        const { notifications } = await medusaAdminApi<{ notifications: Notification[] }>(
          medusa,
          token,
          "GET",
          `/admin/notifications?${query}`,
        );
        url = notifications.find((n) => n.template === "customer-verification")?.data?.url ?? "";
        return url;
      },
      { timeout: 30_000, message: `the verification link for ${email}` },
    )
    .not.toBe("");
  const parsed = new URL(url);
  return parsed.pathname + parsed.search;
}

/** Registers in `/us`, verifies and signs in: a customer with a session, on the dashboard. */
async function newCustomer(page: Page, label: string): Promise<string> {
  const email = testAddress(label);
  const password = `Saved-${Date.now()}-pass`;
  const auth = US.words.templates.auth;
  await page.goto(`${US.prefix}/register`);
  const form = page.locator('[data-slot="auth-register-form"]');
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.locator('input[name="firstName"]').fill("Grace");
  await form.locator('input[name="lastName"]').fill("Hopper");
  await form.getByRole("button", { name: auth.register.submit }).click();
  await expect(page).toHaveURL(new RegExp(`${US.prefix}/verify$`));
  await page.goto(await verificationLink(email));
  await expect(page.locator('[data-slot="auth-notice"]')).toHaveText(auth.login.notices.verified);
  const login = page.locator('[data-slot="auth-login"]');
  await login.locator('input[name="email"]').fill(email);
  await login.locator('input[name="password"]').fill(password);
  await login.getByRole("button", { name: auth.login.submit }).click();
  await expect(page).toHaveURL(new RegExp(`${US.prefix}/account$`));
  return email;
}

/**
 * The page has loaded and its requests have settled. T103: with Stripe, PostHog and Sentry on in one
 * run, a contact page once never reached `networkidle` (1 run in 2; which request kept it busy was
 * not found) and the test waited out its four minutes there; so at most 15 s, then on.
 */
async function hydrated(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

/** The contact step from the cart (the signed-in customer's e-mail is filled in already). */
async function contact(page: Page, prefix: string, words: Words, address: AddressInput) {
  await page.goto(`${prefix}/checkout/contact`);
  // Typed once the page has hydrated (the signed-in customer's e-mail fills in on the server).
  await hydrated(page);
  await fillContact(page, words, undefined, address);
  await page.getByRole("button", { name: words.templates.checkout.contact.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/delivery$/);
  await page
    .locator('[data-slot="checkout-shipping"]:visible input[type="radio"]')
    .first()
    .check({ force: true });
}

/**
 * "Save this card for next time", ticked. Retried: after a tab in the Element, Stripe resizes its
 * frame, and a box scrolled to just before that can sit under the sticky header when the forced
 * click lands (T106's keyed runs, the Revolut Pay tab, 3 runs in 4).
 */
async function saveForLater(page: Page, words: Words) {
  const box = page.getByLabel(words.organisms.paymentStep.save, { exact: true });
  await expect(async () => {
    await box.check({ force: true, timeout: 5_000 });
  }).toPass({ timeout: 20_000 });
}

/** On to the review, then "Place order". */
async function review(page: Page, words: Words) {
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

/** Stripe's test page for a redirect method: authorise, and Stripe sends the shopper back. */
async function authorizeOnStripe(page: Page) {
  await expect(page).toHaveURL(/stripe\.com/, { timeout: 60_000 });
  await page
    .getByRole("link", { name: /authorize/i })
    .or(page.getByRole("button", { name: /authorize/i }))
    .first()
    .click();
}

/** The order is paid with Stripe at its own total, authorised (D118). */
async function expectAuthorised(id: string) {
  const medusa = medusaUrl();
  const { order } = await medusaAdminApi<{
    order: {
      total: number;
      payment_collections: { payments: { amount: number; provider_id: string }[] }[];
    };
  }>(
    medusa,
    await medusaAdminToken(medusa),
    "GET",
    `/admin/orders/${id}?fields=id,total,*payment_collections,*payment_collections.payments`,
  );
  const payments = order.payment_collections.flatMap((collection) => collection.payments);
  expect(payments).toHaveLength(1);
  expect(payments[0]).toMatchObject({ provider_id: "pp_stripe_stripe", amount: order.total });
}

const entries = (page: Page) => page.locator('[data-slot="payment-methods-manager-entry"]');

test("a card saved at checkout pays the second order from its saved radio, and is removed in the account", async ({
  page,
}) => {
  const { words, prefix } = US;
  await newCustomer(page, "checkout");
  await add(page, prefix);
  await contact(page, prefix, words, US_ADDRESS);
  await typeTestCard(page);
  await saveForLater(page, words);
  await review(page, words);
  await place(page, words);
  await expectAuthorised(await receipt(page, words));

  // The account lists it, from Stripe.
  await page.goto(`${prefix}/account/payment-methods`);
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page)).toContainText("4242");

  // The second order: the saved card's radio, nothing typed.
  await add(page, prefix);
  await contact(page, prefix, words, US_ADDRESS);
  const saved = page.getByRole("radio", { name: "Visa ending in 4242" });
  await saved.check({ force: true });
  await review(page, words);
  await expect(page.locator('[data-slot="checkout-review"]:visible')).toContainText("4242");
  await place(page, words);
  await expectAuthorised(await receipt(page, words));

  // Removed in the account, through the dialog.
  await page.goto(`${prefix}/account/payment-methods`);
  await hydrated(page);
  const card = words.molecules.savedPaymentMethodCard;
  await entries(page)
    .getByRole("button", { name: /Visa ending in 4242/ })
    .first()
    .click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: card.confirm }).click();
  await expect(page).toHaveURL(/\/account\/payment-methods\?removed=1$/);
  await expect(page.locator('[data-slot="account-payment-methods-status"]')).toHaveText(
    words.templates.account.paymentMethods.removed,
  );
  await expect(entries(page)).toHaveCount(0);
});

test("a card added in the account (setup mode), then removed without scripts", async ({
  page,
  browser,
  context,
}) => {
  const { words, prefix } = US;
  await newCustomer(page, "account");
  await page.goto(`${prefix}/account/payment-methods`);
  await page.getByRole("link", { name: words.organisms.paymentMethodsManager.add }).click();
  await expect(page).toHaveURL(/\/account\/payment-methods\/new$/);
  await typeTestCard(
    page,
    TEST_CARDS.visa,
    page.frameLocator('[data-slot="setup-element"] iframe').first(),
  );
  await page.getByRole("button", { name: words.templates.account.paymentMethods.submit }).click();
  await expect(page).toHaveURL(/\/account\/payment-methods\?added=1$/, { timeout: 60_000 });
  await expect(page.locator('[data-slot="account-payment-methods-status"]')).toHaveText(
    words.templates.account.paymentMethods.added,
  );
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page)).toContainText("4242");

  // Without scripts the remove button goes to the page that asks, whose form posts the same.
  const off = await withoutScripts(browser, context);
  try {
    const plain = await off.newPage();
    await plain.goto(`${prefix}/account/payment-methods`);
    const card = words.molecules.savedPaymentMethodCard;
    await plain.locator('[data-slot="saved-payment-method-remove"]').first().click();
    await expect(plain).toHaveURL(/\/account\/payment-methods\/remove\?paymentMethodId=pm_/);
    await expect(plain.getByRole("heading", { level: 1 })).toHaveText(card.confirmTitle);
    await plain
      .locator('[data-slot="account-payment-method-remove"]')
      .getByRole("button", { name: card.confirm })
      .click();
    await expect(plain).toHaveURL(/\/account\/payment-methods\?removed=1$/);
    await expect(plain.locator('[data-slot="payment-methods-manager-entry"]')).toHaveCount(0);
  } finally {
    await off.close();
  }
});

test("Revolut Pay saved at checkout in / (EUR) pays a second order after Stripe's approval", async ({
  page,
}) => {
  const { words, prefix } = CY;
  await newCustomer(page, "revolut");
  await add(page, prefix);
  await contact(page, prefix, words, CY_ADDRESS);
  await paymentElement(page)
    .getByRole("tab", { name: /revolut/i })
    .click({ timeout: 60_000 });
  await saveForLater(page, words);
  await review(page, words);
  await place(page, words);
  await authorizeOnStripe(page);
  await expectAuthorised(await receipt(page, words));

  await page.goto(`${prefix}/account/payment-methods`);
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page)).toContainText("Revolut Pay");

  // The second order with the saved account: Stripe asks for its approval again (on-session).
  await add(page, prefix);
  await contact(page, prefix, words, CY_ADDRESS);
  await page.locator('input[name="paymentMethod"][value^="pm_"]').first().check({ force: true });
  await review(page, words);
  await expect(page.locator('[data-slot="checkout-review"]:visible')).toContainText("Revolut Pay");
  await place(page, words);
  await authorizeOnStripe(page);
  await expectAuthorised(await receipt(page, words));
});
