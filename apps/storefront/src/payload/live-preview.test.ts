import { describe, expect, it, vi } from "vitest";
import { greeceOnly, seeded, withDomains } from "../lib/markets/test-maps";
import {
  LIVE_PREVIEW_BREAKPOINTS,
  livePreviewUrl,
  templatesPreviewPath,
  pagePreviewPath,
  previewMarket,
  previewUrl,
} from "./live-preview";

// The market map is Medusa's (D95), read through `get-market-map`, lazily.
const getMarketMap = vi.hoisted(() => vi.fn());
vi.mock("../lib/markets/get-market-map", () => ({ getMarketMap }));

const base = { serverURL: "https://shop.example", secret: "s3cret", path: "/about" };

describe("previewMarket", () => {
  it("takes the primary country when it speaks the language, else the first that does", () => {
    expect(previewMarket(seeded, "el")?.key).toBe("el-cy");
    expect(previewMarket(seeded, "fr")?.key).toBe("fr-fr");
    expect(previewMarket(seeded, "ja")).toBeUndefined();
  });

  it("prefers a country on the site's host, and takes one on its own domain only after (M7 D148, 3)", () => {
    // Cyprus and Switzerland on domains of their own: German and French are previewed in Germany
    // and France, Greek (only Cyprus's) in Cyprus, on the admin's host.
    expect(previewMarket(withDomains, "el")?.key).toBe("el-cy");
    expect(previewMarket(withDomains, "de")?.key).toBe("de-de");
    expect(previewMarket(withDomains, "fr")?.key).toBe("fr-fr");
  });

  it("takes the primary country first among countries on their own domains (PR 152 review, item 6)", () => {
    // Portugal listed first, Brazil primary, both on domains of their own.
    const map = {
      countries: [
        { code: "pt", enabled: true, languages: ["pt"], domain: "loja.pt" },
        { code: "br", enabled: true, languages: ["pt"], domain: "loja.com.br" },
      ],
      languages: [{ code: "pt", medusaLocale: "pt-BR", htmlLang: "pt-BR" }],
      primaryCountry: "br",
      fallbackMarket: "pt-br",
    };
    expect(previewMarket(map, "pt")?.key).toBe("pt-br");
  });
});

describe("previewUrl", () => {
  it("opens /next/preview with the market's public path and the secret", () => {
    const url = new URL(previewUrl({ ...base, map: seeded, language: "en" }) ?? "");
    expect(url.origin + url.pathname).toBe("https://shop.example/next/preview");
    expect(url.searchParams.get("path")).toBe("/us/about");
    expect(url.searchParams.get("secret")).toBe("s3cret");
    expect(
      new URL(previewUrl({ ...base, map: seeded, language: "el" }) ?? "").searchParams.get("path"),
    ).toBe("/about");
  });

  it("is off without a secret or without a market for the language", () => {
    expect(previewUrl({ ...base, secret: undefined, map: seeded, language: "en" })).toBeNull();
    expect(previewUrl({ ...base, map: greeceOnly, language: "de" })).toBeNull();
  });

  it("previews a country on its own domain on the site's origin, at its key (M7 D148, 3)", () => {
    const map = {
      ...greeceOnly,
      countries: greeceOnly.countries.map((country) => ({ ...country, domain: "shop.gr" })),
    };
    const url = new URL(previewUrl({ ...base, map, language: "el" }) ?? "");
    expect(url.origin + url.pathname).toBe("https://shop.example/next/preview");
    expect(url.searchParams.get("path")).toBe("/el-gr/about");
    const home = new URL(previewUrl({ ...base, path: "/", map, language: "el" }) ?? "");
    expect(home.searchParams.get("path")).toBe("/el-gr");
    const query = new URL(
      previewUrl({ ...base, path: "/store?page=2", map, language: "el" }) ?? "",
    );
    expect(query.searchParams.get("path")).toBe("/el-gr/store?page=2");
  });

  it("stays on the site's origin when another country has its own domain", () => {
    const url = new URL(previewUrl({ ...base, map: withDomains, language: "de" }) ?? "");
    expect(url.origin).toBe("https://shop.example");
    expect(url.searchParams.get("path")).toBe("/de/about");
    const greek = new URL(previewUrl({ ...base, map: withDomains, language: "el" }) ?? "");
    expect(greek.origin).toBe("https://shop.example");
    expect(greek.searchParams.get("path")).toBe("/el-cy/about");
  });

  it("offers D74's three frames", () => {
    expect(LIVE_PREVIEW_BREAKPOINTS.map(({ width, height }) => `${width}x${height}`)).toEqual([
      "375x667",
      "768x1024",
      "1440x900",
    ]);
  });
});

