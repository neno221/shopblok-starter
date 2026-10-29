import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";
import { publishGlobal } from "./support/globals";
import { rest } from "./support/payload-rest";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T65 (D80, D74): the editor's pages at their addresses, `{m}/[...slug]`, against a production
// build with the seeded content (`seed-content`).
//
// - A page under a parent answers at its parents' slugs and its own, in each market's language:
//   `/us/about-…/team-…` in English and `/σχετικά-…/ομάδα-…` in Greek (the primary market, at `/`),
//   with its breadcrumbs, its canonical and D80's hreflang, and no per-visitor value in the HTML.
// - A top-level slug that is a market's (`us`) or one of the shop's routes (`checkout`) is refused;
//   under a parent it is a plain segment. A page is not put under one of its own pages, and a page
//   with pages under it is not deleted.
// - A page that is not published is a 404, a real one (the status, before any stream).
// - `site-settings.homepage` decides what `{m}/` draws: the seeded Home (M3's sections as blocks),
//   another page once an editor names it.
// - The seeded "Contact" form, on a page, is sent without scripts and answers in place.
// - Live preview (D74): typing a title in the admin redraws the frame's heading within 3 s.
//
// Every page made here is deleted at the end, and the homepage is named again as it was.

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now().toString(36);
const about = { en: `about-${stamp}`, el: `σχετικά-${stamp}` };
const team = { en: `team-${stamp}`, el: `ομάδα-${stamp}` };
const TEAM_TITLE = { en: `Our team ${stamp}`, el: `Η ομάδα μας ${stamp}` };
/** The seeded contact form's confirmation (`payload/seed/forms.ts`). */
const CONFIRMATION = "Thank you for writing. We will answer within one working day.";

/** A path as the browser sends it: each segment percent-encoded. */
const encoded = (path: string) => path.split("/").map(encodeURIComponent).join("/");

let token = "";
const created: number[] = [];

/** A REST call as the bootstrap admin; returns the status and the parsed body. */
const api = <T>(method: string, path: string, body?: unknown) => rest<T>(token, method, path, body);

/** Creates a page in `locale` and returns its id; the test fails with Payload's answer otherwise. */
async function createPage(data: Record<string, unknown>, locale = "en"): Promise<number> {
  const answer = await api<{ doc: { id: number } }>("POST", `/api/pages?locale=${locale}`, data);
  expect(answer.status, answer.text).toBe(201);
  const id = answer.json().doc.id;
  created.push(id);
  return id;
}

/** Writes a page's fields in another language, published. */
async function translate(id: number, locale: string, data: Record<string, unknown>) {
  const answer = await api("PATCH", `/api/pages/${id}?locale=${locale}`, {
    ...data,
    _status: "published",
  });
  expect(answer.status, answer.text).toBe(200);
}

/** A GET from Node, no cookies, no redirects followed. */
const get = (path: string) => fetch(`${base()}${encoded(path)}`, { redirect: "manual" });

/** The site settings' homepage, by id (`depth=0`). */
async function homepageId(): Promise<number | null> {
  const answer = await api<{ homepage?: number | null }>(
    "GET",
    "/api/globals/site-settings?locale=en&depth=0",
  );
  expect(answer.status, answer.text).toBe(200);
  return answer.json().homepage ?? null;
}

let parentId = 0;
let childId = 0;
let homepage: number | null = null;

test.beforeAll(async () => {
  token = await adminToken();
  homepage = await homepageId();
  parentId = await createPage({ title: `About us ${stamp}`, slug: about.en, _status: "published" });
  await translate(parentId, "el", { title: `Σχετικά με εμάς ${stamp}`, slug: about.el });
  childId = await createPage({
    title: TEAM_TITLE.en,
    slug: team.en,
    parent: parentId,
    _status: "published",
  });
  await translate(childId, "el", { title: TEAM_TITLE.el, slug: team.el });
});

test.afterAll(async () => {
  if (homepage !== null)
    await publishGlobal(token, "site-settings", { homepage }).catch(() => undefined);
  // Children first: a parent with children keeps them pointing at a page that no longer exists.
  for (const id of created.reverse())
    await api("DELETE", `/api/pages/${id}`).catch(() => undefined);
});

