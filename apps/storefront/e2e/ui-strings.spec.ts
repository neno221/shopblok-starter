import { expect, test, type Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";
import { add } from "./support/purchase";

// T62 (D77): the shop's microcopy from Payload's `ui-strings`, over the code catalogs.
//
// - A Greek message edited in the admin shows on `/` within two requests, and `/us` keeps its
//   English: the save revalidates `ui-strings:<locale>` in every language, and each market reads
//   its own language.
// - A value that changes the English text's arguments is refused with the reason.
// - The CSV export has a column per language and imports back by key; a refused value in the file
//   is reported in the import's summary, and only admins may export or import.
// - An edit reaches copy drawn outside next-intl's request config too: the quick cart a server
//   action renders after an add.
// - A market switched to a language with no catalog shows English until its strings are
//   translated, and then the edited value.
//
// The last test saves the `markets` global, which the other suites read through the proxy, so
// playwright.config.ts runs this file in the `locales` project, after every other suite, and
// `afterAll` puts the global and every value it changed back.

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const stamp = Date.now().toString(36);
const base = () => process.env["E2E_BASE_URL"] ?? "http://localhost:8000";

/** The home page's "New arrivals" heading (T51). */
const HEADING = "templates.home.newArrivals";
/** A message with an argument: `{count, plural, …}`. */
const PLURAL = "atoms.stock.low";
/** The quick cart's title, which a server action draws after an add (T52), outside next-intl. */
const QUICK_TITLE = "organisms.quickCartDropdown.title";

type Doc = { id: number; key: string; value: Record<string, string | null> };

let page: Page;
let token = "";
let editorToken = "";
let editorId: number | undefined;
let originalMarkets: Record<string, unknown> | undefined;
/** Every document a test read, as it was before (all languages). */
const originals = new Map<number, Doc>();
/** The languages a test changed, by document: what `afterAll` puts back. */
const touched = new Map<number, Set<string>>();
const touch = (id: number, locale: string) =>
  touched.set(id, new Set([...(touched.get(id) ?? []), locale]));

const admin = () => ({ Authorization: `JWT ${token}`, Origin: new URL(base()).origin });
const json = (headers: Record<string, string>) => ({
  ...headers,
  "content-type": "application/json",
});

async function api(method: string, path: string, headers: Record<string, string>, body?: unknown) {
  return fetch(new URL(`/api${path}`, base()), {
    method,
    headers: body === undefined || body instanceof FormData ? headers : json(headers),
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  });
}

/** A document by key in every language, remembered the first time so `afterAll` can restore it. */
async function stringDoc(key: string): Promise<Doc> {
  const response = await api(
    "GET",
    `/ui-strings?where[key][equals]=${encodeURIComponent(key)}&locale=all&depth=0`,
    admin(),
  );
  expect(response.status).toBe(200);
  const doc = ((await response.json()) as { docs: Doc[] }).docs[0];
  if (doc === undefined) throw new Error(`no ui-strings document for ${key}: run pnpm bootstrap`);
  if (!originals.has(doc.id)) originals.set(doc.id, structuredClone(doc));
  return doc;
}

async function setValue(id: number, locale: string, value: string | null) {
  touch(id, locale);
  return api("PATCH", `/ui-strings/${id}?locale=${locale}`, admin(), { value });
}

async function html(path: string): Promise<string> {
  const response = await fetch(new URL(path, base()));
  expect(response.status, path).toBe(200);
  return response.text();
}

/**
 * `'max'` is stale-while-revalidate: request 1 may still show the old page and starts its
 * regeneration, which for a whole page (the home's Medusa reads included) takes longer than the
 * test routes' 300 ms, so request 2 follows after 2 s. Returns the number of the first request
 * that showed `text`, or 0.
 */
async function freshWithinTwo(path: string, text: string): Promise<number> {
  if ((await html(path)).includes(text)) return 1;
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  return (await html(path)).includes(text) ? 2 : 0;
}

/**
 * Waits until `path` is a page in `lang`: after a save of `markets` it can be a 404 for a moment,
 * since the proxy's map and the pages' are two caches (`current-market.ts`).
 */
async function waitForLanguage(path: string, lang: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await fetch(new URL(path, base()));
        return response.status === 200 && (await response.text()).includes(`<html lang="${lang}"`);
      },
      { message: `${path} is a page in ${lang}`, timeout: 180_000, intervals: [2_000] },
    )
    .toBe(true);
}

