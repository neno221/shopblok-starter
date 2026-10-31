import { beforeEach, describe, expect, it, vi } from "vitest";
import { seeded } from "./test-maps";

const medusa = vi.hoisted(() => ({
  fetch: vi.fn(),
  medusaRequest: vi.fn(),
}));
vi.mock("../medusa/sdk", () => ({ medusaRequest: medusa.medusaRequest }));

const { loadMarketMap } = await import("./medusa-loader");

beforeEach(() => {
  vi.clearAllMocks();
  medusa.medusaRequest.mockImplementation((call: (sdk: unknown) => unknown) =>
    call({ client: { fetch: medusa.fetch } }),
  );
});

describe("loadMarketMap (D94)", () => {
  it("reads GET /store/markets through the SDK, with no locale header", async () => {
    medusa.fetch.mockResolvedValue({ markets: seeded });
    expect(await loadMarketMap()).toEqual(seeded);
    expect(medusa.fetch).toHaveBeenCalledOnce();
    expect(medusa.fetch).toHaveBeenCalledWith("/store/markets");
  });

  it("turns an unset primary country or fallback market into an empty string", async () => {
    medusa.fetch.mockResolvedValue({
      markets: { countries: seeded.countries, languages: seeded.languages },
    });
    expect(await loadMarketMap()).toEqual({ ...seeded, primaryCountry: "", fallbackMarket: "" });
  });

  it("keeps closed countries: the storefront's 404 for them needs to know them", async () => {
    const closed = { code: "at", enabled: false, languages: [] };
    medusa.fetch.mockResolvedValue({
      markets: { ...seeded, countries: [...seeded.countries, closed] },
    });
    expect((await loadMarketMap()).countries).toContainEqual(closed);
  });

  it.each([[{}], [{ markets: null }], [{ markets: { countries: [] } }], [{ markets: "x" }]])(
    "refuses an answer that is not a market map: %j",
    async (body) => {
      medusa.fetch.mockResolvedValue(body);
      await expect(loadMarketMap()).rejects.toThrow(/did not answer a market map/);
    },
  );

  it("lets the data layer's errors through (Medusa down, a missing key)", async () => {
    const down = new Error("Medusa at http://localhost:9000 did not answer");
    medusa.medusaRequest.mockRejectedValue(down);
    await expect(loadMarketMap()).rejects.toBe(down);
  });
});
