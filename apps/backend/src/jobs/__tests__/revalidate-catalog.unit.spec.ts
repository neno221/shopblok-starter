import revalidateCatalog, { config } from "../revalidate-catalog";

describe("revalidate-catalog job (D58: price lists emit no events)", () => {
  const realFetch = global.fetch;
  const fetchMock = jest.fn();
  const log = { warn: jest.fn(), error: jest.fn() };
  const container = {
    resolve: (key: string) =>
      ({
        configModule: { admin: { storefrontUrl: "http://localhost:8000" } },
        logger: log,
      })[key],
  } as never;

  beforeEach(() => {
    process.env.REVALIDATE_SECRET = "s3cret";
    fetchMock.mockReset();
    log.warn.mockReset();
    global.fetch = fetchMock as never;
  });

  afterAll(() => {
    global.fetch = realFetch;
    delete process.env.REVALIDATE_SECRET;
  });

  it("runs every ten minutes", () => {
    expect(config.schedule).toBe("*/10 * * * *");
  });

  it("POSTs medusa:products and search with expire max", async () => {
    fetchMock.mockResolvedValue(new Response("{}"));
    await revalidateCatalog(container);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:8000/api/revalidate");
    expect(JSON.parse(init.body)).toEqual({
      tags: ["medusa:products", "search"],
      expire: "max",
    });
    expect(init.headers.authorization).toBe("Bearer s3cret");
  });

  it("logs a failure and never throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(revalidateCatalog(container)).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledTimes(1);
  });
});