describe("pagePreviewPath", () => {
  const parents: Record<number, { slug: string; parent: number | null }> = {
    1: { slug: "sxetika", parent: null },
    2: { slug: "omada", parent: 1 },
  };
  const payload = {
    findByID: vi.fn(async ({ id }: { id: number }) => parents[id] ?? null),
    findGlobal: vi.fn(async () => ({ homepage: 7 })),
  } as unknown as Parameters<typeof pagePreviewPath>[0];

  it("is the market's home for the page the site settings name as the homepage", async () => {
    expect(await pagePreviewPath(payload, { id: 7, slug: "home", parent: null }, "en")).toBe("/");
    expect(await pagePreviewPath(payload, { id: 4, slug: "home", parent: null }, "en")).toBe(
      "/home",
    );
  });

  it("is the parents' slugs and the page's own, as the language edited reads them", async () => {
    expect(await pagePreviewPath(payload, { id: 3, slug: "theseis", parent: 2 }, "el")).toBe(
      "/sxetika/omada/theseis",
    );
    expect(await pagePreviewPath(payload, { id: 4, slug: "privacy", parent: null }, "el")).toBe(
      "/privacy",
    );
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, locale: "el", draft: true }),
    );
  });

  it("is null for a page with no slug yet, a parent gone or a loop", async () => {
    expect(await pagePreviewPath(payload, { id: 3, slug: "", parent: 2 }, "el")).toBeNull();
    expect(await pagePreviewPath(payload, { id: 3, slug: "x", parent: 9 }, "el")).toBeNull();
    expect(
      await pagePreviewPath(payload, { id: 1, slug: "x", parent: { id: 2 } }, "el"),
    ).toBeNull();
  });
});

describe("livePreviewUrl", () => {
  // Like the SEO URL and the redirect checks (T75 review, items 2 and 3): a fresh server with
  // Medusa down has no map, and the admin's live preview must stay off, not answer an error.
  it("is null, with a warning, when the markets can't be read", async () => {
    getMarketMap.mockRejectedValue(new Error("Medusa at http://localhost:9000 did not answer"));
    const warn = vi.fn();
    const args = {
      globalConfig: { slug: "header" },
      data: {},
      locale: { code: "en" },
      req: { payload: { logger: { warn } } },
    };
    const url = livePreviewUrl as (a: unknown) => Promise<string | null>;
    await expect(url(args)).resolves.toBeNull();
    expect(getMarketMap).toHaveBeenCalled();
    expect(warn.mock.calls[0]?.[0]).toMatch(/did not answer.*the live preview is off for now/);
  });
});

describe("templatesPreviewPath (D101)", () => {
  it("is the newest product's page, read without its deleted products", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ handle: "linen shirt" }] });
    expect(await templatesPreviewPath({ find } as never)).toBe("/products/linen%20shirt");
    expect(find.mock.calls[0]?.[0]).toMatchObject({
      collection: "products",
      where: { deletedInMedusa: { not_equals: true } },
      sort: "-createdAt",
      limit: 1,
    });
  });

  it("is the home while the shop has no product", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] });
    expect(await templatesPreviewPath({ find } as never)).toBe("/");
  });
});
