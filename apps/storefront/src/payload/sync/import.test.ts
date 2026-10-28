import fixture from "@shopblok/fixtures/sync/documents.json";
import type { Payload, TypedUser } from "payload";
import { describe, expect, it } from "vitest";
import { importFromMedusa, type SyncExport } from "./import";

/** Payload's Local API as far as the import uses it, in memory, recording each call's access. */
function fakePayload() {
  const rows: Record<string, (Record<string, unknown> & { id: number })[]> = {
    products: [],
    categories: [],
    collections: [],
  };
  let markets: Record<string, unknown> = { countries: [], synced: {} };
  let next = 1;
  const calls: { op: string; overrideAccess?: unknown; user?: unknown }[] = [];
  const record = (op: string, args: object) =>
    calls.push({ op, ...(args as { overrideAccess?: unknown; user?: unknown }) });
  const payload = {
    find: async (args: { collection: string }) => {
      record("find", args);
      return { docs: rows[args.collection]!.map((row) => ({ ...row })) };
    },
    create: async (args: { collection: string; data: Record<string, unknown> }) => {
      record("create", args);
      const row = { ...args.data, id: next++ };
      rows[args.collection]!.push(row);
      return { ...row };
    },
    update: async (args: { collection: string; id: number; data: Record<string, unknown> }) => {
      record("update", args);
      const row = rows[args.collection]!.find((candidate) => candidate.id === args.id)!;
      Object.assign(row, args.data);
      return { ...row };
    },
    findGlobal: async (args: object) => {
      record("findGlobal", args);
      return markets;
    },
    updateGlobal: async (args: { data: Record<string, unknown> }) => {
      record("updateGlobal", args);
      markets = { ...markets, ...args.data };
      return markets;
    },
  };
  return { payload: payload as unknown as Payload, rows, calls, markets: () => markets };
}

const sync = { collection: "integrations", id: 1, role: "medusa-sync" } as unknown as TypedUser;
const exported: SyncExport = {
  documents: fixture.documents as SyncExport["documents"],
  markets: fixture.markets,
};

describe("importFromMedusa (bootstrap's first sync)", () => {
  it("writes the fixture's documents, the parents as Payload ids, and the markets", async () => {
    const fake = fakePayload();
    const counts = await importFromMedusa(fake.payload, sync, exported);
    expect(counts).toEqual({
      created: 5,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      markets: "updated",
    });
    const tops = fake.rows.categories!.find((row) => row.medusaId === "pcat_01SYNCTOPS")!;
    const shirts = fake.rows.categories!.find((row) => row.medusaId === "pcat_01SYNCSHIRTS")!;
    expect(shirts.parent).toBe(tops.id);
    expect(tops.parent).toBeUndefined();
    expect(fake.rows.products!.map((row) => row.handle)).toEqual(["linen-shirt", "wool-scarf"]);
    expect(fake.markets().synced).toMatchObject(fixture.markets);
  });

  it("writes as the integration, with access control on", async () => {
    const fake = fakePayload();
    await importFromMedusa(fake.payload, sync, exported);
    for (const call of fake.calls)
      expect(call).toMatchObject({ overrideAccess: false, user: sync });
  });

  it("changes nothing on a second run", async () => {
    const fake = fakePayload();
    await importFromMedusa(fake.payload, sync, exported);
    expect(await importFromMedusa(fake.payload, sync, exported)).toEqual({
      created: 0,
      updated: 0,
      deleted: 0,
      unchanged: 5,
      markets: "unchanged",
    });
  });

  it("marks what Medusa no longer has, and writes a rename", async () => {
    const fake = fakePayload();
    await importFromMedusa(fake.payload, sync, exported);
    const [shirt] = exported.documents.products;
    const renamed: SyncExport = {
      ...exported,
      documents: {
        ...exported.documents,
        products: [{ ...shirt!, fields: { ...shirt!.fields, title: "Linen shirt II" } }],
      },
    };
    expect(await importFromMedusa(fake.payload, sync, renamed)).toMatchObject({
      updated: 1,
      deleted: 0,
      unchanged: 3,
    });
    // The scarf was deleted in Medusa already; a product missing from the export is marked.
    const gone: SyncExport = { ...exported, documents: { ...exported.documents, products: [] } };
    expect((await importFromMedusa(fake.payload, sync, gone)).deleted).toBe(1);
    expect(fake.rows.products!.every((row) => row.deletedInMedusa === true)).toBe(true);
    expect(fake.rows.products).toHaveLength(2);
  });
});