/** RFC 4180, as the plugin writes it: quoted fields may hold commas, quotes and line breaks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) rows.push([...row, cell]);
  return rows;
}

const toCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell))
        .join(","),
    )
    .join("\n");

async function exportCsv(headers: Record<string, string>) {
  return api("POST", "/exports/download", headers, {
    data: { collectionSlug: "ui-strings", format: "csv", locale: "all" },
  });
}

async function importCsv(csv: string, headers: Record<string, string>) {
  const form = new FormData();
  form.set("file", new Blob([csv], { type: "text/csv" }), `ui-strings-${stamp}.csv`);
  form.set(
    "_payload",
    JSON.stringify({ collectionSlug: "ui-strings", importMode: "update", matchField: "key" }),
  );
  return api("POST", "/imports", headers, form);
}

test.beforeAll(async ({ browser, baseURL }) => {
  const { email, password } = adminCredentials();
  const login = await api(
    "POST",
    "/users/login",
    { Origin: new URL(base()).origin },
    {
      email,
      password,
    },
  );
  expect(login.status, "bootstrap's admin logs in").toBe(200);
  token = ((await login.json()) as { token: string }).token;

  // An editor of our own, removed again in afterAll.
  const editorEmail = `strings-editor-${stamp}@example.com`;
  const editorPassword = `editor-${stamp}-password`;
  const editor = await api("POST", "/users", admin(), {
    email: editorEmail,
    password: editorPassword,
    role: "editor",
  });
  expect(editor.status, await editor.clone().text()).toBe(201);
  editorId = ((await editor.json()) as { doc: { id: number } }).doc.id;
  const editorLogin = await api(
    "POST",
    "/users/login",
    { Origin: new URL(base()).origin },
    {
      email: editorEmail,
      password: editorPassword,
    },
  );
  editorToken = ((await editorLogin.json()) as { token: string }).token;

  const markets = await api("GET", "/globals/markets", admin());
  expect(markets.status).toBe(200);
  originalMarkets = (await markets.json()) as Record<string, unknown>;

  // `payload-locales.spec.ts` runs first in this project and puts the markets back as it ends;
  // the pages follow in about 80 s here (the proxy's map first, then the pages', with a 404 between).
  await waitForLanguage("/us", "en-US");
  await waitForLanguage("/", "el-CY");

  page = await browser.newPage({ baseURL: baseURL ?? "http://localhost:8000" });
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
});

test.afterAll(async () => {
  test.setTimeout(300_000);
  // Not a test: leave the shared server as found, whatever failed above, and fail the run if that
  // cannot be done. One save at a time: Payload writes every language of a document on a save of
  // one, so two saves of the same document at once lose one of them.
  const failures: unknown[] = [];
  const attempt = async (what: string, run: () => Promise<Response>) => {
    try {
      const response = await run();
      if (!response.ok) failures.push(`${what}: ${response.status} ${await response.text()}`);
    } catch (error) {
      failures.push(`${what}: ${String(error)}`);
    }
  };
  for (const [id, locales] of touched) {
    const doc = originals.get(id);
    for (const locale of locales) {
      await attempt(`ui-strings ${id} ${locale}`, () =>
        api("PATCH", `/ui-strings/${id}?locale=${locale}`, admin(), {
          value: doc?.value[locale] ?? null,
        }),
      );
    }
  }
  if (originalMarkets !== undefined) {
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      globalType: _t,
      synced: _s,
      ...body
    } = originalMarkets;
    await attempt("markets", () => api("POST", "/globals/markets", admin(), body));
    // The next suites (`outage.spec.ts` reads `/us`) need the restored map served: until both
    // caches have it, `/us` answers its old language or a 404 for up to 80 s.
    try {
      await waitForLanguage("/us", "en-US");
      await waitForLanguage("/", "el-CY");
    } catch (error) {
      failures.push(`the restored markets: ${String(error)}`);
    }
  }
  if (editorId !== undefined) {
    await attempt("the editor", () => api("DELETE", `/users/${editorId}`, admin()));
  }
  await page?.close();
  expect(failures, "everything put back").toEqual([]);
});

test("a Greek message edited in the admin shows on / within two requests, and /us keeps English", async () => {
  const doc = await stringDoc(HEADING);
  const edited = `Μόλις ήρθαν ${stamp}`;
  // Within two requests, too: an earlier run's restore may have left the cached page stale.
  expect(await freshWithinTwo("/", doc.value["el"] ?? "")).toBeGreaterThan(0);

  await page.goto(`/admin/collections/ui-strings/${doc.id}?locale=el`);
  const field = page.locator("textarea#field-value");
  await expect(field).toHaveValue(doc.value["el"] ?? "");
  touch(doc.id, "el");
  await field.fill(edited);
  const [saved] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        new URL(r.url()).pathname === `/api/ui-strings/${doc.id}`,
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /^Save$/ }).click(),
  ]);
  expect(saved.status()).toBe(200);

  expect(await freshWithinTwo("/", edited), "the edit appeared in request 1 or 2").toBeGreaterThan(
    0,
  );
  const us = await html("/us");
  expect(us).toContain(doc.value["en"] ?? "");
  expect(us).not.toContain(edited);
});

test("a Greek value whose argument differs from English's is refused with the reason", async () => {
  const doc = await stringDoc(PLURAL);
  const response = await setValue(doc.id, "el", "Μόνο {total} ακόμη");
  expect(response.status).toBe(400);
  const body = (await response.json()) as {
    errors: { data?: { errors?: { message: string }[] } }[];
  };
  expect(body.errors[0]?.data?.errors?.[0]?.message, JSON.stringify(body)).toBe(
    "It must use the English text's arguments ({count, plural}): {count, plural} is missing; {total} is not one of them.",
  );
  expect((await stringDoc(PLURAL)).value["el"]).toBe(doc.value["el"]);
  // Nor may anyone but the seed rewrite the key, or the source the check compares with.
  const read = async () =>
    (await (await api("GET", `/ui-strings/${doc.id}`, admin())).json()) as {
      key: string;
      source: { message: string };
    };
  const before = await read();
  const forged = await api("PATCH", `/ui-strings/${doc.id}`, admin(), {
    source: { message: "{total}" },
    key: "atoms.forged",
  });
  expect(forged.status).toBe(200);
  expect(await read()).toMatchObject({ key: PLURAL, source: before.source });
});

test("the CSV export has every language's column and imports back by key; a refused value is reported", async () => {
  // Admins only.
  expect((await exportCsv({ Authorization: `JWT ${editorToken}` })).status).toBe(403);
  expect((await importCsv("key,value_de\n", { Authorization: `JWT ${editorToken}` })).status).toBe(
    403,
  );
  expect((await api("GET", "/exports", { Authorization: `JWT ${editorToken}` })).status).toBe(403);

  const heading = await stringDoc(HEADING);
  const plural = await stringDoc(PLURAL);
  const exported = await exportCsv(admin());
  expect(exported.status).toBe(200);
  expect(exported.headers.get("content-type")).toContain("text/csv");
  const rows = parseCsv(await exported.text());
  const [header = [], ...records] = rows;
  for (const column of ["key", "value_en", "value_el", "value_de", "value_fr", "value_pt"]) {
    expect(header, column).toContain(column);
  }
  expect(header).not.toContain("seeded_en");
  expect(records).toHaveLength(718);
  const at = (name: string) => header.indexOf(name);
  const row = (key: string) => {
    const found = records.find((record) => record[at("key")] === key);
    if (found === undefined) throw new Error(`${key} is not in the export`);
    return found;
  };
  expect(row(HEADING)[at("value_de")]).toBe(heading.value["de"]);

  // The translator's changes: German for the heading, and a Greek value that drops `{count}`.
  const german = `Frisch eingetroffen ${stamp}`;
  row(HEADING)[at("value_de")] = german;
  touch(heading.id, "de");
  touch(plural.id, "el");
  row(PLURAL)[at("value_el")] = "Μόνο λίγα ακόμη";
  const imported = await importCsv(toCsv(rows), admin());
  expect(imported.status, await imported.clone().text()).toBe(201);
  const { doc: result } = (await imported.json()) as {
    doc: {
      status: string;
      summary: { updated: number; issues: number; issueDetails: { row: number; error: string }[] };
    };
  };
  expect(result.status).toBe("partial");
  // Only the heading's row reached the plugin: the other 717 changed nothing, or nothing allowed.
  expect(result.summary.updated).toBe(1);
  expect(result.summary.issues).toBe(1);
  expect(result.summary.issueDetails[0]?.row).toBe(records.indexOf(row(PLURAL)) + 1);
  expect(result.summary.issueDetails[0]?.error).toMatch(
    /^value_el: It must use the English text's arguments/,
  );

  const after = await stringDoc(HEADING);
  expect(after.value).toEqual({ ...heading.value, de: german });
  expect((await stringDoc(PLURAL)).value).toEqual(plural.value);

  // Nothing else moved, nor was saved: a second export is the first with the one cell changed,
  // and only the heading's `updatedAt` is new.
  const again = parseCsv(await (await exportCsv(admin())).text());
  const headingRow = records.indexOf(row(HEADING)) + 1;
  const withoutTime = (table: string[][]) =>
    table.map((cells, index) =>
      index === headingRow ? cells.filter((_, column) => column !== at("updatedAt")) : cells,
    );
  row(PLURAL)[at("value_el")] = plural.value["el"] ?? "";
  expect(withoutTime(again)).toEqual(withoutTime(rows));

  // A translator's file with Greek only: English stays as it is. Left to the plugin, the row's
  // first language would be written into English (`checkImportedStrings`).
  const greek = `Νέες παραλαβές ${stamp}`;
  touch(heading.id, "el");
  const only = await importCsv(`key,value_el\n${HEADING},${greek}\n`, admin());
  expect(only.status, await only.clone().text()).toBe(201);
  expect((await stringDoc(HEADING)).value).toEqual({ ...heading.value, de: german, el: greek });

  // A file exported in one language has a single `value` column, which the plugin would save over
  // English: it is refused, and nothing changes.
  const single = await importCsv(`key,value\n${HEADING},Μόνο ελληνικά ${stamp}\n`, admin());
  expect(single.status, await single.clone().text()).toBe(201);
  const refused = (
    (await single.json()) as { doc: { status: string; summary: { issues: number } } }
  ).doc;
  expect(refused).toMatchObject({ status: "failed", summary: { issues: 1 } });
  expect((await stringDoc(HEADING)).value).toEqual({ ...heading.value, de: german, el: greek });
});

test("an edited quick-cart title shows in the quick cart a server action draws after an add", async ({
  browser,
}) => {
  const doc = await stringDoc(QUICK_TITLE);
  const edited = `Μπήκε στο καλάθι ${stamp}`;
  expect((await setValue(doc.id, "el", edited)).status).toBe(200);
  const shopper = await browser.newPage({ baseURL: base() });
  // The action's read is stale-while-revalidate like a page's: an add right after the save may
  // still draw the old title, the next one the new.
  await expect
    .poll(
      async () => {
        await add(shopper);
        // The title names the dialog, beside the line just added.
        const named = await shopper.getByRole("dialog", { name: edited }).count();
        await shopper.keyboard.press("Escape");
        return named;
      },
      {
        message: "the quick cart is named by the edited title",
        timeout: 60_000,
        intervals: [2_000],
      },
    )
    .toBe(1);
  await shopper.close();
});

test("a market switched to a language with no catalog shows English, then its edited value", async () => {
  // The US in Italian: the code has no Italian catalog, so the page is English until the strings
  // are translated. The pages follow the save in about 40 s here (`waitForLanguage`).
  const markets = structuredClone(originalMarkets) as {
    countries: { code: string; languages: string[] }[];
    languages: { code: string; medusaLocale: string }[];
  } & Record<string, unknown>;
  const us = markets.countries.find((country) => country.code === "us");
  expect(us, "the US is a seeded market").toBeDefined();
  if (us !== undefined) us.languages = ["it"];
  markets.languages.push({ code: "it", medusaLocale: "en-US" });
  const { id: _id, createdAt: _c, updatedAt: _u, globalType: _t, synced: _s, ...body } = markets;
  const saved = await api("POST", "/globals/markets", admin(), body);
  expect(saved.status, await saved.text()).toBe(200);

  const heading = await stringDoc(HEADING);
  await waitForLanguage("/us", "it-US");
  expect(await html("/us")).toContain(heading.value["en"] ?? "");

  const italian = `Nuovi arrivi ${stamp}`;
  expect((await setValue(heading.id, "it", italian)).status).toBe(200);
  expect(
    await freshWithinTwo("/us", italian),
    "the edit appeared in request 1 or 2",
  ).toBeGreaterThan(0);
});
