import { readFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";

// T53 (D64, SPEC §8.2): the account in `/us`, against `next start` and the seeded Medusa, whose
// e-mails the local notification provider prints in its log (`E2E_MEDUSA_LOG`: CI's
// `$RUNNER_TEMP/servers/medusa.log`). One customer goes the whole way: registers, is refused while
// the address is unverified (no session cookie, the account still asks to sign in), opens the
// verification link, signs in (the customer is created) and sees the dashboard; saves an address
// and finds it filled in at the checkout; places an order; signs out; resets the password and signs
// in with the new one; claims an order placed as a guest with the same address, which the e-mailed
// link accepts. A second customer then asks for the first one's order page and return form by id
// and gets the not-found page (SPEC §11.1: the ownership check, not Medusa, refuses: the Store API answers any
// order by id). The specs share Medusa, so every address is new.

const en = catalogs.en;
const auth = en.templates.auth;
const PREFIX = "/us";
const HANDLE = "demo-heritage-hoodie";
const ADDRESS = {
  firstName: "Ada",
  lastName: "Lovelace",
  address1: `${Date.now() % 10000} Market Street`,
  city: "San Francisco",
  province: "CA",
  postalCode: "94103",
};
const JWT_COOKIE = "_medusa_jwt";

test.describe.configure({ mode: "serial", timeout: 240_000 });

/** The last link Medusa's log shows for `to` with `template`, waiting for it to be printed. */
async function mailedLink(to: string, template: string, after = 0): Promise<string> {
  const file = process.env["E2E_MEDUSA_LOG"];
  if (!file) throw new Error("E2E_MEDUSA_LOG is not set: it is the log of the Medusa under test.");
  let found: string[] = [];
  await expect
    .poll(
      () => {
        const pattern = new RegExp(
          `notification to: '${to.replace(/[.+]/g, "\\$&")}' on the channel: 'email' with template: '${template}' and data: '(.*)'$`,
          "gm",
        );
        found = [...readFileSync(file, "utf8").matchAll(pattern)].map(
          (match) => (JSON.parse(match[1] ?? "{}") as { url?: string }).url ?? "",
        );
        return found.length;
      },
      { timeout: 30_000, message: `${template} to ${to} in ${file}` },
    )
    .toBeGreaterThan(after);
  const url = new URL(found.at(-1) ?? "");
  // The link names STOREFRONT_URL's origin; the page is opened on the server under test.
  return url.pathname + url.search;
}

/** How many links of `template` went to `to` so far. */
function mailedCount(to: string, template: string): number {
  const file = process.env["E2E_MEDUSA_LOG"] ?? "";
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.includes(`to: '${to}'`) && line.includes(`template: '${template}'`))
    .length;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  const form = page.locator('[data-slot="auth-login"]');
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.getByRole("button", { name: auth.login.submit }).click();
}

