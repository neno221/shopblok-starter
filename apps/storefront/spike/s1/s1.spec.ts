import { expect, test, type Page } from "@playwright/test";

// S1 (docs/plans/M0.md §6): Cache Components x the embedded Payload admin. One serial run against
// a fresh database with no users, so the create-first-user form is the first thing it meets.
// Browser console errors and warnings are collected across the whole run and judged at the end.

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now().toString(36);
const credentials = { email: `s1-${stamp}@example.com`, password: `S1-${stamp}-Passw0rd!` };
// A 1 x 1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

type Message = { type: string; text: string; url: string };
const consoleMessages: Message[] = [];
const failedRequests: { url: string; error: string }[] = [];

let page: Page;
let token = "";

/** `fetch` inside the page, as the signed-in admin (`page.request` does not send the Secure cookie). */
function api<T>(
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
) {
  return page.evaluate(
    async ({ path, init }) => {
      const response = await fetch(path, {
        method: init?.method ?? "GET",
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
        ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      });
      const text = await response.text();
      return { status: response.status, json: (text ? JSON.parse(text) : null) as T };
    },
    { path, init },
  );
}

/** A navigation that keeps the document alive leaves this marker; a full reload erases it. */
const mark = () => page.evaluate(() => ((window as unknown as { __s1: number }).__s1 = 1));
const marked = () => page.evaluate(() => (window as unknown as { __s1?: number }).__s1 === 1);

/** Clicks a button and waits for the REST call it makes, so a toast left over from an earlier save
 * cannot stand in for this one. */
async function clickAndWait(name: RegExp | string, method: string, path: RegExp) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === method && path.test(new URL(r.url()).pathname),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name, exact: typeof name === "string" }).click(),
  ]);
  expect(response.status(), `${method} ${response.url()}`).toBeLessThan(300);
}

const field = (name: string) => page.locator(`input[name="${name}"]:visible`);

test.beforeAll(async ({ browser, baseURL }) => {
  page = await browser.newPage({ baseURL: baseURL ?? "http://localhost:8000" });
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
        url: new URL(page.url() || "http://x/").pathname,
      });
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "" });
  });
  page.on("pageerror", (error) => {
    consoleMessages.push({
      type: "pageerror",
      text: error.message,
      url: new URL(page.url() || "http://x/").pathname,
    });
  });
});

test.afterAll(async () => {
  await page?.close();
});

