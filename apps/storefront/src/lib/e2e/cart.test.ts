import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ added: [] as unknown[] }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("../market-context", () => ({
  getMarketContext: async (key: string) =>
    key === "en-us" ? { region: { id: "reg_us" }, market: { medusaLocale: "en-US" } } : null,
}));
vi.mock("../medusa/sdk", () => ({
  medusaRequest: async () => ({ products: [{ id: "prod_1", variants: [{ id: "variant_1" }] }] }),
}));
vi.mock("../medusa/cart", () => ({
  addLine: async (...args: unknown[]) => {
    calls.added.push(args);
    return { lines: [{ quantity: 2 }, { quantity: 1 }] };
  },
}));

import { respondWithCart } from "./cart";

const post = (query: string) =>
  respondWithCart(new Request(`http://localhost:8000/next/e2e/cart${query}`, { method: "POST" }));

beforeEach(() => {
  calls.added = [];
  vi.stubEnv("E2E_TEST_ROUTES", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("/next/e2e/cart (T48)", () => {
  it("is a 404 that adds nothing unless E2E_TEST_ROUTES is `true`", async () => {
    vi.stubEnv("E2E_TEST_ROUTES", "");
    expect((await post("?market=en-us")).status).toBe(404);
    expect(calls.added).toEqual([]);
  });

  it("adds the catalog's first variant to the market's cart and answers the count", async () => {
    const response = await post("?market=en-us&quantity=2");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ count: 3 });
    expect(calls.added).toEqual([[{ regionId: "reg_us", locale: "en-US" }, "variant_1", 2]]);
  });

  it.each(["?market=US", "?market=en-us&quantity=0", "?market=en-us&quantity=1.5", "?quantity=2"])(
    "refuses %s",
    async (query) => {
      expect((await post(query)).status).toBe(400);
      expect(calls.added).toEqual([]);
    },
  );

  it("is a 404 for a market that is not open", async () => {
    expect((await post("?market=pt-br")).status).toBe(404);
  });
});