async function register(page: Page, email: string, password: string, name: string) {
  await page.goto(`${PREFIX}/register`);
  const form = page.locator('[data-slot="auth-register-form"]');
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.locator('input[name="firstName"]').fill(name);
  await form.locator('input[name="lastName"]').fill("Tester");
  await form.getByRole("button", { name: auth.register.submit }).click();
  await expect(page).toHaveURL(new RegExp(`${PREFIX}/verify$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(auth.checkEmail.title);
}

/** Registers, verifies and signs in: a customer with a session, on the dashboard. */
async function newCustomer(page: Page, email: string, password: string, name: string) {
  await register(page, email, password, name);
  await page.goto(await mailedLink(email, "customer-verification"));
  await expect(page.locator('[data-slot="auth-notice"]')).toHaveText(auth.login.notices.verified);
  await signIn(page, email, password);
  await expect(page).toHaveURL(new RegExp(`${PREFIX}/account$`));
}

/** The product's first variant's URL in `/us`, from the page's JSON-LD (as catalog.spec.ts does). */
async function variantPath(page: Page): Promise<string> {
  const html = await (await page.request.get(`${PREFIX}/products/${HANDLE}`)).text();
  const text = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1] ?? "";
  const graph = (
    JSON.parse(text) as { "@graph": { "@type": string; offers?: { url: string }[] }[] }
  )["@graph"];
  const url = graph.find((node) => node["@type"] === "Product")?.offers?.[0]?.url;
  if (url === undefined) throw new Error("the product has no offer");
  const parsed = new URL(url);
  return parsed.pathname + parsed.search;
}

async function addToCart(page: Page): Promise<void> {
  await page.goto(await variantPath(page));
  const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
  await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
  await box.locator('[data-slot="buy-box-add"]').click();
  await expect(page.locator('[data-slot="quick-cart"]')).toBeVisible();
  await page.keyboard.press("Escape");
}

/** The contact step (already filled or filled here) to the receipt; answers the order's id. */
async function checkOut(page: Page, email?: string): Promise<string> {
  await page.goto(`${PREFIX}/checkout/contact`);
  const form = page.locator('[data-slot="address-form"]:visible');
  if (email !== undefined) {
    await page.getByLabel(en.templates.checkout.contact.email, { exact: true }).fill(email);
    for (const [name, value] of Object.entries(ADDRESS))
      await form.locator(`input[name="${name}"]`).fill(value);
  }
  await page.getByRole("button", { name: en.templates.checkout.contact.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/delivery$/);
  await page
    .locator('[data-slot="checkout-shipping"]:visible input[type="radio"]')
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: en.organisms.paymentStep.submit }).click();
  await expect(page).toHaveURL(/\/checkout\/review$/);
  await page.getByRole("button", { name: en.templates.checkout.review.place }).click();
  await expect(page).toHaveURL(/\/order\/order_[^/]+\/confirmed$/);
  return /\/order\/([^/]+)\/confirmed/.exec(page.url())?.[1] ?? "";
}

const hasSession = async (context: BrowserContext) =>
  (await context.cookies()).some((cookie) => cookie.name === JWT_COOKIE);

const stamp = Date.now();
const first = { email: `t53-a-${stamp}@example.com`, password: "first-pass-1" };
const second = { email: `t53-b-${stamp}@example.com`, password: "second-pass-2" };
let orderId = "";

test("register, refused until verified, verify, sign in, address at the checkout, order, sign out, reset, claim a guest order", async ({
  browser,
  context,
  page,
}) => {
  // A guest order first, with the address the account will have: Medusa puts a checkout with a
  // registered customer's e-mail straight into that account (`findOrCreateCustomerStep`), so only an
  // order placed before the account exists is one to claim.
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  let guestOrder = "";
  let guestNumber = "";
  await test.step("a guest order, before the account exists", async () => {
    await addToCart(guestPage);
    guestOrder = await checkOut(guestPage, first.email);
    guestNumber = (
      await guestPage.locator('[data-slot="order-confirmation-number"]:visible').innerText()
    ).replace(/\D/g, "");
  });

  await test.step("register: the e-mail to check", async () => {
    await register(page, first.email, first.password, "Ada");
  });

  await test.step("an unverified sign-in is refused: no session, the account asks to sign in", async () => {
    await page.goto(`${PREFIX}/login`);
    await signIn(page, first.email, first.password);
    await expect(page).toHaveURL(new RegExp(`${PREFIX}/verify$`));
    expect(await hasSession(context)).toBe(false);
    await page.goto(`${PREFIX}/account`);
    await expect(page.locator('[data-slot="auth-notice"]')).toHaveText(
      auth.login.notices["sign-in-required"],
    );
  });

  await test.step("the verification link, then the sign-in creates the customer", async () => {
    await page.goto(await mailedLink(first.email, "customer-verification"));
    await expect(page.locator('[data-slot="auth-notice"]')).toHaveText(auth.login.notices.verified);
    await expect(page.locator('[data-slot="auth-login"] input[name="email"]')).toHaveValue(
      first.email,
    );
    await signIn(page, first.email, first.password);
    await expect(page).toHaveURL(new RegExp(`${PREFIX}/account$`));
    expect(await hasSession(context)).toBe(true);
    await expect(page.locator('[data-slot="account-screen"]')).toContainText(first.email);
  });

  await test.step("a saved address fills the checkout in", async () => {
    await page.goto(`${PREFIX}/account/addresses/new`);
    const form = page.locator('[data-slot="address-form"]:visible');
    for (const [name, value] of Object.entries(ADDRESS))
      await form.locator(`input[name="${name}"]`).fill(value);
    await form.getByRole("button", { name: en.molecules.addressForm.submit }).click();
    await expect(page).toHaveURL(new RegExp(`${PREFIX}/account/addresses$`));
    await expect(page.getByRole("main")).toContainText(ADDRESS.address1);
    await addToCart(page);
    await page.goto(`${PREFIX}/checkout/contact`);
    await expect(page.getByLabel(en.templates.checkout.contact.email, { exact: true })).toHaveValue(
      first.email,
    );
    await expect(
      page.locator('[data-slot="address-form"]:visible input[name="address1"]'),
    ).toHaveValue(ADDRESS.address1);
    orderId = await checkOut(page);
    await page.goto(`${PREFIX}/account/orders`);
    await expect(page.locator(`a[href$="/account/orders/${orderId}"]`).first()).toBeVisible();
  });

  await test.step("sign out", async () => {
    await page.goto(`${PREFIX}/account`);
    await page.locator('[data-slot="account-nav-sign-out"]').first().click();
    await expect(page).toHaveURL(new RegExp(`${PREFIX}/login\\?notice=signed-out$`));
    expect(await hasSession(context)).toBe(false);
  });

  await test.step("reset the password and sign in with the new one", async () => {
    const before = mailedCount(first.email, "customer-password-reset");
    await page.goto(`${PREFIX}/forgot-password`);
    const form = page.locator('[data-slot="auth-forgot-form"]');
    await form.locator('input[name="email"]').fill(first.email);
    await form.getByRole("button").click();
    await expect(page.locator('[data-slot="auth-sent"]')).toBeVisible();
    await page.goto(await mailedLink(first.email, "customer-password-reset", before));
    const reset = page.locator('[data-slot="auth-reset-form"]');
    first.password = "first-pass-new";
    await reset.locator('input[name="password"]').fill(first.password);
    await reset.getByRole("button").click();
    await expect(page.locator('[data-slot="auth-notice"]')).toHaveText(
      auth.login.notices["password-reset"],
    );
    await signIn(page, first.email, first.password);
    await expect(page).toHaveURL(new RegExp(`${PREFIX}/account$`));
  });

  await test.step("claim the order placed as a guest; its e-mail's link accepts", async () => {
    await page.goto(`${PREFIX}/order/lookup`);
    const form = page.locator('[data-slot="order-lookup-form"]');
    await form.locator('input[name="number"]').fill(guestNumber);
    await form.locator('input[name="email"]').fill(first.email.toUpperCase());
    await form.getByRole("button").click();
    await expect(page.locator('[data-slot="order-lookup-sent"]')).toBeVisible();

    // The link goes to the order's address; whoever holds it answers, signed in or not.
    await guestPage.goto(await mailedLink(first.email, "order-transfer-request"));
    await guestPage
      .locator('[data-slot="order-transfer-form"]')
      .getByRole("button", { name: en.templates.orderLookup.transfer.accept })
      .click();
    await expect(guestPage.locator('[data-slot="order-transfer-done"]')).toHaveText(
      en.templates.orderLookup.done.accepted,
    );
    await guest.close();

    await page.goto(`${PREFIX}/account/orders`);
    await expect(page.locator(`a[href$="/account/orders/${guestOrder}"]`).first()).toBeVisible();
  });
});

test("another customer's order is the not-found page, its page and its return form", async ({
  context,
  page,
}) => {
  expect(orderId).not.toBe("");
  await newCustomer(page, second.email, second.password, "Grace");
  for (const path of [`/account/orders/${orderId}`, `/account/returns/${orderId}`]) {
    // Next answers a page's `notFound()` with a 200 whose document the browser draws from the
    // payload (checkout-cy.spec.ts), so both are checked: the HTML carries neither the order's
    // e-mail nor its address, and the browser shows the not-found page.
    const html = await (await context.request.get(`${PREFIX}${path}`)).text();
    expect(html, path).not.toContain(first.email);
    expect(html, path).not.toContain(ADDRESS.address1);
    await page.goto(`${PREFIX}${path}`);
    await expect(page.locator('[data-slot="not-found-template"]:visible')).toHaveCount(1);
  }
  // Their own account is still theirs.
  await page.goto(`${PREFIX}/account`);
  await expect(page.locator('[data-slot="account-screen"]')).toContainText(second.email);
});

test("without scripts: the account asks to sign in, the sign-in goes back to it, and the sign-out", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${PREFIX}/account/profile`);
  await expect(page.locator('[data-slot="auth-notice"]')).toHaveText(
    auth.login.notices["sign-in-required"],
  );
  await signIn(page, second.email, second.password);
  await expect(page).toHaveURL(new RegExp(`${PREFIX}/account/profile$`));
  await expect(page.locator('[data-slot="account-profile-email"]')).toContainText(second.email);
  await page.locator('[data-slot="account-nav-sign-out"]').first().click();
  await expect(page).toHaveURL(new RegExp(`${PREFIX}/login\\?notice=signed-out$`));
  expect(await hasSession(context)).toBe(false);
  await context.close();
});
