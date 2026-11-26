import { expect, test } from "./support/csp";
import { appEnv } from "./support/app-env";
import { marketsAdmin, type MarketsAdmin } from "./support/markets-admin";
import { adminToken, base, settled } from "./support/server";

// M7 D148 (3), T111: live preview for a country on its own domain. Switzerland gets a domain of its
// own for this suite (`ch.shopblok.test`, never visited), so its markets are no longer served on
// the admin's host; Payload's live preview then opens `/next/preview?path=/de-ch/…` on the admin's
// host (`live-preview.ts`, unit-tested there), and the proxy serves that market's page at its key
// only to staff in Draft Mode:
//
// - `/next/preview` sends a signed-in editor with the secret to `/de-ch/<slug>`;
// - there, with Draft Mode's and Payload's cookies, the draft in German, `<html lang="de-CH">`,
//   prices in CHF on the store page, `noindex`, `private, no-store`;
// - without either cookie, `/de-ch/…` is the 404 an internal key always is;
// - the exit route sends the editor to the published page on Switzerland's domain.
//
// It changes the market map every other suite reads, so it runs in the `markets-add` project, after
// the default ones; `afterAll` takes the domain away again and waits until the proxy has the old
// map back. `cms-preview.spec.ts` covers the rest of preview on the site's own host.

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

const DOMAIN = "ch.shopblok.test";
const MAP_TIMEOUT = 70_000;
const stamp = Date.now().toString(36);
const slug = `e2e-domain-${stamp}`;
const publishedTitle = `DOMAIN-PUBLISHED-${stamp}`;
const draftTitle = `DOMAIN-ENTWURF-${stamp}`;

let markets: MarketsAdmin;
let domainBefore: string | null = null;
let changed = false;
let token = "";
let pageId: number | undefined;
let draftCookie = "";

const staff = () => `payload-token=${token}`;
const jwt = () => ({ Authorization: `JWT ${token}`, "content-type": "application/json" });
/** As the admin's live-preview frame asks: same origin, so Payload takes its session cookie. */
const get = (target: string, cookie?: string) =>
  fetch(new URL(target, base()), {
    redirect: "manual",
    ...(cookie === undefined ? {} : { headers: { cookie, "sec-fetch-site": "same-origin" } }),
  });

/** `/next/preview`'s answer for this path, as staff with the secret. */
const preview = (path: string) =>
  get(
    `/next/preview?secret=${encodeURIComponent(appEnv("storefront", "PREVIEW_SECRET"))}&path=${encodeURIComponent(path)}`,
    staff(),
  );

/** The Draft Mode cookie a preview's answer sets (`__prerender_bypass`), or "". */
const bypassCookie = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .filter((value) => value?.startsWith("__prerender_bypass="))
    .join("; ");

const draftModeCookie = async (path: string) => bypassCookie(await preview(path));

/** The `/de-ch/…` answer the proxy gives staff in Draft Mode, once it has the new map. */
const previewStatus = async (target: string) =>
  (await get(target, `${draftCookie}; ${staff()}`)).status;

test.beforeAll(async () => {
  token = await adminToken();
  markets = await marketsAdmin();
  const swiss = (await markets.overview()).countries.find((country) => country.code === "ch");
  expect(swiss?.enabled, "Switzerland is open in the seeded map").toBe(true);
  domainBefore = swiss?.domain ?? null;

  // A published German page, then a draft over it.
  const created = await fetch(`${base()}/api/pages?locale=en`, {
    method: "POST",
    headers: jwt(),
    body: JSON.stringify({ title: publishedTitle, slug, _status: "published" }),
  });
  expect(created.status, await created.clone().text()).toBe(201);
  pageId = ((await created.json()) as { doc: { id: number } }).doc.id;
  const german = await fetch(`${base()}/api/pages/${pageId}?locale=de`, {
    method: "PATCH",
    headers: jwt(),
    body: JSON.stringify({ title: publishedTitle, slug, _status: "published" }),
  });
  expect(german.status, await german.clone().text()).toBe(200);
  const draft = await fetch(`${base()}/api/pages/${pageId}?locale=de&draft=true`, {
    method: "PATCH",
    headers: jwt(),
    body: JSON.stringify({ title: draftTitle, _status: "draft" }),
  });
  expect(draft.status, await draft.clone().text()).toBe(200);

  await settled("/next/markets");
  changed = true;
  await markets.saveCountry("ch", { domain: DOMAIN });
});

test.afterAll(async () => {
  // Its own budget: the map can take a minute to reach the proxy (the route's 30 s, then the
  // proxy's stale-while-revalidate), and the next suites must not start before it has.
  test.setTimeout(4 * MAP_TIMEOUT);
  if (pageId !== undefined)
    await fetch(`${base()}/api/pages/${pageId}`, { method: "DELETE", headers: jwt() }).catch(
      () => undefined,
    );
  if (!changed) return;
  await markets.saveCountry("ch", { domain: domainBefore });
  // The next suites read the map: the proxy has Switzerland back on this host before they start.
  // Only staff in Draft Mode see a difference at `/de-ch` (the own-domain preview, then the 404 of
  // an internal key once the domain is gone), so the check takes a Draft Mode cookie of its own
  // when the first test never got one.
  const cookie = draftCookie !== "" ? draftCookie : await draftModeCookie("/");
  await expect
    .poll(async () => (await get("/de-ch", `${cookie}; ${staff()}`)).status, {
      timeout: 2 * MAP_TIMEOUT,
      intervals: [2_000],
    })
    .toBe(404);
});

test("/next/preview sends staff with the secret to the Swiss page at its key", async () => {
  const path = `/de-ch/${slug}`;
  // The preview route reads the market map itself (30 s at most behind the save).
  await expect.poll(async () => (await preview(path)).status, { timeout: MAP_TIMEOUT }).toBe(307);
  const response = await preview(path);
  expect(response.headers.get("location")).toBe(path);
  draftCookie = bypassCookie(response);
  expect(draftCookie).not.toBe("");
});

test("the draft shows in German with Swiss prices, noindex and never stored", async () => {
  await expect
    .poll(() => previewStatus(`/de-ch/${slug}`), { timeout: MAP_TIMEOUT, intervals: [2_000] })
    .toBe(200);
  const page = await get(`/de-ch/${slug}`, `${draftCookie}; ${staff()}`);
  const html = await page.text();
  expect(/data-slot="cms-page-title"[^>]*>([^<]*)</.exec(html)?.[1]).toBe(draftTitle);
  expect(html).toContain('lang="de-CH"');
  expect(page.headers.get("x-robots-tag")).toBe("noindex");
  expect(page.headers.get("cache-control") ?? "").toContain("no-store");

  const store = await get("/de-ch/store", `${draftCookie}; ${staff()}`);
  expect(store.status).toBe(200);
  expect(await store.text(), "the store's prices in Swiss francs").toMatch(/CHF/);
});

test("anyone else gets the 404 of an internal key", async () => {
  for (const [what, cookie] of [
    ["a visitor", undefined],
    ["Draft Mode alone", draftCookie],
    ["a Payload session alone", staff()],
  ] as const) {
    expect((await get(`/de-ch/${slug}`, cookie)).status, what).toBe(404);
  }
});

test("leaving preview goes to the published page on Switzerland's domain", async () => {
  const exit = await fetch(
    `${base()}/next/exit-preview?path=${encodeURIComponent(`/de-ch/${slug}`)}`,
    { method: "POST", redirect: "manual", headers: { cookie: draftCookie } },
  );
  expect(exit.status).toBe(303);
  expect(exit.headers.get("location")).toBe(`https://${DOMAIN}/${slug}`);
});
