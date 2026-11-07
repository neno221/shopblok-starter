import { expect, test } from "@playwright/test";
import { appEnv } from "./support/app-env";
import { catalogs } from "./support/catalogs";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./support/medusa-admin";
import { api, syncedId } from "./support/payload-rest";
import { variantPath } from "./support/purchase";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T87 (D104): a product's, a category's or a collection's own sections, or the `templates`
// global's, after the product's information or the listing's results. Against `next start` with
// the demo catalog and the seed: a product's own FAQ shows in `/` and `/us` by the second request
// (its texts are English only, so `/` shows them through the English fallback, D73); another product
// shows the global's default `uspBar` (the seed's, in the market's language); `none` shows neither;
// a category's sections follow its results; a sync of the product, and the reconcile, keep them;
// the integration cannot write them; and while a section's island is still loading, the rest of the
// page works (PR 127 review, item 2), and a form placed in the sections can be sent (item 1).

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now();
/** Its own sections (and `none` after); no other spec writes it. */
const OWN = "demo-dotted-notebook";
/** The `templates` global's default sections. */
const DEFAULT = "demo-linen-shorts";
const CATEGORY = "home";
const QUESTION = `Is the notebook's paper acid-free? ${stamp}`;
const CATEGORY_QUESTION = `Can I return homeware? ${stamp}`;
/** The seed's default product sections: one `uspBar`, the shop's three promises (`site.ts`). */
const PROMISES = {
  en: ["Fast delivery", "Free returns", "Secure checkout"],
  el: ["Γρήγορη αποστολή", "Δωρεάν επιστροφές", "Ασφαλής πληρωμή"],
};

const integration = () => `integrations API-Key ${appEnv("backend", "PAYLOAD_API_KEY")}`;

let token = "";
let productId = 0;
let categoryId = 0;

/** The HTML of a page, from Node, as a crawler gets it. */
const html = async (path: string) => (await fetch(`${base()}${encodeURI(path)}`)).text();
/** The product page's sections: from their slot to the reviews, or `null` with no slot. */
function productSections(page: string): string | null {
  const from = page.indexOf('data-slot="product-detail-sections"');
  if (from < 0) return null;
  const to = page.indexOf('data-slot="reviews-section"', from);
  return page.slice(from, to < 0 ? undefined : to);
}
const seenWithinTwo = (shows: () => Promise<boolean>) => freshWithinTwo(shows, 1_500);

const faq = (heading: string, question: string) => ({
  blockType: "faq",
  heading,
  items: [{ question, answer: "Yes, and it lies flat." }],
});

type Stored = { sectionsMode?: string; sections?: { blockType: string }[]; syncedAt?: string };
const stored = (collection: "products" | "categories", id: number) =>
  api<Stored>(token, "GET", `/api/${collection}/${id}?depth=0&locale=en`);

test.beforeAll(async () => {
  token = await adminToken();
  productId = await syncedId("products", OWN);
  categoryId = await syncedId("categories", CATEGORY);
});

test.afterAll(async () => {
  const quietly = (call: Promise<unknown>) => call.catch(() => undefined);
  await quietly(
    api(token, "PATCH", `/api/products/${productId}?locale=en`, {
      sectionsMode: "default",
      sections: [],
    }),
  );
  await quietly(
    api(token, "PATCH", `/api/categories/${categoryId}?locale=en`, {
      sectionsMode: "default",
      sections: [],
    }),
  );
});

test("a product without its own sections shows the templates global's uspBar, in the market's language", async () => {
  await settled(`/us/products/${DEFAULT}`);
  for (const [path, words] of [
    [`/us/products/${DEFAULT}`, PROMISES.en],
    [`/products/${DEFAULT}`, PROMISES.el],
  ] as const) {
    const sections = productSections(await html(path));
    expect(sections, `${path} has the default sections (the seed's uspBar)`).not.toBeNull();
    expect(sections?.match(/data-slot="usp-item"/g) ?? []).toHaveLength(3);
    for (const word of words) expect(sections, path).toContain(word);
  }
});

