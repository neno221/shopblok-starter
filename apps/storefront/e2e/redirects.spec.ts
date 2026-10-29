import { expect, test } from "@playwright/test";
import { rest } from "./support/payload-rest";
import { adminToken, base } from "./support/server";

// T68 (D82): the CMS redirects, answered by the proxy from `/next/redirects` (no Payload in the
// proxy), against a production build with the seeded markets: Cyprus (Greek) at `/`, the US at
// `/us`, Germany at `/de`.
//
// - A redirect from `/old…` works in every market, at that market's own target: 301 on a GET and
//   308 on a POST; a 302 answers a POST with 307. It is answered within 65 s of its save.
// - One from `/de/…` works in Germany only.
// - One to a page goes to the page's address in each market's language.
// - On save, a loop, a `from` taken by another, one like `/old.html` and one under `/api` are refused
//   with the reason.
//
// Every redirect and page made here is deleted at the end.

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

const stamp = Date.now().toString(36);
const OLD = `/e2e-old-${stamp}`;
const TEMPORARY = `/e2e-sale-${stamp}`;
const GERMAN = `/e2e-alt-${stamp}`;
const TO_PAGE = `/e2e-about-${stamp}`;
const SLUG = { en: `about-${stamp}`, el: `σχετικά-${stamp}` };

let token = "";
const redirects: number[] = [];
let pageId = 0;

const api = <T>(method: string, path: string, body?: unknown) => rest<T>(token, method, path, body);

/** Saves a redirect and returns Payload's answer. */
const save = (data: Record<string, unknown>) =>
  api<{ doc: { id: number }; errors?: { data?: { errors?: { message: string }[] } }[] }>(
    "POST",
    "/api/redirects",
    data,
  );

async function create(data: Record<string, unknown>): Promise<number> {
  const answer = await save(data);
  expect(answer.status, answer.text).toBe(201);
  const { id } = answer.json().doc;
  redirects.push(id);
  return id;
}

/** What the shop answers for a path, from Node, without following a redirect. */
async function hit(path: string, method = "GET") {
  const response = await fetch(`${base()}${encodeURI(path)}`, {
    method,
    redirect: "manual",
    ...(method === "POST"
      ? { body: "a=1", headers: { "content-type": "application/x-www-form-urlencoded" } }
      : {}),
  });
  await response.body?.cancel();
  const location = response.headers.get("location");
  return {
    status: response.status,
    location: location === null ? null : decodeURI(new URL(location, base()).pathname),
  };
}

/** The reason Payload gave for refusing a save, field by field. */
const reasons = (answer: Awaited<ReturnType<typeof save>>) =>
  (answer.json().errors ?? []).flatMap((error) => error.data?.errors ?? []).map((e) => e.message);

test.beforeAll(async () => {
  token = await adminToken();
  const page = await api<{ doc: { id: number } }>("POST", "/api/pages?locale=en", {
    title: `About ${stamp}`,
    slug: SLUG.en,
    _status: "published",
  });
  expect(page.status, page.text).toBe(201);
  pageId = page.json().doc.id;
  const greek = await api("PATCH", `/api/pages/${pageId}?locale=el`, {
    title: `Σχετικά ${stamp}`,
    slug: SLUG.el,
    _status: "published",
  });
  expect(greek.status, greek.text).toBe(200);
});

test.afterAll(async () => {
  for (const id of redirects) await api("DELETE", `/api/redirects/${id}`).catch(() => undefined);
  if (pageId !== 0) await api("DELETE", `/api/pages/${pageId}`).catch(() => undefined);
});

