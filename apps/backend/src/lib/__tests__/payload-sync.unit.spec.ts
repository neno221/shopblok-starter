import { readFileSync } from "node:fs";

import { createPayloadClient, PayloadRequestError, toQuery } from "../../modules/payload/client";
import {
  categoryDocument,
  collectionDocument,
  marketsSynced,
  parentsFirst,
  productDocument,
  sameMarkets,
  SYNCED_FIELDS,
  type MedusaCategory,
  type MedusaCollection,
  type MedusaProduct,
  type MedusaRegion,
  type SyncDocument,
} from "../../modules/payload/mapping";
import { needsWrite } from "../payload-sync";
import { PAYLOAD_SYNC_EVENTS } from "../../subscribers/payload-sync";

/**
 * T60 (D75): the mapping against the shared fixture, which the storefront's collection test reads
 * too (`apps/storefront/src/payload/collections/synced.test.ts`). A field renamed or left out here
 * fails this test; the same change on the Payload side fails that one.
 */
const fixture = JSON.parse(
  readFileSync(require.resolve("@shopblok/fixtures/sync/documents.json"), "utf8"),
) as {
  medusa: {
    products: MedusaProduct[];
    categories: MedusaCategory[];
    collections: MedusaCollection[];
    regions: MedusaRegion[];
    store: Parameters<typeof marketsSynced>[1];
  };
  documents: Record<"products" | "categories" | "collections", SyncDocument[]>;
  markets: ReturnType<typeof marketsSynced>;
};

describe("the mapping (shared fixture)", () => {
  it("makes the fixture's products, categories and collections of Medusa's records", () => {
    expect(fixture.medusa.products.map(productDocument)).toEqual(fixture.documents.products);
    expect(fixture.medusa.categories.map(categoryDocument)).toEqual(fixture.documents.categories);
    expect(fixture.medusa.collections.map(collectionDocument)).toEqual(
      fixture.documents.collections,
    );
  });

  it("writes exactly the synced fields each collection lists", () => {
    for (const [collection, documents] of Object.entries(fixture.documents)) {
      for (const document of documents) {
        expect(
          [...Object.keys(document.fields), ...Object.keys(document.references)].sort(),
        ).toEqual([...SYNCED_FIELDS[collection as keyof typeof SYNCED_FIELDS]].sort());
      }
    }
  });

  it("makes the markets' synced part of the regions and the store", () => {
    expect(marketsSynced(fixture.medusa.regions, fixture.medusa.store)).toEqual(fixture.markets);
  });

  it("gives the same markets value whatever order Medusa lists things in", () => {
    const shuffled = marketsSynced(
      [...fixture.medusa.regions].reverse().map((region) => ({
        ...region,
        countries: [...(region.countries ?? [])].reverse(),
      })),
      {
        supported_currencies: [...(fixture.medusa.store?.supported_currencies ?? [])].reverse(),
        supported_locales: [...(fixture.medusa.store?.supported_locales ?? [])].reverse(),
      },
    );
    expect(sameMarkets(shuffled, fixture.markets)).toBe(true);
  });

  it("reads timestamps as Medusa's modules return them (Date) and as HTTP does (string)", () => {
    const [record] = fixture.medusa.products;
    expect(productDocument({ ...record, updated_at: new Date(record.updated_at) })).toEqual(
      productDocument(record),
    );
  });

  it("puts parents before their children", () => {
    const [tops, shirts] = fixture.documents.categories;
    const tees: SyncDocument = {
      fields: { ...shirts.fields, medusaId: "pcat_tees" },
      references: { parent: shirts.fields.medusaId },
    };
    expect(parentsFirst([tees, shirts, tops]).map((document) => document.fields.medusaId)).toEqual([
      tops.fields.medusaId,
      shirts.fields.medusaId,
      "pcat_tees",
    ]);
  });
});

describe("needsWrite (the reconcile's comparison)", () => {
  const [, shirts] = fixture.documents.categories;
  const stored = {
    id: 12,
    medusaId: shirts.fields.medusaId,
    medusaUpdatedAt: "2026-10-21T10:00:00.000Z",
    deletedInMedusa: false,
    parent: 11,
  };
  const ids = new Map([["11", "pcat_01SYNCTOPS"]]);

  it("creates a record Payload lacks and leaves a matching one", () => {
    expect(needsWrite(shirts, undefined, ids)).toBe("create");
    expect(needsWrite(shirts, stored, ids)).toBeNull();
  });

  it("updates a record changed since (by time, not text), deleted or restored, or moved", () => {
    expect(
      needsWrite(shirts, { ...stored, medusaUpdatedAt: "2026-10-21T10:00:01.000Z" }, ids),
    ).toBe("update");
    expect(needsWrite(shirts, { ...stored, medusaUpdatedAt: "2026-10-21T10:00:00Z" }, ids)).toBe(
      null,
    );
    expect(needsWrite(shirts, { ...stored, medusaUpdatedAt: null }, ids)).toBe("update");
    expect(needsWrite(shirts, { ...stored, deletedInMedusa: true }, ids)).toBe("update");
    expect(needsWrite(shirts, { ...stored, parent: null }, ids)).toBe("update");
    expect(needsWrite(shirts, { ...stored, parent: 99 }, ids)).toBe("update");
  });
});

describe("the subscriber's events (D75)", () => {
  it("covers create, update and delete of each synced type, and regions", () => {
    for (const prefix of ["product", "product-category", "product-collection", "region"]) {
      for (const action of ["created", "updated", "deleted"]) {
        expect(PAYLOAD_SYNC_EVENTS[`${prefix}.${action}`]).toBeDefined();
      }
    }
  });
});

describe("the Payload client", () => {
  const ok = (body: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

  it("writes `where` and `select` as Payload's query string", () => {
    expect(toQuery({ where: { medusaId: { equals: "prod_1" } }, select: { a: true } })).toEqual([
      "where%5BmedusaId%5D%5Bequals%5D=prod_1",
      "select%5Ba%5D=true",
    ]);
  });

  it("signs in with the integration's API key, never a query flag", async () => {
    const send = jest.fn(() => ok({ docs: [], hasNextPage: false, totalDocs: 0 }));
    const client = createPayloadClient({
      serverUrl: "http://payload.test/",
      apiKey: "key-1",
      fetch: send as unknown as typeof fetch,
    });
    await client.find("products", { where: { medusaId: { equals: "prod_1" } }, limit: 1 });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "http://payload.test/api/products?depth=0&where%5BmedusaId%5D%5Bequals%5D=prod_1&limit=1",
    );
    expect(init.headers).toEqual({ Authorization: "integrations API-Key key-1" });
    expect(url).not.toContain("is_from_medusa");
  });

  it("names Payload's own error, and refuses an answer of the wrong shape", async () => {
    const failing = createPayloadClient({
      serverUrl: "http://payload.test",
      apiKey: "key-1",
      fetch: (() => ok({ errors: [{ message: "You are not allowed" }] }, 403)) as typeof fetch,
    });
    await expect(failing.create("products", {})).rejects.toThrow(
      "POST /products: Payload answered 403: You are not allowed",
    );
    const odd = createPayloadClient({
      serverUrl: "http://payload.test",
      apiKey: "key-1",
      fetch: (() => ok({ nothing: true })) as typeof fetch,
    });
    await expect(odd.update("products", 1, {})).rejects.toBeInstanceOf(PayloadRequestError);
  });
});