test("a product's own FAQ shows on its page in / and /us by the second request, in place of the default", async () => {
  // A save first, so both pages are drawn again by this server and its reads are in its cache: a
  // page built by `next build` has none of them in memory, and its next drawing would read the
  // sections afresh whatever their tags (the mutation in SETUP.md would pass unseen).
  await api(token, "PATCH", `/api/products/${productId}?locale=en`, { sectionsMode: "default" });
  for (const path of [`/us/products/${OWN}`, `/products/${OWN}`]) {
    await fetch(`${base()}${path}`).then((answer) => answer.text());
    await settled(path);
  }
  // Before: the default sections, as on every product.
  expect(productSections(await html(`/us/products/${OWN}`))).toContain(PROMISES.en[0]);

  await api(token, "PATCH", `/api/products/${productId}?locale=en`, {
    sectionsMode: "own",
    sections: [faq("About the paper", QUESTION)],
  });
  for (const path of [`/us/products/${OWN}`, `/products/${OWN}`]) {
    const shows = async () => (productSections(await html(path)) ?? "").includes(QUESTION);
    expect(await seenWithinTwo(shows), path).toBeGreaterThan(0);
    const sections = productSections(await html(path)) ?? "";
    expect(sections).toContain('data-slot="faq-item"');
    // Its own sections replace the default ones; they do not add to them.
    expect(sections).not.toContain('data-slot="usp-item"');
  }
  // The FAQ's JSON-LD is on the page with it.
  expect(await html(`/us/products/${OWN}`)).toContain('"@type":"FAQPage"');
  // The other products keep the default.
  expect(productSections(await html(`/us/products/${DEFAULT}`))).not.toContain(QUESTION);
});

test("the integration cannot write a product's sections", async () => {
  const before = await stored("products", productId);
  expect(before.sectionsMode).toBe("own");
  const answer = await fetch(`${base()}/api/products/${productId}?locale=en`, {
    method: "PATCH",
    headers: { authorization: integration(), origin: base(), "content-type": "application/json" },
    body: JSON.stringify({ sectionsMode: "none", sections: [] }),
  });
  await answer.text();
  // Payload drops the fields the integration may not write and keeps the rest of the document.
  const after = await stored("products", productId);
  expect(after.sectionsMode).toBe("own");
  expect(after.sections?.map((block) => block.blockType)).toEqual(["faq"]);
});

test("a sync of the product from Medusa, and the reconcile, keep its sections", async () => {
  const medusa = medusaUrl();
  const medusaToken = await medusaAdminToken(medusa);
  const medusaApi = <T>(method: string, path: string, body?: unknown) =>
    medusaAdminApi<T>(medusa, medusaToken, method, path, body);
  const { products } = await medusaApi<{ products: { id: string; subtitle: string | null }[] }>(
    "GET",
    `/admin/products?handle=${OWN}&fields=id,subtitle`,
  );
  const product = products[0];
  if (product === undefined) throw new Error(`Medusa has no product ${OWN}`);
  const { syncedAt } = await stored("products", productId);
  try {
    // A change in Medusa: the sync writes the document again.
    await medusaApi("POST", `/admin/products/${product.id}`, { subtitle: `Synced ${stamp}` });
    await expect
      .poll(async () => (await stored("products", productId)).syncedAt, { timeout: 10_000 })
      .not.toBe(syncedAt);
    // And every document at once (Settings → Payload's "Sync now").
    await medusaApi("POST", "/admin/payload/sync");
  } finally {
    await medusaApi("POST", `/admin/products/${product.id}`, { subtitle: product.subtitle });
  }
  const after = await stored("products", productId);
  expect(after.sectionsMode).toBe("own");
  expect(after.sections?.map((block) => block.blockType)).toEqual(["faq"]);
  const shows = async () =>
    (productSections(await html(`/us/products/${OWN}`)) ?? "").includes(QUESTION);
  expect(await seenWithinTwo(shows)).toBeGreaterThan(0);
});

