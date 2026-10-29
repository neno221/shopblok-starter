import type { Payload } from "payload";
import { beforeEach, describe, expect, it } from "vitest";
import { siteText } from "../../lib/site";
import { footerSeed, headerSeed, SEED_GLOBALS, siteSettingsSeed } from "./globals";
import { inLanguage, runGlobalSeeds, runSeeds } from "./run";
import type { SeedGlobal, SeedModule } from "./types";
import { comparable } from "./values";

/**
 * A `pages` table in memory, with drafts, enough of the Local API for the runner. Each write stamps
 * the row's `updatedAt`; `versions` is what `findVersions` answers (a test adds an editor's draft).
 */
function fakePayload() {
  const rows = new Map<number, Record<string, unknown>>();
  const versions: { parent: number; updatedAt: string; version: { _status: string } }[] = [];
  let clock = Date.parse("2026-10-28T12:00:00Z");
  const stamp = () => new Date((clock += 1000)).toISOString();
  const calls: {
    op: string;
    locale?: string;
    data?: Record<string, unknown>;
    context?: unknown;
  }[] = [];
  let next = 1;
  const write = (row: Record<string, unknown>, locale: string, data: Record<string, unknown>) => {
    for (const [field, value] of Object.entries(data)) {
      if (field === "seedKey" || field === "_status") row[field] = value;
      else row[field] = { ...(row[field] as object), [locale]: value };
    }
  };
  const payload = {
    collections: { pages: { config: { slug: "pages", versions: { drafts: true } } } },
    findVersions: async ({ where }: { where: { parent: { equals: number } } }) => {
      calls.push({ op: "findVersions" });
      const docs = versions
        .filter((version) => version.parent === where.parent.equals)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return { docs: docs.slice(0, 1) };
    },
    find: async ({ where }: { where: { seedKey: { equals: string } } }) => ({
      docs: [...rows.values()].filter((row) => row["seedKey"] === where.seedKey.equals),
    }),
    findByID: async ({ id }: { id: number }) => rows.get(id),
    create: async ({
      locale,
      data,
      context,
    }: {
      locale: string;
      data: Record<string, unknown>;
      context: unknown;
    }) => {
      calls.push({ op: "create", locale, data, context });
      const row: Record<string, unknown> = { id: next++, updatedAt: stamp() };
      write(row, locale, data);
      rows.set(row["id"] as number, row);
      return row;
    },
    update: async ({
      id,
      locale,
      data,
      context,
    }: {
      id: number;
      locale: string;
      data: Record<string, unknown>;
      context: unknown;
    }) => {
      calls.push({ op: "update", locale, data, context });
      const row = rows.get(id)!;
      write(row, locale, data);
      row["updatedAt"] = stamp();
    },
  };
  /** An editor's draft save: a new version, the row untouched. */
  const saveDraft = (parent: number) =>
    versions.push({ parent, updatedAt: stamp(), version: { _status: "draft" } });
  return { payload: payload as unknown as Payload, rows, calls, saveDraft };
}

const home = (title: { en: string; el: string }, before: string[] = []): SeedModule => ({
  collection: "pages",
  documents: () => [
    {
      key: "home",
      publish: true,
      localized: {
        title: { en: { value: title.en, before }, el: { value: title.el } },
        slug: { en: { value: "home" }, el: { value: "arxiki" } },
      },
    },
  ],
});

let fake: ReturnType<typeof fakePayload>;
beforeEach(() => {
  fake = fakePayload();
});

