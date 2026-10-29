import { expect, test, type Browser } from "@playwright/test";
import { appEnv } from "./support/app-env";
import { adminToken, base, freshWithinTwo } from "./support/server";

// T59 (D73, D74): preview and scheduled publishing, end to end, against a production build.
//
// - A draft saved over a published page stays out of every public response; `/next/preview` needs
//   both the secret and a Payload session, and only then shows the draft, `private, no-store`.
// - Draft Mode without a session (the editor signed out) shows the published page again; the
//   exit route turns it off and never redirects off-site.
// - A scheduled publish happens when `/api/payload-jobs/run` is called with the cron secret, and
//   the endpoint refuses a call without it, and the integration's API key too.
//
// The page is read at its own address, `{m}/[...slug]` (T65). Requests go from Node with the
// cookies set by hand,
// as `payload-cache.spec.ts` does: Draft Mode's cookie is `Secure`, and a browser on
// http://localhost would not send it with `page.request`.

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now().toString(36);
const publishedTitle = `PREVIEW-PUBLISHED-${stamp}`;
const draftTitle = `PREVIEW-DRAFT-${stamp}`;
const slug = `e2e-preview-${stamp}`;
// Greek is the primary market's language: its pages sit at `/…`.
const pagePath = `/${slug}`;
/** A string only the live-preview island's code contains (`@payloadcms/live-preview`). */
const ISLAND_MARKER = "payload-document-event";

let token = "";
let draftCookie = "";
const created: number[] = [];

const jwt = () => ({ Authorization: `JWT ${token}`, "content-type": "application/json" });
const session = () => `payload-token=${token}`;
/**
 * A request as the browser makes it in the admin's live-preview frame: same origin. Payload takes
 * its session cookie only from such a request (no `Origin`, `Sec-Fetch-Site: same-origin`), so a
 * cross-site page cannot preview with an editor's cookie.
 */
const browser = (cookie: string) => ({ cookie, "sec-fetch-site": "same-origin" });
const get = (path: string, cookie?: string) =>
  fetch(new URL(path, base()), {
    redirect: "manual",
    ...(cookie === undefined ? {} : { headers: browser(cookie) }),
  });

/** The title the test page shows, and whether it says it is a draft. */
async function shown(cookie?: string) {
  const response = await get(pagePath, cookie);
  const html = await response.text();
  return {
    status: response.status,
    cacheControl: response.headers.get("cache-control") ?? "",
    title: /data-slot="cms-page-title"[^>]*>([^<]*)</.exec(html)?.[1] ?? null,
    html,
  };
}

/**
 * Whether a browser showing the test page loads the live-preview listener's code: the island
 * fetches it on demand (`refresh-on-save.tsx`), so only a real page load tells. `cookies` are the
 * Draft Mode and Payload cookies, or none for a visitor.
 */
async function loadsIsland(browser: Browser, cookies: Record<string, string>): Promise<boolean> {
  const context = await browser.newContext({ baseURL: base() });
  await context.addCookies(
    Object.entries(cookies).map(([name, value]) => ({ name, value, url: base() })),
  );
  const page = await context.newPage();
  const scripts: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") {
      scripts.push(response.text().catch(() => ""));
    }
  });
  await page.goto(pagePath);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  const bodies = await Promise.all(scripts);
  await context.close();
  return bodies.some((body) => body.includes(ISLAND_MARKER));
}

/** `name=value` pairs of a cookie header, as an object. */
const cookieMap = (header: string) =>
  Object.fromEntries(header.split("; ").map((pair) => pair.split("=", 2) as [string, string]));

async function createPage(
  title: string,
  pageSlug: string,
  status: "published" | "draft",
  locale = "el",
) {
  const response = await fetch(`${base()}/api/pages?locale=${locale}`, {
    method: "POST",
    headers: jwt(),
    body: JSON.stringify({ title, slug: pageSlug, _status: status }),
  });
  expect(response.status, await response.clone().text()).toBe(201);
  const id = ((await response.json()) as { doc: { id: number } }).doc.id;
  created.push(id);
  return id;
}

test.beforeAll(async () => {
  token = await adminToken();
});

test.afterAll(async () => {
  for (const id of created) {
    await fetch(`${base()}/api/pages/${id}`, { method: "DELETE", headers: jwt() }).catch(
      () => undefined,
    );
  }
});

test("the admin saves a draft over a published page; a visitor sees the published title", async () => {
  const id = await createPage(publishedTitle, slug, "published");
  // As the admin's Save Draft and autosave do: `?draft=true`, only the versions table changes.
  const saved = await fetch(`${base()}/api/pages/${id}?locale=el&draft=true`, {
    method: "PATCH",
    headers: jwt(),
    body: JSON.stringify({ title: draftTitle, _status: "draft" }),
  });
  expect(saved.status, await saved.clone().text()).toBe(200);

  const visitor = await shown();
  expect(visitor.status).toBe(200);
  expect(visitor.title).toBe(publishedTitle);
  expect(visitor.html).not.toContain(draftTitle);
});

