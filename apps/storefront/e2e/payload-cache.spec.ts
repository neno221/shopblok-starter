import { expect, test, type Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";

// ADR 0001 (Accepted: Cache Components stay on with the embedded Payload admin) rests on three
// behaviours that S1 measured once, on a throwaway branch (commit `dbfec6e`), and that a new
// `next` or `payload` could break without anyone noticing. Plan T17 step 4 moves them here, so
// `e2e-smoke` runs them on every PR, Renovate's included:
//
//   1. a Payload Local API read inside `"use cache"` is served from the cache (a counter in the
//      loader does not move on a second request);
//   2. a save in the admin shows within two requests (the `pages` hook calls
//      `revalidateTag(tag, 'max')` inside Payload's REST handler), and `revalidateTag` from a
//      route handler works with `{ expire: 0 }` (fresh on the next request) and `'max'`;
//   3. draft isolation (GHSA-3w37-wq28-93x7): 200 concurrent requests, half with the Draft Mode
//      cookie, and no public response carries the draft.
//
// They need routes the shop itself does not have, under `/next/e2e`. Those answer 404 unless the
// server was started with E2E_TEST_ROUTES=true (`src/lib/e2e/gate.ts`), which only CI's
// `e2e-smoke` does: both it and a deployment run a production build, so the gate is read at run
// time. Without the variable this file fails in its first test with that hint.
//
// Differences from the prototype, on purpose: the reads are served by route handlers and not by
// pages under `[market]` (a page cannot read an environment variable at run time without becoming
// dynamic, and a public page for a test would be in every deployment); the first-user form, the
// media drawer and the dev-mode console are not here (SETUP.md, "Docs, ADRs and spec v0.6 (T17)").

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now().toString(36);
const base = () => process.env["E2E_BASE_URL"] ?? "http://localhost:8000";

let page: Page;
let token = "";
const created: number[] = [];

const authorised = () => ({ Authorization: `JWT ${token}`, "content-type": "application/json" });
const field = (name: string) => page.locator(`input[name="${name}"]:visible`);

type Read = { status: number; runId: number | null; draft: boolean | null; titles: string[] };

/** One of the test-only reads, as plain data. */
async function read(path: string, headers?: Record<string, string>): Promise<Read> {
  const response = await fetch(new URL(path, base()), {
    ...(headers === undefined ? {} : { headers }),
    redirect: "manual",
  });
  const text = await response.text();
  let body: Partial<{ runId: number; draft: boolean; titles: string[] }> = {};
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    // Not JSON (a 404 page): the status says what happened.
  }
  return {
    status: response.status,
    runId: body.runId ?? null,
    draft: body.draft ?? null,
    titles: body.titles ?? [],
  };
}

async function counter(): Promise<Record<string, number>> {
  const response = await fetch(`${base()}/next/e2e/counter`);
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, number>;
}

async function revalidate(tag: string, profile: "max" | "expire0") {
  const response = await fetch(
    `${base()}/next/e2e/revalidate?tag=${encodeURIComponent(tag)}&profile=${profile}`,
    { method: "POST" },
  );
  expect(response.status, await response.clone().text()).toBe(200);
}

async function createPage(title: string, slug: string, status: "published" | "draft") {
  const response = await fetch(`${base()}/api/pages?locale=el`, {
    method: "POST",
    headers: authorised(),
    body: JSON.stringify({ title, slug, _status: status }),
  });
  expect(response.status, await response.clone().text()).toBe(201);
  const id = ((await response.json()) as { doc: { id: number } }).doc.id;
  created.push(id);
  return id;
}

async function patchPage(id: number, query: string, body: unknown) {
  const response = await fetch(`${base()}/api/pages/${id}?${query}`, {
    method: "PATCH",
    headers: authorised(),
    body: JSON.stringify(body),
  });
  expect(response.status, await response.clone().text()).toBe(200);
}

/**
 * `'max'` is stale-while-revalidate: request 1 may still show the old text and starts the refresh,
 * which took about 300 ms in S1, so request 2 follows after a pause of 500 ms (back to back it
 * would still see the old text). Returns the number of the first request that showed `text`, or 0.
 */