describe("runSeeds", () => {
  it("creates a missing document, published, in English first and then each language", async () => {
    const counts = await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    expect(counts).toEqual({ created: 1, updated: 0, unchanged: 0, kept: [] });
    const row = [...fake.rows.values()][0];
    expect(row).toMatchObject({
      seedKey: "home",
      _status: "published",
      title: { en: "Home", el: "Αρχική" },
      slug: { en: "home", el: "arxiki" },
    });
    expect(fake.calls.map(({ op, locale }) => `${op}:${locale}`)).toEqual([
      "create:en",
      "update:el",
    ]);
  });

  it("changes nothing on a second run", async () => {
    await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    fake.calls.length = 0;
    expect(await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })])).toEqual({
      created: 0,
      updated: 0,
      unchanged: 1,
      kept: [],
    });
    expect(fake.calls).toEqual([]);
  });

  it("keeps an editor's change, and moves a value only the seed wrote", async () => {
    await runSeeds(fake.payload, [home({ en: "Welcome", el: "Αρχική" })]);
    const row = [...fake.rows.values()][0]!;
    row["title"] = { en: "Welcome", el: "Η αρχική μας" };
    const counts = await runSeeds(fake.payload, [
      home({ en: "Home", el: "Αρχική σελίδα" }, ["Welcome"]),
    ]);
    expect(counts).toEqual({ created: 0, updated: 1, unchanged: 0, kept: [] });
    expect(row["title"]).toEqual({ en: "Home", el: "Η αρχική μας" });
  });

  it("finds its document by key, so a re-slugged page is not created twice", async () => {
    await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    const row = [...fake.rows.values()][0]!;
    row["slug"] = { en: "start", el: "arxiki" };
    await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    expect(fake.rows.size).toBe(1);
    expect(row["slug"]).toEqual({ en: "start", el: "arxiki" });
  });

  it("leaves a document with an editor's newer draft alone, and names it", async () => {
    await runSeeds(fake.payload, [home({ en: "Welcome", el: "Αρχική" })]);
    const row = [...fake.rows.values()][0]!;
    fake.saveDraft(row["id"] as number);
    fake.calls.length = 0;
    const counts = await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" }, ["Welcome"])]);
    expect(counts).toEqual({ created: 0, updated: 0, unchanged: 0, kept: ["pages:home"] });
    expect(fake.calls.map(({ op }) => op)).toEqual(["findVersions"]);
    expect(row["title"]).toEqual({ en: "Welcome", el: "Αρχική" });
  });

  it("writes again once the draft is published or discarded (no draft newer than the row)", async () => {
    await runSeeds(fake.payload, [home({ en: "Welcome", el: "Αρχική" })]);
    const row = [...fake.rows.values()][0]!;
    fake.saveDraft(row["id"] as number);
    // A publish writes the row after the draft.
    row["updatedAt"] = new Date(Date.parse("2026-10-29T00:00:00Z")).toISOString();
    const counts = await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" }, ["Welcome"])]);
    expect(counts).toMatchObject({ updated: 1, kept: [] });
    expect(row["title"]).toEqual({ en: "Home", el: "Αρχική" });
  });

  it("does not look for drafts when it has nothing to write", async () => {
    await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    fake.saveDraft([...fake.rows.values()][0]!["id"] as number);
    fake.calls.length = 0;
    expect(await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })])).toMatchObject({
      unchanged: 1,
      kept: [],
    });
    expect(fake.calls).toEqual([]);
  });

  it("writes a field with every language's texts one language at a time, English first (T65)", async () => {
    const layout = [{ id: "b1", blockType: "hero", heading: { en: "Hi", el: "Γεια" }, media: 3 }];
    const pages: SeedModule = {
      collection: "pages",
      documents: () => [
        {
          key: "home",
          publish: true,
          localized: { title: { en: { value: "Home" } }, slug: { en: { value: "home" } } },
          allLanguages: { layout: { value: layout } },
        },
      ],
    };
    await runSeeds(fake.payload, [pages]);
    const writes = fake.calls.filter(
      (call) => call.op === "update" && "layout" in (call.data ?? {}),
    );
    expect(writes.map(({ locale, data }) => [locale, data])).toEqual([
      ["en", { layout: [{ id: "b1", blockType: "hero", heading: "Hi", media: 3 }] }],
      ["el", { layout: [{ id: "b1", blockType: "hero", heading: "Γεια", media: 3 }] }],
    ]);
    // Stored as a `locale: "all"` read gives it, it is what the seed writes: nothing to do.
    fake.rows.get(1)!["layout"] = layout;
    fake.calls.length = 0;
    expect((await runSeeds(fake.payload, [pages])).unchanged).toBe(1);
    expect(fake.calls.filter((call) => call.op === "update")).toEqual([]);
  });

  it("saves with revalidation off", async () => {
    await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    expect(
      fake.calls.every(
        ({ context }) => (context as { disableRevalidate?: boolean })?.disableRevalidate,
      ),
    ).toBe(true);
  });
});

/**
 * One global in memory, read and written as Payload does with `locale: "all"` (a deep merge of the
 * locale-keyed data, row ids added to array rows), and one language at a time for a path.
 */
