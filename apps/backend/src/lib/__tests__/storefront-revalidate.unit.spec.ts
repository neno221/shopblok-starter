import { REVALIDATE_EVENTS, batchesFor, handlesFor, postBatch } from "../storefront-revalidate";

const logger = () => ({ warn: jest.fn(), error: jest.fn() });

describe("batchesFor (the event-to-tags table)", () => {
  it.each([
    [
      "product.updated",
      ["tee"],
      [{ tags: ["product:tee", "medusa:products", "search"], expire: "max" }],
    ],
    ["product.created", [], [{ tags: ["medusa:products", "search"], expire: "max" }]],
    ["product.deleted", [], [{ tags: ["medusa:products", "search"], expire: "max" }]],
    [
      "product-variant.updated",
      ["tee"],
      [
        { tags: ["medusa:products", "search"], expire: "max" },
        { tags: ["product:tee"], expire: 0 },
      ],
    ],
    [
      "inventory-level.updated",
      ["tee", "cap"],
      [{ tags: ["product:cap", "product:tee"], expire: 0 }],
    ],
    ["inventory-level.updated", [], []],
    [
      "product-category.updated",
      ["apparel"],
      [
        {
          tags: ["category:apparel", "medusa:categories", "navigation", "search"],
          expire: "max",
        },
      ],
    ],
    ["product-collection.deleted", [], [{ tags: ["medusa:collections", "search"], expire: "max" }]],
    [
      "translation.updated",
      [],
      [
        {
          tags: [
            "medusa:products",
            "medusa:categories",
            "medusa:collections",
            "navigation",
            "search",
          ],
          expire: "max",
        },
      ],
    ],
    ["region.updated", [], [{ tags: ["medusa:regions", "medusa:products", "search"], expire: 0 }]],
    ["order.placed", ["tee"], []],
  ])("%s with %j", (event, handles, expected) => {
    expect(batchesFor(event, handles)).toEqual(expected);
  });

  it("lists every family the plan names (product, variant, inventory, category, collection, translation, region)", () => {
    for (const family of [
      "product",
      "product-variant",
      "inventory-level",
      "product-category",
      "product-collection",
      "translation",
      "region",
    ]) {
      for (const action of ["created", "updated", "deleted"]) {
        expect(REVALIDATE_EVENTS).toContain(`${family}.${action}`);
      }
    }
  });

  it("puts the expire-0 batch last, de-duplicates the handles and sorts them", () => {
    const batches = batchesFor("product-variant.updated", ["b", "a", "b"]);
    expect(batches.map((batch) => batch.expire)).toEqual(["max", 0]);
    expect(batches[1].tags).toEqual(["product:a", "product:b"]);
  });
});

describe("handlesFor", () => {
  it("reads a variant's product handle by id, deleted rows included", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ product: { handle: "tee" } }, { product: null }],
    });
    expect(await handlesFor({ graph }, "product-variant.deleted", ["variant_1"])).toEqual(["tee"]);
    expect(graph).toHaveBeenCalledWith({
      entity: "product_variant",
      fields: ["product.handle"],
      filters: { id: ["variant_1"] },
      withDeleted: true,
    });
  });

  it("follows an inventory level to every variant's product", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          inventory_item: {
            variants: [{ product: { handle: "tee" } }, { product: { handle: "cap" } }],
          },
        },
      ],
    });
    expect(await handlesFor({ graph }, "inventory-level.updated", ["ilev_1"])).toEqual([
      "tee",
      "cap",
    ]);
    expect(graph.mock.calls[0][0].fields).toEqual(["inventory_item.variants.product.handle"]);
  });

  it("reads nothing for an event whose tags need no handle, or without ids", async () => {
    const graph = jest.fn();
    expect(await handlesFor({ graph }, "product.deleted", ["prod_1"])).toEqual([]);
    expect(await handlesFor({ graph }, "product.updated", [])).toEqual([]);
    expect(graph).not.toHaveBeenCalled();
  });
});

describe("postBatch", () => {
  const batch = { tags: ["search"], expire: "max" as const };

  it("POSTs the batch with the secret as a bearer token", async () => {
    const send = jest.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const ok = await postBatch(batch, {
      storefrontUrl: "http://localhost:8000/",
      secret: " s3cret ",
      logger: logger(),
      fetch: send,
    });
    expect(ok).toBe(true);
    const [url, init] = send.mock.calls[0];
    expect(String(url)).toBe("http://localhost:8000/api/revalidate");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer s3cret");
    expect(JSON.parse(init.body)).toEqual(batch);
  });

  it("logs and never throws when the storefront refuses, is down, or is not configured", async () => {
    const cases = [
      { fetch: jest.fn().mockResolvedValue(new Response("", { status: 401 })) },
      { fetch: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) },
      { secret: "" },
      { storefrontUrl: "localhost:8000" },
      { storefrontUrl: undefined },
    ];
    for (const overrides of cases) {
      const log = logger();
      await expect(
        postBatch(batch, {
          storefrontUrl: "http://localhost:8000",
          secret: "s",
          logger: log,
          fetch: jest.fn().mockResolvedValue(new Response("")),
          ...overrides,
        }),
      ).resolves.toBe(false);
      expect(log.warn.mock.calls.length + log.error.mock.calls.length).toBe(1);
    }
  });
});