test.describe("admin", () => {
  test("/admin on an empty database asks for the first user", async ({ request }) => {
    const init = await request.get("/api/users/init");
    const text = await init.text();
    expect(`${init.status()} ${text.slice(0, 200)}`).toBe(`200 {"initialized":false}`);
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/create-first-user/);
    await expect(field("email")).toBeVisible();
  });

  test("creates the first user, who becomes an admin", async () => {
    await field("email").fill(credentials.email);
    await field("password").fill(credentials.password);
    await field("confirm-password").fill(credentials.password);
    await page.getByRole("button", { name: /^create$/i }).click();
    await page.waitForURL(/\/admin\/?$/);
    await expect(page).toHaveTitle(/Dashboard/);
    const me = await api<{ user: { email: string; role: string } | null }>("/api/users/me");
    expect(me.json.user).toMatchObject({ email: credentials.email, role: "admin" });
  });

  test("logs out and logs in again", async () => {
    // The "Log out" link of the navigation, as a user uses it. (Playwright's own click is blocked
    // by the sidebar's overlay at this viewport, so the click is made in the page.) A deep link
    // to /admin/logout is not the same: its POST /api/users/logout answered 400 in 2 of 6 runs.
    await page.goto("/admin");
    await page.waitForSelector('a[href="/admin/logout"]', { state: "attached" });
    await page.evaluate(() =>
      (document.querySelector('a[href="/admin/logout"]') as HTMLElement).click(),
    );
    await page.waitForURL(/\/admin\/(login|logout)/);
    // The page logs out from the browser; wait for it, or the next navigation cancels it.
    await expect
      .poll(async () => (await api<{ user: unknown }>("/api/users/me")).json.user, {
        timeout: 30_000,
      })
      .toBeNull();
    await page.goto("/admin/login");
    await field("email").fill(credentials.email);
    await field("password").fill(credentials.password);
    await page.getByRole("button", { name: /^log in$|^login$/i }).click();
    await page.waitForURL(/\/admin\/?$/);
    const login = await api<{ token: string }>("/api/users/me");
    expect(login.status).toBe(200);
    // A token for the Node-side requests below.
    const result = await page.evaluate(async ({ email, password }) => {
      const r = await fetch("/api/users/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return (await r.json()) as { token?: string };
    }, credentials);
    expect(result.token).toBeTruthy();
    token = result.token ?? "";
  });

  const english = { title: `S1 page ${stamp}`, slug: `s1-page-${stamp}` };
  const greek = { title: `Σελίδα S1 ${stamp}`, slug: `selida-s1-${stamp}` };
  let pageId = 0;

  test("creates a page, writes a second language, publishes", async () => {
    await page.goto("/admin/collections/pages/create?locale=en");
    await field("title").fill(english.title);
    await field("slug").fill(english.slug);
    await clickAndWait("Save Draft", "POST", /^\/api\/pages$/);
    await page.waitForURL(/\/admin\/collections\/pages\/(\d+)/);
    pageId = Number(/\/pages\/(\d+)/.exec(page.url())?.[1]);
    expect(pageId).toBeGreaterThan(0);

    await mark();
    await page.getByRole("button", { name: "Locale" }).first().click();
    await page.getByRole("button", { name: /Ελληνικά/ }).click();
    await page.waitForURL(/locale=el/);
    expect(await marked(), "switching language is a client navigation").toBe(true);
    await expect(field("title")).toHaveValue("");
    await field("title").fill(greek.title);
    await field("slug").fill(greek.slug);
    await clickAndWait(/^Publish/, "PATCH", /^\/api\/pages\/\d+$/);
    await expect(page.getByText(/updated successfully/i).first()).toBeVisible();

    const el = await api<{ title: string }>(`/api/pages/${pageId}?locale=el&fallback-locale=none`);
    expect(el.json.title).toBe(greek.title);
  });

  test("switches back and edits the English title", async () => {
    await page.getByRole("button", { name: "Locale" }).first().click();
    await page.getByRole("button", { name: /English/ }).click();
    await page.waitForURL(/locale=en/);
    await expect(field("title")).toHaveValue(english.title);
    const edited = `${english.title} edited`;
    await field("title").fill(edited);
    await clickAndWait(/^Publish/, "PATCH", /^\/api\/pages\/\d+$/);
    await expect(page.getByText(/updated successfully/i).first()).toBeVisible();
    const en = await api<{ title: string }>(`/api/pages/${pageId}?locale=en&fallback-locale=none`);
    expect(en.json.title).toBe(edited);
  });

  test("uploads an image to media, then opens it from the list without a full reload", async () => {
    await page.goto("/admin/collections/media/create");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: `s1-${stamp}.png`,
        mimeType: "image/png",
        buffer: PNG,
      });
    await field("alt").fill("S1 test image");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForURL(/\/admin\/collections\/media\/(\d+)/);

    await page.goto("/admin/collections/media");
    await mark();
    await page
      .getByRole("link", { name: new RegExp(`s1-${stamp}`) })
      .first()
      .click();
    await page.waitForURL(/\/admin\/collections\/media\/(\d+)/);
    expect(await marked(), "opening a document from the list is a client navigation").toBe(true);
  });

  test("picks an image from the media drawer of an upload field, without a full reload", async () => {
    await page.goto("/admin/collections/pages/create?locale=en");
    await field("title").fill(`S1 hero ${stamp}`);
    await mark();
    await page.getByRole("button", { name: /choose from existing/i }).click();
    const row = page.locator("tbody tr", { hasText: `s1-${stamp}` }).first();
    await row.waitFor({ timeout: 30_000 });
    await row.locator("td.cell-filename button").click();
    await expect(page.getByText(`s1-${stamp}.png`).first()).toBeVisible();
    expect(await marked(), "choosing a file closes the drawer, it does not reload").toBe(true);
    await expect(field("title")).toHaveValue(`S1 hero ${stamp}`);
    await field("slug").fill(`s1-hero-${stamp}`);
    await clickAndWait("Save Draft", "POST", /^\/api\/pages$/);
    await page.waitForURL(/\/admin\/collections\/pages\/(\d+)/);
    const saved = await api<{ heroImage: number | null }>(
      `/api/pages/${/\/pages\/(\d+)/.exec(page.url())?.[1]}?draft=true&depth=0`,
    );
    expect(saved.json.heroImage).toBeGreaterThan(0);
  });

  test("paginates the list view without a full reload", async () => {
    for (let i = 0; i < 12; i += 1) {
      const created = await api("/api/pages?locale=en", {
        method: "POST",
        body: { title: `S1 bulk ${i} ${stamp}`, slug: `s1-bulk-${i}-${stamp}`, _status: "draft" },
      });
      expect(created.status).toBe(201);
    }
    await page.goto("/admin/collections/pages");
    await expect(page.locator("tbody tr")).toHaveCount(10);
    const firstRow = await page.locator("tbody tr").first().innerText();
    await mark();
    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.waitForURL(/page=2/);
    await expect(page.locator("tbody tr").first()).not.toHaveText(firstRow);
    expect(await marked(), "pagination is a client navigation").toBe(true);
  });

  test("GET /api/pages answers 200", async ({ request }) => {
    const response = await request.get("/api/pages");
    expect(response.status()).toBe(200);
  });

  test("keeps the admin's token for the cache tests", () => {
    expect(token).not.toBe("");
  });

  test.afterAll(() => {
    // Handed to the next describe through the module.
    shared.pageId = pageId;
    shared.english = english;
    shared.greek = greek;
  });
});