function fakeGlobal() {
  let stored: Record<string, unknown> = { design: "classic", _status: "draft" };
  let saved = false;
  let clock = Date.parse("2026-10-28T12:00:00Z");
  const versions: { updatedAt: string; version: { _status: string } }[] = [];
  const writes: { locale: string; data: Record<string, unknown>; context: unknown }[] = [];
  let ids = 0;
  const withIds = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map((row) =>
          row !== null && typeof row === "object"
            ? { id: `row${++ids}`, ...(withIds(row) as object) }
            : row,
        )
      : value !== null && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withIds(v)]))
        : value;
  const merge = (into: Record<string, unknown>, data: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(data)) {
      const current = into[key];
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        current !== null &&
        typeof current === "object" &&
        !Array.isArray(current)
      ) {
        merge(current as Record<string, unknown>, value as Record<string, unknown>);
      } else into[key] = withIds(value);
    }
  };
  const payload = {
    globals: { config: [{ slug: "site-settings", versions: { drafts: true } }] },
    findGlobal: async () => structuredClone(saved ? stored : { ...stored, updatedAt: undefined }),
    findGlobalVersions: async () => ({
      docs: [...versions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 1),
    }),
    updateGlobal: async ({
      locale,
      data,
      context,
    }: {
      locale: string;
      data: Record<string, unknown>;
      context: unknown;
    }) => {
      writes.push({ locale, data: structuredClone(data), context });
      if (locale === "all") merge(stored, data);
      else {
        // One language of a localized array: `{ productNotes: [...] }` under that language.
        for (const [key, value] of Object.entries(data)) {
          stored[key] = { ...(stored[key] as object), [locale]: withIds(value) };
        }
      }
      saved = true;
      stored["updatedAt"] = new Date((clock += 1000)).toISOString();
    },
  };
  return {
    payload: payload as unknown as Payload,
    writes,
    edit: (data: Record<string, unknown>) => merge(stored, data),
    saveDraft: () =>
      versions.push({
        updatedAt: new Date((clock += 1000)).toISOString(),
        version: { _status: "draft" },
      }),
    stored: () => stored,
    reset: () => {
      stored = { design: "classic", _status: "draft" };
      saved = false;
    },
  };
}

const settingsSeed = (storeName: string, before: string[] = []): SeedGlobal => ({
  global: "site-settings",
  fields: () => ({
    storeName: { value: storeName, before },
    "seo.description": { value: { en: "Basics", el: "Βασικά" } },
    productNotes: {
      value: { en: [{ note: "Ships fast" }], el: [{ note: "Γρήγορη αποστολή" }] },
    },
  }),
  perLocale: ["productNotes"],
});

describe("inLanguage", () => {
  it("takes one language's text from each `{ en: …, el: … }`, leaving everything else", () => {
    const value = {
      heading: { en: "Hi", el: "Γεια" },
      links: [{ id: "r1", link: { url: "/store", label: { en: "Shop", el: "Αγορά" } } }],
      content: { root: { children: [] } },
      media: 3,
    };
    expect(inLanguage(value, "el")).toEqual({
      heading: "Γεια",
      links: [{ id: "r1", link: { url: "/store", label: "Αγορά" } }],
      content: { root: { children: [] } },
      media: 3,
    });
    expect(inLanguage({ heading: { en: "Hi" } }, "de")).toEqual({ heading: undefined });
  });
});

