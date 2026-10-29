import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";
import { adminToken, base } from "./support/server";

// T67 (D81): the forms an editor builds in the admin, posted to the shop's server action. The
// seeded "Contact" form in a `formBlock` on T59's test page (`/us/e2e-cms/[slug]`,
// `E2E_TEST_ROUTES=true`), and the footer's newsletter (the seeded "Newsletter", T67's footer seed)
// on the US home. Each is sent with scripts and without, and the submission is read back through
// the REST API as the bootstrap admin. The REST `create` is closed (403, even for an admin), a
// filled spam trap answers "thank you" and stores nothing, and an e-mail the server refuses is
// marked on its field. The page and the submissions are deleted afterwards.

const stamp = Date.now().toString(36);
const slug = `e2e-forms-${stamp}`;
const en = catalogs.en;
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The seeded contact form's confirmation (`payload/seed/forms.ts`). */
const CONFIRMATION = "Thank you for writing. We will answer within one working day.";

const headers = (token: string) => ({
  Authorization: `JWT ${token}`,
  Origin: new URL(base()).origin,
  "content-type": "application/json",
});

async function api<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    method,
    headers: headers(token),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw new Error(`${method} ${path} answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

type Submission = { id: number; submissionData: { field: string; value: string }[] };

/** The submissions to a form that hold `marker` in a field, newest first. */
async function submissionsWith(token: string, form: number, marker: string) {
  const { docs } = await api<{ docs: Submission[] }>(
    token,
    "GET",
    `/api/form-submissions?where[form][equals]=${form}&sort=-createdAt&limit=200&depth=0`,
  );
  return docs
    .filter((doc) => doc.submissionData.some((row) => row.value.includes(marker)))
    .map((doc) => ({
      id: doc.id,
      submissionData: doc.submissionData.map(({ field, value }) => ({ field, value })),
    }));
}

/** A seeded form's id, found by its `seedKey`. */
async function seededForm(token: string, key: string): Promise<number> {
  const { docs } = await api<{ docs: { id: number }[] }>(
    token,
    "GET",
    `/api/forms?where[seedKey][equals]=${key}&limit=1&depth=0`,
  );
  const id = docs[0]?.id;
  if (id === undefined) throw new Error(`no seeded "${key}" form: run seed-content first`);
  return id;
}

/** Fills the contact form; `email` is the marker the submission is found by. */
async function fillContact(page: Page, email: string) {
  const form = page.locator("[data-slot=form-block]");
  await form.getByLabel("Your name").fill("Ann Example");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel(/What is it about/).selectOption("returns");
  await form.getByLabel("Your message").fill(`A question from ${email}.`);
  await form.getByLabel(/I agree/).check();
  return form;
}

/** Fills the hidden spam trap the way a bot does: straight into the DOM. */
const fillTrap = (page: Page, selector: string) =>
  page.locator(`${selector} input[name=website]`).evaluate((input: HTMLInputElement) => {
    input.value = "https://spam.example";
  });

async function withoutScripts<T>(browser: Browser, run: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    return await run(await context.newPage());
  } finally {
    await context.close();
  }
}

test.describe("the forms (T67)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  let contact = 0;
  let newsletter = 0;
  let pageId: number | undefined;
  const url = () => `/us/e2e-cms/${slug}`;

  test.beforeAll(async () => {
    token = await adminToken();
    contact = await seededForm(token, "contact");
    newsletter = await seededForm(token, "newsletter");
    const created = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      title: `Forms ${stamp}`,
      slug,
      layout: [
        {
          blockType: "formBlock",
          variant: "standard",
          heading: "Write to us",
          intro: "We answer within a day.",
          form: contact,
        },
      ],
      _status: "published",
    });
    pageId = created.doc.id;
  });

  test.afterAll(async () => {
    if (pageId !== undefined)
      await api(token, "DELETE", `/api/pages/${pageId}`).catch(() => undefined);
    for (const form of [contact, newsletter]) {
      for (const doc of await submissionsWith(token, form, stamp).catch(() => []))
        await api(token, "DELETE", `/api/form-submissions/${doc.id}`).catch(() => undefined);
    }
  });

  test("closes the REST create: POST /api/form-submissions answers 403, for an admin too", async () => {
    const body = JSON.stringify({
      form: contact,
      submissionData: [{ field: "email", value: `rest-${stamp}@example.com` }],
    });
    const anonymous = await fetch(`${base()}/api/form-submissions`, {
      method: "POST",
      headers: { "content-type": "application/json", Origin: new URL(base()).origin },
      body,
    });
    expect(anonymous.status).toBe(403);
    const admin = await fetch(`${base()}/api/form-submissions`, {
      method: "POST",
      headers: headers(token),
      body,
    });
    expect(admin.status).toBe(403);
    expect(await submissionsWith(token, contact, `rest-${stamp}`)).toHaveLength(0);
  });

  test("sends the contact form with scripts, and stores it once, as the form's fields", async ({
    page,
  }) => {
    await page.goto(url());
    const email = `js-${stamp}@example.com`;
    const form = await fillContact(page, email);
    await expect(form.locator("[data-slot=form-block-message]")).toContainText(
      "Please do not send card numbers",
    );
    const violations = (await new AxeBuilder({ page }).withTags(axeTags).include("main").analyze())
      .violations;
    expect(violations.map((violation) => violation.id)).toEqual([]);
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(form.locator("[data-slot=form-block-status]")).toContainText(CONFIRMATION);
    const stored = await submissionsWith(token, contact, email);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.submissionData).toEqual([
      { field: "name", value: "Ann Example" },
      { field: "email", value: email },
      { field: "topic", value: "returns" },
      { field: "order", value: "" },
      { field: "message", value: `A question from ${email}.` },
      { field: "consent", value: "true" },
    ]);
  });

  test("sends the contact form without scripts: stored once, the page back at the form", async ({
    browser,
  }) => {
    // The test page is per request (`connection()`), so Next 16.4.3 resumes its prerendered shell
    // and draws no answer (React's resume takes no action state; SETUP.md "Forms (T67)"). T65's
    // CMS pages are prerendered whole and answer in place, as the footer's newsletter on home does
    // below.
    const email = `nojs-${stamp}@example.com`;
    await withoutScripts(browser, async (page) => {
      await page.goto(url());
      const form = await fillContact(page, email);
      await form.getByRole("button", { name: "Send message" }).click();
      await page.waitForLoadState("load");
      expect(new URL(page.url()).pathname).toBe(url());
      expect(new URL(page.url()).hash).toMatch(/^#form-/);
    });
    expect(await submissionsWith(token, contact, email)).toHaveLength(1);
  });

  test("marks an e-mail the server refuses on its field, keeping what was typed", async ({
    page,
  }) => {
    await page.goto(url());
    const marker = `refused-${stamp}`;
    const form = await fillContact(page, `${marker}@`);
    // Past the browser's own check, as a client that skips it would post.
    await form.evaluate((element: HTMLFormElement) => element.setAttribute("novalidate", ""));
    await form.getByRole("button", { name: "Send message" }).click();
    const email = form.getByLabel("Email address");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription(en.sections.form.errors.email);
    await expect(email).toHaveValue(`${marker}@`);
    await expect(form.getByLabel("Your name")).toHaveValue("Ann Example");
    await expect(form.locator("[data-slot=form-block-status]")).toContainText(
      en.sections.form.invalid,
    );
    expect(await submissionsWith(token, contact, marker)).toHaveLength(0);
  });

  test("answers a filled spam trap with thanks, with scripts and without, and stores nothing", async ({
    page,
    browser,
  }) => {
    const marker = `trap-${stamp}`;
    await page.goto(url());
    const form = await fillContact(page, `${marker}-js@example.com`);
    await fillTrap(page, "[data-slot=form-block]");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(form.locator("[data-slot=form-block-status]")).toContainText(CONFIRMATION);
    await withoutScripts(browser, async (noScripts) => {
      await noScripts.goto("/us");
      const footer = noScripts.locator("footer [data-slot=newsletter-form]");
      await footer.getByLabel(en.molecules.newsletterForm.emailLabel).fill(`${marker}@example.com`);
      await fillTrap(noScripts, "footer");
      await footer.getByRole("button", { name: en.molecules.newsletterForm.submit }).click();
      await noScripts.waitForLoadState("load");
      await expect(noScripts.locator("footer [data-slot=newsletter-form-status]")).toContainText(
        en.molecules.newsletterForm.done,
      );
    });
    expect(await submissionsWith(token, contact, marker)).toHaveLength(0);
    expect(await submissionsWith(token, newsletter, marker)).toHaveLength(0);
  });

  test("subscribes from the footer's newsletter, with scripts and without", async ({
    page,
    browser,
  }) => {
    await page.goto("/us");
    const footer = page.locator("footer [data-slot=newsletter-form]");
    await expect(
      footer.getByRole("link", { name: en.molecules.newsletterForm.privacyLink }),
    ).toHaveAttribute("href", "/us/privacy");
    const withJs = `footer-js-${stamp}@example.com`;
    await footer.getByLabel(en.molecules.newsletterForm.emailLabel).fill(withJs);
    await footer.getByRole("button", { name: en.molecules.newsletterForm.submit }).click();
    await expect(footer.locator("[data-slot=newsletter-form-status]")).toContainText(
      en.molecules.newsletterForm.done,
    );
    // Without scripts, from the cart (a page with a per-visitor part): the post goes to the market's
    // home, prerendered whole, which answers in its footer.
    const noJs = `footer-nojs-${stamp}@example.com`;
    await withoutScripts(browser, async (noScripts) => {
      await noScripts.goto("/us/cart");
      const form = noScripts.locator("footer [data-slot=newsletter-form]");
      await form.getByLabel(en.molecules.newsletterForm.emailLabel).fill(noJs);
      await form.getByRole("button", { name: en.molecules.newsletterForm.submit }).click();
      await noScripts.waitForLoadState("load");
      expect(noScripts.url()).toBe(`${new URL("/us", noScripts.url()).href}#footer-newsletter`);
      await expect(noScripts.locator("footer [data-slot=newsletter-form-status]")).toContainText(
        en.molecules.newsletterForm.done,
      );
    });
    for (const email of [withJs, noJs]) {
      const stored = await submissionsWith(token, newsletter, email);
      expect(stored.map((doc) => doc.submissionData)).toEqual([[{ field: "email", value: email }]]);
    }
  });
});
