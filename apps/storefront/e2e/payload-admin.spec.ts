import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { expect, test, type Page } from "@playwright/test";

// T16: Payload's admin inside the storefront, end to end: the admin that `pnpm bootstrap` made
// logs in, creates a page with a title per language, and the API serves each language. It is the
// suite that runs on Payload and Next upgrades (renovate.json), where the admin's UI, its login
// and its localized fields are what a new release changes.
//
// Why a login and not the first-user form (the plan's "first user, login, create a localized page"):
// bootstrap's step 8 has already made the first admin, from DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD
// in the backend's .env, so `/admin/create-first-user` is only reachable on an empty `users` table.
// Testing it would take a second, empty database and a second server. The second server cannot be
// the same build on another port: the site's origin is baked in at build time, and Payload's CSRF
// check compares it with the request's (measured: on :8001 the admin logs in and reads, and a POST
// with the same cookie answers 403; on :8000 it answers 201). That is a second build as well, for a
// form that nobody sees after the quickstart. Logging in with
// bootstrap's credentials tests what the quickstart's reader does, and fails if bootstrap makes an
// admin that cannot log in. The first-user form is left to M7's deployment check (SETUP.md, T16).
//
// The page it creates is deleted at the end and the admin's language selector is put back on
// English, so a run leaves the database as it found it. (Payload remembers the last language an
// admin picked, per user, and opens the next page in it: the suite names its language in the URL
// and does not rely on what an earlier run or a person left behind.)

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

type Credentials = { email: string; password: string };

/** The admin bootstrap made: the environment first, then the backend's .env (bootstrap's step 5). */
function adminCredentials(): Credentials {
  const email = process.env["E2E_ADMIN_EMAIL"];
  const password = process.env["E2E_ADMIN_PASSWORD"];
  if (email && password) return { email, password };
  const file = path.resolve(import.meta.dirname, "../../backend/.env");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new Error(
      `No admin to log in with: ${file} does not exist. Run pnpm bootstrap, or set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.`,
    );
  }
  // `parseEnv` reads the file the way dotenv does (the last assignment wins, `export `, quotes and
  // an unquoted ` # comment`), as bootstrap's own reader and the servers do.
  const { DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD } = parseEnv(text);
  if (!DEV_ADMIN_EMAIL || !DEV_ADMIN_PASSWORD) {
    throw new Error(
      `DEV_ADMIN_EMAIL or DEV_ADMIN_PASSWORD is not set in ${file}. Run pnpm bootstrap.`,
    );
  }
  return { email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD };
}

/**
 * A field of the form that is on screen. Next keeps the route you came from mounted but hidden
 * (Cache Components), so right after a redirect `input[name="title"]` matches the old form too.
 */
const field = (page: Page, name: "title" | "slug") => page.locator(`input[name="${name}"]:visible`);

type PageDoc = { id?: number; title?: string | null; slug?: string | null; _status?: string };

/** A `pages` document in one language, read as the signed-in admin. `fetch` inside the page, because
 * `page.request` does not send the `Secure` cookie to http://localhost (SETUP.md, T11). An error
 * response fails here, so a field that is `undefined` in a test means the document lacks it. */
function readAs(page: Page, id: number, query: string): Promise<PageDoc> {
  return page.evaluate(
    async ({ id, query }) => {
      const response = await fetch(`/api/pages/${id}?${query}`);
      if (!response.ok)
        throw new Error(`GET /api/pages/${id}?${query} answered ${response.status}`);
      return (await response.json()) as PageDoc;
    },
    { id, query },
  );
}

/** A DELETE as the signed-in admin (the same `fetch` inside the page); resolves to the status. */
function deleteAs(page: Page, url: string): Promise<number> {
  return page.evaluate((url) => fetch(url, { method: "DELETE" }).then((r) => r.status), url);
}

