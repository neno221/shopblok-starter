import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Env from "../../lib/env";
import { seeded } from "../../lib/markets/test-maps";
import type * as Regions from "../../lib/medusa/regions";
import type * as Templates from "../../lib/cms/templates";

const reads = vi.hoisted(() => ({
  configured: true,
  draft: false,
  categories: vi.fn(),
  regions: vi.fn(),
  header: vi.fn(),
  footer: vi.fn(),
  settings: vi.fn(),
  templates: vi.fn(),
}));
vi.mock("next/root-params", () => ({ market: async () => "en-us" }));
// A Greek browser on `/us`: what the request asks for is never the language a global is read in.
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: reads.draft }),
  headers: async () => new Headers({ "accept-language": "el" }),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("../../lib/cms/site", () => ({
  readHeader: reads.header,
  readFooter: reads.footer,
  readSiteSettings: reads.settings,
}));
vi.mock("../../lib/cms/templates", async (original) => ({
  ...(await original<typeof Templates>()),
  readTemplates: reads.templates,
}));
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
  reads.draft = false;
  for (const read of [reads.header, reads.footer, reads.settings, reads.templates])
    read.mockReset().mockResolvedValue(null);
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

  it("reads the three globals in the market's language, published unless in Draft Mode (T61)", async () => {
    await getShellData();
    for (const read of [reads.header, reads.footer, reads.settings, reads.templates]) {
      expect(read).toHaveBeenCalledExactlyOnceWith({
        market: expect.objectContaining({ key: "en-us", language: "en" }),
        draft: false,
      });
    }
    reads.draft = true;
    await getShellData();
    expect(reads.header).toHaveBeenLastCalledWith(expect.objectContaining({ draft: true }));
  });

  // The market test (D101): the global is read by the market's language, never the request's (the
  // mocked request asks for Greek).
  it("reads the templates global in the market's language and passes its picks on (D101)", async () => {
    const { TEMPLATE_DEFAULTS } = await import("../../lib/cms/templates");
    expect((await getShellData()).templates).toEqual(TEMPLATE_DEFAULTS);
    expect(reads.templates).toHaveBeenCalledExactlyOnceWith({
      market: expect.objectContaining({ key: "en-us", language: "en" }),
      draft: false,
    });
    reads.templates.mockResolvedValue({
      updatedAt: "2026-11-06",
      productPage: { variant: "default" },
      cart: { variant: "default", miniCart: "page", quickCart: "off" },
    });
    expect((await getShellData()).templates).toEqual({
      ...TEMPLATE_DEFAULTS,
      miniCart: "page",
      quickCart: "off",
    });
  });

  it("takes a saved header and the site's name, and gives site.ts's values for the rest", async () => {
    reads.header.mockResolvedValue({ updatedAt: "2026-10-28", design: "minimal", sticky: false });
    reads.settings.mockResolvedValue({ updatedAt: "2026-10-28", storeName: "Kalimera" });
    const shell = await getShellData();
    expect(shell.header).toMatchObject({ design: "minimal", sticky: false });
    expect(shell.settings.storeName).toBe("Kalimera");
    expect(shell.footer.design).toBe("multi-column");
    expect(shell.footer.copyright).toMatch(/^© \d{4} Kalimera$/);
  });

  it("uses site.ts's values when Payload fails, and logs it rather than throwing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reads.header.mockRejectedValue(new Error("connection terminated"));
    const shell = await getShellData();
    expect(shell.header.design).toBe("classic");
    expect(shell.header.announcement?.messages[0]?.message).toBe("Free returns within 30 days");
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("a Payload read failed"),
      expect.any(Error),
    );
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
