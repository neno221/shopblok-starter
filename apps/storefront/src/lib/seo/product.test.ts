import { pageFixtures } from "@shopblok/fixtures";
import { describe, expect, it, vi } from "vitest";
import { jsonLdText, metaDescription, productJsonLd, shareableImage, siteBase } from "./product";

const detail = pageFixtures.en.productDetail.buyBox.product;
const base = new URL("https://shop.example");

describe("the product page's SEO (T49, SPEC §12)", () => {
  it("is a Product with one Offer per variant, and the breadcrumbs, with absolute URLs", () => {
    const data = productJsonLd(detail, base) as {
      "@graph": Record<string, unknown>[];
    };
    const [product, trail] = data["@graph"] as [
      {
        name: string;
        url: string;
        offers: { url: string; priceCurrency: string }[];
      },
      { itemListElement: { position: number; item: string; name: string }[] },
    ];
    expect(product.name).toBe(detail.title);
    expect(product.url).toBe(`https://shop.example${detail.href}`);
    expect(product.offers).toHaveLength(detail.variants.length);
    expect(product.offers[0]?.url).toMatch(/\?variant=/);
    expect(trail.itemListElement.at(-1)).toMatchObject({
      position: detail.breadcrumbs.length + 1,
      name: detail.title,
    });
  });

  it("escapes < so a product text cannot close the script element", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });

  it("shares only fetchable pictures, and cuts a long description at a word", () => {
    expect(shareableImage("/img.jpg", base)).toBe("https://shop.example/img.jpg");
    expect(shareableImage("data:image/svg+xml,x", base)).toBeUndefined();
    expect(shareableImage("//evil.example/x.jpg", base)).toBeUndefined();
    const long = metaDescription(`${"word ".repeat(60)}end`);
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("…")).toBe(true);
    expect(metaDescription("  short\n text ")).toBe("short text");
  });

  it("takes the base from NEXT_PUBLIC_BASE_URL, or the local one", () => {
    expect(siteBase({ NEXT_PUBLIC_BASE_URL: "https://shop.example" }).origin).toBe(
      "https://shop.example",
    );
    expect(siteBase({}).origin).toBe("http://localhost:8000");
  });

  it("throws for a value that is not a URL, and says so in production without one", () => {
    expect(() => siteBase({ NEXT_PUBLIC_BASE_URL: "shop.example" })).toThrow(
      'NEXT_PUBLIC_BASE_URL is "shop.example", which is not a URL',
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(siteBase({ NODE_ENV: "production" }).origin).toBe("http://localhost:8000");
    siteBase({ NODE_ENV: "production" });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain("NEXT_PUBLIC_BASE_URL is not set");
    error.mockRestore();
  });
});