test("/next/preview refuses a missing session and a wrong secret with 401", async () => {
  const secret = appEnv("storefront", "PREVIEW_SECRET");
  const path = encodeURIComponent(pagePath);
  const noSession = await get(`/next/preview?secret=${encodeURIComponent(secret)}&path=${path}`);
  expect(noSession.status).toBe(401);
  expect(noSession.headers.getSetCookie().join(";")).not.toContain("__prerender_bypass");
  const wrongSecret = await get(`/next/preview?secret=nope&path=${path}`, session());
  expect(wrongSecret.status).toBe(401);
  // The editor's cookie sent by another site (a link or a frame elsewhere) is no session.
  const crossSite = await fetch(
    `${base()}/next/preview?secret=${encodeURIComponent(secret)}&path=${path}`,
    { redirect: "manual", headers: { cookie: session(), "sec-fetch-site": "cross-site" } },
  );
  expect(crossSite.status).toBe(401);
  const offSite = await get(
    `/next/preview?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent("//evil.example")}`,
    session(),
  );
  expect(offSite.status).toBe(400);
});

test("with the secret and a session: Draft Mode, the draft title, private and not stored", async ({
  browser,
}) => {
  const secret = appEnv("storefront", "PREVIEW_SECRET");
  const response = await get(
    `/next/preview?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(pagePath)}`,
    session(),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(pagePath);
  draftCookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .filter((value) => value?.startsWith("__prerender_bypass="))
    .join("; ");
  expect(draftCookie).not.toBe("");

  const editor = await shown(`${draftCookie}; ${session()}`);
  expect(editor.title).toBe(draftTitle);
  expect(editor.cacheControl).toContain("private");
  expect(editor.cacheControl).toContain("no-store");
  expect(
    await loadsIsland(browser, cookieMap(`${draftCookie}; ${session()}`)),
    "the live-preview island loads on the draft page",
  ).toBe(true);

  // Meanwhile a visitor still gets the published page, without the island's code.
  const visitor = await shown();
  expect(visitor.title).toBe(publishedTitle);
  expect(await loadsIsland(browser, {}), "a published page does not load the island").toBe(false);
});

test("signed out of Payload, the same browser in Draft Mode sees the published title", async () => {
  const signedOut = await shown(draftCookie);
  expect(signedOut.title).toBe(publishedTitle);
  expect(signedOut.html).not.toContain(draftTitle);
});

test("/next/exit-preview turns Draft Mode off and never leaves the site", async () => {
  const exit = (path: string) =>
    fetch(`${base()}/next/exit-preview`, {
      method: "POST",
      redirect: "manual",
      headers: {
        ...browser(`${draftCookie}; ${session()}`),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ path }),
    });
  const back = await exit(pagePath);
  expect(back.status).toBe(303);
  expect(back.headers.get("location")).toBe(pagePath);
  const cleared = back.headers
    .getSetCookie()
    .find((value) => value.startsWith("__prerender_bypass="));
  expect(cleared, "the Draft Mode cookie is cleared").toMatch(/Expires=Thu, 01 Jan 1970/i);
  // A browser drops the cleared cookie: the next request carries only the session.
  expect((await shown(session())).title).toBe(publishedTitle);

  const offSite = await exit("//evil.example");
  expect(offSite.status).toBe(303);
  expect(offSite.headers.get("location"), "the market's home, not another site").toBe("/");
  // GET is not a way to turn preview off (a link or an image cannot).
  expect((await get("/next/exit-preview")).status).toBe(405);
});

test("a scheduled publish runs when the jobs endpoint is called with the cron secret", async () => {
  const run = (headers: Record<string, string> = {}) =>
    fetch(`${base()}/api/payload-jobs/run`, { headers });
  expect((await run()).status, "no credentials").toBe(401);
  const integration = `integrations API-Key ${appEnv("backend", "PAYLOAD_API_KEY")}`;
  expect((await run({ Authorization: integration })).status, "the integration's key").toBe(401);
  expect((await run({ Authorization: "Bearer nope" })).status, "a wrong secret").toBe(401);

  const title = `SCHEDULED-${stamp}`;
  // In English: the job publishes every language and validates the default one, as the admin's
  // Publish does, so a page with no English title would fail with "invalid fields: Title, Slug".
  const id = await createPage(title, `e2e-scheduled-${stamp}`, "draft", "en");
  const queued = await fetch(`${base()}/next/e2e/schedule-publish?id=${id}&in=5`, {
    method: "POST",
  });
  expect(queued.status, await queued.clone().text()).toBe(200);
  const { waitUntil } = (await queued.json()) as { waitUntil: string };

  const cron = { Authorization: `Bearer ${appEnv("storefront", "CRON_SECRET")}` };
  const visitorRead = () => fetch(`${base()}/api/pages/${id}?locale=en`);
  const address = `${base()}/us/e2e-scheduled-${stamp}`;
  // Not due yet: the run leaves it alone.
  expect((await run(cron)).status).toBe(200);
  expect((await visitorRead()).status, "still a draft before its time").toBe(404);
  expect((await fetch(address)).status, "no page at its address yet").toBe(404);

  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, Date.parse(waitUntil) - Date.now()) + 500),
  );
  expect((await run(cron)).status).toBe(200);
  const published = await visitorRead();
  expect(published.status, "published by the job").toBe(200);
  expect(((await published.json()) as { title: string }).title).toBe(title);
  // And the page answers at its address (the publish revalidated the pages' addresses).
  const shows = async () => {
    const response = await fetch(address);
    return response.status === 200 && (await response.text()).includes(`${title}</h1>`);
  };
  expect(await freshWithinTwo(shows, 1_500), "the page at /us/…").toBeGreaterThan(0);
});
