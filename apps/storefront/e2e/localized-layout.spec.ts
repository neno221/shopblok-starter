import { expect, test } from "@playwright/test";
import { appEnv } from "./support/app-env";
import { rest } from "./support/payload-rest";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T88 (D105): a page's own layout per language, against a production build.
//
// - Off (M4's way): every language draws the shared `layout`, each with its own texts.
// - Switched on: each language draws its own `localizedLayout`. The switch copies the shared blocks
//   into every language the page is translated into, with its texts, so nothing a visitor sees
//   changes; a language the page is not translated into (German here) shows English's.
// - A block added to the Greek layout only shows on `/…` (Cyprus, Greek) and not on `/us/…` or
//   `/de/…`; a Greek draft with another block shows in Draft Mode (live preview) and to no visitor.
// - Switched off again: the shared layout, as before; the Greek layout is kept for the next time.
//
// The page made here is deleted at the end.

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now().toString(36);
const slug = { en: `layout-${stamp}`, el: `διάταξη-${stamp}` };
const path = { en: `/us/${slug.en}`, el: `/${slug.el}`, de: `/de/${slug.en}` };
const SHARED = { en: `Shared offer ${stamp}`, el: `Κοινή προσφορά ${stamp}` };
const GREEK_ONLY = `Μόνο στα ελληνικά ${stamp}`;
const GREEK_DRAFT = `Ελληνικό πρόχειρο ${stamp}`;

/** A path as the browser sends it: each segment percent-encoded. */
const encoded = (each: string) => each.split("/").map(encodeURIComponent).join("/");

let token = "";
let id = 0;
let promoId = "";

const api = <T>(method: string, apiPath: string, body?: unknown) =>
  rest<T>(token, method, apiPath, body);

/** Saves the page in `locale` and checks Payload took it; published unless `draft`. */
async function save(locale: string, data: Record<string, unknown>, draft = false) {
  const answer = await api(
    "PATCH",
    `/api/pages/${id}?locale=${locale}${draft ? "&draft=true" : ""}`,
    draft ? data : { ...data, _status: "published" },
  );
  expect(answer.status, answer.text).toBe(200);
}

/** The page's HTML at `market`'s address, as a visitor (no cookie) or with `cookie`. */
async function html(market: keyof typeof path, cookie?: string): Promise<string> {
  const response = await fetch(`${base()}${encoded(path[market])}`, {
    redirect: "manual",
    ...(cookie === undefined ? {} : { headers: { cookie, "sec-fetch-site": "same-origin" } }),
  });
  expect(response.status, `${path[market]} answered ${response.status}`).toBe(200);
  return response.text();
}

/** Whether a visitor of `market` sees every text of `shown` and none of `hidden`, by request two. */
async function visitorSees(market: keyof typeof path, shown: string[], hidden: string[] = []) {
  const sees = async () => {
    const page = await html(market);
    return shown.every((text) => page.includes(text)) && hidden.every((t) => !page.includes(t));
  };
  return freshWithinTwo(sees, 1_500);
}

/** The page's own layout in Greek as the latest version has it (no fallback). */
async function greekLayout(): Promise<Record<string, unknown>[]> {
  const answer = await api<{ localizedLayout?: Record<string, unknown>[] }>(
    "GET",
    `/api/pages/${id}?locale=el&fallback-locale=none&draft=true&depth=0`,
  );
  expect(answer.status, answer.text).toBe(200);
  return answer.json().localizedLayout ?? [];
}

test.beforeAll(async () => {
  token = await adminToken();
  const created = await api<{ doc: { id: number; layout: { id: string }[] } }>(
    "POST",
    "/api/pages?locale=en",
    {
      title: `Layout ${stamp}`,
      slug: slug.en,
      layout: [{ blockType: "promoBanner", heading: SHARED.en }],
      _status: "published",
    },
  );
  expect(created.status, created.text).toBe(201);
  id = created.json().doc.id;
  promoId = created.json().doc.layout[0]?.id ?? "";
  await save("el", {
    title: `Διάταξη ${stamp}`,
    slug: slug.el,
    layout: [{ id: promoId, blockType: "promoBanner", heading: SHARED.el }],
  });
});

test.afterAll(async () => {
  if (id !== 0) await api("DELETE", `/api/pages/${id}`).catch(() => undefined);
});

test("off: every language draws the shared layout with its own texts (M4)", async () => {
  expect(await visitorSees("en", [SHARED.en])).toBeGreaterThan(0);
  expect(await visitorSees("el", [SHARED.el])).toBeGreaterThan(0);
  // German has no translation: English's texts, by the fallback.
  expect(await visitorSees("de", [SHARED.en])).toBeGreaterThan(0);
});

test("switching it on copies the blocks into each translated language: nothing a visitor sees changes", async () => {
  for (const market of ["en", "el", "de"] as const) await settled(encoded(path[market]));
  await save("en", { layoutPerLanguage: true });
  const copy = await greekLayout();
  expect(copy.map((block) => [block["blockType"], block["heading"]])).toEqual([
    ["promoBanner", SHARED.el],
  ]);
  // A copy of its own: new ids, so the languages' rows never meet.
  expect(copy[0]?.["id"]).not.toBe(promoId);
  expect(await visitorSees("en", [SHARED.en])).toBeGreaterThan(0);
  expect(await visitorSees("el", [SHARED.el])).toBeGreaterThan(0);
  expect(await visitorSees("de", [SHARED.en])).toBeGreaterThan(0);
});