test.describe("the admin bootstrap made", () => {
  let page: Page;
  let pageId: number | undefined;
  const stamp = Date.now().toString(36);
  const english = { title: `E2E page ${stamp}`, slug: `e2e-page-${stamp}` };
  const greek = { title: `Δοκιμαστική σελίδα ${stamp}`, slug: `dokimastiki-${stamp}` };

  test.beforeAll(async ({ browser, baseURL }) => {
    page = await browser.newPage({ baseURL: baseURL ?? "http://localhost:8000" });
  });

  test.afterAll(async () => {
    if (!page) return;
    // Not a test: leave the database as found, whatever failed above. By slug and not by `pageId`,
    // which is unknown when the draft was saved and the redirect to it then failed.
    await deleteAs(page, `/api/pages?where[slug][equals]=${english.slug}&locale=en`).catch(
      () => undefined,
    );
    // A `?locale=` in the URL is also what Payload stores as the admin's language.
    await page.goto("/admin/collections/pages?locale=en").catch(() => undefined);
    await page.close();
  });

  test("an admin exists, so /admin asks for a login, not for a first user", async ({ request }) => {
    const init = await request.get("/api/users/init");
    expect(await init.json()).toEqual({ initialized: true });
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test("logs in with the credentials bootstrap wrote, and is an admin", async () => {
    const { email, password } = adminCredentials();
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: /^log in$|^login$/i }).click();
    await page.waitForURL(/\/admin\/?$/);
    await expect(page).toHaveTitle(/Dashboard/);
    const me = await page.evaluate(
      async () =>
        (await (await fetch("/api/users/me")).json()) as {
          user: { email: string; role: string } | null;
        },
    );
    expect(me.user?.email).toBe(email);
    expect(me.user?.role).toBe("admin");
  });

  test("creates a page with an English title, as a draft that visitors cannot read", async ({
    request,
  }) => {
    await page.goto("/admin/collections/pages/create?locale=en");
    await expect(page.getByRole("button", { name: "Locale" }).first()).toContainText("English");
    await field(page, "title").fill(english.title);
    await field(page, "slug").fill(english.slug);
    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/admin\/collections\/pages\/(\d+)/);
    pageId = Number(/\/pages\/(\d+)/.exec(page.url())?.[1]);
    expect(pageId).toBeGreaterThan(0);

    const asAdmin = await readAs(page, pageId, "draft=true&locale=en&fallback-locale=none");
    expect(asAdmin).toMatchObject({
      title: english.title,
      slug: english.slug,
      _status: "draft",
    });
    // A visitor sees published pages only (pages.ts: staffOrPublished).
    expect((await request.get(`/api/pages/${pageId}?locale=en`)).status()).toBe(404);
  });

  test("switches to Greek, writes its own title, and publishes", async ({ request }) => {
    expect(pageId, "the page made by the previous test").toBeDefined();
    await page.getByRole("button", { name: "Locale" }).first().click();
    await page.getByRole("button", { name: /Ελληνικά/ }).click();
    await page.waitForURL(/locale=el/);
    // A new language starts empty: the English text is not copied into the form.
    await expect(field(page, "title")).toHaveValue("");
    await field(page, "title").fill(greek.title);
    await field(page, "slug").fill(greek.slug);
    await page.getByRole("button", { name: /^Publish/ }).click();
    await expect(page.getByText(/updated successfully/i).first()).toBeVisible();

    const id = pageId as number;
    const publicRead = await request.get(`/api/pages/${id}?locale=el&fallback-locale=none`);
    expect(publicRead.status(), "a published page is public").toBe(200);
    expect(await publicRead.json()).toMatchObject({ title: greek.title, slug: greek.slug });
  });

  test("each language has its own title, and an unwritten one falls back to English", async ({
    request,
  }) => {
    const id = pageId as number;
    const en = await readAs(page, id, "locale=en&fallback-locale=none");
    const el = await readAs(page, id, "locale=el&fallback-locale=none");
    const de = await readAs(page, id, "locale=de&fallback-locale=none");
    expect(en).toMatchObject({
      title: english.title,
      slug: english.slug,
      _status: "published",
    });
    expect(el).toMatchObject({ title: greek.title, slug: greek.slug });
    expect(de.title ?? null, "German was never written").toBeNull();

    // The config's `fallback: true`: a language with no text shows the English one.
    const fallback = await request.get(`/api/pages/${id}?locale=de`);
    expect(await fallback.json()).toMatchObject({ title: english.title });
  });

  test("deletes the page again", async () => {
    const id = pageId as number;
    expect(await deleteAs(page, `/api/pages/${id}`)).toBe(200);
  });
});