test("a page under a parent answers at its address in English and in Greek", async () => {
  const us = await get(`/us/${about.en}/${team.en}`);
  expect(us.status).toBe(200);
  const html = await us.text();
  expect(html).toContain('<html lang="en-US"');
  expect(html).toMatch(new RegExp(`data-slot="cms-page-title"[^>]*>${TEAM_TITLE.en}</h1>`));
  // The breadcrumbs: Home, the parent, the page.
  const crumbs = /<nav[^>]*data-slot="breadcrumb"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
  expect(crumbs).toContain('href="/us"');
  expect(crumbs).toContain(`href="/us/${about.en}"`);
  expect(crumbs).toContain(`About us ${stamp}`);
  expect(crumbs).toContain(TEAM_TITLE.en);

  // Greek is the primary market's language: at `/`, with the Greek slugs.
  const cy = await get(`/${about.el}/${team.el}`);
  expect(cy.status).toBe(200);
  const greek = await cy.text();
  expect(greek).toContain('<html lang="el-CY"');
  expect(greek).toContain(`${TEAM_TITLE.el}</h1>`);
  // The English address is no Greek page.
  expect((await get(`/${about.en}/${team.en}`)).status).toBe(404);
  expect((await get(`/us/${about.el}/${team.el}`)).status).toBe(404);
});

test("the head names the page, its canonical, and its address in each market", async () => {
  const html = await (await get(`/us/${about.en}/${team.en}`)).text();
  expect(html).toContain(`<title>${TEAM_TITLE.en} | `);
  const origin = new URL(base()).origin;
  expect(html).toContain(`<link rel="canonical" href="${origin}/us/${about.en}/${team.en}"/>`);
  const hrefLang = (language: string) =>
    new RegExp(`<link rel="alternate" hrefLang="${language}" href="([^"]+)"/>`).exec(html)?.[1];
  expect(hrefLang("en-US")).toBe(`${origin}/us/${about.en}/${team.en}`);
  expect(hrefLang("el-CY")).toBe(`${origin}${encoded(`/${about.el}/${team.el}`)}`);
  // German has no slug of its own: its markets show the English one (`fallbackLocale`).
  expect(hrefLang("de-DE")).toBe(`${origin}/de/${about.en}/${team.en}`);
  expect(hrefLang("x-default")).toBe(`${origin}/us/${about.en}/${team.en}`);
});

test("the HTML holds no per-visitor value", async () => {
  const response = await get(`/us/${about.en}/${team.en}`);
  const html = await response.text();
  expect(html).toContain('data-slot="cart-button"');
  expect(html).not.toContain('data-slot="cart-badge"');
  expect(response.headers.getSetCookie(), "a page sets no cookie").toEqual([]);
  expect(response.headers.get("cache-control") ?? "").not.toContain("private");
});

test("a market's or a route's slug is refused at the top level, and allowed under a parent", async () => {
  for (const slug of ["us", "checkout"]) {
    const answer = await api("POST", "/api/pages?locale=en", {
      title: `Refused ${slug} ${stamp}`,
      slug,
      _status: "published",
    });
    expect(answer.status, `"${slug}" at the top level`).toBe(400);
    expect(answer.text).toContain(slug === "us" ? "Two letters" : "shop's own addresses");
  }
  await createPage({
    title: `Allowed us ${stamp}`,
    slug: "us",
    parent: parentId,
    _status: "published",
  });
  expect((await get(`/us/${about.en}/us`)).status).toBe(200);
});

test("a page is not put under one of its own pages, nor deleted with pages under it", async () => {
  // PR 98 review, items 5 and 2: the parent picker's filter is no guard, and deleting a parent
  // would move its pages to the top level unchecked.
  const loop = await api("PATCH", `/api/pages/${parentId}?locale=en`, {
    parent: childId,
    _status: "published",
  });
  expect(loop.status, loop.text).toBe(400);
  expect(loop.text).toContain("under itself or one of the pages under it");
  const deleted = await api("DELETE", `/api/pages/${parentId}`);
  expect(deleted.status, deleted.text).toBe(400);
  expect(deleted.text).toMatch(/under it: move/);
  expect((await get(`/us/${about.en}/${team.en}`)).status, "both still answer").toBe(200);
});

test("a page that is not published is a 404, with the status", async () => {
  const slug = `e2e-draft-${stamp}`;
  await createPage({ title: `Draft ${stamp}`, slug, _status: "draft" });
  const response = await get(`/us/${slug}`);
  // A `notFound()` after the shell streamed would be a 200 with a 404 page inside it.
  expect(response.status).toBe(404);
  expect(await response.text()).not.toContain(`Draft ${stamp}`);
});

