import {
  MAX_TAGS_PER_BATCH,
  REVALIDATE_EVENTS,
  batchesFor,
  handlesFor,
  idsFor,
  postBatch,
} from "../storefront-revalidate";

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
    ["inventory-level.deleted", [], [{ tags: ["medusa:products"], expire: "max" }]],
    [
      "price-list.prices_added",
      ["tee", "cap"],
      [
        { tags: ["medusa:products", "search"], expire: "max" },
        { tags: ["product:cap", "product:tee"], expire: 0 },
      ],
    ],
    ["price-list.deleted", [], [{ tags: ["medusa:products", "search"], expire: "max" }]],
    [
      "product-category.updated",
      ["apparel"],
      [
        {
          tags: [
            "category:apparel",
            "medusa:categories",
            "medusa:products",
            "navigation",
            "search",
          ],
          expire: "max",
        },
      ],
    ],
    [
      "product-collection.deleted",
      [],
      [{ tags: ["medusa:collections", "medusa:products", "search"], expire: "max" }],
    ],
    [
      "product-option-value.updated",
      ["tee"],
      [{ tags: ["product:tee", "medusa:products", "search"], expire: "max" }],
    ],
    ["product-tag.deleted", [], [{ tags: ["medusa:products", "search"], expire: "max" }]],
    ["sales-channel.deleted", [], [{ tags: ["medusa:products", "search"], expire: "max" }]],
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
    [
      "region.updated",
      [],
      [{ tags: ["medusa:regions", "medusa:markets", "medusa:products", "search"], expire: 0 }],
    ],
    ["shopblok.markets.updated", [], [{ tags: ["medusa:markets"], expire: 0 }]],
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

  it("takes Medusa 2.22's six price-list events with the variant's PRICES batches (D112)", () => {
    for (const action of [
      "created",
      "updated",
      "deleted",
      "prices_added",
      "prices_updated",
      "prices_removed",
    ]) {
      const event = `price-list.${action}`;
      expect(REVALIDATE_EVENTS).toContain(event);
      expect(batchesFor(event, ["tee"])).toEqual(batchesFor("product-variant.updated", ["tee"]));
    }
  });

  it("sends the market map's tag with expire 0 on a saved market and on every region event (D94)", () => {
    expect(REVALIDATE_EVENTS).toContain("shopblok.markets.updated");
    for (const event of [
      "shopblok.markets.updated",
      "region.created",
      "region.updated",
      "region.deleted",
    ]) {
      const batches = batchesFor(event, []);
      const withMap = batches.filter((batch) => batch.tags.includes("medusa:markets"));
      expect(withMap).toHaveLength(1);
      expect(withMap[0]!.expire).toBe(0);
    }
    // ... and on nothing else: a product or a price list does not change the map.
    for (const event of ["product.updated", "product-variant.updated", "translation.updated"]) {
      expect(batchesFor(event, ["tee"]).flatMap((batch) => batch.tags)).not.toContain(
        "medusa:markets",
      );
    }
  });

  it("splits a batch at the storefront's 100 tags, the expire-0 ones still last (PR 115 review)", () => {
    const handles = Array.from({ length: 250 }, (_, i) => `p${String(i).padStart(3, "0")}`);
    const batches = batchesFor("price-list.updated", handles);
    expect(MAX_TAGS_PER_BATCH).toBe(100);
    expect(batches.map((batch) => [batch.expire, batch.tags.length])).toEqual([
      ["max", 2],
      [0, 100],
      [0, 100],
      [0, 50],
    ]);
    expect(batches.slice(1).flatMap((batch) => batch.tags)).toEqual(
      handles.map((handle) => `product:${handle}`),
    );
    // A "max" batch with handles is split the same way.
    const content = batchesFor("product-tag.updated", handles);
    expect(content.map((batch) => batch.tags.length)).toEqual([100, 100, 52]);
    expect(content.every((batch) => batch.expire === "max")).toBe(true);
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

  it("follows an option value to every product of its option", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ option: { products: [{ handle: "tee" }, { handle: "cap" }, null] } }],
    });
    expect(await handlesFor({ graph }, "product-option-value.updated", ["optval_1"])).toEqual([
      "tee",
      "cap",
    ]);
    expect(graph.mock.calls[0][0]).toMatchObject({
      entity: "product_option_value",
      fields: ["option.products.handle"],
    });
  });

  it("follows a price list's price sets through the variant link (prices_* events)", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ variant: { product: { handle: "tee" } } }, { variant: null }],
    });
    expect(await handlesFor({ graph }, "price-list.prices_removed", ["pset_1"])).toEqual(["tee"]);
    expect(graph).toHaveBeenCalledWith({
      entity: "product_variant_price_set",
      fields: ["variant.product.handle"],
      filters: { price_set_id: ["pset_1"] },
      withDeleted: true,
    });
  });

  it("reads a list's prices (a deleted list's too), then their sets' products", async () => {
    const graph = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ price_set_id: "pset_1" }, { price_set_id: "pset_1" }, { price_set_id: null }],
      })
      .mockResolvedValueOnce({
        data: [{ variant: { product: { handle: "tee" } } }],
      });
    expect(await handlesFor({ graph }, "price-list.deleted", ["plist_1"])).toEqual(["tee"]);
    expect(graph.mock.calls).toEqual([
      [
        {
          entity: "price",
          fields: ["price_set_id"],
          filters: { price_list_id: ["plist_1"] },
          withDeleted: true,
        },
      ],
      [
        {
          entity: "product_variant_price_set",
          fields: ["variant.product.handle"],
          filters: { price_set_id: ["pset_1"] },
          withDeleted: true,
        },
      ],
    ]);
  });

  it("reads a live list's prices without the removed ones; only a deleted list's withDeleted", async () => {
    for (const [event, withDeleted] of [
      ["price-list.created", false],
      ["price-list.updated", false],
      ["price-list.deleted", true],
    ] as const) {
      const graph = jest.fn().mockResolvedValue({ data: [] });
      await handlesFor({ graph }, event, ["plist_1"]);
      expect(graph.mock.calls[0][0]).toMatchObject({ entity: "price", withDeleted });
    }
  });

  it("stops after the list's prices when it has none", async () => {
    const graph = jest.fn().mockResolvedValue({ data: [] });
    expect(await handlesFor({ graph }, "price-list.created", ["plist_1"])).toEqual([]);
    expect(graph).toHaveBeenCalledTimes(1);
  });

  it("reads nothing for an event whose tags need no handle, or without ids", async () => {
    const graph = jest.fn();
    expect(await handlesFor({ graph }, "product.deleted", ["prod_1"])).toEqual([]);
    expect(await handlesFor({ graph }, "product.updated", [])).toEqual([]);
    expect(graph).not.toHaveBeenCalled();
  });
});

