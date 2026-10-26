import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Env from "../../lib/env";
import { seeded } from "../../lib/markets/test-maps";
import type * as Regions from "../../lib/medusa/regions";

const reads = vi.hoisted(() => ({
  configured: true,
  categories: vi.fn(),
  regions: vi.fn(),
}));
vi.mock("next/root-params", () => ({ market: async () => "en-us" }));
vi.mock("../../lib/markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));
vi.mock("../../lib/env", async (original) => {
  const actual = await original<typeof Env>();
  return {
    ...actual,
    medusaEnv: async () => {
      if (!reads.configured) throw new actual.EnvError("Medusa is not configured");
      return { backendUrl: "http://localhost:9000", publishableKey: "pk_test" };
    },
  };
});
vi.mock("../../lib/medusa/categories", () => ({ listCategories: reads.categories }));
vi.mock("../../lib/medusa/regions", async (original) => ({
  ...(await original<typeof Regions>()),
  listRegions: reads.regions,
}));

import { MedusaRequestError } from "../../lib/medusa/sdk";
import { getShellData } from "./shell-data";

const region = { id: "reg_us", name: "US", currencyCode: "usd", countries: ["us"] };
const tree = [{ id: "pcat_1", handle: "shirts", name: "Shirts", children: [] }];

beforeEach(() => {
  reads.configured = true;
  reads.categories.mockReset().mockResolvedValue(tree);
  reads.regions.mockReset().mockResolvedValue([region]);
});
afterEach(() => vi.restoreAllMocks());

describe("getShellData (D66)", () => {
  it("has the market's categories and its switcher", async () => {
    const shell = await getShellData();
    expect(shell.categories.map((category) => category.href)).toEqual(["/us/categories/shirts"]);
    expect(shell.choice?.markets.map((option) => option.country)).toEqual(["us"]);
    expect(shell.url("/cart")).toBe("/us/cart");
  });

  it("has no menu and no switcher while Medusa is down, and logs nothing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reads.categories.mockRejectedValue(new MedusaRequestError("down", "unreachable"));
    reads.regions.mockRejectedValue(new MedusaRequestError("down", "unreachable"));
    const shell = await getShellData();
    expect(shell.categories).toEqual([]);
    expect(shell.choice).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
  });

  it("goes without a read that fails in any other way, and logs it (PR 75 review, item 3)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reads.categories.mockRejectedValue(new TypeError("rows is not iterable"));
    const shell = await getShellData();
    expect(shell.categories).toEqual([]);
    expect(shell.choice?.markets).toHaveLength(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("reads nothing from Medusa when it is not configured (the design-system job's build)", async () => {
    reads.configured = false;
    const shell = await getShellData();
    expect(reads.categories).not.toHaveBeenCalled();
    expect(reads.regions).not.toHaveBeenCalled();
    expect(shell.categories).toEqual([]);
    expect(shell.homes.length).toBeGreaterThan(1);
  });
});
