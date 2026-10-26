import { marketPrefixFrom, storefrontLink } from "../../lib/storefront-url";

describe("marketPrefixFrom", () => {
  it("takes a market prefix the storefront sent", () => {
    for (const prefix of ["", "/us", "/ch/fr", "/cy/en", "/en"]) {
      expect(marketPrefixFrom({ market: prefix })).toBe(prefix);
    }
  });

  it("falls back to the primary market (no prefix) for anything that is not a prefix", () => {
    for (const metadata of [
      undefined,
      null,
      {},
      { market: 42 },
      { market: "us" },
      { market: "/US" },
      { market: "//evil.example" },
      { market: "/us/../admin" },
      { market: "/a/b/c" },
      { market: "/us?x=1" },
      { market: "/us/" },
    ]) {
      expect(marketPrefixFrom(metadata)).toBe("");
    }
  });
});

describe("storefrontLink", () => {
  it("joins the storefront's URL, the market's prefix, the path and the query", () => {
    expect(storefrontLink("http://localhost:8000", { market: "/us" }, "/verify", { code: "123 456" })).toBe(
      "http://localhost:8000/us/verify?code=123+456",
    );
    expect(storefrontLink("https://shop.example/", {}, "/verify", { code: "1" })).toBe(
      "https://shop.example/verify?code=1",
    );
  });

  it("keeps a storefront served under a path", () => {
    expect(
      storefrontLink("https://example.com/shop/", { market: "/ch/fr" }, "/reset-password", {
        token: "t",
        email: "a+b@example.com",
      }),
    ).toBe("https://example.com/shop/ch/fr/reset-password?token=t&email=a%2Bb%40example.com");
  });

  it("gives nothing when STOREFRONT_URL is missing or not a URL", () => {
    expect(storefrontLink(undefined, {}, "/verify", {})).toBeUndefined();
    expect(storefrontLink("localhost:8000", {}, "/verify", {})).toBeUndefined();
    expect(storefrontLink("not a url", {}, "/verify", {})).toBeUndefined();
  });
});