describe("idsFor", () => {
  it("takes the event's id, or a price list's price_set_ids for its prices_* events", () => {
    expect(idsFor("product-variant.updated", { id: "variant_1" })).toEqual(["variant_1"]);
    expect(idsFor("product.updated", { id: ["prod_1", "prod_2", ""] })).toEqual([
      "prod_1",
      "prod_2",
    ]);
    expect(idsFor("price-list.updated", { id: "plist_1" })).toEqual(["plist_1"]);
    expect(
      idsFor("price-list.prices_added", {
        id: "plist_1",
        price_set_ids: ["pset_1", "pset_2"],
      }),
    ).toEqual(["pset_1", "pset_2"]);
    expect(idsFor("price-list.prices_removed", { id: "plist_1" })).toEqual([]);
    expect(idsFor("region.updated", undefined)).toEqual([]);
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

  it("logs the tags the storefront skipped", async () => {
    const log = logger();
    const answer = { revalidated: ["search"], skipped: ["product:v1.2"], expire: "max" };
    const ok = await postBatch(batch, {
      storefrontUrl: "http://localhost:8000",
      secret: "s",
      logger: log,
      fetch: jest.fn().mockResolvedValue(Response.json(answer)),
    });
    expect(ok).toBe(true);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("skipped product:v1.2"));
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
