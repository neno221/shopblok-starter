import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";
import { collectConsole, judgeConsole, type FailedRequest, type Message } from "./support/console";
import { focusIndicator } from "./support/focus-ring";
import { draftOf, publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import { adminToken } from "./support/server";

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
// ADR 0001 (T17 step 4) adds what S1's prototype checked about the admin and that Next or Payload
// upgrades could break: an image uploaded to `media` and opened from the list without a full reload,
// the list view paginated without a full reload, and a browser console with no errors or warnings
// across the whole run. S1's third admin check, choosing an image in an upload field's drawer,
// came back with the first upload field (T61): the header global's logo. T61 also picks the
// header's design by keyboard alone (D85's picker is a radio group: arrows move the choice).
//
// The page it creates is deleted at the end, the header is published again as it was (which also
// replaces the drafts the header tests saved), and the admin's language selector is put back on
// English, so a run leaves the database as it found it. (Payload remembers the last language an
// admin picked, per user, and opens the next page in it: the suite names its language in the URL
// and does not rely on what an earlier run or a person left behind.)

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

// A 1 x 1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** A client navigation keeps the document alive and leaves this marker; a full reload erases it. */
const mark = (page: Page) =>
  page.evaluate(() => ((window as unknown as { __e2e: number }).__e2e = 1));
const marked = (page: Page) =>
  page.evaluate(() => (window as unknown as { __e2e?: number }).__e2e === 1);

/**
 * A field of the form that is on screen. Next keeps the route you came from mounted but hidden
 * (Cache Components), so right after a redirect `input[name="title"]` matches the old form too.
 */
const field = (page: Page, name: "title" | "slug") => page.locator(`input[name="${name}"]:visible`);

/**
 * axe's contrast check on the screen (T90, D108: Medusa Admin's colours on Payload's screens). Only
 * `color-contrast`: the rest of axe's rules judge Payload's own markup (its react-select inputs
 * without a label, icon buttons without a name, sort buttons under 24 px), which the theme does
 * not touch (SETUP.md, "Payload's admin theme (T90)"). The SEO plugin's inline colours are left
 * out: it writes `#9A9A9A`, `red` and `green` into `style`, which no variable reaches.
 */
async function contrastViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .exclude('#field-meta [style*="color"]')
    .analyze();
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary ?? ""}`),
  );
}

/** The viewport the suite's page opens with; the theme's checks put it back. */
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

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
  let mediaId: number | undefined;
  let token = "";
  let header: GlobalData | undefined;
  const stamp = Date.now().toString(36);
  const consoleMessages: Message[] = [];
  const failedRequests: FailedRequest[] = [];
  const english = { title: `E2E page ${stamp}`, slug: `e2e-page-${stamp}` };
  const greek = { title: `Δοκιμαστική σελίδα ${stamp}`, slug: `dokimastiki-${stamp}` };
  // The translation status's page (T89) and the message the "not translated" filter test empties.
  const statusPage: {
    id?: number;
    english: { title: string; slug: string; heading: string };
    greek: { title: string; slug: string };
    greekHeading: string;
  } = {
    english: { title: `E2E status ${stamp}`, slug: `e2e-status-${stamp}`, heading: "Half price" },
    greek: { title: `Κατάσταση ${stamp}`, slug: `katastasi-${stamp}` },
    greekHeading: "Μισή τιμή",
  };
  let emptied: { id: number; key: string; value: string } | undefined;

  test.beforeAll(async ({ browser, baseURL }) => {
    page = await browser.newPage({ baseURL: baseURL ?? "http://localhost:8000" });
    collectConsole(page, consoleMessages, failedRequests);
    token = await adminToken();
    header = await snapshotGlobal(token, "header");
  });

  test.afterAll(async () => {
    if (header !== undefined)
      await publishGlobal(token, "header", header, "all").catch(() => undefined);
    if (!page) return;
    // Media and the bulk pages of the tests below, by their stamped names.
    await deleteAs(page, `/api/media?where[filename][contains]=e2e-${stamp}`).catch(
      () => undefined,
    );
    await deleteAs(page, `/api/pages?where[slug][contains]=e2e-bulk-${stamp}&locale=en`).catch(
      () => undefined,
    );
    await deleteAs(
      page,
      `/api/pages?where[slug][equals]=${statusPage.english.slug}&locale=en`,
    ).catch(() => undefined);
    if (emptied !== undefined) {
      const { id, value } = emptied;
      await page
        .evaluate(
          ({ id, value }) =>
            fetch(`/api/ui-strings/${id}?locale=el`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ value }),
            }),
          { id, value },
        )
        .catch(() => undefined);
    }
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
    // D108 (T90): the shop's logo where Payload's was: the site settings' store name, as text
    // while the settings have no logo (the seed's).
    const settings = (await (await request.get("/api/globals/site-settings?depth=0")).json()) as {
      storeName: string;
      logo: unknown;
    };
    expect(settings.logo ?? null, "the seed's site settings have no logo").toBeNull();
    await expect(page.locator(".login__brand .admin-logo")).toHaveText(settings.storeName);
    await expect(page.locator(".login__brand svg")).toHaveCount(0);
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

  test("wears Medusa Admin's look: light, Inter, and the store's letter as the icon", async () => {
    await page.goto("/admin");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    // The theme is fixed: the account page has no theme picker.
    const look = await page.evaluate(async () => {
      await document.fonts.ready;
      const body = getComputedStyle(document.body);
      const family = body.fontFamily.split(",")[0]!.trim();
      return {
        family,
        loaded: document.fonts.check(`13px ${family}`),
        text: body.color,
        primary: getComputedStyle(document.documentElement).getPropertyValue("--theme-success-500"),
      };
    });
    // `next/font`'s family for Inter (`lib/fonts.ts`), loaded from this server.
    expect(look.family).toMatch(/Inter/);
    expect(look.loaded, "Inter's file loaded").toBe(true);
    expect(look.text, "Medusa's --fg-base").toBe("rgb(24, 24, 27)");
    expect(look.primary.trim()).not.toBe("");
    const home = page.locator(".step-nav__home");
    await expect(home.locator(".admin-icon--letter")).toHaveText("S");
    await expect(home.locator("svg")).toHaveCount(0);
  });

  test("creates a page with an English title, as a draft that visitors cannot read", async ({
    request,
  }) => {
    await page.goto("/admin/collections/pages/create?locale=en");
    // Autosave (T59): opening "create" saves an empty draft at once and moves to its edit view, so
    // the form is filled there, and the read below waits for Save Draft's own answer (the URL
    // already names the page before that save is made).
    await page.waitForURL(/\/admin\/collections\/pages\/(\d+)/);
    pageId = Number(/\/pages\/(\d+)/.exec(page.url())?.[1]);
    expect(pageId).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "Locale" }).first()).toContainText("English");
    await field(page, "title").fill(english.title);
    await field(page, "slug").fill(english.slug);
    const [saved] = await Promise.all([
      page.waitForResponse(
        // Save Draft, not an autosave that typing may have started first.
        (r) =>
          r.request().method() === "PATCH" &&
          new URL(r.url()).pathname === `/api/pages/${pageId}` &&
          !new URL(r.url()).searchParams.has("autosave"),
        { timeout: 30_000 },
      ),
      page.getByRole("button", { name: "Save Draft" }).click(),
    ]);
    expect(saved.status()).toBeLessThan(300);

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

  test("uploads an image to media, which is then served", async ({ request }) => {
    await page.goto("/admin/collections/media/create?locale=en");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: `e2e-${stamp}.png`, mimeType: "image/png", buffer: PNG });
    await page.locator('input[name="alt"]:visible').fill("E2E test image");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForURL(/\/admin\/collections\/media\/(\d+)/);
    const id = Number(/\/media\/(\d+)/.exec(page.url())?.[1]);
    expect(id).toBeGreaterThan(0);
    mediaId = id;

    const doc = await page.evaluate(async (id) => {
      const response = await fetch(`/api/media/${id}?locale=en`);
      return (await response.json()) as { filename?: string; mimeType?: string; url?: string };
    }, id);
    expect(doc).toMatchObject({ filename: `e2e-${stamp}.png`, mimeType: "image/png" });
    const file = await request.get(doc.url ?? "/missing");
    expect(file.status(), "the uploaded file is served").toBe(200);
    expect(file.headers()["content-type"]).toContain("image/png");
  });

  test("opens that image from the media list without a full reload", async () => {
    await page.goto("/admin/collections/media?locale=en");
    await mark(page);
    await page
      .getByRole("link", { name: new RegExp(`e2e-${stamp}`) })
      .first()
      .click();
    await page.waitForURL(/\/admin\/collections\/media\/(\d+)/);
    await expect(page.locator('input[name="alt"]:visible')).toHaveValue("E2E test image");
    expect(await marked(page), "opening a document from the list is a client navigation").toBe(
      true,
    );
  });

  test("chooses the header's logo in the upload field's drawer, and saves a draft", async () => {
    expect(mediaId, "the image uploaded above").toBeDefined();
    await page.goto("/admin/globals/header?locale=en");
    const logo = page.locator("#field-logo");
    await logo.getByRole("button", { name: "Choose from existing" }).click();
    const drawer = page.locator("dialog.list-drawer");
    await drawer
      .locator("tbody tr")
      .filter({ hasText: `e2e-${stamp}.png` })
      .getByRole("button")
      .first()
      .click();
    await expect(drawer).toBeHidden();
    await expect(logo).toContainText(`e2e-${stamp}.png`);
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect.poll(async () => (await draftOf(token, "header"))["logo"]).toBe(mediaId);
    // A draft: visitors still read the published header, without the logo.
    expect((await snapshotGlobal(token, "header"))["logo"] ?? null).toBe(header?.["logo"] ?? null);
  });

  test("picks the header's design by keyboard alone", async () => {
    await page.goto("/admin/globals/header?locale=en");
    const picker = page.getByRole("radiogroup", { name: "Design" });
    const radios = picker.getByRole("radio");
    await expect(radios.first()).toBeVisible();
    const before = await picker.getByRole("radio", { checked: true }).getAttribute("value");
    const values = await radios.evaluateAll((all) =>
      all.map((radio) => (radio as HTMLInputElement).value),
    );
    // Tab to the group: a radio group is one stop, on its checked radio.
    for (let presses = 0; presses < 200; presses += 1) {
      await page.keyboard.press("Tab");
      if (await picker.evaluate((group) => group.contains(document.activeElement))) break;
    }
    const focused = page.locator(":focus");
    await expect(focused).toHaveAttribute("value", before ?? "");
    await page.keyboard.press("ArrowRight");
    const next = values[(values.indexOf(before ?? "") + 1) % values.length];
    await expect(picker.getByRole("radio", { checked: true })).toHaveAttribute("value", next ?? "");
    await expect(focused).toHaveAttribute("value", next ?? "");
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect.poll(async () => (await draftOf(token, "header"))["design"]).toBe(next);
  });

  test("paginates the list view without a full reload", async () => {
    // More than the 10 a page shows. Drafts, in English, named so the cleanup finds them.
    for (let i = 0; i < 12; i += 1) {
      const status = await page.evaluate(
        async ({ i, stamp }) =>
          (
            await fetch("/api/pages?locale=en", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                title: `E2E bulk ${i} ${stamp}`,
                slug: `e2e-bulk-${stamp}-${i}`,
                _status: "draft",
              }),
            })
          ).status,
        { i, stamp },
      );
      expect(status).toBe(201);
    }
    // `limit=10` in the URL: the admin remembers a list's page size per user (the first click on a
    // page number stores it), so a size chosen earlier by a person or an earlier run is not assumed.
    await page.goto("/admin/collections/pages?locale=en&limit=10");
    await expect(page.locator("tbody tr")).toHaveCount(10);
    const firstRow = await page.locator("tbody tr").first().innerText();
    await mark(page);
    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.waitForURL(/page=2/);
    await expect(page.locator("tbody tr").first()).not.toHaveText(firstRow);
    expect(await marked(page), "pagination is a client navigation").toBe(true);
  });

  // D107 (T89): the translation status in the sidebar and the list, from one read in every
  // language without the fallback. The page has English and Greek titles and slugs, and an English
  // promotion heading with no Greek one: Greek has that heading left to translate.
  test("the translation status names the text Greek lacks, and is complete once it is written", async () => {
    const created = await page.evaluate(
      async ({ english, greek }) => {
        const post = await fetch("/api/pages?locale=en&draft=true", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...english,
            layout: [{ blockType: "promoBanner", variant: "standard", heading: english.heading }],
          }),
        });
        const { doc } = (await post.json()) as { doc: { id: number } };
        const patch = await fetch(`/api/pages/${doc.id}?locale=el&draft=true`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(greek),
        });
        return { id: doc.id, post: post.status, patch: patch.status };
      },
      { english: statusPage.english, greek: statusPage.greek },
    );
    expect(created).toMatchObject({ post: 201, patch: 200 });
    statusPage.id = created.id;

    await page.goto(`/admin/collections/pages/${created.id}?locale=en`);
    const greekStatus = page.locator('.translation-status [data-language="el"]');
    await expect(greekStatus).toContainText("1 to translate");
    const link = greekStatus.getByRole("link", { name: /Promo banner 1 › Heading$/ });
    await expect(link).toHaveAttribute("href", "?locale=el#field-layout__0__heading");

    // The list's column, from one read of the list page in every language.
    await page.goto(
      `/admin/collections/pages?locale=en&search=${encodeURIComponent(statusPage.english.title)}`,
    );
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr .translation-status__cell")).toContainText(
      "Ελληνικά: 1 to translate",
    );

    // The link opens the Greek form at the heading.
    await page.goto(`/admin/collections/pages/${created.id}?locale=en`);
    await page.locator('.translation-status [data-language="el"]').getByRole("link").click();
    await page.waitForURL(/locale=el#field-layout__0__heading/);
    const heading = page.locator("#field-layout__0__heading");
    await expect(heading).toBeFocused();
    await heading.fill(statusPage.greekHeading);
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "PATCH" &&
          new URL(r.url()).pathname === `/api/pages/${created.id}` &&
          !new URL(r.url()).searchParams.has("autosave"),
        { timeout: 30_000 },
      ),
      page.getByRole("button", { name: "Save Draft" }).click(),
    ]);
    // The count is the one the form opened with (D107); the note opens the form again.
    await page.getByRole("link", { name: "Count again" }).click();
    await expect(page.locator('.translation-status [data-language="el"]')).toHaveAttribute(
      "data-state",
      "complete",
    );
    await expect(page.locator('.translation-status [data-language="el"]')).toContainText(
      "complete",
    );
  });

  test("lists a message emptied in Greek under “Not translated in Ελληνικά”", async () => {
    const message = await page.evaluate(async () => {
      const response = await fetch(
        "/api/ui-strings?locale=el&fallback-locale=none&depth=0&limit=1&sort=key&where[value][exists]=true",
      );
      const { docs } = (await response.json()) as {
        docs: { id: number; key: string; value: string }[];
      };
      return docs[0];
    });
    expect(message, "a message with a Greek text").toBeDefined();
    emptied = message;
    const empty = async (value: string | null) =>
      page.evaluate(
        async ({ id, value }) =>
          (
            await fetch(`/api/ui-strings/${id}?locale=el`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ value }),
            })
          ).status,
        { id: message!.id, value },
      );
    expect(await empty("")).toBe(200);

    await page.goto("/admin/collections/ui-strings?locale=en");
    const filter = page.getByRole("navigation", { name: "Not translated in" });
    await expect(page.getByRole("link", { name: message!.key })).toHaveCount(0);
    await filter.getByRole("link", { name: "Ελληνικά" }).click();
    await page.waitForURL(/locale=el/);
    await expect(filter.getByRole("link", { name: "Ελληνικά" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByRole("link", { name: message!.key, exact: true })).toBeVisible();

    expect(await empty(message!.value)).toBe(200);
    emptied = undefined;
  });

  // D108 (T90): Medusa Admin's colours keep Payload's screens readable, on a desktop and a phone:
  // the dashboard, a list, an edit form with the translation status in its sidebar (the page the
  // status test made: Greek complete, the other open languages not), and the variant picker.
  test("every screen passes axe's contrast check at 1440 and 375 px", async () => {
    test.setTimeout(120_000);
    expect(statusPage.id, "the page the translation status test made").toBeDefined();
    const screens = [
      { name: "the dashboard", url: "/admin", ready: page.locator(".integrations-status") },
      {
        name: "a list",
        url: "/admin/collections/pages?locale=en",
        ready: page.locator("tbody tr").first(),
      },
      {
        name: "an edit form",
        url: `/admin/collections/pages/${statusPage.id}?locale=en`,
        ready: page.locator('.translation-status [data-language="el"][data-state="complete"]'),
      },
      {
        name: "the variant picker",
        url: "/admin/globals/header?locale=en",
        ready: page.getByRole("radiogroup", { name: "Design" }).getByRole("radio").first(),
      },
    ];
    try {
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 900 });
        for (const screen of screens) {
          await page.goto(screen.url);
          await expect(screen.ready).toBeAttached();
          expect(await contrastViolations(page), `${screen.name} at ${width} px`).toEqual([]);
        }
      }
    } finally {
      await page.setViewportSize(DEFAULT_VIEWPORT);
    }
  });

  test("an error on the edit form stays readable", async () => {
    await page.goto(`/admin/collections/pages/${statusPage.id}?locale=en`);
    // Publishing without a title: Payload marks the field and says so in a toast. Nothing is
    // published (the form is refused), and the page is the suite's own, deleted at the end.
    await field(page, "title").fill("");
    await page.getByRole("button", { name: /^Publish/ }).click();
    await expect(page.locator(".field-type.text.error").first()).toBeVisible();
    await expect(page.locator(".payload-toast-item").first()).toBeVisible();
    expect(await contrastViolations(page), "the field's error and the toast").toEqual([]);
  });

  // axe has no rule for a focus ring's colour: this measures it (3:1 against what is behind it).
  test("the focus ring stands out from its background on the edit form", async () => {
    await page.goto(`/admin/collections/pages/${statusPage.id}?locale=en`);
    const title = field(page, "title");
    await title.focus();
    const titleRing = await focusIndicator(title);
    expect(
      titleRing.ratio,
      `the title field's focus edge ${JSON.stringify(titleRing)}`,
    ).toBeGreaterThanOrEqual(3);
    // The block's variant picker, reached by keyboard: its card draws Payload's focus outline.
    const picker = page.locator(".variant-picker__options").first();
    for (let presses = 0; presses < 200; presses += 1) {
      await page.keyboard.press("Tab");
      if (await picker.evaluate((group) => group.contains(document.activeElement))) break;
    }
    const card = await focusIndicator(page.locator(":focus"), ".variant-picker__card");
    expect(card.kind).toBe("outline");
    expect(card.width).toBeGreaterThanOrEqual(2);
    expect(card.ratio, `the variant card's ring ${JSON.stringify(card)}`).toBeGreaterThanOrEqual(3);
  });

  // Last: it judges everything the admin logged since the first test. A failed request to another
  // host is excused (the admin asks Gravatar for an avatar, D18, and the cloud's proxy blocks it);
  // so is a fetch that a navigation cancelled (`ERR_ABORTED`), which is the browser's doing. A
  // request to this server that fails is not.
  test("the browser console had no errors or warnings", ({ baseURL }) => {
    const { local, judged, summary, failedLine } = judgeConsole(
      consoleMessages,
      failedRequests,
      baseURL,
    );
    console.log(failedLine);
    expect(local, "no request to this server failed").toEqual([]);
    console.log(
      `console messages (${consoleMessages.length}, ${judged.length} judged)${summary.length ? ":\n" + summary.join("\n") : ""}`,
    );
    expect(summary).toEqual([]);
  });
});
