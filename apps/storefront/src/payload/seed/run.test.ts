import type { Payload } from "payload";
import { beforeEach, describe, expect, it } from "vitest";
import { runSeeds } from "./run";
import type { SeedModule } from "./types";

/** A `pages` table in memory, enough of the Local API for the runner. */
function fakePayload() {
  const rows = new Map<number, Record<string, unknown>>();
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
      const row: Record<string, unknown> = { id: next++ };
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
      write(rows.get(id)!, locale, data);
    },
  };
  return { payload: payload as unknown as Payload, rows, calls };
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
    expect(counts).toEqual({ created: 1, updated: 0, unchanged: 0 });
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
    expect(counts).toEqual({ created: 0, updated: 1, unchanged: 0 });
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

  it("saves with revalidation off", async () => {
    await runSeeds(fake.payload, [home({ en: "Home", el: "Αρχική" })]);
    expect(
      fake.calls.every(
        ({ context }) => (context as { disableRevalidate?: boolean })?.disableRevalidate,
      ),
    ).toBe(true);
  });
});