const shared: {
  pageId: number;
  english: { title: string; slug: string };
  greek: { title: string; slug: string };
} = { pageId: 0, english: { title: "", slug: "" }, greek: { title: "", slug: "" } };

/** Only the part of the body that the pages list prints, so a title is found whatever the markup. */
async function titlesAt(path: string, headers?: Record<string, string>) {
  const response = await fetch(
    new URL(path, process.env["E2E_BASE_URL"] ?? "http://localhost:8000"),
    {
      ...(headers === undefined ? {} : { headers }),
      redirect: "manual",
    },
  );
  const html = await response.text();
  return {
    status: response.status,
    html,
    run: /data-testid="s1-run">(\d+)</.exec(html)?.[1] ?? null,
    shownAsDraft: /data-testid="s1-draft">(\w+)</.exec(html)?.[1] ?? null,
  };
}

async function counter(): Promise<Record<string, number>> {
  const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8000";
  return (await (await fetch(`${base}/next/spike/counter`)).json()) as Record<string, number>;
}

const base = () => process.env["E2E_BASE_URL"] ?? "http://localhost:8000";
const authorised = () => ({ Authorization: `JWT ${token}`, "content-type": "application/json" });

async function patchPage(
  id: number,
  query: string,
  body: unknown,
  extra: Record<string, string> = {},
) {
  const response = await fetch(`${base()}/api/pages/${id}?${query}`, {
    method: "PATCH",
    headers: { ...authorised(), ...extra },
    body: JSON.stringify(body),
  });
  expect(response.status, await response.clone().text()).toBe(200);
}

async function revalidate(tag: string, profile: "max" | "expire0") {
  const response = await fetch(
    `${base()}/next/spike/revalidate?tag=${encodeURIComponent(tag)}&profile=${profile}`,
    {
      method: "POST",
    },
  );
  expect(response.status).toBe(200);
}

/**
 * 'max' is stale-while-revalidate: request 1 may still show the old text and starts the refresh,
 * which takes about 300 ms (measured), so request 2 follows after a pause of 500 ms. Back to back,
 * request 2 would still see the old text. Returns the number of the first request that showed
 * `text`, or 0.
 */
async function freshWithinTwo(text: string): Promise<number> {
  if ((await titlesAt("/spike-cache")).html.includes(text)) return 1;
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (await titlesAt("/spike-cache")).html.includes(text) ? 2 : 0;
}

test.describe("cache", () => {
  test("a read of pages inside use cache serves the Greek title, and the second request is a hit", async () => {
    // pages:el is the tag of the el-CY market's read.
    await revalidate("pages:el", "expire0");
    const first = await titlesAt("/spike-cache");
    expect(first.status).toBe(200);
    expect(first.html).toContain(shared.greek.title);
    const before = await counter();
    const second = await titlesAt("/spike-cache");
    const third = await titlesAt("/spike-cache");
    const after = await counter();
    expect(second.run).toBe(third.run);
    expect(after["published:el"], "the loader did not run again").toBe(before["published:el"]);
    expect(Number(second.run)).toBeGreaterThan(0);
  });

  test("an admin edit shows within two requests", async () => {
    const edited = `${shared.greek.title} (edited)`;
    await page.goto(`/admin/collections/pages/${shared.pageId}?locale=el`);
    await field("title").fill(edited);
    await clickAndWait(/^Publish/, "PATCH", /^\/api\/pages\/\d+$/);
    await expect(page.getByText(/updated successfully/i).first()).toBeVisible();
    expect(await freshWithinTwo(edited), "the edit appeared in request 1 or 2").toBeGreaterThan(0);
    shared.greek.title = edited;
  });

  test("revalidateTag(tag, { expire: 0 }) from a route handler gives fresh content on the next request", async () => {
    const edited = `${shared.greek.title} (silent)`;
    // The header makes the spike's hook skip its own revalidation, so only the route handler acts.
    await patchPage(
      shared.pageId,
      "locale=el",
      { title: edited, _status: "published" },
      { "x-s1-skip-revalidate": "1" },
    );
    const stale = await titlesAt("/spike-cache");
    expect(
      stale.html,
      "no revalidation yet, so the cache still serves the old title",
    ).not.toContain(edited);
    await revalidate("pages:el", "expire0");
    const fresh = await titlesAt("/spike-cache");
    expect(fresh.html).toContain(edited);
    shared.greek.title = edited;
  });

  test("the same with 'max': stale first, fresh within two requests", async () => {
    const edited = `${shared.greek.title} (max)`;
    await patchPage(
      shared.pageId,
      "locale=el",
      { title: edited, _status: "published" },
      { "x-s1-skip-revalidate": "1" },
    );
    await revalidate("pages:el", "max");
    expect(await freshWithinTwo(edited)).toBeGreaterThan(0);
  });
});