test("the seeded home draws M3's sections as blocks, in M3's order", async () => {
  const html = await (await get("/us")).text();
  const order = ["hero-section", "category-showcase-section", "product-collection-section"].map(
    (slot) => html.indexOf(`data-slot="${slot}"`),
  );
  expect(
    order.every((at) => at > 0),
    "each section is drawn",
  ).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  expect(html).toMatch(/<h1 data-slot="hero-heading"/);
  // The hero's picture loads: an upload is linked by its path, which `/_next/image` takes (an
  // absolute URL on the shop's own host was a 400 there, and a failed page in `next dev`).
  const picture = /<img[^>]*data-slot="hero-image"[^>]*srcSet="([^" ]+)/
    .exec(html)?.[1]
    ?.replaceAll("&amp;", "&");
  expect(picture, "the hero's picture").toMatch(/^\/_next\/image\?url=%2Fapi%2Fmedia%2F/);
  const loaded = await fetch(`${base()}${picture}`);
  expect(loaded.status, "the hero's picture loads").toBe(200);
  expect(loaded.headers.get("content-type")).toMatch(/^image\//);
  // The homepage's canonical is the market's home, not the page's own address.
  expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/us"\/>/);
});

test("the homepage follows site-settings.homepage", async () => {
  expect(homepage, "the seed names the Home (seed-content)").not.toBeNull();
  await settled("/us");
  await publishGlobal(token, "site-settings", { homepage: childId });
  const shows = (title: string) => async () =>
    (await (await get("/us")).text()).includes(`${title}</h1>`);
  expect(await freshWithinTwo(shows(TEAM_TITLE.en), 1_500)).toBeGreaterThan(0);
  // As the homepage, it has no breadcrumbs: it is the market's home.
  expect(await (await get("/us")).text()).not.toContain('data-slot="breadcrumb"');

  await settled("/us");
  await publishGlobal(token, "site-settings", { homepage });
  const seeded = async () => (await (await get("/us")).text()).includes('data-slot="hero-section"');
  expect(await freshWithinTwo(seeded, 1_500)).toBeGreaterThan(0);
});

async function withoutScripts<T>(browser: Browser, run: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    return await run(await context.newPage());
  } finally {
    await context.close();
  }
}

test("the seeded contact form, on a page, is sent without scripts and answers in place", async ({
  browser,
}) => {
  const forms = await api<{ docs: { id: number }[] }>(
    "GET",
    "/api/forms?where[seedKey][equals]=contact&limit=1&depth=0",
  );
  const contact = forms.json().docs[0]?.id;
  expect(contact, "the seeded contact form (seed-content)").toBeDefined();
  const slug = `e2e-contact-${stamp}`;
  await createPage({
    title: `Contact ${stamp}`,
    slug,
    layout: [
      { blockType: "formBlock", variant: "standard", heading: "Write to us", form: contact },
    ],
    _status: "published",
  });
  const email = `pages-nojs-${stamp}@example.com`;
  await withoutScripts(browser, async (page) => {
    await page.goto(`/us/${slug}`);
    const form = page.locator("[data-slot=form-block]");
    await form.getByLabel("Your name").fill("Ann Example");
    await form.getByLabel("Email address").fill(email);
    await form.getByLabel(/What is it about/).selectOption("returns");
    await form.getByLabel("Your message").fill(`A question from ${email}.`);
    await form.getByLabel(/I agree/).check();
    await form.getByRole("button", { name: "Send message" }).click();
    await page.waitForLoadState("load");
    expect(new URL(page.url()).pathname).toBe(`/us/${slug}`);
    await expect(page.locator("[data-slot=form-block-status]")).toContainText(CONFIRMATION);
  });
  const stored = await api<{ docs: { id: number; submissionData: { value: string }[] }[] }>(
    "GET",
    `/api/form-submissions?where[form][equals]=${contact}&sort=-createdAt&limit=50&depth=0`,
  );
  const mine = stored
    .json()
    .docs.filter((doc) => doc.submissionData.some((row) => row.value === email));
  expect(mine).toHaveLength(1);
  for (const doc of mine)
    await api("DELETE", `/api/form-submissions/${doc.id}`).catch(() => undefined);
});

