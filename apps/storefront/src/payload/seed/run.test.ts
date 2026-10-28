import type { Payload } from "payload";
import { beforeEach, describe, expect, it } from "vitest";
import { runSeeds } from "./run";
import type { SeedModule } from "./types";

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

  it("saves with revalidation off", async () => {
    await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    expect(
      fake.calls.every(
        ({ context }) => (context as { disableRevalidate?: boolean })?.disableRevalidate,
      ),
    ).toBe(true);
  });
});