async function freshWithinTwo(path: string, text: string): Promise<number> {
  if ((await read(path)).titles.includes(text)) return 1;
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (await read(path)).titles.includes(text) ? 2 : 0;
}

test.beforeAll(async ({ browser, baseURL }) => {
  page = await browser.newPage({ baseURL: baseURL ?? "http://localhost:8000" });
  const { email, password } = adminCredentials();
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
  // A token for the requests made from Node: `page.request` does not send the Secure cookie to
  // http://localhost (SETUP.md, T11), and these have no page to run in.
  token = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return ((await response.json()) as { token?: string }).token ?? "";
    },
    { email, password },
  );
});

test.afterAll(async () => {
  // Not a test: leave the database as found, whatever failed above.
  for (const id of created) {
    await fetch(`${base()}/api/pages/${id}`, { method: "DELETE", headers: authorised() }).catch(
      () => undefined,
    );
  }
  await page?.close();
});

test.describe("the test-only routes", () => {
  test("are open on this server (E2E_TEST_ROUTES=true), and a login gave a token", async () => {
    expect(token, "an admin token").not.toBe("");
    const response = await fetch(`${base()}/next/e2e/counter`);
    expect(
      response.status,
      "GET /next/e2e/counter answers 404 unless the server was started with E2E_TEST_ROUTES=true",
    ).toBe(200);
  });

  test("answer for the Greek language the specs use, and refuse anything that is not a language", async () => {
    expect((await read("/next/e2e/pages?locale=el")).status).toBe(200);
    expect((await read("/next/e2e/pages?locale=../etc")).status).toBe(400);
  });
});

test.describe("cache", () => {
  const title = `Cache page ${stamp}`;
  let id = 0;
  let current = title;

  test("a page to read", async () => {
    id = await createPage(title, `e2e-cache-${stamp}`, "published");
    expect(id).toBeGreaterThan(0);
  });

  test("a read of pages inside use cache serves the Greek title, and the second request is a hit", async () => {
    await revalidate("e2e:pages:el", "expire0");
    const first = await read("/next/e2e/pages-by-tag?locale=el");
    expect(first.status).toBe(200);
    expect(first.titles).toContain(current);
    const before = await counter();
    const second = await read("/next/e2e/pages-by-tag?locale=el");
    const third = await read("/next/e2e/pages-by-tag?locale=el");
    const after = await counter();
    expect(second.runId).toBe(first.runId);
    expect(third.runId).toBe(first.runId);
    expect(after["by-tag:el"], "the loader did not run again").toBe(before["by-tag:el"]);
    expect(Number(second.runId)).toBeGreaterThan(0);
  });

  test("an admin edit shows within two requests (the pages hook revalidates with 'max')", async () => {
    // The hook revalidates `pages:el` and `payload:pages`, which `/next/e2e/pages` carries. Start
    // from an entry that holds the page, whatever an earlier read left behind.
    await revalidate("pages:el", "expire0");
    expect((await read("/next/e2e/pages?locale=el")).titles).toContain(current);
    const edited = `${title} (edited)`;
    await page.goto(`/admin/collections/pages/${id}?locale=el`);
    await field("title").fill(edited);
    const [saved] = await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === "PATCH" && new URL(r.url()).pathname === `/api/pages/${id}`,
        { timeout: 30_000 },
      ),
      page.getByRole("button", { name: /^Publish/ }).click(),
    ]);
    expect(saved.status()).toBeLessThan(300);
    expect(
      await freshWithinTwo("/next/e2e/pages?locale=el", edited),
      "the edit appeared in request 1 or 2",
    ).toBeGreaterThan(0);
    current = edited;
  });

  test("revalidateTag(tag, { expire: 0 }) from a route handler gives fresh content on the next request", async () => {
    const path = "/next/e2e/pages-by-tag?locale=el";
    // Warm: the entry holds the current title.
    await revalidate("e2e:pages:el", "expire0");
    expect((await read(path)).titles).toContain(current);
    // No hook touches this tag, so only the route handler below can refresh the entry.
    const edited = `${title} (silent)`;
    await patchPage(id, "locale=el", { title: edited, _status: "published" });
    const stale = await read(path);
    expect(stale.titles, "no revalidation yet, so the cache still serves the old title").toContain(
      current,
    );
    expect(stale.titles).not.toContain(edited);
    await revalidate("e2e:pages:el", "expire0");
    const fresh = await read(path);
    expect(fresh.titles).toContain(edited);
    current = edited;
  });

  test("the same with 'max': fresh within two requests", async () => {
    const path = "/next/e2e/pages-by-tag?locale=el";
    const edited = `${title} (max)`;
    await patchPage(id, "locale=el", { title: edited, _status: "published" });
    await revalidate("e2e:pages:el", "max");
    expect(await freshWithinTwo(path, edited)).toBeGreaterThan(0);
  });

  test("a tag that is not the entry's changes nothing", async () => {
    const path = "/next/e2e/pages-by-tag?locale=el";
    const before = await read(path);
    await revalidate("e2e:pages:de", "expire0");
    const after = await read(path);
    expect(after.runId, "the Greek entry was not refreshed by the German tag").toBe(before.runId);
  });
});

