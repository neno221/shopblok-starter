import storefrontRevalidate, { config } from "../storefront-revalidate";

function containerWith(
  graph: jest.Mock,
  log = { warn: jest.fn(), error: jest.fn() },
  caching?: { computeTags: jest.Mock; clear: jest.Mock },
) {
  const services: Record<string, unknown> = {
    configModule: { admin: { storefrontUrl: "http://localhost:8000" } },
    logger: log,
    query: { graph },
    ...(caching && { caching }),
  };
  return {
    resolve: (key: string) => services[key],
    hasRegistration: (key: string) => key in services,
  } as never;
}

describe("storefront-revalidate subscriber", () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.REVALIDATE_SECRET = "s3cret";
    fetchMock.mockReset();
    global.fetch = fetchMock as never;
  });

  afterAll(() => {
    global.fetch = realFetch;
    delete process.env.REVALIDATE_SECRET;
  });

  it("subscribes to the table's events", () => {
    expect(config.event).toContain("product-variant.updated");
    expect(config.event).toContain("inventory-level.updated");
    expect(config.event).toContain("shopblok.markets.updated");
    expect(config.event).toContain("region.updated");
    expect(config.event).toContain("price-list.prices_added");
  });

  it("expires the market map when the markets plugin saved a market (D94)", async () => {
    fetchMock.mockResolvedValue(new Response("{}"));
    const graph = jest.fn();
    await storefrontRevalidate({
      event: { name: "shopblok.markets.updated", data: { scope: "country", codes: ["at"] } },
      container: containerWith(graph),
    } as never);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      { tags: ["medusa:markets"], expire: 0 },
    ]);
    expect(fetchMock.mock.calls[0][0].href).toBe("http://localhost:8000/api/revalidate");
    // No handles to read: the event names no product.
    expect(graph).not.toHaveBeenCalled();
  });

  it("expires the market map, with the prices, when a region changes (D94)", async () => {
    fetchMock.mockResolvedValue(new Response("{}"));
    await storefrontRevalidate({
      event: { name: "region.updated", data: { id: "reg_1" } },
      container: containerWith(jest.fn()),
    } as never);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      { tags: ["medusa:regions", "medusa:markets", "medusa:products", "search"], expire: 0 },
    ]);
  });

  it("turns a variant's change into two POSTs, the expire-0 one last", async () => {
    fetchMock.mockResolvedValue(new Response("{}"));
    const graph = jest.fn().mockResolvedValue({ data: [{ product: { handle: "tee" } }] });
    await storefrontRevalidate({
      event: { name: "product-variant.updated", data: { id: "variant_1" } },
      container: containerWith(graph),
    } as never);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      { tags: ["medusa:products", "search"], expire: "max" },
      { tags: ["product:tee"], expire: 0 },
    ]);
  });

  it("reads a price list's price_set_ids, not its id, for a prices_* event (D112)", async () => {
    fetchMock.mockResolvedValue(new Response("{}"));
    const graph = jest.fn().mockResolvedValue({
      data: [{ variant: { product: { handle: "tee" } } }],
    });
    await storefrontRevalidate({
      event: {
        name: "price-list.prices_added",
        data: { id: "plist_1", price_set_ids: ["pset_1"] },
      },
      container: containerWith(graph),
    } as never);
    expect(graph.mock.calls[0][0].filters).toEqual({
      price_set_id: ["pset_1"],
    });
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      { tags: ["medusa:products", "search"], expire: "max" },
      { tags: ["product:tee"], expire: 0 },
    ]);
  });

  it("sends medusa:products for a stock change whose products cannot be read", async () => {
    fetchMock.mockImplementation(async () => new Response("{}"));
    const log = { warn: jest.fn(), error: jest.fn() };
    const graph = jest.fn().mockRejectedValue(new Error("database down"));
    await storefrontRevalidate({
      event: { name: "inventory-level.deleted", data: { id: "ilev_1" } },
      container: containerWith(graph, log),
    } as never);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      { tags: ["medusa:products"], expire: "max" },
    ]);
  });

  it("never throws: a failed read still sends the list tags, a failed POST is logged", async () => {
    // The mutation (T49's Verify): a subscriber that lets the POST's error out fails here.
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const log = { warn: jest.fn(), error: jest.fn() };
    const graph = jest.fn().mockRejectedValue(new Error("database down"));
    await expect(
      storefrontRevalidate({
        event: { name: "product.updated", data: { id: "prod_1" } },
        container: containerWith(graph, log),
      } as never),
    ).resolves.toBeUndefined();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      tags: ["medusa:products", "search"],
      expire: "max",
    });
    expect(log.warn).toHaveBeenCalledTimes(2);
  });

  describe("Medusa's caching module (T112 follow-up, D149)", () => {
    /**
     * A simplified `computeTags`: the entity and its list for every operation. The real module
     * adds the list tag only for list-affecting operations (`created`, `updated`, `deleted`,
     * `restored`, `attached`, `detached`), so not for `prices_added`; the subscriber passes on
     * whatever it returns, which is what these tests check.
     */
    const cachingModule = () => ({
      computeTags: jest.fn(
        async (_input: object, options: { entities: { type: string; id: string }[] }) =>
          options.entities.flatMap(({ type, id }) => [`${type}:${id}`, `${type}:list:*`]),
      ),
      clear: jest.fn(async (_options: { tags: string[]; options?: object }) => undefined),
    });

    it("clears the event's entities in Medusa's cache before the storefront is told", async () => {
      // The mutation: a subscriber that posts first (or never clears) fails here, since the
      // storefront could re-render from the Store API's old answer and keep it.
      const order: string[] = [];
      const caching = cachingModule();
      caching.clear.mockImplementation(async () => {
        order.push("clear");
      });
      fetchMock.mockImplementation(async () => {
        order.push("post");
        return new Response("{}");
      });
      const graph = jest.fn().mockResolvedValue({ data: [{ product: { handle: "tee" } }] });
      await storefrontRevalidate({
        event: { name: "product-variant.updated", data: { id: "variant_1" } },
        container: containerWith(graph, undefined, caching),
      } as never);
      expect(caching.computeTags).toHaveBeenCalledWith(
        { id: "variant_1" },
        { entities: [{ type: "ProductVariant", id: "variant_1" }], operation: "updated" },
      );
      expect(caching.clear).toHaveBeenCalledWith({
        tags: ["ProductVariant:variant_1", "ProductVariant:list:*"],
        options: { autoInvalidate: true },
      });
      expect(order).toEqual(["clear", "post", "post"]);
    });

    it("clears every id of a batch event once, and nothing for an event with no id", async () => {
      fetchMock.mockResolvedValue(new Response("{}"));
      const caching = cachingModule();
      await storefrontRevalidate({
        event: {
          name: "price-list.prices_added",
          data: { id: ["plist_1", "plist_2"], price_set_ids: [] },
        },
        container: containerWith(jest.fn().mockResolvedValue({ data: [] }), undefined, caching),
      } as never);
      expect(caching.computeTags.mock.calls.map(([, options]) => options)).toEqual([
        { entities: [{ type: "PriceList", id: "plist_1" }], operation: "prices_added" },
        { entities: [{ type: "PriceList", id: "plist_2" }], operation: "prices_added" },
      ]);
      expect(caching.clear).toHaveBeenCalledTimes(1);
      // Repeats kept, as the module's own subscriber keeps them, so the two clears' request keys
      // match and the module joins them (PR 154 review, item 2).
      expect(caching.clear.mock.calls[0][0].tags).toEqual([
        "PriceList:plist_1",
        "PriceList:list:*",
        "PriceList:plist_2",
        "PriceList:list:*",
      ]);

      const quiet = cachingModule();
      await storefrontRevalidate({
        event: { name: "shopblok.markets.updated", data: { scope: "country", codes: ["at"] } },
        container: containerWith(jest.fn(), undefined, quiet),
      } as never);
      expect(quiet.clear).not.toHaveBeenCalled();
    });

    it("still tells the storefront when the clear fails, and logs it", async () => {
      fetchMock.mockResolvedValue(new Response("{}"));
      const log = { warn: jest.fn(), error: jest.fn() };
      const caching = cachingModule();
      caching.clear.mockRejectedValue(new Error("redis down"));
      await expect(
        storefrontRevalidate({
          event: { name: "product.updated", data: { id: "prod_1" } },
          container: containerWith(
            jest.fn().mockResolvedValue({ data: [{ handle: "tee" }] }),
            log,
            caching,
          ),
        } as never),
      ).resolves.toBeUndefined();
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("redis down"));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does nothing to a cache that is not there (no MEDUSA_FF_CACHING)", async () => {
      fetchMock.mockResolvedValue(new Response("{}"));
      const log = { warn: jest.fn(), error: jest.fn() };
      await storefrontRevalidate({
        event: { name: "product.updated", data: { id: "prod_1" } },
        container: containerWith(jest.fn().mockResolvedValue({ data: [{ handle: "tee" }] }), log),
      } as never);
      expect(log.warn).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