test.describe("draft isolation (GHSA-3w37-wq28-93x7)", () => {
  const publicTitle = `PUBLIC-${stamp}`;
  const draftTitle = `DRAFT-MARKER-${stamp}`;
  let id = 0;

  test("a published page whose newest version is a draft", async () => {
    const created = await fetch(`${base()}/api/pages?locale=el`, {
      method: "POST",
      headers: authorised(),
      body: JSON.stringify({ title: publicTitle, slug: `pub-${stamp}`, _status: "published" }),
    });
    expect(created.status).toBe(201);
    id = ((await created.json()) as { doc: { id: number } }).doc.id;
    await patchPage(id, "locale=el&draft=true", { title: draftTitle, _status: "draft" });
    const readBack = await fetch(`${base()}/api/pages/${id}?locale=el&draft=true`, {
      headers: authorised(),
    });
    expect(((await readBack.json()) as { title: string }).title).toBe(draftTitle);
  });

  async function run(label: string) {
    const enabled = await fetch(`${base()}/next/spike/draft?on=1`);
    const cookie = enabled.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    expect(cookie).toContain("__prerender_bypass");
    const requests = Array.from({ length: 200 }, (_, i) => ({
      draft: i % 2 === 0,
      promise: titlesAt("/spike-cache/draft", i % 2 === 0 ? { cookie } : undefined),
    }));
    const results = await Promise.all(
      requests.map(async (r) => ({ draft: r.draft, ...(await r.promise) })),
    );
    const publicOnes = results.filter((r) => !r.draft);
    const draftOnes = results.filter((r) => r.draft);
    const leaked = publicOnes.filter((r) => r.html.includes(draftTitle));
    const publicWithout = publicOnes.filter((r) => r.html.includes(publicTitle));
    const draftWith = draftOnes.filter((r) => r.html.includes(draftTitle));
    console.log(
      `[${label}] public: ${publicOnes.length}, with the draft marker: ${leaked.length}, with the public title: ${publicWithout.length}; ` +
        `draft: ${draftOnes.length}, with the draft marker: ${draftWith.length}; non-200: ${results.filter((r) => r.status !== 200).length}`,
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(leaked, "no public response contains the draft marker").toHaveLength(0);
    expect(publicWithout.length, "public responses show the published title").toBe(
      publicOnes.length,
    );
    expect(draftWith.length, "draft responses show the draft title").toBe(draftOnes.length);
  }

  test("200 concurrent requests, mixed, on cold cache", async () => {
    await revalidate("pages:el", "expire0");
    await run("cold");
  });

  test("200 concurrent requests, mixed, on warm cache", async () => {
    await run("warm");
  });
});

test("the storefront's pages open in a browser", async () => {
  for (const path of ["/spike-cache", "/us/spike-cache", "/spike-cache/draft"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByTestId("s1-run")).toBeVisible();
  }
});

test("the browser console had no errors or warnings", async () => {
  // A request to another host fails here: the cloud's proxy allows only listed domains, and the
  // admin asks Gravatar for the avatar (D18). That is the VM, not the product; a request to
  // this server that fails is not excused.
  const isLocal = (url: string) => ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
  const external = failedRequests.filter((r) => !isLocal(r.url));
  // A prefetch or a fetch that a navigation cancels is `ERR_ABORTED`: the browser's doing, not a failure.
  const local = failedRequests.filter((r) => isLocal(r.url) && r.error !== "net::ERR_ABORTED");
  console.log(
    `failed requests: ${failedRequests.length} (this server, not aborted: ${local.length}; aborted: ${failedRequests.filter((r) => r.error === "net::ERR_ABORTED").length}); other hosts: ` +
      [...new Set(external.map((r) => new URL(r.url).hostname))].join(", "),
  );
  expect(local, "no request to this server failed").toEqual([]);
  const judged = consoleMessages.filter(
    (m) => !(external.length > 0 && /^Failed to load resource: net::ERR_/.test(m.text)),
  );
  const summary = judged.map((m) => `${m.type} @ ${m.url}: ${m.text.slice(0, 400)}`);
  console.log(
    `console messages (${consoleMessages.length}, ${judged.length} judged):\n${summary.join("\n")}`,
  );
  expect(summary).toEqual([]);
});