test("the page works while a section's island loads, and a form in the sections can be sent", async ({
  page,
}) => {
  const en = catalogs.en.molecules.newsletterForm;
  const { docs } = await api<{ docs: { id: number }[] }>(
    token,
    "GET",
    "/api/forms?where[seedKey][equals]=newsletter&limit=1&depth=0",
  );
  const form = docs[0]?.id;
  if (form === undefined) throw new Error('no seeded "newsletter" form: run seed-content first');
  await settled(`/us/products/${OWN}`);
  // A form on no page: only the product's sections place it (`loadPlacedForms`).
  await api(token, "PATCH", `/api/products/${productId}?locale=en`, {
    sectionsMode: "own",
    sections: [{ blockType: "newsletter", form, privacy: { type: "custom", url: "/privacy" } }],
  });
  const shows = async () =>
    (productSections(await html(`/us/products/${OWN}`)) ?? "").includes(
      'data-slot="newsletter-form"',
    );
  expect(await seenWithinTwo(shows)).toBeGreaterThan(0);

  // The newsletter island's module (its chunk has the island's `displayName`) is held back.
  let release = () => {};
  const released = new Promise<void>((done) => (release = done));
  const held: string[] = [];
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    const answer = await route.fetch();
    const body = await answer.text();
    if (body.includes("shopblok:newsletter-section-island")) {
      held.push(route.request().url());
      await released;
    }
    await route.fulfill({ status: answer.status(), contentType: "text/javascript", body });
  });
  await page.goto(await variantPath(page, "/us", OWN));
  await expect.poll(() => held.length, { message: "the island's chunk is asked for" }).toBe(1);
  const sections = page.locator('[data-slot="product-detail-sections"]');
  // The island keeps the server's HTML, and the page around it is hydrated: the buy box adds, the
  // header's count follows, and the header's cart opens the drawer rather than the cart page.
  await expect(sections.locator('[data-slot="newsletter-form"]')).toBeVisible();
  const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
  await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
  await box.locator('[data-slot="buy-box-add"]').click();
  await expect(page.locator('[data-slot="quick-cart"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText("1");
  await page.locator('header a[data-slot="cart-button"]').click();
  const drawer = page.locator('[data-slot="cart-drawer"]');
  await expect(drawer).toBeVisible();
  await expect(page).not.toHaveURL(/\/cart$/);
  await expect(drawer.locator('[data-slot="cart-line-item"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  expect(held).toHaveLength(1);

  // Once the module is in, the form in the sections is sent and accepted.
  release();
  const signup = sections.locator('[data-slot="newsletter-form"]');
  const email = `sections-${stamp}@example.com`;
  await signup.getByLabel(en.emailLabel).fill(email);
  await signup.getByRole("button", { name: en.submit }).click();
  await expect(signup.locator("[data-slot=newsletter-form-status]")).toContainText(en.done);
  const { docs: sent } = await api<{
    docs: { id: number; submissionData: { value: string }[] }[];
  }>(token, "GET", `/api/form-submissions?where[form][equals]=${form}&sort=-createdAt&limit=50`);
  const mine = sent.filter((doc) => doc.submissionData.some((row) => row.value === email));
  expect(mine).toHaveLength(1);
  for (const doc of mine) await api(token, "DELETE", `/api/form-submissions/${doc.id}`);
});

test("a product set to none shows neither its own sections nor the default", async () => {
  await settled(`/us/products/${OWN}`);
  await api(token, "PATCH", `/api/products/${productId}?locale=en`, { sectionsMode: "none" });
  const gone = async () => productSections(await html(`/us/products/${OWN}`)) === null;
  expect(await seenWithinTwo(gone)).toBeGreaterThan(0);
  const page = await html(`/us/products/${OWN}`);
  expect(page).not.toContain(QUESTION);
  expect(page).not.toContain('data-slot="usp-item"');
  // Its own sections are kept, for when it shows them again.
  expect((await stored("products", productId)).sections).toHaveLength(1);
});

test("a category's own sections show after its results", async () => {
  const path = `/us/categories/${CATEGORY}`;
  await settled(path);
  // The listing pages' default sections are empty in the seed: the page has none.
  expect(await html(path)).not.toContain('data-slot="product-listing-sections"');
  await api(token, "PATCH", `/api/categories/${categoryId}?locale=en`, {
    sectionsMode: "own",
    sections: [faq("Questions", CATEGORY_QUESTION)],
  });
  const shows = async () => (await html(path)).includes(CATEGORY_QUESTION);
  expect(await seenWithinTwo(shows)).toBeGreaterThan(0);
  const page = await html(path);
  const results = page.indexOf('data-slot="product-listing-region"');
  const sections = page.indexOf('data-slot="product-listing-sections"');
  expect(results).toBeGreaterThan(-1);
  expect(sections).toBeGreaterThan(results);
  expect(page.indexOf(CATEGORY_QUESTION)).toBeGreaterThan(sections);
  // The category's products are still listed before them (none assumed by name: their order varies).
  expect(page.slice(results, sections)).toMatch(/href="\/us\/products\/demo-/);
  // A sibling listing keeps none.
  expect(await html("/us/categories/accessories")).not.toContain(CATEGORY_QUESTION);
});
