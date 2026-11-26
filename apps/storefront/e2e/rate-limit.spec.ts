import type { Browser, Page } from "@playwright/test";
import { expect, test } from "./support/csp";
import { adminCredentials } from "./support/admin-credentials";
import { catalogs } from "./support/catalogs";
import { api } from "./support/payload-rest";
import { adminToken, base } from "./support/server";
import { freshVisitor, visitorHeaders } from "./support/visitor";

// M7 D142 (T108): the storefront's own limits at their real values, kept by Medusa's limiter
// through the signed route, against `next start` with `E2E_TEST_ROUTES=true`: each visitor here is
// an address of its own (`x-e2e-client-ip`, `support/visitor.ts`), so no other suite shares its
// buckets. A form's 11th sending in an hour and the newsletter's 6th are refused, with the wait in
// the market's language, with scripts and without; Payload's 11th sign-in in 15 minutes from one
// address is refused before the password is checked, and the account is not locked. Medusa's own
// limits are the backend's `rate-limit.spec.ts`; Medusa stopped is `outage.spec.ts`'s.

const stamp = Date.now().toString(36);
const { en, el } = catalogs;

/** "Too many attempts. Try again in N minutes." as a pattern, for any N, in `message`'s language. */
function waitPattern(message: string): RegExp {
  const at = message.indexOf("{minutes, plural");
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escape(message.slice(0, at))}\\d+ \\S+${escape(message.slice(message.lastIndexOf("}}") + 2))}$`,
  );
}

/** A context that is one visitor, with scripts or without. */
async function visitor(browser: Browser, javaScriptEnabled = true) {
  return browser.newContext({ javaScriptEnabled, extraHTTPHeaders: visitorHeaders() });
}

/** Fills the seeded contact form by its fields' names (its labels are each language's). */
async function fillContact(page: Page, email: string) {
  const form = page.locator("[data-slot=form-block]");
  await form.locator("input[name=name]").fill("Ann Example");
  await form.locator("input[name=email]").fill(email);
  await form.locator("select[name=topic]").selectOption("returns");
  await form.locator("textarea[name=message]").fill(`A question from ${email}.`);
  await form.locator("input[name=consent]").check();
  return form;
}

test.describe("the storefront's rate limits (T108)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);
  let token = "";
  let contact = 0;
  let pageId: number | undefined;
  const slug = { en: `e2e-limit-${stamp}`, el: `e2e-orio-${stamp}` };

  test.beforeAll(async () => {
    token = await adminToken();
    const forms = await api<{ docs: { id: number }[] }>(
      token,
      "GET",
      "/api/forms?where[seedKey][equals]=contact&limit=1&depth=0",
    );
    contact = forms.docs[0]?.id ?? 0;
    expect(contact, "the seeded contact form (seed-content)").toBeGreaterThan(0);
    // A page prerendered whole, so a post without scripts is answered in place (SETUP "Forms").
    const layout = [
      { blockType: "formBlock", variant: "standard", heading: "Write", form: contact },
    ];
    const created = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      title: `Limits ${stamp}`,
      slug: slug.en,
      layout,
      _status: "published",
    });
    pageId = created.doc.id;
    const saved = await api<{ layout: unknown }>(
      token,
      "GET",
      `/api/pages/${pageId}?locale=en&depth=0`,
    );
    await api(token, "PATCH", `/api/pages/${pageId}?locale=el`, {
      title: `Όρια ${stamp}`,
      slug: slug.el,
      layout: saved.layout,
      _status: "published",
    });
  });

  test.afterAll(async () => {
    if (pageId !== undefined)
      await api(token, "DELETE", `/api/pages/${pageId}`).catch(() => undefined);
    const { docs } = await api<{ docs: { id: number; submissionData: { value: string }[] }[] }>(
      token,
      "GET",
      `/api/form-submissions?where[form][equals]=${contact}&sort=-createdAt&limit=100&depth=0`,
    ).catch(() => ({ docs: [] }));
    for (const doc of docs)
      if (doc.submissionData.some((row) => row.value.includes(stamp)))
        await api(token, "DELETE", `/api/form-submissions/${doc.id}`).catch(() => undefined);
    await api(
      token,
      "DELETE",
      `/api/newsletter-confirmations?where[email][contains]=${stamp}`,
    ).catch(() => undefined);
  });

  test("refuses a form's 11th sending in an hour, with scripts, in English", async ({
    browser,
  }) => {
    const context = await visitor(browser);
    const page = await context.newPage();
    for (let n = 1; n <= 11; n += 1) {
      await page.goto(`/us/${slug.en}`);
      const form = await fillContact(page, `limit-js-${n}-${stamp}@example.com`);
      await form.locator("button[type=submit]").click();
      if (n <= 10) await expect(form.locator("[data-slot=form-block-status]")).not.toBeEmpty();
    }
    const alert = page.getByRole("alert");
    await expect(alert).toHaveAttribute("data-slot", "form-block-refusal");
    await expect(alert).toHaveText(waitPattern(en.sections.form.tooMany));
    // What was typed is kept.
    await expect(page.locator("input[name=email]")).toHaveValue(`limit-js-11-${stamp}@example.com`);
    // Another visitor is not this one.
    const second = await visitor(browser);
    const other = await second.newPage();
    await other.goto(`/us/${slug.en}`);
    const form = await fillContact(other, `limit-other-${stamp}@example.com`);
    await form.locator("button[type=submit]").click();
    await expect(form.locator("[data-slot=form-block-status]")).not.toBeEmpty();
    await expect(other.getByRole("alert")).toHaveCount(0);
    await second.close();
    await context.close();
  });

  test("refuses a form's 11th sending in an hour, without scripts, in Greek", async ({
    browser,
  }) => {
    const context = await visitor(browser, false);
    const page = await context.newPage();
    for (let n = 1; n <= 11; n += 1) {
      await page.goto(`/${slug.el}`);
      const form = await fillContact(page, `limit-nojs-${n}-${stamp}@example.com`);
      await form.locator("button[type=submit]").click();
      await page.waitForLoadState("load");
      if (n <= 10) await expect(page.getByRole("alert")).toHaveCount(0);
    }
    await expect(page.locator("[data-slot=form-block-refusal]")).toHaveText(
      waitPattern(el.sections.form.tooMany),
    );
    await context.close();
  });

  test("refuses the newsletter's 6th sign-up in an hour, with scripts, in Greek", async ({
    browser,
  }) => {
    const context = await visitor(browser);
    const page = await context.newPage();
    const footer = page.locator("footer [data-slot=newsletter-form]");
    for (let n = 1; n <= 6; n += 1) {
      await page.goto("/");
      await footer.locator("input[type=email]").fill(`news-js-${n}-${stamp}@example.com`);
      await footer.locator("button[type=submit]").click();
      if (n <= 5)
        await expect(footer.locator("[data-slot=newsletter-form-status]")).toContainText(
          el.molecules.newsletterForm.done,
        );
    }
    await expect(footer.locator("[data-slot=newsletter-form-refusal]")).toHaveText(
      waitPattern(el.molecules.newsletterForm.tooMany),
    );
    await expect(footer.locator("input[type=email]")).not.toHaveAttribute("aria-invalid", "true");
    await context.close();
  });

  test("refuses the newsletter's 6th sign-up in an hour, without scripts, in English", async ({
    browser,
  }) => {
    const context = await visitor(browser, false);
    const page = await context.newPage();
    const footer = page.locator("footer [data-slot=newsletter-form]");
    for (let n = 1; n <= 6; n += 1) {
      await page.goto("/us");
      await footer.locator("input[type=email]").fill(`news-nojs-${n}-${stamp}@example.com`);
      await footer.locator("button[type=submit]").click();
      await page.waitForLoadState("load");
      if (n <= 5)
        await expect(page.locator("footer [data-slot=newsletter-form-status]")).toContainText(
          en.molecules.newsletterForm.done,
        );
    }
    await expect(page.locator("footer [data-slot=newsletter-form-refusal]")).toHaveText(
      waitPattern(en.molecules.newsletterForm.tooMany),
    );
    await context.close();
  });

  test("refuses a third sign-up of one address in a day, whoever sends it", async ({ browser }) => {
    const email = `news-twice-${stamp}@example.com`;
    for (let n = 1; n <= 3; n += 1) {
      const context = await visitor(browser);
      const page = await context.newPage();
      await page.goto("/us");
      const footer = page.locator("footer [data-slot=newsletter-form]");
      await footer.locator("input[type=email]").fill(email);
      await footer.locator("button[type=submit]").click();
      await expect(
        footer.locator(
          n <= 2 ? "[data-slot=newsletter-form-status]" : "[data-slot=newsletter-form-refusal]",
        ),
      ).not.toBeEmpty();
      if (n === 3)
        await expect(footer.locator("[data-slot=newsletter-form-refusal]")).toHaveText(
          waitPattern(en.molecules.newsletterForm.tooMany),
        );
      await context.close();
    }
  });

  test("refuses Payload's 11th sign-in in 15 minutes from one address, before the password, and locks nothing", async () => {
    const { email, password } = adminCredentials();
    const address = freshVisitor();
    const login = (secret: string, from = address) =>
      fetch(`${base()}/api/users/login`, {
        method: "POST",
        headers: { "content-type": "application/json", ...visitorHeaders(from) },
        body: JSON.stringify({ email, password: secret }),
      });
    for (let n = 1; n <= 10; n += 1)
      expect((await login(password)).status, `sign-in ${n}`).toBe(200);
    const refused = await login(password);
    expect(refused.status).toBe(429);
    expect(await refused.text()).toMatch(/Too many attempts\. Try again in \d+ minutes?\./);
    // A wrong password is refused the same: Payload never checks it, so its lockout counts nothing.
    expect((await login("not-the-password")).status).toBe(429);
    // Another address signs in: the account is not locked.
    expect((await login(password, freshVisitor())).status).toBe(200);
  });
});