test("live preview: a title typed in the admin is the frame's heading within 3 s", async ({
  browser,
}) => {
  const slug = `e2e-live-${stamp}`;
  const title = `Live ${stamp}`;
  const id = await createPage({ title, slug, _status: "published" });
  const context = await browser.newContext({ baseURL: base() });
  const page = await context.newPage();
  // Payload remembers per user whether the edit view opens with live preview: the button says
  // which it is now, and the test leaves it off as it found it.
  const exit = page.getByRole("button", { name: "Exit Live Preview" });
  try {
    const { email, password } = adminCredentials();
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /^log in$|^login$/i }).click();
    await page.waitForURL(/\/admin\/?$/);

    await page.goto(`/admin/collections/pages/${id}?locale=en`);
    const field = page.locator('input[name="title"]:visible');
    await expect(field).toHaveValue(title);
    if ((await exit.count()) === 0)
      await page.getByRole("button", { name: "Live Preview", exact: true }).first().click();
    // The admin's one frame: the live preview's, the page through `/next/preview` in Draft Mode.
    const frame = page.frameLocator("iframe");
    const heading = frame.locator('[data-slot="cms-page-title"]');
    await expect(heading).toHaveText(title, { timeout: 30_000 });

    await field.click();
    await field.press("End");
    await field.pressSequentially(" edited");
    // Autosave saves 375 ms after the last key (pages.ts), and the frame redraws on the save.
    await expect(heading).toHaveText(`${title} edited`, { timeout: 3_000 });
  } finally {
    if ((await exit.count().catch(() => 0)) > 0)
      await exit
        .first()
        .click()
        .catch(() => undefined);
    await context.close();
  }
});