test("a block added to the Greek layout only shows on / and not on /us or /de", async () => {
  for (const market of ["en", "el", "de"] as const) await settled(encoded(path[market]));
  const greek = await greekLayout();
  await save("el", {
    localizedLayout: [...greek, { blockType: "promoBanner", heading: GREEK_ONLY }],
  });
  expect(await visitorSees("el", [SHARED.el, GREEK_ONLY])).toBeGreaterThan(0);
  // English's own layout, and German's by the fallback: without the Greek block.
  expect(await visitorSees("en", [SHARED.en], [GREEK_ONLY])).toBeGreaterThan(0);
  expect(await visitorSees("de", [SHARED.en], [GREEK_ONLY])).toBeGreaterThan(0);
});

test("a Greek draft of the layout shows in Draft Mode (live preview) and to no visitor", async () => {
  const greek = await greekLayout();
  await save(
    "el",
    { localizedLayout: [...greek, { blockType: "promoBanner", heading: GREEK_DRAFT }] },
    true,
  );
  const secret = appEnv("storefront", "PREVIEW_SECRET");
  const session = `payload-token=${token}`;
  const entered = await fetch(
    `${base()}/next/preview?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(encoded(path.el))}`,
    { redirect: "manual", headers: { cookie: session, "sec-fetch-site": "same-origin" } },
  );
  expect(entered.status).toBe(307);
  const bypass = entered.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .filter((value) => value?.startsWith("__prerender_bypass="))
    .join("; ");
  expect(bypass).not.toBe("");
  const editor = await html("el", `${bypass}; ${session}`);
  expect(editor).toContain(GREEK_DRAFT);
  expect(editor).toContain(GREEK_ONLY);
  const visitor = await html("el");
  expect(visitor).toContain(GREEK_ONLY);
  expect(visitor).not.toContain(GREEK_DRAFT);
  // The draft is published as it is, so the next test starts from a published page.
  await save("el", {});
});

test("switched off again: the shared layout in every language, and the Greek one kept", async () => {
  for (const market of ["en", "el"] as const) await settled(encoded(path[market]));
  await save("en", { layoutPerLanguage: false });
  expect(await visitorSees("el", [SHARED.el], [GREEK_ONLY, GREEK_DRAFT])).toBeGreaterThan(0);
  expect(await visitorSees("en", [SHARED.en])).toBeGreaterThan(0);
  expect((await greekLayout()).map((block) => block["heading"])).toEqual([
    SHARED.el,
    GREEK_ONLY,
    GREEK_DRAFT,
  ]);
});

test("a page whose blocks have ids of their own, as the seed's, publishes with the switch on and off (W7 item 1)", async () => {
  const own = `seed-like-${stamp}`;
  const created = await api<{ doc: { id: number } }>("POST", "/api/pages?locale=en", {
    title: `Seeded ${stamp}`,
    slug: `seeded-${stamp}`,
    layout: [
      {
        id: own,
        blockType: "uspBar",
        items: [{ id: `${own}-row`, icon: "delivery", title: SHARED.en }],
      },
    ],
    _status: "published",
  });
  expect(created.status, created.text).toBe(201);
  const seeded = created.json().doc.id;
  const call = (locale: string, data: Record<string, unknown>, draft = false) =>
    api(
      "PATCH",
      `/api/pages/${seeded}?locale=${locale}${draft ? "&draft=true" : ""}`,
      draft ? data : { ...data, _status: "published" },
    );
  try {
    const greek = await call("el", {
      title: `Σπορά ${stamp}`,
      slug: `spora-${stamp}`,
      layout: [
        {
          id: own,
          blockType: "uspBar",
          items: [{ id: `${own}-row`, icon: "delivery", title: SHARED.el }],
        },
      ],
    });
    expect(greek.status, greek.text).toBe(200);
    // As in the admin: the switch is saved as a draft (autosave), then published.
    const draft = await call("en", { layoutPerLanguage: true }, true);
    expect(draft.status, draft.text).toBe(200);
    const ids: string[] = [];
    for (const locale of ["en", "el"]) {
      const read = await api<{ localizedLayout?: { id: string; items: { id: string }[] }[] }>(
        "GET",
        `/api/pages/${seeded}?locale=${locale}&fallback-locale=none&draft=true&depth=0`,
      );
      for (const block of read.json().localizedLayout ?? [])
        ids.push(block.id, ...block.items.map((row) => row.id));
    }
    // Each language's copy of the block and of its row has an id of its own.
    expect(ids).toHaveLength(4);
    expect(new Set([own, `${own}-row`, ...ids]).size).toBe(6);
    const published = await call("en", {});
    expect(published.status, published.text).toBe(200);
    const off = await call("en", { layoutPerLanguage: false });
    expect(off.status, off.text).toBe(200);
  } finally {
    await api("DELETE", `/api/pages/${seeded}`).catch(() => undefined);
  }
});