test.describe("draft isolation (GHSA-3w37-wq28-93x7)", () => {
  const publicTitle = `PUBLIC-${stamp}`;
  const draftTitle = `DRAFT-MARKER-${stamp}`;

  test("a published page whose newest version is a draft", async () => {
    const id = await createPage(publicTitle, `e2e-pub-${stamp}`, "published");
    await patchPage(id, "locale=el&draft=true", { title: draftTitle, _status: "draft" });
    const readBack = await fetch(`${base()}/api/pages/${id}?locale=el&draft=true`, {
      headers: authorised(),
    });
    expect(((await readBack.json()) as { title: string }).title).toBe(draftTitle);
    // The public read sees the published title and nothing else.
    const visitor = await fetch(`${base()}/api/pages/${id}?locale=el`);
    expect(((await visitor.json()) as { title: string }).title).toBe(publicTitle);
  });

  async function run(label: string) {
    const enabled = await fetch(`${base()}/next/e2e/draft?on=1`);
    expect(enabled.status).toBe(200);
    const cookie = enabled.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    expect(cookie).toContain("__prerender_bypass");
    const results = await Promise.all(
      Array.from({ length: 200 }, async (_, i) => {
        const asDraft = i % 2 === 0;
        return {
          asDraft,
          ...(await read("/next/e2e/preview?locale=el", asDraft ? { cookie } : undefined)),
        };
      }),
    );
    const publicOnes = results.filter((r) => !r.asDraft);
    const draftOnes = results.filter((r) => r.asDraft);
    const leaked = publicOnes.filter((r) => r.titles.includes(draftTitle));
    const publicWith = publicOnes.filter((r) => r.titles.includes(publicTitle));
    const draftWith = draftOnes.filter((r) => r.titles.includes(draftTitle));
    console.log(
      `[${label}] public: ${publicOnes.length}, with the draft marker: ${leaked.length}, with the public title: ${publicWith.length}; ` +
        `draft: ${draftOnes.length}, with the draft marker: ${draftWith.length}; non-200: ${results.filter((r) => r.status !== 200).length}`,
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(leaked, "no public response contains the draft marker").toHaveLength(0);
    expect(publicWith.length, "public responses show the published title").toBe(publicOnes.length);
    expect(draftWith.length, "draft responses show the draft title").toBe(draftOnes.length);
    expect(
      publicOnes.every((r) => r.draft === false),
      "public responses are not marked as drafts",
    ).toBe(true);
  }

  test("200 concurrent requests, mixed, on a cold cache", async () => {
    await revalidate("e2e:preview:el", "expire0");
    await run("cold");
  });

  test("200 concurrent requests, mixed, on a warm cache", async () => {
    await run("warm");
  });

  test("Draft Mode off again", async () => {
    const response = await fetch(`${base()}/next/e2e/draft?on=0`);
    expect(response.status).toBe(200);
  });
});
