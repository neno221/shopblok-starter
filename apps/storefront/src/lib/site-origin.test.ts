import { describe, expect, it } from "vitest";
import { DEFAULT_BASE_URL, siteOrigin } from "./site-origin";

describe("siteOrigin", () => {
  it("is the origin alone: no trailing slash, no path", () => {
    expect(siteOrigin("http://localhost:8000/")).toBe("http://localhost:8000");
    expect(siteOrigin("https://shop.example//")).toBe("https://shop.example");
    expect(siteOrigin("https://shop.example/en/")).toBe("https://shop.example");
    expect(siteOrigin("https://shop.example:443")).toBe("https://shop.example");
  });

  it("falls back to localhost:8000 when unset or empty", () => {
    expect(siteOrigin(undefined)).toBe(DEFAULT_BASE_URL);
    expect(siteOrigin("")).toBe(DEFAULT_BASE_URL);
  });

  it("names the variable when it is not a URL", () => {
    expect(() => siteOrigin("shop.example")).toThrow(/NEXT_PUBLIC_BASE_URL is "shop.example"/);
  });
});
