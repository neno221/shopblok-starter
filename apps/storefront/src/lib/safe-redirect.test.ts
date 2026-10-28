import { describe, expect, it } from "vitest";
import { seeded } from "./markets/test-maps";
import { safeRedirect } from "./safe-redirect";

const HOST = "shop.example";
const check = (target: string | null | undefined) => safeRedirect(target, HOST, seeded);

describe("safeRedirect", () => {
  it("accepts a market's page and keeps its query string", () => {
    expect(check("/")).toBe("/");
    expect(check("/about")).toBe("/about");
    expect(check("/us/about?x=1")).toBe("/us/about?x=1");
    expect(check("/ch/fr/products/shirt")).toBe("/ch/fr/products/shirt");
  });

  it("drops a fragment", () => {
    expect(check("/about#top")).toBe("/about");
  });

  it("refuses another origin, however it is written", () => {
    for (const target of [
      "//evil.example",
      "//evil.example/about",
      "https://evil.example",
      "http:/evil.example",
      "/\\evil.example",
      "/%2F%2Fevil.example",
      "/%2f/evil.example",
      "/%5Cevil.example",
      "/\tevil.example",
      " /about",
      "javascript:alert(1)",
      "evil.example",
    ]) {
      expect(check(target), target).toBeNull();
    }
  });

  it("refuses a path outside any market", () => {
    for (const target of [
      "/admin",
      "/admin/collections/pages",
      "/api/pages",
      "/next/exit-preview",
      "/design-system",
      "/_next/static/x.js",
      "/el-cy/about",
    ]) {
      expect(check(target), target).toBeNull();
    }
  });

  it("refuses a path the shop would redirect (the primary country's own segment)", () => {
    expect(check("/cy/about")).toBeNull();
  });

  it("refuses nothing at all", () => {
    expect(check(undefined)).toBeNull();
    expect(check(null)).toBeNull();
    expect(check("")).toBeNull();
  });
});