// T66 (D80): the journal. Two posts are published here, the newest: with the seed's two that makes
// four, two pages at e2e-smoke's page size of 3 (`STOREFRONT_LISTING_PAGE_SIZE`). The first has an
// address in English and one in Greek; the second has English's only, which every market then
// shows. Both are deleted at the end.
test.describe("the journal (T66)", () => {
  const first = {
    en: { title: `Spring notes ${stamp}`, slug: `e2e-post-${stamp}` },
    el: { title: `Ανοιξιάτικες σημειώσεις ${stamp}`, slug: `άρθρο-${stamp}` },
  };
  const second = { title: `Second post ${stamp}`, slug: `e2e-second-${stamp}` };
  /** The seed's oldest post (`payload/seed/posts.ts`), the one left for page 2. */
  const OLDEST = "Welcome to the journal";
  const posts: number[] = [];

  /** Creates a post in English and returns its id. */
  async function createPost(data: Record<string, unknown>): Promise<number> {
    const answer = await api<{ doc: { id: number } }>("POST", "/api/posts?locale=en", data);
    expect(answer.status, answer.text).toBe(201);
    const id = answer.json().doc.id;
    posts.push(id);
    return id;
  }

  /** The post links a page lists, by their text, in order. */
  const listed = (html: string) =>
    [...html.matchAll(/data-slot="post-card-link"[^>]*>([^<]+)</g)].map((match) => match[1]);

  test.beforeAll(async () => {
    // The pages made above leave the journal regenerating (its shell reads the pages): a
    // regeneration that ends after the publish would keep what it read before (`settled`).
    await settled("/us/journal");
    await settled("/journal");
    const now = Date.now();
    const id = await createPost({
      ...first.en,
      publishedAt: new Date(now).toISOString(),
      author: "Ann Example",
      excerpt: "What the season brings.",
      _status: "published",
    });
    const greek = await api("PATCH", `/api/posts/${id}?locale=el`, {
      ...first.el,
      excerpt: "Τι φέρνει η εποχή.",
      _status: "published",
    });
    expect(greek.status, greek.text).toBe(200);
    await createPost({
      ...second,
      publishedAt: new Date(now - 60_000).toISOString(),
      _status: "published",
    });
  });

  test.afterAll(async () => {
    for (const id of posts) await api("DELETE", `/api/posts/${id}`).catch(() => undefined);
  });

  test("a published post shows in the journal and at its own address, in / and /us", async () => {
    const lists = (path: string, title: string) => async () =>
      listed(await (await get(path)).text()).includes(title);
    expect(await freshWithinTwo(lists("/us/journal", first.en.title), 1_500)).toBeGreaterThan(0);
    expect(await freshWithinTwo(lists("/journal", first.el.title), 1_500)).toBeGreaterThan(0);

    const us = await (await get("/us/journal")).text();
    // Newest first, three to a page: the two posts made here, then the seed's newer one.
    expect(listed(us)).toEqual([first.en.title, second.title, "How to care for your knitwear"]);
    expect(us).toContain(`href="/us/journal/${first.en.slug}"`);
    expect(us).toContain('<link rel="canonical"');
    const cy = await (await get("/journal")).text();
    expect(cy).toContain('<html lang="el-CY"');
    // The second post has no Greek of its own: its English title, at English's slug.
    expect(listed(cy).slice(0, 2)).toEqual([first.el.title, second.title]);
    expect(cy).toContain(`href="/journal/${encodeURIComponent(first.el.slug)}"`);
    expect(cy).toContain(`href="/journal/${second.slug}"`);

    const post = await get(`/us/journal/${first.en.slug}`);
    expect(post.status).toBe(200);
    const html = await post.text();
    expect(html).toMatch(new RegExp(`data-slot="post-title"[^>]*>${first.en.title}</h1>`));
    expect(html).toContain("Ann Example");
    expect(html).toContain('"@type":"BlogPosting"');
    expect(post.headers.getSetCookie(), "a post sets no cookie").toEqual([]);
    const greek = await get(`/journal/${first.el.slug}`);
    expect(greek.status).toBe(200);
    expect(await greek.text()).toContain(`${first.el.title}</h1>`);
    // Each language at its own address only.
    expect((await get(`/us/journal/${first.el.slug}`)).status).toBe(404);
    expect((await get(`/journal/${first.en.slug}`)).status).toBe(404);
    expect((await get(`/journal/${second.slug}`)).status).toBe(200);
  });

  test("the post's head names its address in each market, English's where a language has none", async () => {
    const html = await (await get(`/us/journal/${first.en.slug}`)).text();
    expect(html).toContain(`<title>${first.en.title} | `);
    expect(html).toContain('<meta name="description" content="What the season brings."/>');
    const origin = new URL(base()).origin;
    expect(html).toContain(`<link rel="canonical" href="${origin}/us/journal/${first.en.slug}"/>`);
    const hrefLang = (language: string) =>
      new RegExp(`<link rel="alternate" hrefLang="${language}" href="([^"]+)"/>`).exec(html)?.[1];
    expect(hrefLang("en-US")).toBe(`${origin}/us/journal/${first.en.slug}`);
    expect(hrefLang("el-CY")).toBe(`${origin}/journal/${encodeURIComponent(first.el.slug)}`);
    expect(hrefLang("de-DE")).toBe(`${origin}/de/journal/${first.en.slug}`);
  });

  test("the journal's second page works by path, and pages 1 and 3 are 404s", async () => {
    const response = await get("/us/journal/page/2");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(listed(html)).toEqual([OLDEST]);
    const origin = new URL(base()).origin;
    expect(html).toContain(`<link rel="canonical" href="${origin}/us/journal/page/2"/>`);
    expect(html).toContain("<title>Journal, Page 2 | ");
    // Page 1 is `/journal` itself; a page past the last is no page.
    expect((await get("/us/journal/page/1")).status).toBe(404);
    expect((await get("/us/journal/page/3")).status).toBe(404);
    // The query is not read: `?page=2` is the first page.
    // (`get` would encode the `?` into the segment.)
    const query = await (await fetch(`${base()}/us/journal?page=2`)).text();
    expect(listed(query)[0]).toBe(first.en.title);
  });

  test("a slug another post reads by fallback is refused, with the reason", async () => {
    // PR 100 review, item 2: the second post has no Greek slug, so the Greek shop reads its
    // English one; the first post may not take it as its Greek slug.
    const answer = await api("PATCH", `/api/posts/${posts[0]}?locale=el`, {
      slug: second.slug,
      _status: "published",
    });
    expect(answer.status, answer.text).toBe(400);
    expect(answer.text).toContain("Another post already has this slug.");
    expect((await get(`/journal/${first.el.slug}`)).status, "the Greek address stays").toBe(200);
  });

  test("a missing or unpublished post is a 404, with the status", async () => {
    expect((await get(`/us/journal/missing-${stamp}`)).status).toBe(404);
    const slug = `e2e-draft-post-${stamp}`;
    await createPost({ title: `Draft post ${stamp}`, slug, _status: "draft" });
    const response = await get(`/us/journal/${slug}`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(`Draft post ${stamp}`);
  });

  test("an editorial list on a page lists the newest posts, and links to the journal", async () => {
    const slug = `e2e-editorial-${stamp}`;
    await createPage({
      title: `Editorial ${stamp}`,
      slug,
      layout: [
        {
          blockType: "editorialList",
          variant: "standard",
          heading: "From the journal",
          source: "newest",
          limit: 2,
        },
      ],
      _status: "published",
    });
    const html = await (await get(`/us/${slug}`)).text();
    const section = /data-slot="editorial-list-section"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
    expect(section).toContain("From the journal");
    expect(listed(section)).toEqual([first.en.title, second.title]);
    expect(section).toContain(`href="/us/journal/${first.en.slug}"`);
    expect(section).toMatch(/href="\/us\/journal"[^>]*>[\s\S]*?See all posts/);
  });
});