test("a new redirect is answered within 65 s, in every market, at its own target", async () => {
  // The proxy holds a list from before the save, as a running shop does.
  expect((await hit(`/us${OLD}`)).status).toBe(404);
  const started = Date.now();
  await create({ from: OLD, to: { type: "custom", url: "/store" }, type: "301" });
  await create({ from: TEMPORARY, to: { type: "custom", url: "/store" }, type: "302" });
  await create({ from: `/de${GERMAN}`, to: { type: "custom", url: "/store" }, type: "301" });
  await create({
    from: TO_PAGE,
    to: { type: "reference", reference: { relationTo: "pages", value: pageId } },
    type: "301",
  });
  await expect
    .poll(async () => (await hit(`/us${OLD}`)).status, { timeout: 65_000, intervals: [1_000] })
    .toBe(301);
  const took = (Date.now() - started) / 1000;
  console.log(`redirects: the new redirect was answered after ${took.toFixed(1)} s`);
  expect(took).toBeLessThan(65);

  expect(await hit(OLD)).toEqual({ status: 301, location: "/store" });
  expect(await hit(`/us${OLD}`)).toEqual({ status: 301, location: "/us/store" });
  expect(await hit(`/de${OLD}`)).toEqual({ status: 301, location: "/de/store" });
});

test("a POST keeps its method: 308 for a 301, 307 for a 302; a GET gets the type", async () => {
  expect(await hit(`/us${OLD}`, "POST")).toEqual({ status: 308, location: "/us/store" });
  expect(await hit(`/us${TEMPORARY}`)).toEqual({ status: 302, location: "/us/store" });
  expect(await hit(`/us${TEMPORARY}`, "POST")).toEqual({ status: 307, location: "/us/store" });
});

test("a market-only redirect works in its market only", async () => {
  expect(await hit(`/de${GERMAN}`)).toEqual({ status: 301, location: "/de/store" });
  expect((await hit(`/us${GERMAN}`)).status).toBe(404);
  expect((await hit(GERMAN)).status).toBe(404);
});

test("a redirect to a page goes to its address in each market's language", async () => {
  expect(await hit(`/us${TO_PAGE}`)).toEqual({ status: 301, location: `/us/${SLUG.en}` });
  expect(await hit(TO_PAGE)).toEqual({ status: 301, location: `/${SLUG.el}` });
  // German has no slug of its own: English's, by the fallback.
  expect(await hit(`/de${TO_PAGE}`)).toEqual({ status: 301, location: `/de/${SLUG.en}` });
});

test("a loop, a taken from, a from like /old.html and one under /api are refused on save, with the reason", async () => {
  const self = await save({
    from: `/e2e-loop-${stamp}`,
    to: { type: "custom", url: `/e2e-loop-${stamp}` },
    type: "301",
  });
  expect(self.status).toBe(400);
  expect(reasons(self).join(" ")).toMatch(/its own address/);

  // To another redirect's from: a chain, refused the same way.
  const chain = await save({
    from: `/e2e-chain-${stamp}`,
    to: { type: "custom", url: OLD },
    type: "301",
  });
  expect(chain.status).toBe(400);
  expect(reasons(chain).join(" ")).toMatch(/which redirects too/);

  // To the page another redirect already sends to is fine; from the page's address is a loop.
  const toPage = await save({
    from: `/${SLUG.en}`,
    to: { type: "custom", url: "/store" },
    type: "301",
  });
  expect(toPage.status).toBe(400);
  expect(reasons(toPage).join(" ")).toMatch(/already redirects/);

  // The same address spelled another way: Payload's unique index would take it, and the proxy
  // would answer only the older one (PR 101 review, item 1).
  const twin = await save({
    from: `${OLD}/`,
    to: { type: "custom", url: "/journal" },
    type: "301",
  });
  expect(twin.status).toBe(400);
  expect(reasons(twin).join(" ")).toMatch(/same address/);

  const file = await save({
    from: `/old-${stamp}.html`,
    to: { type: "custom", url: "/store" },
    type: "301",
  });
  expect(file.status).toBe(400);
  expect(reasons(file).join(" ")).toMatch(/looks like a file/);

  const underApi = await save({
    from: `/api/old-${stamp}`,
    to: { type: "custom", url: "/store" },
    type: "301",
  });
  expect(underApi.status).toBe(400);
  expect(reasons(underApi).join(" ")).toMatch(/\/api never reach/);
});