describe("runGlobalSeeds (T61)", () => {
  it("writes a global that was never saved, published, all languages at once", async () => {
    const { payload, writes, stored } = fakeGlobal();
    expect(await runGlobalSeeds(payload, [settingsSeed("Shopblok")])).toEqual({
      created: 1,
      updated: 0,
      unchanged: 0,
      kept: [],
    });
    expect(writes[0]).toMatchObject({
      locale: "all",
      data: {
        _status: "published",
        storeName: "Shopblok",
        seo: { description: { en: "Basics", el: "Βασικά" } },
      },
      context: { disableRevalidate: true },
    });
    // A localized array, one language at a time.
    expect(writes.slice(1).map((write) => [write.locale, write.data])).toEqual([
      ["en", { productNotes: [{ note: "Ships fast" }] }],
      ["el", { productNotes: [{ note: "Γρήγορη αποστολή" }] }],
    ]);
    expect(comparable(stored()["productNotes"])).toEqual({
      en: [{ note: "Ships fast" }],
      el: [{ note: "Γρήγορη αποστολή" }],
    });
  });

  it("changes nothing on a second run, though Payload added row ids", async () => {
    const { payload, writes } = fakeGlobal();
    await runGlobalSeeds(payload, [settingsSeed("Shopblok")]);
    writes.length = 0;
    expect(await runGlobalSeeds(payload, [settingsSeed("Shopblok")])).toMatchObject({
      unchanged: 1,
    });
    expect(writes).toEqual([]);
  });

  it("keeps an editor's value, and replaces one an earlier seed wrote", async () => {
    const { payload, writes, edit } = fakeGlobal();
    await runGlobalSeeds(payload, [settingsSeed("Shopblok")]);
    edit({ seo: { description: { en: "Our own words", el: "Βασικά" } } });
    writes.length = 0;
    expect(await runGlobalSeeds(payload, [settingsSeed("Shopblok 2", ["Shopblok"])])).toMatchObject(
      {
        updated: 1,
      },
    );
    // The store's name is in no language of its own: written in English (T65).
    expect(writes).toEqual([
      { locale: "en", data: { storeName: "Shopblok 2" }, context: { disableRevalidate: true } },
    ]);
  });

  it("writes only the languages of an array when nothing else changed (no empty write)", async () => {
    const { payload, writes } = fakeGlobal();
    await runGlobalSeeds(payload, [settingsSeed("Shopblok")]);
    writes.length = 0;
    const first = settingsSeed("Shopblok");
    const newNotes: SeedGlobal = {
      ...first,
      fields: async (p) => ({
        ...(await first.fields(p)),
        productNotes: {
          value: { en: [{ note: "Ships today" }], el: [{ note: "Αποστολή σήμερα" }] },
          before: [{ en: [{ note: "Ships fast" }], el: [{ note: "Γρήγορη αποστολή" }] }],
        },
      }),
    };
    expect(await runGlobalSeeds(payload, [newNotes])).toMatchObject({ updated: 1 });
    expect(writes.map((write) => write.locale)).toEqual(["en", "el"]);
  });

  it("writes a change in no language of its own in English, not in every language (T65)", async () => {
    const { payload, writes } = fakeGlobal();
    await runGlobalSeeds(payload, [settingsSeed("Shopblok")]);
    writes.length = 0;
    const withHomepage: SeedGlobal = {
      ...settingsSeed("Shopblok"),
      fields: async (each) => ({
        ...(await settingsSeed("Shopblok").fields(each)),
        homepage: { value: 4 },
      }),
    };
    await runGlobalSeeds(payload, [withHomepage]);
    expect(writes).toEqual([
      { locale: "en", data: { homepage: 4 }, context: { disableRevalidate: true } },
    ]);
  });

  it("leaves a global with an editor's newer draft alone, and names it", async () => {
    const { payload, writes, saveDraft } = fakeGlobal();
    await runGlobalSeeds(payload, [settingsSeed("Shopblok")]);
    saveDraft();
    writes.length = 0;
    expect(await runGlobalSeeds(payload, [settingsSeed("Shopblok 2", ["Shopblok"])])).toMatchObject(
      {
        kept: ["site-settings"],
      },
    );
    expect(writes).toEqual([]);
  });
});

describe("the globals' seed (T61 step 6)", () => {
  it("is the header, the footer and the site settings, in that order", () => {
    expect(SEED_GLOBALS.map((seed) => seed.global)).toEqual(["header", "footer", "site-settings"]);
  });

  it("writes M3's shell from site.ts, in the four seeded languages", async () => {
    const header = await headerSeed.fields({} as Payload);
    expect(header["design"]?.value).toBe("classic");
    expect(header["navigation.source"]?.value).toBe("categories");
    expect(header["announcement.message"]?.value).toEqual({
      en: siteText("en").announcement,
      el: siteText("el").announcement,
      de: siteText("de").announcement,
      fr: siteText("fr").announcement,
    });
    // T67: the newsletter is the seeded form, looked up; none before the forms' seed ran.
    const noForms = { find: async () => ({ docs: [] }) } as unknown as Payload;
    const footer = await footerSeed.fields(noForms);
    expect(footer).not.toHaveProperty(["newsletter.form"]);
    const withForm = { find: async () => ({ docs: [{ id: 5 }] }) } as unknown as Payload;
    expect(await footerSeed.fields(withForm)).toMatchObject({
      "newsletter.form": { value: 5 },
      "newsletter.privacy": { value: { type: "custom", url: "/privacy" } },
    });
    const columns = footer["columns"]?.value as {
      title: Record<string, string>;
      categories?: boolean;
      links: { link: { url: string; label: Record<string, string> } }[];
    }[];
    expect(columns.map((column) => column.title["el"])).toEqual([
      siteText("el").shop,
      siteText("el").help,
    ]);
    expect(columns[0]?.categories).toBe(true);
    expect(columns.flatMap((column) => column.links.map((row) => row.link.url))).toEqual([
      "/store",
      "/account",
      "/cart",
      "/order/lookup",
    ]);
    const settings = await siteSettingsSeed.fields(noForms);
    expect(settings["productNotes"]?.value).toMatchObject({
      de: siteText("de").productNotes.map((note) => ({ note })),
    });
    expect(siteSettingsSeed.perLocale).toEqual(["productNotes"]);
    // T65: the seeded Home is the homepage once the pages' seed made it; nothing before.
    expect(settings).not.toHaveProperty("homepage");
    expect((await siteSettingsSeed.fields(withForm))["homepage"]).toEqual({ value: 5 });
  });
});
