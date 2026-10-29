import { describe, expect, it, vi } from "vitest";
import { greeceOnly, seeded, withDomains } from "../lib/markets/test-maps";
import {
  LIVE_PREVIEW_BREAKPOINTS,
  pagePreviewPath,
  previewMarket,
  previewUrl,
} from "./live-preview";

const base = { serverURL: "https://shop.example", secret: "s3cret", path: "/about" };

describe("previewMarket", () => {
  it("takes the primary country when it speaks the language, else the first that does", () => {
    expect(previewMarket(seeded, "el")?.key).toBe("el-cy");
    expect(previewMarket(seeded, "fr")?.key).toBe("fr-fr");
    expect(previewMarket(seeded, "ja")).toBeUndefined();
  });

  it("skips a country with its own domain: the editor's session cannot reach it (known limit)", () => {
    // Cyprus and Switzerland on domains of their own: Greek is only Cyprus's, so it has no market
    // to preview in; German and French are previewed in Germany and France, never Switzerland.
    expect(previewMarket(withDomains, "el")).toBeUndefined();
    expect(previewMarket(withDomains, "de")?.key).toBe("de-de");
    expect(previewMarket(withDomains, "fr")?.key).toBe("fr-fr");
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

  it("is off for a language that only countries with their own domain speak", () => {
    const map = {
      ...greeceOnly,
      countries: greeceOnly.countries.map((country) => ({ ...country, domain: "shop.gr" })),
    };
    expect(previewUrl({ ...base, map, language: "el" })).toBeNull();
  });

  it("stays on the site's origin when another country has its own domain", () => {
    const url = new URL(previewUrl({ ...base, map: withDomains, language: "de" }) ?? "");
    expect(url.origin).toBe("https://shop.example");
    expect(url.searchParams.get("path")).toBe("/de/about");
    expect(previewUrl({ ...base, map: withDomains, language: "el" })).toBeNull();
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
  } as unknown as Parameters<typeof pagePreviewPath>[0];

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
