import storefrontRevalidate, { config } from "../storefront-revalidate";

function containerWith(graph: jest.Mock, log = { warn: jest.fn(), error: jest.fn() }) {
  const services: Record<string, unknown> = {
    configModule: { admin: { storefrontUrl: "http://localhost:8000" } },
    logger: log,
    query: { graph },
  };
  return { resolve: (key: string) => services[key] } as never;
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
});
