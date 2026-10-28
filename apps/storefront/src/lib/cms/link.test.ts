import { describe, expect, it } from "vitest";
import { findMarket } from "../markets/market";
import { seeded } from "../markets/test-maps";
import { isSafeLinkUrl, resolveLink } from "./link";

const us = findMarket(seeded, "en-us")!;
const cy = findMarket(seeded, "el-cy")!;
const paths = { products: (doc: Record<string, unknown>) => `/products/${String(doc["handle"])}` };

describe("isSafeLinkUrl", () => {
  it("accepts a path, https, mailto and tel", () => {
    for (const url of ["/sale", "https://example.com", "mailto:a@b.c", "tel:+35712345678"]) {
      expect(isSafeLinkUrl(url), url).toBe(true);
    }
  });

  it("refuses scripts, other schemes, other origins and stray space", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,x",
      "http://example.com",
      "//evil.example",
      "/\\evil.example",
      " /sale",
      "sale",
      "",
    ]) {
      expect(isSafeLinkUrl(url), url).toBe(false);
    }
  });
});

describe("resolveLink", () => {
  it("puts a custom path in the current market", () => {
    expect(resolveLink({ type: "custom", url: "/sale" }, { market: us, map: seeded })?.href).toBe(
      "/us/sale",
    );
    expect(resolveLink({ type: "custom", url: "/sale" }, { market: cy, map: seeded })?.href).toBe(
      "/sale",
    );
  });

  it("resolves an internal reference through the collection's path", () => {
    const value = {
      type: "reference" as const,
      reference: { relationTo: "products", value: { handle: "shirt" } },
      label: "Shirt",
    };
    expect(resolveLink(value, { market: us, map: seeded, paths })).toEqual({
      href: "/us/products/shirt",
      label: "Shirt",
      newTab: false,
      appearance: null,
    });
  });

  it("leaves out a reference it cannot place, and an unsafe URL", () => {
    const ctx = { market: us, map: seeded, paths };
    expect(
      resolveLink({ type: "reference", reference: { relationTo: "products", value: 4 } }, ctx),
    ).toBeNull();
    expect(
      resolveLink({ type: "reference", reference: { relationTo: "posts", value: {} } }, ctx),
    ).toBeNull();
    expect(resolveLink({ type: "custom", url: "javascript:alert(1)" }, ctx)).toBeNull();
    expect(resolveLink(null, ctx)).toBeNull();
  });

  it("adds noopener noreferrer to a link that opens a new tab", () => {
    const resolved = resolveLink(
      { type: "custom", url: "https://example.com", newTab: true },
      { market: us, map: seeded },
    );
    expect(resolved).toMatchObject({
      href: "https://example.com",
      newTab: true,
      rel: "noopener noreferrer",
    });
  });
});
