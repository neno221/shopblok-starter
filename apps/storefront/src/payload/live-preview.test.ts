import { describe, expect, it } from "vitest";
import { greeceOnly, seeded } from "../lib/markets/test-maps";
import { LIVE_PREVIEW_BREAKPOINTS, previewMarket, previewUrl } from "./live-preview";

const base = { serverURL: "https://shop.example", secret: "s3cret", path: "/about" };

describe("previewMarket", () => {
  it("takes the primary country when it speaks the language, else the first that does", () => {
    expect(previewMarket(seeded, "el")?.key).toBe("el-cy");
    expect(previewMarket(seeded, "fr")?.key).toBe("fr-fr");
    expect(previewMarket(seeded, "ja")).toBeUndefined();
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

  it("previews a market with its own domain on that domain", () => {
    const map = {
      ...greeceOnly,
      countries: greeceOnly.countries.map((country) => ({ ...country, domain: "shop.gr" })),
    };
    const url = new URL(previewUrl({ ...base, map, language: "el" }) ?? "");
    expect(url.origin).toBe("https://shop.gr");
    expect(url.searchParams.get("path")).toBe("/about");
  });

  it("offers D74's three frames", () => {
    expect(LIVE_PREVIEW_BREAKPOINTS.map(({ width, height }) => `${width}x${height}`)).toEqual([
      "375x667",
      "768x1024",
      "1440x900",
    ]);
  });
});
